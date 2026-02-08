from django.contrib import admin
from django.utils.html import format_html
from .models import Registration, EventSettings


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
