from django.core.management.base import BaseCommand
from registrations.models import Registration
from registrations.id_card_generator import save_id_card
import os


class Command(BaseCommand):
    help = 'Regenerate all ID cards with updated configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--payment-status',
            type=str,
            default='SUCCESS',
            help='Filter by payment status (default: SUCCESS). Use "ALL" for all registrations.'
        )

    def handle(self, *args, **options):
        payment_status = options['payment_status']

        # Get registrations based on filter
        if payment_status == 'ALL':
            registrations = Registration.objects.all()
            self.stdout.write(self.style.WARNING('Regenerating ID cards for ALL registrations...'))
        else:
            registrations = Registration.objects.filter(payment_status=payment_status)
            self.stdout.write(self.style.WARNING(f'Regenerating ID cards for registrations with payment status: {payment_status}'))

        total = registrations.count()
        self.stdout.write(self.style.SUCCESS(f'Found {total} registrations to process'))

        success_count = 0
        error_count = 0

        for idx, registration in enumerate(registrations, 1):
            try:
                # Generate and save ID card
                image_path = save_id_card(registration)
                success_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'[{idx}/{total}] ✓ Generated ID card for {registration.ticket_no} - {registration.name}'
                    )
                )
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'[{idx}/{total}] ✗ Failed for {registration.ticket_no} - {registration.name}: {str(e)}'
                    )
                )

        # Summary
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('ID Card Regeneration Complete!'))
        self.stdout.write(self.style.SUCCESS(f'Total processed: {total}'))
        self.stdout.write(self.style.SUCCESS(f'Successful: {success_count}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write(self.style.SUCCESS('='*60))
