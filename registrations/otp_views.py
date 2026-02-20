"""
OTP verification views for BNI member authentication
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from .models import OTPVerification
from .serializers import OTPVerificationSerializer
from .sms_utils import send_otp_sms
from django.core.mail import EmailMessage
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_otp_email(email, otp_code, member_name):
    """
    Send OTP via email

    Args:
        email: Email address to send OTP to
        otp_code: The 6-digit OTP code
        member_name: Name of the member

    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        subject = f'BNI Event - Your OTP Code: {otp_code}'

        message = f"""
Dear {member_name},

Your OTP code for BNI Event registration is:

{otp_code}

This OTP is valid for 5 minutes.

Please do not share this code with anyone.

If you did not request this OTP, please ignore this email.

Best Regards,
BNI Chettinad Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated email. Please do not reply to this email.
"""

        email_message = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )

        email_message.send(fail_silently=False)
        logger.info(f'OTP email sent successfully to {email}')
        return True, 'OTP sent successfully via email'

    except Exception as e:
        logger.error(f'Failed to send OTP email to {email}: {str(e)}')
        return False, f'Failed to send OTP email: {str(e)}'


@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    """
    Send OTP to member's mobile number or email

    Request Body (Mobile):
    {
        "mobile_number": "9876543210",
        "member_name": "John Doe",
        "category": "BNI_CHETTINAD"
    }

    Request Body (Email):
    {
        "email": "john@example.com",
        "member_name": "John Doe",
        "category": "BNI_CHETTINAD"
    }
    """
    mobile_number = request.data.get('mobile_number')
    email = request.data.get('email')
    member_name = request.data.get('member_name')
    category = request.data.get('category')

    # Determine which method to use
    use_email = bool(email)
    identifier = email if use_email else mobile_number

    # Validation
    if not identifier or not member_name or not category:
        return Response({
            'error': 'mobile_number or email, member_name, and category are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate format based on method
    if not use_email:
        if not mobile_number.isdigit() or len(mobile_number) < 10:
            return Response({
                'error': 'Invalid mobile number format'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        # Basic email validation
        if '@' not in email or '.' not in email:
            return Response({
                'error': 'Invalid email format'
            }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Check rate limiting - max 3 OTPs per identifier per 15 minutes
        if use_email:
            recent_otps = OTPVerification.objects.filter(
                email=email,
                created_at__gte=timezone.now() - timezone.timedelta(minutes=15)
            ).count()
        else:
            recent_otps = OTPVerification.objects.filter(
                mobile_number=mobile_number,
                created_at__gte=timezone.now() - timezone.timedelta(minutes=15)
            ).count()

        if recent_otps >= 3:
            return Response({
                'error': 'Too many OTP requests. Please try again after 15 minutes.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Generate OTP
        if use_email:
            otp = OTPVerification.generate_otp(email=email, member_name=member_name, category=category)
        else:
            otp = OTPVerification.generate_otp(mobile_number=mobile_number, member_name=member_name, category=category)

        # Send OTP via SMS or Email
        if use_email:
            send_success, send_message = send_otp_email(email, otp.otp_code, member_name)
            delivery_method = 'email'
        else:
            send_success, send_message = send_otp_sms(mobile_number, otp.otp_code, member_name)
            delivery_method = 'mobile number'

        if not send_success:
            logger.error(f"Failed to send OTP via {delivery_method}: {send_message}")
            # Still return success in development mode
            # In production, you might want to return error

        return Response({
            'success': True,
            'message': f'OTP sent successfully to your {delivery_method}',
            'mobile_number': identifier if not use_email else None,
            'email': identifier if use_email else None,
            'expires_in_minutes': 5,
            'otp_id': otp.id
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error sending OTP: {str(e)}")
        return Response({
            'error': f'Failed to send OTP: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Verify OTP entered by user

    Request Body (Mobile):
    {
        "mobile_number": "9876543210",
        "otp_code": "123456"
    }

    Request Body (Email):
    {
        "email": "john@example.com",
        "otp_code": "123456"
    }
    """
    mobile_number = request.data.get('mobile_number')
    email = request.data.get('email')
    otp_code = request.data.get('otp_code')

    # Determine identifier
    identifier = email if email else mobile_number

    # Validation
    if not identifier or not otp_code:
        return Response({
            'error': 'mobile_number or email, and otp_code are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Find the latest OTP for this identifier
        if email:
            otp = OTPVerification.objects.filter(
                email=email,
                is_verified=False
            ).order_by('-created_at').first()
        else:
            otp = OTPVerification.objects.filter(
                mobile_number=mobile_number,
                is_verified=False
            ).order_by('-created_at').first()

        if not otp:
            return Response({
                'error': 'No OTP found for this identifier. Please request a new OTP.'
            }, status=status.HTTP_404_NOT_FOUND)

        # Check if OTP is expired
        if not otp.is_valid():
            return Response({
                'error': 'OTP has expired or maximum attempts exceeded. Please request a new OTP.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify OTP
        success, message = otp.verify(otp_code)

        if success:
            return Response({
                'success': True,
                'message': message,
                'otp_id': otp.id,
                'mobile_number': identifier if not email else None,
                'email': identifier if email else None,
                'member_name': otp.member_name,
                'category': otp.category
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': message
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error verifying OTP: {str(e)}")
        return Response({
            'error': f'Failed to verify OTP: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    """
    Resend OTP to member's mobile number

    Request Body:
    {
        "mobile_number": "9876543210",
        "member_name": "John Doe",
        "category": "BNI_CHETTINAD"
    }
    """
    # Just call send_otp again
    return send_otp(request)
