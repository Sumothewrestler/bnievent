from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid
import random

class EventSettings(models.Model):
    """Singleton model for event settings like logo"""
    logo = models.ImageField(upload_to='event_logos/', blank=True, null=True)
    event_name = models.CharField(max_length=200, default='BNI Event')

    # Seat limit configuration
    total_seats = models.IntegerField(default=541)
    students_seats = models.IntegerField(default=50)
    public_seats = models.IntegerField(default=350)
    bni_seats = models.IntegerField(default=141)

    # Enable/disable registration
    registration_enabled = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Event Settings'
        verbose_name_plural = 'Event Settings'

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton)
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.event_name


class IDCardTemplate(models.Model):
    """Store Google Drive URLs for different ID card templates by category"""
    TEMPLATE_CATEGORY_CHOICES = [
        ('STUDENTS', 'Students'),
        ('BNI_MEMBERS_PRIMARY', 'BNI Members (Primary)'),
        ('BNI_MEMBERS_GUEST', 'BNI Guests'),
        ('BNI_MEMBERS', 'BNI Members (Legacy)'),
        ('VIP', 'VIP'),
        ('PUBLIC', 'Public'),
        ('ORGANISERS', 'Organisers'),
        ('VOLUNTEERS', 'Volunteers'),
    ]

    category = models.CharField(
        max_length=20,
        choices=TEMPLATE_CATEGORY_CHOICES,
        unique=True,
        db_index=True,
        help_text="Category type for this ID card template"
    )
    template_url = models.TextField(
        blank=True,
        null=True,
        help_text="Google Drive share link URL for the ID card template PNG"
    )
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ID Card Template'
        verbose_name_plural = 'ID Card Templates'
        ordering = ['category']

    def __str__(self):
        return f"ID Card Template - {self.get_category_display()}"

    def get_direct_image_url(self):
        """Convert Google Drive share URL to direct image URL"""
        if not self.template_url:
            return None

        if 'drive.google.com' in self.template_url:
            # Extract file ID from various Google Drive URL formats
            if '/file/d/' in self.template_url:
                file_id = self.template_url.split('/file/d/')[1].split('/')[0]
            elif 'id=' in self.template_url:
                file_id = self.template_url.split('id=')[1].split('&')[0]
            else:
                return self.template_url
            # Return direct download URL
            return f"https://drive.google.com/uc?export=download&id={file_id}"
        return self.template_url

    @classmethod
    def get_template_for_registration(cls, registration):
        """
        Get template URL for a registration
        Maps registration categories to template categories
        Distinguishes between primary BNI members and guests
        """
        registration_for = registration.registration_for
        is_primary = registration.is_primary_booker

        # Map registration categories to template categories
        # For BNI members, check if primary or guest
        if registration_for in ['BNI_CHETTINAD', 'BNI_THALAIVAS', 'BNI_MADURAI']:
            if is_primary:
                template_category = 'BNI_MEMBERS_PRIMARY'
            else:
                template_category = 'BNI_MEMBERS_GUEST'
        elif registration_for == 'STUDENTS':
            template_category = 'STUDENTS'
        elif registration_for == 'PUBLIC':
            template_category = 'PUBLIC'
        elif registration_for == 'VIP':
            template_category = 'VIP'
        elif registration_for == 'ORGANISERS':
            template_category = 'ORGANISERS'
        elif registration_for == 'VOLUNTEERS':
            template_category = 'VOLUNTEERS'
        else:
            template_category = 'PUBLIC'

        # Try to get specific template, fallback to BNI_MEMBERS legacy if not found
        try:
            template = cls.objects.get(category=template_category, is_active=True)
            return template.get_direct_image_url()
        except cls.DoesNotExist:
            # Fallback for BNI members if specific template not found
            if template_category in ['BNI_MEMBERS_PRIMARY', 'BNI_MEMBERS_GUEST']:
                try:
                    template = cls.objects.get(category='BNI_MEMBERS', is_active=True)
                    return template.get_direct_image_url()
                except cls.DoesNotExist:
                    pass
            return None

