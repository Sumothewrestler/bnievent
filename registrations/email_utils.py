"""
Email utility functions for sending registration emails with E-Pass attachments
"""
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)


def send_epass_email(registration, id_card_path):
    """
    Send email with E-Pass attachment to the registered user

    Args:
        registration: Registration object
        id_card_path: Full path to the generated ID card image

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = f'BNI Chettinad Event - Your E-Pass is Ready! (Ticket: {registration.ticket_no})'

        # Email body in plain text
        message = f"""
Dear {registration.name},

Congratulations! Your registration for the BNI Chettinad Event has been confirmed.

Registration Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ticket Number: {registration.ticket_no}
Name: {registration.name}
Mobile: {registration.mobile_number}
Email: {registration.email}
Payment Status: {registration.payment_status}
Amount Paid: ₹{registration.amount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your E-Pass (ID Card) is attached to this email. Please:
✓ Download and save the E-Pass on your phone
✓ Present this E-Pass at the event entry
✓ Keep your Ticket Number handy for reference

Event Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
We look forward to seeing you at the event!

For any queries, please contact:
Email: support@bnievent.com
Phone: [Your Contact Number]

Thank you for registering!

Best Regards,
BNI Chettinad Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated email. Please do not reply to this email.
"""

        # Create email message
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[registration.email],
        )

        # Attach the ID card image
        with open(id_card_path, 'rb') as f:
            email.attach(
                f'BNI_Event_EPass_{registration.ticket_no}.png',
                f.read(),
                'image/png'
            )

        # Send email
        email.send(fail_silently=False)

        logger.info(f'E-Pass email sent successfully to {registration.email} for ticket {registration.ticket_no}')
        return True

    except FileNotFoundError:
        logger.error(f'ID card file not found: {id_card_path}')
        return False
    except Exception as e:
        logger.error(f'Failed to send E-Pass email to {registration.email}: {str(e)}')
        return False


def send_payment_confirmation_email(registration):
    """
    Send payment confirmation email without attachment

    Args:
        registration: Registration object

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = f'Payment Confirmed - BNI Chettinad Event (Ticket: {registration.ticket_no})'

        message = f"""
Dear {registration.name},

Your payment for the BNI Chettinad Event has been successfully received!

Payment Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ticket Number: {registration.ticket_no}
Amount: ₹{registration.amount}
Payment Status: {registration.payment_status}
Transaction ID: {registration.payment_id or 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your E-Pass will be sent to you shortly in a separate email.

Thank you for registering!

Best Regards,
BNI Chettinad Team
"""

        # Create and send email
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[registration.email],
        )

        email.send(fail_silently=False)

        logger.info(f'Payment confirmation email sent to {registration.email} for ticket {registration.ticket_no}')
        return True

    except Exception as e:
        logger.error(f'Failed to send payment confirmation email to {registration.email}: {str(e)}')
        return False
