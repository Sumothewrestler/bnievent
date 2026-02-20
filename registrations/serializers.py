from rest_framework import serializers
from .models import Registration, EventSettings, ScanLog, OTPVerification, Sponsor, SponsorTicketLimit, BNIMember, IDCardTemplate, EventFeedback

class RegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Registration
        fields = [
            'id', 'ticket_no', 'name', 'mobile_number', 'email',
            'age', 'location', 'company_name', 'referred_by', 'registration_for', 'sponsor_type', 'student_id_card',
            'payment_status', 'payment_id', 'order_id', 'amount',
            'payment_date', 'payment_info',
            'booking_group_id', 'is_primary_booker', 'primary_booker_name',
            'primary_booker_email', 'primary_booker_mobile',
            'message_copied', 'message_copied_at',
            'created_at', 'updated_at', 'gateway_verified'
        ]
        read_only_fields = [
            'ticket_no', 'payment_id', 'order_id',
            'payment_date', 'message_copied_at', 'created_at', 'updated_at'
        ]

    def validate(self, data):
        """Validate student ID card and seat availability only - mobile/email are for ticket sharing only"""
        # Get the registration_for value (from update data or existing instance)
        registration_for = data.get('registration_for')
        if registration_for is None and self.instance:
            registration_for = self.instance.registration_for

        # Get the student_id_card value (from update data or existing instance)
        student_id_card = data.get('student_id_card')
        if student_id_card is None and self.instance:
            student_id_card = self.instance.student_id_card

        # If registering as STUDENTS, student ID card is required
        if registration_for == 'STUDENTS' and not student_id_card:
            raise serializers.ValidationError({
                'student_id_card': 'Student ID card is required for Students category registration.'
            })

        # Check seat availability (only if registration_for is in the update data)
        # Skip seat availability check for VIP, ORGANISERS, VOLUNTEERS (no seat limits)
        vip_categories = ['VIP', 'ORGANISERS', 'VOLUNTEERS']
        if 'registration_for' in data and data['registration_for'] not in vip_categories:
            available, remaining, message = Registration.check_seat_availability(data['registration_for'])

            if not available:
                raise serializers.ValidationError({
                    'registration_for': message
                })

        return data

class EventSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = EventSettings
        fields = [
            'id', 'logo', 'logo_url', 'event_name',
            'total_seats', 'students_seats', 'public_seats', 'bni_seats',
            'registration_enabled', 'updated_at'
        ]
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


class OTPVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPVerification
        fields = ['id', 'mobile_number', 'member_name', 'category', 'created_at', 'expires_at', 'is_verified']
        read_only_fields = ['id', 'created_at', 'expires_at', 'is_verified']