class Registration(models.Model):
    REGISTRATION_CHOICES = [
        ('BNI_THALAIVAS', 'BNI Members - Thalaivas'),
        ('BNI_CHETTINAD', 'BNI Members - Chettinad'),
        ('BNI_MADURAI', 'BNI Members - Madurai'),
        ('PUBLIC', 'Public'),
        ('STUDENTS', 'Students'),
        ('VIP', 'VIP'),
        ('ORGANISERS', 'Organisers'),
        ('VOLUNTEERS', 'Volunteers'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    SPONSOR_TYPE_CHOICES = [
        ('TITLE_SPONSORS', 'Title Sponsors'),
        ('ASSOCIATE_SPONSORS', 'Associate Sponsors'),
        ('CO_SPONSORS', 'Co Sponsors'),
        ('BNI_MEMBERS', 'BNI Members'),
        ('PLATINUM', 'Platinum Sponsor'),
        ('GOLD', 'Gold Sponsor'),
        ('SILVER', 'Silver Sponsor'),
        ('BRONZE', 'Bronze Sponsor'),
        ('EXHIBITOR', 'Exhibitor'),
        ('OTHER', 'Other'),
    ]

    REFERRED_BY_CHOICES = [
        ('BNI_MEMBERS', 'BNI Members'),
        ('FLEX', 'Flex'),
        ('SOCIAL_MEDIA', 'Social Media'),
        ('FRIENDS', 'Friends'),
    ]

    ticket_no = models.CharField(max_length=20, unique=True, editable=False)
    name = models.CharField(max_length=200)
    mobile_number = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    age = models.IntegerField(blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, default='')
    company_name = models.CharField(max_length=200, blank=True, default='')
    referred_by = models.CharField(max_length=20, choices=REFERRED_BY_CHOICES, blank=True, null=True)
    registration_for = models.CharField(max_length=20, choices=REGISTRATION_CHOICES)
    sponsor_type = models.CharField(max_length=20, choices=SPONSOR_TYPE_CHOICES, blank=True, null=True)
    student_id_card = models.ImageField(upload_to='student_id_cards/', blank=True, null=True)

    # Payment fields
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    payment_id = models.CharField(max_length=100, blank=True, null=True)
    order_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    payment_date = models.DateTimeField(blank=True, null=True)
    payment_info = models.TextField(blank=True, null=True)
    gateway_verified = models.BooleanField(
        default=False,
        help_text="True if payment was confirmed by payment gateway (has payment_id)"
    )

    # Bulk booking fields
    booking_group_id = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    is_primary_booker = models.BooleanField(default=True)
    primary_booker_name = models.CharField(max_length=200, blank=True, null=True)
    primary_booker_email = models.EmailField(blank=True, null=True)
    primary_booker_mobile = models.CharField(max_length=15, blank=True, null=True)

    # WhatsApp message status
    message_copied = models.BooleanField(default=False, help_text="True if WhatsApp message was copied")
    message_copied_at = models.DateTimeField(blank=True, null=True, help_text="Timestamp when message was copied")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.ticket_no:
            # Generate sequential ticket number from BNI001 to BNI541 with gap filling
            self.ticket_no = self._generate_next_ticket_number()
        super().save(*args, **kwargs)

    @classmethod
    def _generate_next_ticket_number(cls):
        """
        Generate the next available ticket number from BNI001 to BNI541.
        Fills gaps when registrations are deleted.
        """
        # Get all existing ticket numbers
        existing_tickets = cls.objects.values_list('ticket_no', flat=True)

        # Extract numeric parts and convert to set for fast lookup
        used_numbers = set()
        for ticket in existing_tickets:
            if ticket and ticket.startswith('BNI'):
                try:
                    num = int(ticket[3:])  # Extract number after "BNI"
                    if 1 <= num <= 541:
                        used_numbers.add(num)
                except (ValueError, IndexError):
                    continue

        # Find the first available number (fills gaps)
        for num in range(1, 542):  # BNI001 to BNI541
            if num not in used_numbers:
                return f"BNI{num:03d}"  # Format as BNI001, BNI002, etc.

        # If all 541 tickets are used, raise an error
        raise ValueError("All ticket numbers (BNI001 to BNI541) have been allocated. No more registrations can be accepted.")

    def __str__(self):
        return f"{self.ticket_no} - {self.name}"

    class Meta:
        ordering = ['-created_at']

    @classmethod
    def get_category_group(cls, registration_for):
        """Map registration category to seat quota group"""
        BNI_CATEGORIES = ['BNI_THALAIVAS', 'BNI_CHETTINAD', 'BNI_MADURAI']

        if registration_for == 'STUDENTS':
            return 'STUDENTS'
        elif registration_for == 'PUBLIC':
            return 'PUBLIC'
        elif registration_for in BNI_CATEGORIES:
            return 'BNI'
        return None

    @classmethod
    def get_successful_registrations_count(cls, category_group):
        """Get count of successful registrations for a category group"""
        from django.db.models import Q

        if category_group == 'STUDENTS':
            filters = Q(registration_for='STUDENTS')
        elif category_group == 'PUBLIC':
            filters = Q(registration_for='PUBLIC')
        elif category_group == 'BNI':
            filters = Q(registration_for__in=['BNI_THALAIVAS', 'BNI_CHETTINAD', 'BNI_MADURAI'])
        else:
            return 0

        # Count both SUCCESS and PENDING (to reserve seats during payment)
        return cls.objects.filter(
            filters,
            payment_status__in=['SUCCESS', 'PENDING']
        ).count()

    @classmethod
    def check_seat_availability(cls, registration_for):
        """
        Check if seats are available for a registration category
        Returns: (available: bool, remaining: int, message: str)
        """
        settings = EventSettings.get_settings()
        category_group = cls.get_category_group(registration_for)

        if not category_group:
            return False, 0, "Invalid registration category"

        # Get current count
        current_count = cls.get_successful_registrations_count(category_group)

        # Get limit based on category
        if category_group == 'STUDENTS':
            limit = settings.students_seats
            category_name = "Students"
        elif category_group == 'PUBLIC':
            limit = settings.public_seats
            category_name = "Public"
        elif category_group == 'BNI':
            limit = settings.bni_seats
            category_name = "BNI Members"
        else:
            return False, 0, "Invalid category group"

        remaining = limit - current_count

        if remaining <= 0:
            return False, 0, f"Sorry! All seats for {category_name} are full. Please try another category or contact support."

        return True, remaining, f"{remaining} seats remaining"

    @classmethod
    def get_sponsor_ticket_limit(cls, sponsor_type):
        """
        Get ticket limit for a sponsor type from database
        Returns: int (total tickets including primary member)
        """
        # Import here to avoid circular import
        from .models import SponsorTicketLimit
        return SponsorTicketLimit.get_limit(sponsor_type)

    @classmethod
    def check_sponsor_ticket_limit(cls, primary_mobile, sponsor_type, additional_count=0):
        """
        Check if a member with sponsor type can register more tickets
        Args:
            primary_mobile: Mobile number of the primary member
            sponsor_type: Sponsor type (TITLE_SPONSORS, ASSOCIATE_SPONSORS, etc.)
            additional_count: Number of additional tickets being requested
        Returns: (available: bool, remaining: int, message: str)
        """
        if not sponsor_type:
            # No sponsor type means regular BNI member - can register self + 1 additional
            sponsor_type = 'BNI_MEMBERS'

        # Get the limit for this sponsor type
        limit = cls.get_sponsor_ticket_limit(sponsor_type)

        # Count existing registrations for this primary member - FILTER BY SPONSOR TYPE
        # For BNI_MEMBERS (no sponsor_type), count registrations where sponsor_type is NULL or empty
        # For other sponsor types, count only registrations with that specific sponsor_type
        if sponsor_type == 'BNI_MEMBERS':
            # Count registrations with no sponsor_type or empty sponsor_type
            existing_count = cls.objects.filter(
                primary_booker_mobile=primary_mobile,
                payment_status__in=['SUCCESS', 'PENDING']
            ).filter(
                models.Q(sponsor_type__isnull=True) | models.Q(sponsor_type='')
            ).count()

            self_registration_count = cls.objects.filter(
                mobile_number=primary_mobile,
                payment_status__in=['SUCCESS', 'PENDING']
            ).filter(
                models.Q(sponsor_type__isnull=True) | models.Q(sponsor_type='')
            ).count()
        else:
            # Count registrations with the specific sponsor_type
            existing_count = cls.objects.filter(
                primary_booker_mobile=primary_mobile,
                sponsor_type=sponsor_type,
                payment_status__in=['SUCCESS', 'PENDING']
            ).count()

            self_registration_count = cls.objects.filter(
                mobile_number=primary_mobile,
                sponsor_type=sponsor_type,
                payment_status__in=['SUCCESS', 'PENDING']
            ).count()

        # Total count is the maximum of the two (to avoid double counting)
        total_existing = max(existing_count, self_registration_count)

        # Calculate remaining tickets
        remaining = limit - total_existing

        # Check if the requested additional tickets exceed the limit
        if additional_count + 1 > remaining:  # +1 for the primary member if not registered
            sponsor_name = sponsor_type.replace('_', ' ').title()
            return False, remaining, f"Sorry! {sponsor_name} can register maximum {limit} tickets. You have already registered {total_existing} ticket(s). Only {remaining} ticket(s) remaining."

        return True, remaining, f"{remaining} tickets remaining for this member"

    @classmethod
    def check_member_ticket_limit_by_name(cls, member_name, chapter, sponsor_type):
        """
        Check ticket limit by MEMBER NAME (not mobile)
        This prevents the same person from registering multiple times with different phone numbers
        Counts ALL tickets including primary + additional members in booking groups
        Args:
            member_name: Name of the member
            chapter: BNI chapter (BNI_CHETTINAD, BNI_THALAIVAS, BNI_MADURAI)
            sponsor_type: Sponsor type (TITLE_SPONSORS, ASSOCIATE_SPONSORS, etc.)
        Returns: (available: bool, limit: int, used: int, remaining: int)
        """
        # Try to get limit from BNIMember table first
        try:
            member = BNIMember.objects.get(
                name__iexact=member_name.strip(),
                chapter=chapter,
                is_active=True
            )
            limit = member.ticket_limit
        except BNIMember.DoesNotExist:
            # Special handling for BNI_MADURAI: 1 ticket per member (no pre-registered members)
            if chapter == 'BNI_MADURAI':
                limit = 1
            else:
                # Fallback to sponsor type limits for other chapters
                limit = cls.get_sponsor_ticket_limit(sponsor_type or 'BNI_MEMBERS')

        # Count ALL tickets where this person is the primary booker
        # This includes the primary registration + all additional members across ALL booking groups
        # Handles edge case: same person registering with different mobile numbers

        # Step 1: Find ALL primary bookings by this member (could be multiple if different mobiles used)
        primary_bookings = cls.objects.filter(
            name__iexact=member_name.strip(),
            registration_for=chapter,
            is_primary_booker=True,
            payment_status__in=['SUCCESS', 'PENDING']
        )

        # Step 2: Collect ALL mobile numbers from primary bookings
        mobile_numbers = [b.mobile_number for b in primary_bookings if b.mobile_number]

        # Step 3: Count ALL registrations linked to ANY of these mobiles
        # This ensures we count ALL additional members added at different times, even with different mobiles
        if mobile_numbers:
            existing_count = cls.objects.filter(
                primary_booker_mobile__in=mobile_numbers,
                payment_status__in=['SUCCESS', 'PENDING']
            ).count()
        else:
            # Fallback: count only by name if no primary booking exists (old data or no mobile)
            existing_count = cls.objects.filter(
                name__iexact=member_name.strip(),
                registration_for=chapter,
                payment_status__in=['SUCCESS', 'PENDING']
            ).count()

        remaining = limit - existing_count

        return (
            remaining > 0,
            limit,
            existing_count,
            max(0, remaining)
        )


class BNIMember(models.Model):
    """Pre-registered BNI members with fixed ticket allocations"""
    CHAPTER_CHOICES = [
        ('BNI_CHETTINAD', 'BNI Chettinad'),
        ('BNI_THALAIVAS', 'BNI Thalaivas'),
        ('BNI_MADURAI', 'BNI Madurai'),
    ]

    name = models.CharField(max_length=200, db_index=True)
    company = models.CharField(max_length=200)
    chapter = models.CharField(max_length=20, choices=CHAPTER_CHOICES, db_index=True)
    sponsor_type = models.CharField(
        max_length=20,
        choices=Registration.SPONSOR_TYPE_CHOICES,
        default='BNI_MEMBERS'
    )
    ticket_limit = models.IntegerField(default=2)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['chapter', 'name']
        unique_together = [['name', 'chapter']]  # Name unique per chapter
        indexes = [
            models.Index(fields=['name', 'chapter', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} - {self.chapter}"

    def get_registration_count(self):
        """Get count of existing registrations for this member"""
        return Registration.objects.filter(
            name__iexact=self.name,
            registration_for=self.chapter,
            payment_status__in=['SUCCESS', 'PENDING']
        ).count()

    def get_remaining_tickets(self):
        """Get remaining ticket count"""
        return max(0, self.ticket_limit - self.get_registration_count())


class ScanLog(models.Model):
    """Track all QR code scans and check-ins"""
    ACTION_CHOICES = [
        ('SCAN_SUCCESS', 'Scan Success'),
        ('SCAN_FAILED', 'Scan Failed'),
        ('CHECK_IN', 'Check In'),
    ]

    registration = models.ForeignKey(Registration, on_delete=models.CASCADE, null=True, blank=True, related_name='scan_logs')
    ticket_no = models.CharField(max_length=20)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default='SCAN_SUCCESS')
    scanned_at = models.DateTimeField(auto_now_add=True)
    scanned_by = models.CharField(max_length=100, blank=True, null=True)  # Admin username
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-scanned_at']

    def __str__(self):
        return f"{self.ticket_no} - {self.action} at {self.scanned_at}"


class OTPVerification(models.Model):
    """OTP verification for BNI member registration authentication"""
    mobile_number = models.CharField(max_length=15, db_index=True, blank=True, null=True)
    email = models.EmailField(max_length=255, db_index=True, blank=True, null=True)
    otp_code = models.CharField(max_length=6)
    member_name = models.CharField(max_length=200)
    category = models.CharField(max_length=20)

    # OTP validity
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    # Status tracking
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(blank=True, null=True)
    attempts = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['mobile_number', 'is_verified']),
            models.Index(fields=['email', 'is_verified']),
        ]

    def save(self, *args, **kwargs):
        # Set expiry to 5 minutes from now if not set
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=5)
        super().save(*args, **kwargs)

    @classmethod
    def generate_otp(cls, mobile_number=None, member_name=None, category=None, email=None):
        """Generate a new 6-digit OTP for mobile or email"""
        otp_code = str(random.randint(100000, 999999))

        # Invalidate any previous OTPs for this mobile number or email
        if email:
            cls.objects.filter(
                email=email,
                is_verified=False
            ).delete()
        elif mobile_number:
            cls.objects.filter(
                mobile_number=mobile_number,
                is_verified=False
            ).delete()

        # Create new OTP
        otp = cls.objects.create(
            mobile_number=mobile_number,
            email=email,
            otp_code=otp_code,
            member_name=member_name,
            category=category
        )
        return otp

    def is_valid(self):
        """Check if OTP is still valid"""
        return (
            not self.is_verified and
            timezone.now() < self.expires_at and
            self.attempts < 3
        )

    def verify(self, input_otp):
        """Verify the OTP code"""
        self.attempts += 1
        self.save()

        if not self.is_valid():
            return False, "OTP expired or maximum attempts exceeded"

        if self.otp_code == input_otp:
            self.is_verified = True
            self.verified_at = timezone.now()
            self.save()
            return True, "OTP verified successfully"

        return False, f"Invalid OTP. {3 - self.attempts} attempts remaining"

    def __str__(self):
        return f"OTP for {self.mobile_number} - {self.member_name}"


