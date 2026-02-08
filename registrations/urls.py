from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistrationViewSet, EventSettingsViewSet
from .payment_views import create_payment_order, verify_payment, payment_webhook

router = DefaultRouter()
router.register(r'registrations', RegistrationViewSet)
router.register(r'settings', EventSettingsViewSet, basename='settings')

urlpatterns = [
    path('', include(router.urls)),
    # Payment endpoints
    path('payment/create-order/', create_payment_order, name='create_payment_order'),
    path('payment/verify/', verify_payment, name='verify_payment'),
    path('payment/webhook/', payment_webhook, name='payment_webhook'),
]