class SponsorSerializer(serializers.ModelSerializer):
    direct_image_url = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Sponsor
        fields = [
            'id', 'category', 'category_display', 'logo_url', 'direct_image_url',
            'company_name', 'display_order', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_direct_image_url(self, obj):
        """Get the direct image URL for frontend display"""
        return obj.get_direct_image_url()


class SponsorTicketLimitSerializer(serializers.ModelSerializer):
    """Serializer for sponsor ticket limits"""
    sponsor_type_display = serializers.CharField(source='get_sponsor_type_display', read_only=True)

    class Meta:
        model = SponsorTicketLimit
        fields = [
            'id', 'sponsor_type', 'sponsor_type_display', 'ticket_limit',
            'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class BNIMemberSerializer(serializers.ModelSerializer):
    """Serializer for BNI members with sponsor types and ticket limits"""
    sponsor_type_display = serializers.CharField(source='get_sponsor_type_display', read_only=True)
    registration_count = serializers.SerializerMethodField()
    remaining_tickets = serializers.SerializerMethodField()
    primary_count = serializers.SerializerMethodField()
    additional_count = serializers.SerializerMethodField()

    class Meta:
        model = BNIMember
        fields = [
            'id', 'name', 'company', 'chapter', 'sponsor_type',
            'sponsor_type_display', 'ticket_limit', 'is_active',
            'registration_count', 'primary_count', 'additional_count',
            'remaining_tickets', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_registration_count(self, obj):
        """Get total count of registrations for this member (primary + additional)"""
        return Registration.objects.filter(
            name=obj.name,
            registration_for=obj.chapter,
            payment_status__in=['SUCCESS', 'PENDING']
        ).count()

    def get_primary_count(self, obj):
        """Get count of primary (self) registrations for this member"""
        return Registration.objects.filter(
            name=obj.name,
            registration_for=obj.chapter,
            payment_status__in=['SUCCESS', 'PENDING'],
            is_primary_booker=True
        ).count()

    def get_additional_count(self, obj):
        """Get count of additional (guest) registrations booked by this member"""
        return Registration.objects.filter(
            primary_booker_name=obj.name,
            registration_for=obj.chapter,
            payment_status__in=['SUCCESS', 'PENDING'],
            is_primary_booker=False
        ).count()

    def get_remaining_tickets(self, obj):
        """Calculate remaining tickets for this member"""
        registered = self.get_registration_count(obj)
        return max(0, obj.ticket_limit - registered)


class IDCardTemplateSerializer(serializers.ModelSerializer):
    """Serializer for ID card templates with Google Drive URLs"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    direct_image_url = serializers.SerializerMethodField()

    class Meta:
        model = IDCardTemplate
        fields = [
            'id', 'category', 'category_display', 'template_url',
            'direct_image_url', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_direct_image_url(self, obj):
        """Get the direct image URL for templates"""
        return obj.get_direct_image_url()


class EventFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for event feedback and ratings"""
    ticket_no = serializers.CharField(source='registration.ticket_no', read_only=True)
    attendee_name = serializers.CharField(source='registration.name', read_only=True)
    registration_category = serializers.CharField(source='registration.registration_for', read_only=True)
    average_rating = serializers.SerializerMethodField()
    nps_category = serializers.SerializerMethodField()

    class Meta:
        model = EventFeedback
        fields = [
            'id', 'registration', 'ticket_no', 'attendee_name', 'registration_category',
            'overall_rating', 'venue_rating', 'food_rating', 'speaker_rating',
            'networking_rating', 'organization_rating', 'recommendation_score',
            'liked_most', 'improvements', 'additional_comments', 'attend_future',
            'submitted_at', 'ip_address', 'user_agent',
            'average_rating', 'nps_category'
        ]
        read_only_fields = ['id', 'submitted_at', 'ticket_no', 'attendee_name', 'registration_category']

    def get_average_rating(self, obj):
        """Get calculated average rating"""
        return obj.get_average_rating()

    def get_nps_category(self, obj):
        """Get NPS category (Promoter/Passive/Detractor)"""
        return obj.get_nps_category()

    def validate_registration(self, value):
        """Ensure feedback hasn't already been submitted for this registration"""
        if self.instance is None:  # Only check on creation
            if EventFeedback.objects.filter(registration=value).exists():
                raise serializers.ValidationError(
                    "Feedback has already been submitted for this ticket."
                )
        return value


class EventFeedbackSubmitSerializer(serializers.ModelSerializer):
    """Simplified serializer for submitting feedback (uses ticket_no instead of registration ID)"""
    ticket_no = serializers.CharField(write_only=True)

    class Meta:
        model = EventFeedback
        fields = [
            'ticket_no', 'overall_rating', 'venue_rating', 'food_rating',
            'speaker_rating', 'networking_rating', 'organization_rating',
            'recommendation_score', 'liked_most', 'improvements',
            'additional_comments', 'attend_future'
        ]

    def validate_ticket_no(self, value):
        """Validate ticket exists and hasn't already submitted feedback"""
        try:
            registration = Registration.objects.get(ticket_no=value)
        except Registration.DoesNotExist:
            raise serializers.ValidationError("Invalid ticket number.")

        if EventFeedback.objects.filter(registration=registration).exists():
            raise serializers.ValidationError("Feedback has already been submitted for this ticket.")

        return value

    def create(self, validated_data):
        """Create feedback with registration lookup"""
        ticket_no = validated_data.pop('ticket_no')
        registration = Registration.objects.get(ticket_no=ticket_no)

        # Add IP address and user agent from request context
        request = self.context.get('request')
        if request:
            validated_data['ip_address'] = self.get_client_ip(request)
            validated_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')

        feedback = EventFeedback.objects.create(
            registration=registration,
            **validated_data
        )
        return feedback

    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
