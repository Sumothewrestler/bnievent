from django.core.management.base import BaseCommand
from django.db.models import Q
from registrations.models import Registration


class Command(BaseCommand):
    help = 'Fix bulk booking payment propagation and populate gateway_verified field'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting bulk payment fix...'))
        self.stdout.write('=' * 80)

        # Step 1: Populate gateway_verified for all existing records
        self.stdout.write('\n1. Populating gateway_verified field...')
        self.populate_gateway_verified()

        # Step 2: Fix bulk booking payment propagation
        self.stdout.write('\n2. Fixing bulk booking payment propagation...')
        self.fix_bulk_booking_payments()

        self.stdout.write(self.style.SUCCESS('\nAll tasks completed successfully!'))

    def populate_gateway_verified(self):
        """Populate gateway_verified based on payment_id existence"""
        # Set gateway_verified=True for records with payment_id
        updated_true = Registration.objects.filter(
            payment_id__isnull=False
        ).exclude(payment_id='').update(gateway_verified=True)

        # Set gateway_verified=False for records without payment_id
        updated_false = Registration.objects.filter(
            Q(payment_id__isnull=True) | Q(payment_id='')
        ).update(gateway_verified=False)

        self.stdout.write(f'   - Set gateway_verified=True for {updated_true} records (have payment_id)')
        self.stdout.write(f'   - Set gateway_verified=False for {updated_false} records (no payment_id)')

    def fix_bulk_booking_payments(self):
        """Propagate payment data from primary booker to additional members"""
        # Get all bulk bookings (where booking_group_id is not null)
        bulk_bookings = Registration.objects.filter(
            booking_group_id__isnull=False
        ).values_list('booking_group_id', flat=True).distinct()

        fixed_count = 0
        skipped_count = 0
        error_count = 0

        for booking_id in bulk_bookings:
            try:
                # Get all registrations in this booking group
                registrations = Registration.objects.filter(booking_group_id=booking_id).order_by('created_at')

                # Find primary booker
                primary = registrations.filter(is_primary_booker=True).first()

                if not primary:
                    self.stdout.write(self.style.WARNING(f'   ⚠️  No primary booker for {booking_id}'))
                    skipped_count += 1
                    continue

                # Check if primary has successful payment
                if primary.payment_status != 'SUCCESS' or not primary.payment_id:
                    # Primary hasn't paid yet, skip
                    skipped_count += 1
                    continue

                # Calculate expected amount (number of persons * per person price)
                total_persons = registrations.count()

                # Get per-person price from primary booker's amount
                # For Public: Should be 300 per person
                # For Students: Should be 150 per person
                # For BNI: Should be 0 per person
                if primary.registration_for == 'PUBLIC':
                    per_person_price = 300
                elif primary.registration_for == 'STUDENTS':
                    per_person_price = 150
                else:  # BNI members
                    per_person_price = 0

                expected_total = total_persons * per_person_price
                primary_paid = float(primary.amount)

                # Check if primary paid for all members
                if primary_paid >= expected_total:
                    # Primary paid for everyone, propagate payment data to additional members
                    additional_members = registrations.filter(is_primary_booker=False)

                    for member in additional_members:
                        # Only update if member is not already SUCCESS with gateway verification
                        if not (member.payment_status == 'SUCCESS' and member.gateway_verified):
                            member.payment_status = 'SUCCESS'
                            member.payment_id = primary.payment_id  # Link to primary's payment
                            member.payment_date = primary.payment_date
                            member.gateway_verified = True  # Verified through primary's payment

                            # Add note in payment_info that this was paid by primary
                            import json
                            try:
                                payment_info = json.loads(primary.payment_info) if primary.payment_info else {}
                            except:
                                payment_info = {}

                            payment_info['paid_by_primary'] = True
                            payment_info['primary_ticket'] = primary.ticket_no
                            member.payment_info = json.dumps(payment_info)

                            member.save()
                            fixed_count += 1

                    if additional_members.count() > 0:
                        self.stdout.write(
                            f'   ✓ Fixed {booking_id}: '
                            f'{primary.name} paid ₹{primary_paid} for {total_persons} persons'
                        )
                else:
                    # Primary paid only for themselves or partial payment
                    skipped_count += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'   ✗ Error processing {booking_id}: {str(e)}'))
                error_count += 1

        self.stdout.write('\n' + '-' * 80)
        self.stdout.write(f'   Total booking groups processed: {len(list(bulk_bookings))}')
        self.stdout.write(f'   Additional members fixed: {fixed_count}')
        self.stdout.write(f'   Skipped (incomplete payment): {skipped_count}')
        self.stdout.write(f'   Errors: {error_count}')
