from django.db import models
import uuid

class EventSettings(models.Model):
    """Singleton model for event settings like logo"""
    logo = models.ImageField(upload_to='event_logos/', blank=True, null=True)
    event_name = models.CharField(max_length=200, default='BNI Event')
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

class Registration(models.Model):
    REGISTRATION_CHOICES = [
        ('BNI_THALAIVAS', 'BNI Members - Thalaivas'),
        ('BNI_CHETTINAD', 'BNI Members - Chettinad'),
        ('BNI_MADURAI', 'BNI Members - Madurai'),
        ('PUBLIC', 'Public'),
        ('STUDENTS', 'Students'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    ticket_no = models.CharField(max_length=20, unique=True, editable=False)
    name = models.CharField(max_length=200)
    mobile_number = models.CharField(max_length=15)
    email = models.EmailField()
    age = models.IntegerField()
    location = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200)
    registration_for = models.CharField(max_length=20, choices=REGISTRATION_CHOICES)

    # Payment fields
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    payment_id = models.CharField(max_length=100, blank=True, null=True)
    order_id = models.CharField(max_length=100, blank=True, null=True, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    payment_date = models.DateTimeField(blank=True, null=True)
    payment_info = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.ticket_no:
            # Generate ticket number: BNI + unique 8-digit number
            self.ticket_no = f"BNI{str(uuid.uuid4().int)[:8]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_no} - {self.name}"

    class Meta:
        ordering = ['-created_at']
