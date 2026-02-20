from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.conf import settings
from django.utils import timezone
from .models import Registration
from .email_utils import send_epass_email
from .id_card_generator import generate_id_card
import uuid
import json
import os
import time
import logging
from functools import wraps
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.customer_details import CustomerDetails


# Configure logging
logger = logging.getLogger(__name__)

# Initialize Cashfree
Cashfree.XClientId = settings.CASHFREE_APP_ID
Cashfree.XClientSecret = settings.CASHFREE_SECRET_KEY
Cashfree.XEnvironment = Cashfree.SANDBOX if settings.CASHFREE_ENV == 'TEST' else Cashfree.PRODUCTION


def propagate_bulk_payment(primary_registration):
    """
    Propagate payment from primary booker to all additional members in booking group
    """
    try:
        # Get all additional members in the same booking group
        additional_members = Registration.objects.filter(
            booking_group_id=primary_registration.booking_group_id,
            is_primary_booker=False
        )

        if not additional_members.exists():
            logger.info(f"No additional members found for {primary_registration.booking_group_id}")
            return

        # Calculate expected amount
        total_persons = Registration.objects.filter(
            booking_group_id=primary_registration.booking_group_id
        ).count()

        # Get per-person price
        if primary_registration.registration_for == 'PUBLIC':
            per_person_price = 300
        elif primary_registration.registration_for == 'STUDENTS':
            per_person_price = 150
        else:  # BNI members
            per_person_price = 0

        expected_total = total_persons * per_person_price
        primary_paid = float(primary_registration.amount)

        # Check if primary paid for all members
        if primary_paid >= expected_total:
            logger.info(f"Primary paid ₹{primary_paid} for {total_persons} persons - propagating payment")

            # Update all additional members
            for member in additional_members:
                member.payment_status = 'SUCCESS'
                member.payment_id = primary_registration.payment_id
                member.payment_date = primary_registration.payment_date
                member.gateway_verified = True

                # Add note in payment_info
                try:
                    payment_info = json.loads(primary_registration.payment_info) if primary_registration.payment_info else {}
                except:
                    payment_info = {}

                payment_info['paid_by_primary'] = True
                payment_info['primary_ticket'] = primary_registration.ticket_no
                member.payment_info = json.dumps(payment_info)

                member.save()
                logger.info(f"Updated {member.ticket_no} with payment from primary {primary_registration.ticket_no}")

                # Generate ID card and send email for each additional member
                try:
                    id_card_path = generate_id_card(member)
                    send_epass_email(member, id_card_path)
                    logger.info(f"Sent E-Pass email to {member.email}")
                except Exception as e:
                    logger.error(f"Failed to send E-Pass to {member.email}: {str(e)}")

            logger.info(f"Successfully propagated payment to {additional_members.count()} additional members")
        else:
            logger.warning(f"Primary paid ₹{primary_paid} but expected ₹{expected_total} for {total_persons} persons")

    except Exception as e:
        logger.error(f"Error propagating bulk payment: {str(e)}", exc_info=True)


