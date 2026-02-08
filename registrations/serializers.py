from rest_framework import serializers
from .models import Registration, EventSettings, ScanLog

class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = [
            'id', 'ticket_no', 'name', 'mobile_number', 'email',
            'age', 'location', 'company_name', 'registration_for',
            'payment_status', 'payment_id', 'order_id', 'amount',
            'payment_date', 'payment_info', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'ticket_no', 'payment_status', 'payment_id', 'order_id',
            'payment_date', 'created_at', 'updated_at'
        ]

class EventSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = EventSettings
        fields = ['id', 'logo', 'logo_url', 'event_name', 'updated_at']
        read_only_fields = ['updated_at']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
        return None


class ScanLogSerializer(serializers.ModelSerializer):
    registration_name = serializers.CharField(source='registration.name', read_only=True)
    registration_mobile = serializers.CharField(source='registration.mobile_number', read_only=True)
    registration_email = serializers.CharField(source='registration.email', read_only=True)
    payment_status = serializers.CharField(source='registration.payment_status', read_only=True)

    class Meta:
        model = ScanLog
        fields = [
            'id', 'registration', 'ticket_no', 'action', 'scanned_at',
            'scanned_by', 'notes', 'registration_name', 'registration_mobile',
            'registration_email', 'payment_status'
        ]
        read_only_fields = ['scanned_at']