class SponsorTicketLimit(models.Model):
    """Configurable ticket limits for each sponsor type"""
    sponsor_type = models.CharField(
        max_length=20,
        choices=Registration.SPONSOR_TYPE_CHOICES,
        unique=True,
        db_index=True
    )
    ticket_limit = models.IntegerField(
        default=2,
        help_text="Total number of tickets allowed (including primary member)"
    )
    description = models.TextField(blank=True, null=True, help_text="Description of sponsor benefits")
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Sponsor Ticket Limit'
        verbose_name_plural = 'Sponsor Ticket Limits'
        ordering = ['-ticket_limit', 'sponsor_type']

    def __str__(self):
        return f"{self.get_sponsor_type_display()} - {self.ticket_limit} tickets"

    @classmethod
    def get_limit(cls, sponsor_type):
        """Get ticket limit for a sponsor type"""
        try:
            limit_obj = cls.objects.get(sponsor_type=sponsor_type, is_active=True)
            return limit_obj.ticket_limit
        except cls.DoesNotExist:
            # Fallback to default hardcoded limits
            DEFAULTS = {
                'TITLE_SPONSORS': 10,
                'ASSOCIATE_SPONSORS': 6,
                'CO_SPONSORS': 4,
                'BNI_MEMBERS': 2,
            }
            return DEFAULTS.get(sponsor_type, 1)