def retry_on_failure(max_attempts=3, initial_delay=1, backoff_factor=2):
    """
    Decorator to retry a function with exponential backoff
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None

            for attempt in range(1, max_attempts + 1):
                try:
                    logger.info(f"Attempting {func.__name__} (attempt {attempt}/{max_attempts})")
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    logger.warning(
                        f"{func.__name__} attempt {attempt}/{max_attempts} failed: {str(e)}"
                    )

                    if attempt < max_attempts:
                        logger.info(f"Retrying after {delay} seconds...")
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(
                            f"{func.__name__} failed after {max_attempts} attempts: {str(e)}"
                        )

            raise last_exception
        return wrapper
    return decorator


@retry_on_failure(max_attempts=3, initial_delay=1, backoff_factor=2)
def _create_cashfree_order(cashfree_client, order_request, registration):
    """
    Internal function to create Cashfree order with retry logic
    """
    try:
        logger.info(f"Creating Cashfree order for registration {registration.id}, ticket {registration.ticket_no}")
        response = cashfree_client.PGCreateOrder("2023-08-01", order_request)

        # Extract payment details from response
        if hasattr(response.data, 'to_dict'):
            response_dict = response.data.to_dict()
        elif hasattr(response.data, '__dict__'):
            response_dict = response.data.__dict__
        else:
            response_dict = {}

        payment_session_id = response_dict.get('payment_session_id', '')
        order_status = response_dict.get('order_status', 'ACTIVE')

        if not payment_session_id:
            logger.error(f"No payment_session_id in Cashfree response for registration {registration.id}")
            raise Exception("Payment session ID not received from Cashfree")

        logger.info(f"Successfully created Cashfree order for registration {registration.id}")
        return {
            'payment_session_id': payment_session_id,
            'order_status': order_status,
            'response_dict': response_dict
        }

    except Exception as e:
        logger.error(f"Cashfree order creation failed for registration {registration.id}: {str(e)}")
        raise


@api_view(['POST'])
@permission_classes([AllowAny])
def create_payment_order(request):
    """
    Create a payment order for a registration
    Expected: registration_id and amount in request body
    """
    registration_id = request.data.get('registration_id')
    amount = request.data.get('amount')

    logger.info(f"Payment order creation request for registration_id: {registration_id}, amount: {amount}")

    try:
        # Validate input
        if not registration_id:
            logger.warning("Payment order creation failed: registration_id missing")
            return Response({
                'error': 'registration_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not amount:
            logger.warning("Payment order creation failed: amount missing")
            return Response({
                'error': 'amount is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get the registration
        try:
            registration = Registration.objects.get(id=registration_id)
            logger.info(f"Found registration: {registration.ticket_no}, name: {registration.name}")
        except Registration.DoesNotExist:
            logger.error(f"Registration not found: {registration_id}")
            return Response({
                'error': 'Registration not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Check if already paid
        if registration.payment_status == 'SUCCESS':
            logger.warning(f"Payment already completed for registration {registration.id}")
            return Response({
                'error': 'Payment already completed for this registration'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate unique order ID
        order_id = f"BNI_ORDER_{registration.ticket_no}_{uuid.uuid4().hex[:8]}"
        logger.info(f"Generated order_id: {order_id}")

        # Create customer details (Cashfree requires min 3 chars for ID and name)
        customer_id = f"BNI{str(registration.id).zfill(5)}"  # e.g., BNI00006
        customer_name = registration.name if len(registration.name) >= 3 else f"{registration.name} User"

        # Normalize phone: strip spaces, remove +91/0091 country code, remove leading 0, take last 10 digits
        raw_phone = str(registration.mobile_number).strip().replace(" ", "").replace("-", "")
        if raw_phone.startswith("+91"):
            raw_phone = raw_phone[3:]
        elif raw_phone.startswith("0091"):
            raw_phone = raw_phone[4:]
        if raw_phone.startswith("0") and len(raw_phone) == 11:
            raw_phone = raw_phone[1:]
        customer_phone = raw_phone[-10:]  # always take last 10 digits

        customer_details = CustomerDetails(
            customer_id=customer_id,
            customer_name=customer_name,
            customer_email=registration.email,
            customer_phone=customer_phone
        )

        # Create order request with dynamic amount
        order_request = CreateOrderRequest(
            order_id=order_id,
            order_amount=float(amount),
            order_currency="INR",
            customer_details=customer_details
        )

        # Set return and notify URLs
        order_request.order_meta = {
            "return_url": f"{settings.FRONTEND_URL}/payment/success?order_id={order_id}",
            "notify_url": f"{request.scheme}://{request.get_host()}/api/payment/webhook/"
        }

        # Create order with Cashfree (with retry logic)
        try:
            cashfree_client = Cashfree(Cashfree.XEnvironment)
            result = _create_cashfree_order(cashfree_client, order_request, registration)

            # Update registration with order details and dynamic amount
            registration.order_id = order_id
            registration.amount = float(amount)
            registration.save()
            logger.info(f"Updated registration {registration.id} with order_id: {order_id}")

            # Construct Cashfree payment URL
            cashfree_domain = 'api.cashfree.com' if settings.CASHFREE_ENV == 'PROD' else 'sandbox.cashfree.com'
            payment_url = f"https://{cashfree_domain}/pg/view/gateway/{result['payment_session_id']}"

            logger.info(f"Payment order created successfully for registration {registration.id}")

            return Response({
                'success': True,
                'order_id': order_id,
                'payment_session_id': result['payment_session_id'],
                'payment_url': payment_url,
                'order_status': result['order_status']
            }, status=status.HTTP_200_OK)

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Cashfree API error for registration {registration.id}: {error_msg}")
            return Response({
                'error': f'Payment gateway error. Please try again in a moment.',
                'details': error_msg if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Unexpected error in create_payment_order: {error_msg}", exc_info=True)
        return Response({
            'error': 'An unexpected error occurred. Please try again.',
            'details': error_msg if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_payment(request):
    """
    Verify payment status after user completes payment
    Expected: order_id in request body
    """
    try:
        order_id = request.data.get('order_id')

        if not order_id:
            return Response({
                'error': 'order_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get registration by order_id
        try:
            registration = Registration.objects.get(order_id=order_id)
        except Registration.DoesNotExist:
            return Response({
                'error': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Verify payment with Cashfree
        try:
            cashfree_client = Cashfree(Cashfree.XEnvironment)
            response = cashfree_client.PGOrderFetchPayments("2023-08-01", order_id)

            if response.data and len(response.data) > 0:
                payment = response.data[0]

                # Update registration based on payment status
                if payment.payment_status == 'SUCCESS':
                    registration.payment_status = 'SUCCESS'
                    registration.payment_id = payment.cf_payment_id
                    registration.payment_date = timezone.now()
                    registration.gateway_verified = True  # Payment verified by gateway
                    registration.payment_info = json.dumps({
                        'payment_method': payment.payment_group,
                        'payment_time': str(payment.payment_time),
                        'payment_amount': str(payment.payment_amount)
                    })

                    # Save registration first
                    registration.save()

                    # BULK BOOKING: Propagate payment to additional members
                    if registration.booking_group_id and registration.is_primary_booker:
                        logger.info(f"Processing bulk booking payment for {registration.booking_group_id}")
                        propagate_bulk_payment(registration)

                    # Generate ID card and send email with E-Pass
                    try:
                        # Generate ID card
                        id_card_path = generate_id_card(registration)

                        # Send email with E-Pass attachment
                        email_sent = send_epass_email(registration, id_card_path)

                        response_data = {
                            'success': True,
                            'payment_status': registration.payment_status,
                            'ticket_no': registration.ticket_no,
                            'registration_id': registration.id,
                            'email_sent': email_sent
                        }
                    except Exception as e:
                        # Even if email fails, payment was successful
                        response_data = {
                            'success': True,
                            'payment_status': registration.payment_status,
                            'ticket_no': registration.ticket_no,
                            'registration_id': registration.id,
                            'email_sent': False,
                            'email_error': str(e)
                        }

                    return Response(response_data, status=status.HTTP_200_OK)

                elif payment.payment_status in ['FAILED', 'CANCELLED', 'USER_DROPPED']:
                    registration.payment_status = 'FAILED'
                    registration.payment_info = json.dumps({
                        'status': payment.payment_status,
                        'message': getattr(payment, 'payment_message', 'Payment failed')
                    })
                    registration.save()

                    return Response({
                        'success': True,
                        'payment_status': registration.payment_status,
                        'ticket_no': registration.ticket_no,
                        'registration_id': registration.id
                    }, status=status.HTTP_200_OK)
                else:
                    registration.save()

                    return Response({
                        'success': True,
                        'payment_status': registration.payment_status,
                        'ticket_no': registration.ticket_no,
                        'registration_id': registration.id
                    }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'No payment found for this order'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return Response({
                'error': f'Cashfree API error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def payment_webhook(request):
    """
    Webhook handler for Cashfree payment callbacks
    Cashfree sends payment updates here
    """
    try:
        # Get webhook data
        webhook_data = request.data

        order_id = webhook_data.get('data', {}).get('order', {}).get('order_id')

        if not order_id:
            return Response({'status': 'error', 'message': 'Invalid webhook data'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Get registration
        try:
            registration = Registration.objects.get(order_id=order_id)
        except Registration.DoesNotExist:
            return Response({'status': 'error', 'message': 'Order not found'},
                          status=status.HTTP_404_NOT_FOUND)

        # Update payment status
        payment_data = webhook_data.get('data', {}).get('payment', {})
        payment_status = payment_data.get('payment_status')

        if payment_status == 'SUCCESS':
            registration.payment_status = 'SUCCESS'
            registration.payment_id = payment_data.get('cf_payment_id')
            registration.payment_date = timezone.now()
            registration.gateway_verified = True  # Payment verified by gateway
            registration.payment_info = json.dumps(payment_data)
            registration.save()

            # BULK BOOKING: Propagate payment to additional members
            if registration.booking_group_id and registration.is_primary_booker:
                logger.info(f"Webhook: Processing bulk booking payment for {registration.booking_group_id}")
                propagate_bulk_payment(registration)

            # Generate ID card and send email with E-Pass (in webhook)
            try:
                id_card_path = generate_id_card(registration)
                send_epass_email(registration, id_card_path)
            except Exception as e:
                # Log error but don't fail webhook
                logger.error(f"Webhook: Failed to send E-Pass: {str(e)}")
                pass

        elif payment_status in ['FAILED', 'CANCELLED', 'USER_DROPPED']:
            registration.payment_status = 'FAILED'
            registration.payment_info = json.dumps(payment_data)
            registration.save()

        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'status': 'error', 'message': str(e)},
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)
