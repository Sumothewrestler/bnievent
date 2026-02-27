from django.contrib import admin
from django.utils.html import format_html
from django.http import HttpResponse, JsonResponse
from django.contrib.admin.views.decorators import staff_member_required
from django.core.management import call_command
from django.urls import path
from datetime import datetime
import io
from .models import Registration, EventSettings, ScanLog, OTPVerification, BNIMember, SponsorTicketLimit, Sponsor, IDCardTemplate, EventFeedback


@admin.register(EventSettings)
class EventSettingsAdmin(admin.ModelAdmin):
    list_display = ['event_name', 'updated_at']


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = [
        'ticket_no', 'name', 'email', 'mobile_number',
        'registration_for', 'referred_by', 'payment_status_display',
        'amount', 'payment_date', 'created_at'
    ]
    list_filter = [
        'payment_status',
        'registration_for',
        'created_at',
        'payment_date'
    ]
    search_fields = [
        'ticket_no',
        'name',
        'email',
        'mobile_number',
        'order_id',
        'payment_id'
    ]
    readonly_fields = [
        'ticket_no',
        'order_id',
        'payment_id',
        'payment_date',
        'created_at',
        'updated_at'
    ]
    list_per_page = 50
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Registration Details', {
            'fields': ('ticket_no', 'name', 'email', 'mobile_number', 'age', 'location', 'company_name', 'referred_by', 'registration_for')
        }),
        ('Payment Details', {
            'fields': ('payment_status', 'order_id', 'payment_id', 'amount', 'payment_date', 'payment_info')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def payment_status_display(self, obj):
        """Display payment status with color coding"""
        colors = {
            'SUCCESS': '#28a745',  # Green
            'PENDING': '#ffc107',  # Yellow
            'FAILED': '#dc3545',   # Red
        }
        color = colors.get(obj.payment_status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_payment_status_display()
        )
    payment_status_display.short_description = 'Payment Status'

    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete registrations"""
        return request.user.is_superuser


@admin.register(ScanLog)
class ScanLogAdmin(admin.ModelAdmin):
    list_display = [
        'ticket_no', 'registration_name', 'action_display',
        'scanned_by', 'scanned_at'
    ]
    list_filter = ['action', 'scanned_at']
    search_fields = ['ticket_no', 'registration__name', 'scanned_by', 'notes']
    readonly_fields = ['scanned_at']
    list_per_page = 100
    date_hierarchy = 'scanned_at'

    def registration_name(self, obj):
        return obj.registration.name if obj.registration else 'N/A'
    registration_name.short_description = 'Name'

    def action_display(self, obj):
        """Display action with color coding"""
        colors = {
            'SCAN_SUCCESS': '#28a745',  # Green
            'CHECK_IN': '#0066cc',      # Blue
            'SCAN_FAILED': '#dc3545',   # Red
        }
        color = colors.get(obj.action, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; border-radius: 3px; font-weight: 600; font-size: 11px;">{}</span>',
            color,
            obj.get_action_display()
        )
    action_display.short_description = 'Action'


@admin.register(OTPVerification)
class OTPVerificationAdmin(admin.ModelAdmin):
    list_display = [
        'mobile_number', 'member_name', 'category',
        'otp_code', 'verification_status', 'attempts',
        'created_at', 'expires_at'
    ]
    list_filter = ['is_verified', 'category', 'created_at']
    search_fields = ['mobile_number', 'member_name', 'otp_code']
    readonly_fields = ['created_at', 'verified_at', 'expires_at']
    list_per_page = 50
    date_hierarchy = 'created_at'

    def verification_status(self, obj):
        """Display verification status with color coding"""
        if obj.is_verified:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 4px 8px; border-radius: 3px; font-weight: 600;">VERIFIED</span>'
            )
        elif obj.expires_at < admin.utils.timezone.now():
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 3px; font-weight: 600;">EXPIRED</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #ffc107; color: black; padding: 4px 8px; border-radius: 3px; font-weight: 600;">PENDING</span>'
            )
    verification_status.short_description = 'Status'


@admin.register(BNIMember)
class BNIMemberAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'company', 'chapter',
        'sponsor_type', 'ticket_limit',
        'registration_count_display', 'remaining_tickets_display',
        'is_active'
    ]
    list_filter = ['chapter', 'sponsor_type', 'is_active']
    search_fields = ['name', 'company']
    list_per_page = 100
    ordering = ['chapter', 'name']

    fieldsets = (
        ('Member Information', {
            'fields': ('name', 'company', 'chapter')
        }),
        ('Ticket Allocation', {
            'fields': ('sponsor_type', 'ticket_limit', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

    def registration_count_display(self, obj):
        """Display current registration count"""
        count = obj.get_registration_count()
        return format_html(
            '<span style="font-weight: bold;">{}</span>',
            count
        )
    registration_count_display.short_description = 'Registered'

    def remaining_tickets_display(self, obj):
        """Display remaining tickets with color coding"""
        remaining = obj.get_remaining_tickets()
        if remaining == 0:
            color = '#dc3545'  # Red
        elif remaining <= 2:
            color = '#ffc107'  # Yellow
        else:
            color = '#28a745'  # Green

        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; border-radius: 3px; font-weight: 600;">{}</span>',
            color,
            remaining
        )
    remaining_tickets_display.short_description = 'Remaining'


@admin.register(SponsorTicketLimit)
class SponsorTicketLimitAdmin(admin.ModelAdmin):
    """Admin interface for managing sponsor ticket limits"""
    list_display = [
        'sponsor_type_display', 'ticket_limit',
        'is_active', 'updated_at'
    ]
    list_filter = ['is_active', 'ticket_limit']
    search_fields = ['sponsor_type', 'description']
    list_editable = ['ticket_limit', 'is_active']
    list_per_page = 20
    ordering = ['-ticket_limit', 'sponsor_type']

    fieldsets = (
        ('Sponsor Type Configuration', {
            'fields': ('sponsor_type', 'ticket_limit', 'is_active'),
            'description': 'Configure the maximum number of tickets allowed for each sponsor type'
        }),
        ('Additional Information', {
            'fields': ('description',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

    def sponsor_type_display(self, obj):
        """Display sponsor type with formatting"""
        colors = {
            'TITLE_SPONSORS': '#ff6b00',
            'ASSOCIATE_SPONSORS': '#0066cc',
            'CO_SPONSORS': '#28a745',
            'BNI_MEMBERS': '#6c757d',
        }
        color = colors.get(obj.sponsor_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 6px 12px; border-radius: 4px; font-weight: 700; font-size: 12px;">{}</span>',
            color,
            obj.get_sponsor_type_display()
        )
    sponsor_type_display.short_description = 'Sponsor Type'


@admin.register(Sponsor)
class SponsorAdmin(admin.ModelAdmin):
    """Admin interface for sponsor logos"""
    list_display = [
        'company_name', 'category', 'display_order',
        'is_active', 'updated_at'
    ]
    list_filter = ['category', 'is_active']
    search_fields = ['company_name', 'logo_url']
    list_editable = ['display_order', 'is_active']
    list_per_page = 20
    ordering = ['category', 'display_order']

    fieldsets = (
        ('Sponsor Information', {
            'fields': ('company_name', 'category', 'logo_url')
        }),
        ('Display Settings', {
            'fields': ('display_order', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(IDCardTemplate)
class IDCardTemplateAdmin(admin.ModelAdmin):
    """Admin interface for ID card templates"""
    list_display = [
        'category_display', 'template_status',
        'is_active', 'updated_at'
    ]
    list_filter = ['category', 'is_active']
    search_fields = ['category', 'template_url']
    list_editable = ['is_active']
    list_per_page = 20
    ordering = ['category']

    fieldsets = (
        ('Template Configuration', {
            'fields': ('category', 'template_url', 'is_active'),
            'description': 'Upload PNG templates to Google Drive and paste the share link here'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

    def category_display(self, obj):
        """Display category with color coding"""
        colors = {
            'STUDENTS': '#ff6b00',
            'BNI_MEMBERS_PRIMARY': '#0066cc',
            'BNI_MEMBERS_GUEST': '#17a2b8',
            'BNI_MEMBERS': '#6c757d',
            'VIP': '#9b59b6',
            'PUBLIC': '#28a745',
            'ORGANISERS': '#e74c3c',
            'VOLUNTEERS': '#f39c12',
        }
        color = colors.get(obj.category, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 6px 12px; border-radius: 4px; font-weight: 700; font-size: 12px;">{}</span>',
            color,
            obj.get_category_display()
        )
    category_display.short_description = 'Category'

    def template_status(self, obj):
        """Display template URL status"""
        if obj.template_url:
            return format_html(
                '<span style="background-color: #28a745; color: white; padding: 4px 8px; border-radius: 3px; font-weight: 600;">✓ Configured</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 3px; font-weight: 600;">✗ Not Set</span>'
            )
    template_status.short_description = 'Template Status'


@admin.register(EventFeedback)
class EventFeedbackAdmin(admin.ModelAdmin):
    """Admin interface for event feedback - Simplified version"""
    list_display = [
        'ticket_no_display', 'attendee_name', 'registration_category',
        'overall_rating_display', 'speaker_rating_display', 'attend_future_display',
        'submitted_at'
    ]
    list_filter = [
        'overall_rating', 'speaker_rating',
        'attend_future', 'registration__registration_for',
        'submitted_at'
    ]
    search_fields = [
        'registration__ticket_no', 'registration__name',
        'registration__email'
    ]
    readonly_fields = [
        'registration', 'submitted_at', 'ip_address',
        'user_agent', 'average_rating_display'
    ]
    list_per_page = 50
    date_hierarchy = 'submitted_at'

    fieldsets = (
        ('Feedback Information', {
            'fields': ('registration', 'submitted_at')
        }),
        ('Star Ratings (1-5)', {
            'fields': (
                'overall_rating', 'speaker_rating', 'average_rating_display'
            )
        }),
        ('BNI Chettinad Interest', {
            'fields': ('attend_future',)
        }),
        ('Technical Details', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
    )

    def ticket_no_display(self, obj):
        """Display ticket number"""
        return obj.registration.ticket_no
    ticket_no_display.short_description = 'Ticket No'

    def attendee_name(self, obj):
        """Display attendee name"""
        return obj.registration.name
    attendee_name.short_description = 'Name'

    def registration_category(self, obj):
        """Display registration category"""
        return obj.registration.get_registration_for_display()
    registration_category.short_description = 'Category'

    def overall_rating_display(self, obj):
        """Display overall rating with stars"""
        stars = '⭐' * obj.overall_rating
        color = '#28a745' if obj.overall_rating >= 4 else '#ffc107' if obj.overall_rating >= 3 else '#dc3545'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; border-radius: 3px; font-weight: 600;">{} {}</span>',
            color,
            obj.overall_rating,
            stars
        )
    overall_rating_display.short_description = 'Overall'

    def speaker_rating_display(self, obj):
        """Display speaker rating with stars"""
        stars = '⭐' * obj.speaker_rating
        color = '#28a745' if obj.speaker_rating >= 4 else '#ffc107' if obj.speaker_rating >= 3 else '#dc3545'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; border-radius: 3px; font-weight: 600;">{} {}</span>',
            color,
            obj.speaker_rating,
            stars
        )
    speaker_rating_display.short_description = 'Speaker'

    def attend_future_display(self, obj):
        """Display willingness to join BNI with color coding"""
        colors = {
            'YES': '#28a745',   # Green
            'MAYBE': '#ffc107',  # Yellow
            'NO': '#dc3545',     # Red
        }
        color = colors.get(obj.attend_future, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; border-radius: 3px; font-weight: 600;">{}</span>',
            color,
            obj.get_attend_future_display()
        )
    attend_future_display.short_description = 'Join BNI?'

    def average_rating_display(self, obj):
        """Display average of overall and speaker ratings"""
        avg = obj.get_average_rating()
        return format_html(
            '<span style="font-weight: bold; font-size: 14px;">{:.1f} / 5.0</span>',
            avg
        )
    average_rating_display.short_description = 'Average Rating'

    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete feedback"""
        return request.user.is_superuser


# Custom Admin View for Database Backup
@staff_member_required
def download_database_backup(request):
    """
    Download complete database backup as JSON
    Requires admin authentication (same as admin login)
    """
    # Create a BytesIO buffer to receive the JSON data
    buffer = io.StringIO()
    
    # Generate JSON backup using Django's dumpdata command
    call_command('dumpdata', '--indent', '2', stdout=buffer)
    
    # Get the JSON content
    json_content = buffer.getvalue()
    buffer.close()
    
    # Create filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'bnievent_backup_{timestamp}.json'
    
    # Return as downloadable file
    response = HttpResponse(json_content, content_type='application/json')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    return response


# Override admin site to add custom URL
from django.contrib.admin import AdminSite

class BNIAdminSite(AdminSite):
    site_header = "BNI Event Administration"
    site_title = "BNI Event Admin"
    index_title = "Dashboard"
    
    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path('backup/download/', self.admin_view(download_database_backup), name='backup_download'),
        ]
        return custom_urls + urls

# Create custom admin site instance
admin_site = BNIAdminSite(name='admin')

# Unregister from default site and register to custom site
admin.site.unregister(EventSettings)
admin.site.unregister(Registration)
admin.site.unregister(ScanLog)
admin.site.unregister(OTPVerification)
admin.site.unregister(BNIMember)
admin.site.unregister(SponsorTicketLimit)
admin.site.unregister(Sponsor)
admin.site.unregister(IDCardTemplate)
admin.site.unregister(EventFeedback)

# Register all models with the custom admin site
admin_site.register(EventSettings, EventSettingsAdmin)
admin_site.register(Registration, RegistrationAdmin)
admin_site.register(ScanLog, ScanLogAdmin)
admin_site.register(OTPVerification, OTPVerificationAdmin)
admin_site.register(BNIMember, BNIMemberAdmin)
admin_site.register(SponsorTicketLimit, SponsorTicketLimitAdmin)
admin_site.register(Sponsor, SponsorAdmin)
admin_site.register(IDCardTemplate, IDCardTemplateAdmin)
admin_site.register(EventFeedback, EventFeedbackAdmin)