class Sponsor(models.Model):
    """Sponsor management with Google Drive logo URLs"""
    CATEGORY_CHOICES = [
        ('TITLE_SPONSORS', 'Title Sponsors'),
        ('ASSOCIATE_SPONSORS', 'Associate Sponsors'),
        ('CO_SPONSORS', 'Co Sponsors'),
    ]

    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, db_index=True)
    logo_url = models.TextField(help_text="Google Drive share link URL")
    company_name = models.CharField(max_length=200, blank=True, null=True)
    display_order = models.IntegerField(default=0, help_text="Lower numbers appear first")
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'created_at']
        indexes = [
            models.Index(fields=['category', 'is_active', 'display_order']),
        ]

    def __str__(self):
        company = self.company_name or 'Unnamed Sponsor'
        return f"{self.get_category_display()} - {company}"

    def get_direct_image_url(self):
        """Convert Google Drive share URL to direct image URL"""
        if 'drive.google.com' in self.logo_url:
            # Extract file ID from various Google Drive URL formats
            if '/file/d/' in self.logo_url:
                file_id = self.logo_url.split('/file/d/')[1].split('/')[0]
            elif 'id=' in self.logo_url:
                file_id = self.logo_url.split('id=')[1].split('&')[0]
            else:
                return self.logo_url
            # Return thumbnail URL which works better for images
            return f"https://drive.google.com/thumbnail?id={file_id}&sz=w1000"
        return self.logo_url


