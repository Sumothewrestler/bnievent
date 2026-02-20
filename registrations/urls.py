from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegistrationViewSet, EventSettingsViewSet, ScanLogViewSet, SponsorViewSet,
    SponsorTicketLimitViewSet, BNIMemberViewSet, IDCardTemplateViewSet, bulk_registration,
    sync_members_to_database, get_bulk_registrations, get_bulk_group_details,
    scan_ticket, scan_qr_dual_behavior, submit_feedback, check_feedback_status, get_all_feedback,
    vip_registration,
    special_registration
)
from .payment_views import create_payment_order, verify_payment, payment_webhook
from .otp_views import send_otp, verify_otp, resend_otp

router = DefaultRouter()
router.register(r'registrations', RegistrationViewSet)
router.register(r'scan-logs', ScanLogViewSet, basename='scan-logs')
router.register(r'settings', EventSettingsViewSet, basename='settings')
router.register(r'sponsors', SponsorViewSet, basename='sponsors')
router.register(r'sponsor-ticket-limits', SponsorTicketLimitViewSet, basename='sponsor-ticket-limits')
router.register(r'bni-members', BNIMemberViewSet, basename='bni-members')
router.register(r'idcard-templates', IDCardTemplateViewSet, basename='idcard-templates')

urlpatterns = [
    path('', include(router.urls)),
    # Bulk registration endpoint
    path('bulk-registration/', bulk_registration, name='bulk_registration'),
    # Bulk registration management endpoints
    path('bulk-registrations/', get_bulk_registrations, name='get_bulk_registrations'),
    path('bulk-registrations/<str:booking_group_id>/', get_bulk_group_details, name='get_bulk_group_details'),
    # Member sync endpoint
    path('sync-members/', sync_members_to_database, name='sync_members'),
    # Scan ticket endpoint (public access)
    path('scan/<str:ticket_no>/', scan_ticket, name='scan_ticket'),
    # Dual-behavior QR scan endpoint
    path('scan-qr/<str:ticket_no>/', scan_qr_dual_behavior, name='scan_qr_dual_behavior'),
    # Feedback endpoints
    path('feedback/submit/', submit_feedback, name='submit_feedback'),
    path('feedback/check/<str:ticket_no>/', check_feedback_status, name='check_feedback_status'),
    path('feedback/all/', get_all_feedback, name='get_all_feedback'),
    # Payment endpoints
    path('payment/create-order/', create_payment_order, name='create_payment_order'),
    path('payment/verify/', verify_payment, name='verify_payment'),
    path('payment/webhook/', payment_webhook, name='payment_webhook'),
    # OTP endpoints
    path('otp/send/', send_otp, name='send_otp'),
    path('otp/verify/', verify_otp, name='verify_otp'),
    path('otp/resend/', resend_otp, name='resend_otp'),
    # VIP registration endpoint
    path('vip-registration/', vip_registration, name='vip_registration'),
    # Special registration endpoint (Volunteers & Organisers)
    path('special-registration/', special_registration, name='special_registration'),
]
