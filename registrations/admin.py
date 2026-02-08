from django.contrib import admin
from django.utils.html import format_html
from .models import Registration, EventSettings, ScanLog


@admin.register(EventSettings)
class EventSettingsAdmin(admin.ModelAdmin):
    list_display = ['event_name', 'updated_at']


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = [
        'ticket_no', 'name', 'email', 'mobile_number',
        'registration_for', 'payment_status_display',
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
            'fields': ('ticket_no', 'name', 'email', 'mobile_number', 'age', 'location', 'company_name', 'registration_for')
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