class EventFeedback(models.Model):
    """Event feedback and ratings from attendees - Simplified version"""
    RATING_CHOICES = [(i, i) for i in range(1, 6)]  # 1-5 stars

    ATTEND_FUTURE_CHOICES = [
        ('YES', 'Yes'),
        ('NO', 'No'),
        ('MAYBE', 'May be'),
    ]

    # Link to registration
    registration = models.OneToOneField(
        Registration,
        on_delete=models.CASCADE,
        related_name='feedback',
        help_text="One feedback per registration"
    )

    # Star ratings (1-5) - Required fields
    overall_rating = models.IntegerField(
        choices=RATING_CHOICES,
        help_text="Overall event experience (1-5 stars)"
    )
    speaker_rating = models.IntegerField(
        choices=RATING_CHOICES,
        default=3,
        help_text="Speaker quality (1-5 stars)"
    )

    # Willingness to join BNI Chettinad
    attend_future = models.CharField(
        max_length=10,
        choices=ATTEND_FUTURE_CHOICES,
        default='MAYBE',
        help_text="Are you willing to join BNI Chettinad to expand your business?"
    )

    # Metadata
    submitted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(
        blank=True,
        null=True,
        help_text="IP address of submitter"
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="Browser/device info"
    )

    class Meta:
        verbose_name = 'Event Feedback'
        verbose_name_plural = 'Event Feedback'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"Feedback from {self.registration.name} ({self.registration.ticket_no}) - {self.overall_rating}⭐"

    def get_average_rating(self):
        """Calculate average of overall and speaker ratings"""
        return (self.overall_rating + self.speaker_rating) / 2
