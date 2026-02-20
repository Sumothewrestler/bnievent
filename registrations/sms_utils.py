"""
SMS utility for sending OTP via SMS
Supports multiple SMS providers - configure in settings
"""
import logging

logger = logging.getLogger(__name__)


def send_sms(mobile_number, message):
    """
    Send SMS to the given mobile number

    Args:
        mobile_number (str): Mobile number to send SMS to
        message (str): Message content

    Returns:
        tuple: (success: bool, message: str)
    """
    try:
        # For development/testing: Log OTP instead of sending
        # In production, integrate with SMS gateway (Twilio, AWS SNS, MSG91, etc.)

        logger.info(f"SMS to {mobile_number}: {message}")
        print(f"\n{'='*60}")
        print(f"SMS SIMULATION - DEVELOPMENT MODE")
        print(f"To: {mobile_number}")
        print(f"Message: {message}")
        print(f"{'='*60}\n")

        # Return success for development
        return True, "OTP sent successfully (Development Mode)"

        # PRODUCTION CODE - Uncomment and configure one of the following:

        # Option 1: Twilio
        # from twilio.rest import Client
        # account_sid = settings.TWILIO_ACCOUNT_SID
        # auth_token = settings.TWILIO_AUTH_TOKEN
        # client = Client(account_sid, auth_token)
        # message = client.messages.create(
        #     body=message,
        #     from_=settings.TWILIO_PHONE_NUMBER,
        #     to=mobile_number
        # )
        # return True, "SMS sent successfully"

        # Option 2: AWS SNS
        # import boto3
        # sns = boto3.client('sns', region_name='your-region')
        # response = sns.publish(
        #     PhoneNumber=mobile_number,
        #     Message=message
        # )
        # return True, "SMS sent successfully"

        # Option 3: MSG91 (Popular in India)
        # import requests
        # url = "https://api.msg91.com/api/v5/otp"
        # payload = {
        #     "template_id": "your_template_id",
        #     "mobile": mobile_number,
        #     "authkey": "your_auth_key",
        #     "otp": message
        # }
        # response = requests.post(url, json=payload)
        # if response.status_code == 200:
        #     return True, "SMS sent successfully"
        # else:
        #     return False, f"SMS failed: {response.text}"

    except Exception as e:
        logger.error(f"SMS sending failed: {str(e)}")
        return False, f"Failed to send SMS: {str(e)}"


def send_otp_sms(mobile_number, otp_code, member_name):
    """
    Send OTP SMS to member

    Args:
        mobile_number (str): Mobile number
        otp_code (str): 6-digit OTP
        member_name (str): Name of the member

    Returns:
        tuple: (success: bool, message: str)
    """
    message = (
        f"Dear {member_name},\n"
        f"Your OTP for BNI Event registration is: {otp_code}\n"
        f"Valid for 5 minutes.\n"
        f"- BNI Chettinad"
    )

    return send_sms(mobile_number, message)
