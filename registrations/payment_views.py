from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.conf import settings
from django.utils import timezone
from .models import Registration
import uuid
import json
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.customer_details import CustomerDetails


# Initialize Cashfree
Cashfree.XClientId = settings.CASHFREE_APP_ID
Cashfree.XClientSecret = settings.CASHFREE_SECRET_KEY
Cashfree.XEnvironment = Cashfree.SANDBOX if settings.CASHFREE_ENV == 'TEST' else Cashfree.PRODUCTION


@api_view(['POST'])
@permission_classes([AllowAny])
def create_payment_order(request):
    """
    Create a payment order for a registration
    Expected: registration_id in request body
    """
    try:
        registration_id = request.data.get('registration_id')

        if not registration_id:
            return Response({
                'error': 'registration_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get the registration
        try:
            registration = Registration.objects.get(id=registration_id)
        except Registration.DoesNotExist:
            return Response({
                'error': 'Registration not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Check if already paid
        if registration.payment_status == 'SUCCESS':
            return Response({
                'error': 'Payment already completed for this registration'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate unique order ID
        order_id = f"BNI_ORDER_{registration.ticket_no}_{uuid.uuid4().hex[:8]}"

        # Create customer details (Cashfree requires min 3 chars for ID and name)
        customer_id = f"BNI{str(registration.id).zfill(5)}"  # e.g., BNI00006
        customer_name = registration.name if len(registration.name) >= 3 else f"{registration.name} User"

        customer_details = CustomerDetails(
            customer_id=customer_id,
            customer_name=customer_name,
            customer_email=registration.email,
            customer_phone=registration.mobile_number
        )

        # Create order request
        # Note: return_url and notify_url are set separately, not in order_meta
        order_request = CreateOrderRequest(
            order_id=order_id,
            order_amount=float(settings.CASHFREE_PAYMENT_AMOUNT),
            order_currency="INR",
            customer_details=customer_details
        )

        # Set return and notify URLs
        order_request.order_meta = {
            "return_url": f"{settings.FRONTEND_URL}/payment/success?order_id={order_id}",
            "notify_url": f"{request.scheme}://{request.get_host()}/api/payment/webhook/"
        }

        # Create order with Cashfree
        try:
            cashfree_client = Cashfree(Cashfree.XEnvironment)
            response = cashfree_client.PGCreateOrder("2023-08-01", order_request)

            # Update registration with order details
            registration.order_id = order_id
            registration.amount = settings.CASHFREE_PAYMENT_AMOUNT
            registration.save()

            # Extract payment details from response
            # Convert to dict to access all fields properly
            if hasattr(response.data, 'to_dict'):
                response_dict = response.data.to_dict()
            elif hasattr(response.data, '__dict__'):
                response_dict = response.data.__dict__
            else:
                response_dict = {}

            payment_session_id = response_dict.get('payment_session_id', '')
            order_status = response_dict.get('order_status', 'ACTIVE')

            # Construct Cashfree payment URL using correct format
            # Cashfree Payment Gateway URL format: https://api.cashfree.com/pg/view/gateway/{session_id}
            # In production: api.cashfree.com, in sandbox: sandbox.cashfree.com
            cashfree_domain = 'api.cashfree.com' if settings.CASHFREE_ENV == 'PROD' else 'sandbox.cashfree.com'
            payment_url = f"https://{cashfree_domain}/pg/view/gateway/{payment_session_id}" if payment_session_id else None

            return Response({
                'success': True,
                'order_id': order_id,
                'payment_session_id': payment_session_id,
                'payment_url': payment_url,
                'order_status': order_status
            }, status=status.HTTP_200_OK)

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
                    registration.payment_info = json.dumps({
                        'payment_method': payment.payment_group,
                        'payment_time': str(payment.payment_time),
                        'payment_amount': str(payment.payment_amount)
                    })
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
                    'ticket_no': registration.ticket_no
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
            registration.payment_info = json.dumps(payment_data)
        elif payment_status in ['FAILED', 'CANCELLED', 'USER_DROPPED']:
            registration.payment_status = 'FAILED'
            registration.payment_info = json.dumps(payment_data)

        registration.save()

        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'status': 'error', 'message': str(e)},
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)
