from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import HttpResponse
from django.db import transaction, models
from django.db.models import Count, Sum, Min, Max, Q
from .models import Registration, EventSettings, ScanLog, Sponsor, SponsorTicketLimit, BNIMember, IDCardTemplate, EventFeedback
from .serializers import RegistrationSerializer, EventSettingsSerializer, ScanLogSerializer, SponsorSerializer, SponsorTicketLimitSerializer, BNIMemberSerializer, IDCardTemplateSerializer, EventFeedbackSerializer, EventFeedbackSubmitSerializer
from .id_card_generator import generate_id_card, save_id_card
import uuid
import zipfile
import io

class RegistrationViewSet(viewsets.ModelViewSet):
    queryset = Registration.objects.all()
    serializer_class = RegistrationSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_permissions(self):
        if self.action in ['create', 'generate_id_card', 'seat_availability', 'sponsor_ticket_limit', 'member_ticket_limit', 'check_registration', 'check_registration_by_name']:
            # Allow anyone to create registration, generate ID card, check seats, check sponsor limits, and check registration status
            permission_classes = [AllowAny]
        else:
            # Only authenticated users (admin) can view/update/delete
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create registration with seat availability check (atomic transaction)"""
        registration_for = request.data.get('registration_for')

        # Check if registration is enabled
        settings = EventSettings.get_settings()
        if not settings.registration_enabled:
            return Response({
                'error': 'Registration is currently closed.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Double-check seat availability with database lock
        if registration_for:
            available, remaining, message = Registration.check_seat_availability(registration_for)

            if not available:
                return Response({
                    'error': message,
                    'seats_full': True
                }, status=status.HTTP_400_BAD_REQUEST)

        # Proceed with normal creation (serializer will validate again)
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def seat_availability(self, request):
        """Get current seat availability for all categories"""
        settings = EventSettings.get_settings()

        # Calculate for each category group
        students_count = Registration.get_successful_registrations_count('STUDENTS')
        public_count = Registration.get_successful_registrations_count('PUBLIC')
        bni_count = Registration.get_successful_registrations_count('BNI')

        students_remaining = settings.students_seats - students_count
        public_remaining = settings.public_seats - public_count
        bni_remaining = settings.bni_seats - bni_count
        total_remaining = students_remaining + public_remaining + bni_remaining

        return Response({
            'registration_enabled': settings.registration_enabled,
            'total': {
                'capacity': settings.total_seats,
                'booked': students_count + public_count + bni_count,
                'remaining': total_remaining
            },
            'categories': {
                'STUDENTS': {
                    'capacity': settings.students_seats,
                    'booked': students_count,
                    'remaining': max(0, students_remaining),
                    'available': students_remaining > 0
                },
                'PUBLIC': {
                    'capacity': settings.public_seats,
                    'booked': public_count,
                    'remaining': max(0, public_remaining),
                    'available': public_remaining > 0
                },
                'BNI': {
                    'capacity': settings.bni_seats,
                    'booked': bni_count,
                    'remaining': max(0, bni_remaining),
                    'available': bni_remaining > 0,
                    'note': 'Combined for all BNI chapters'
                }
            }
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='sponsor-limit')
    def sponsor_ticket_limit(self, request):
        """Check sponsor-based ticket limit for a member"""
        mobile = request.query_params.get('mobile')
        sponsor_type = request.query_params.get('sponsor_type')

        if not mobile:
            return Response({
                'error': 'Mobile number is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Normalize sponsor type
        effective_sponsor_type = sponsor_type if sponsor_type else 'BNI_MEMBERS'

        # Get the limit for this sponsor type
        limit = Registration.get_sponsor_ticket_limit(effective_sponsor_type)

        # Count existing registrations - FILTER BY SPONSOR TYPE
        # For BNI_MEMBERS (no sponsor_type), count registrations where sponsor_type is NULL or empty
        # For other sponsor types, count only registrations with that specific sponsor_type
        if effective_sponsor_type == 'BNI_MEMBERS':
            # Count registrations with no sponsor_type or empty sponsor_type
            existing_count = Registration.objects.filter(
                primary_booker_mobile=mobile,
                payment_status__in=['SUCCESS', 'PENDING']
            ).filter(
                models.Q(sponsor_type__isnull=True) | models.Q(sponsor_type='')
            ).count()

            self_registration_count = Registration.objects.filter(
                mobile_number=mobile,
                payment_status__in=['SUCCESS', 'PENDING']
            ).filter(
                models.Q(sponsor_type__isnull=True) | models.Q(sponsor_type='')
            ).count()
        else:
            # Count registrations with the specific sponsor_type
            existing_count = Registration.objects.filter(
                primary_booker_mobile=mobile,
                sponsor_type=effective_sponsor_type,
                payment_status__in=['SUCCESS', 'PENDING']
            ).count()

            self_registration_count = Registration.objects.filter(
                mobile_number=mobile,
                sponsor_type=effective_sponsor_type,
                payment_status__in=['SUCCESS', 'PENDING']
            ).count()

        total_existing = max(existing_count, self_registration_count)
        remaining = limit - total_existing

        return Response({
            'mobile': mobile,
            'sponsor_type': effective_sponsor_type,
            'limit': limit,
            'registered': total_existing,
            'remaining': max(0, remaining),
            'available': remaining > 0
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='member-limit')
    def member_ticket_limit(self, request):
        """
        Check ticket limit by MEMBER NAME (not mobile)
        This prevents the same person from registering with different phone numbers
        """
        name = request.query_params.get('name')
        chapter = request.query_params.get('chapter')
        sponsor_type = request.query_params.get('sponsor_type')

        if not name or not chapter:
            return Response({
                'error': 'Name and chapter are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Use the name-based validation method
        available, limit, used, remaining = Registration.check_member_ticket_limit_by_name(
            name, chapter, sponsor_type
        )

        return Response({
            'name': name,
            'chapter': chapter,
            'sponsor_type': sponsor_type or 'BNI_MEMBERS',
            'limit': limit,
            'registered': used,
            'remaining': remaining,
            'available': available
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='check-registration')
    def check_registration(self, request):
        """Check if a member is already registered as primary (by mobile + name)"""
        mobile = request.query_params.get('mobile')
        name = request.query_params.get('name')

        if not mobile or not name:
            return Response({
                'error': 'Mobile number and name are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if this member is already registered as primary
        existing_primary = Registration.objects.filter(
            mobile_number=mobile,
            name=name,
            is_primary_booker=True,
            payment_status__in=['SUCCESS', 'PENDING']
        ).first()

        if existing_primary:
            # Get all registrations for this member
            all_registrations = Registration.objects.filter(
                primary_booker_mobile=mobile,
                payment_status__in=['SUCCESS', 'PENDING']
            ).values('ticket_no', 'name', 'created_at')

            return Response({
                'is_registered': True,
                'primary_registration': {
                    'ticket_no': existing_primary.ticket_no,
                    'name': existing_primary.name,
                    'mobile': existing_primary.mobile_number,
                    'email': existing_primary.email,
                    'company': existing_primary.company_name,
                    'registration_for': existing_primary.registration_for,
                    'sponsor_type': existing_primary.sponsor_type,
                    'created_at': existing_primary.created_at,
                    'payment_status': existing_primary.payment_status
                },
                'total_registrations': len(all_registrations),
                'registrations': list(all_registrations)
            })
        else:
            return Response({
                'is_registered': False,
                'message': 'Member not registered yet'
            })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='check-registration-by-name')
    def check_registration_by_name(self, request):
        """Check if a member is already registered as primary (by name + chapter only)"""
        name = request.query_params.get('name')
        chapter = request.query_params.get('chapter')

        if not name or not chapter:
            return Response({
                'error': 'Name and chapter are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if this member is already registered as primary (by name + chapter)
        existing_primary = Registration.objects.filter(
            name=name,
            registration_for=chapter,
            is_primary_booker=True,
            payment_status__in=['SUCCESS', 'PENDING']
        ).first()

        if existing_primary:
            # Get ALL registrations for this primary member (across all booking groups)
            # This ensures we show all additional members added at different times
            all_registrations = Registration.objects.filter(
                primary_booker_mobile=existing_primary.mobile_number,
                payment_status__in=['SUCCESS', 'PENDING']
            ).values('ticket_no', 'name', 'mobile_number', 'email', 'is_primary_booker', 'created_at').order_by('-is_primary_booker', 'created_at')

            return Response({
                'is_registered': True,
                'primary_registration': {
                    'ticket_no': existing_primary.ticket_no,
                    'name': existing_primary.name,
                    'mobile': existing_primary.mobile_number,
                    'email': existing_primary.email,
                    'company': existing_primary.company_name,
                    'registration_for': existing_primary.registration_for,
                    'sponsor_type': existing_primary.sponsor_type,
                    'booking_group_id': existing_primary.booking_group_id,  # FIXED: Include booking_group_id
                    'created_at': existing_primary.created_at,
                    'payment_status': existing_primary.payment_status
                },
                'total_registrations': len(all_registrations),
                'registrations': list(all_registrations)
            })
        else:
            return Response({
                'is_registered': False,
                'message': 'Member not registered yet'
            })

    @action(detail=True, methods=['get'], url_path='generate-id-card')
    def generate_id_card(self, request, pk=None):
        """Generate and return ID card image for a registration"""
        try:
            registration = self.get_object()

            # Generate ID card
            buffer = generate_id_card(registration)

            # Return as image
            response = HttpResponse(buffer.read(), content_type='image/png')
            response['Content-Disposition'] = f'attachment; filename="id_card_{registration.ticket_no}.png"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='save-id-card')
    def save_id_card(self, request, pk=None):
        """Generate, save and return URL to ID card image"""
        try:
            registration = self.get_object()

            # Save ID card
            image_url = save_id_card(registration)

            # Mark message as copied and save timestamp
            from django.utils import timezone
            registration.message_copied = True
            registration.message_copied_at = timezone.now()
            registration.save(update_fields=['message_copied', 'message_copied_at'])

            # Return full URL
            full_url = request.build_absolute_uri('/' + image_url)

            return Response({
                'success': True,
                'image_url': full_url,
                'ticket_no': registration.ticket_no,
                'message_copied': registration.message_copied
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='download-id-cards-zip')
    def download_id_cards_zip(self, request):
        """Generate and return a ZIP file containing ID cards for filtered registrations"""
        try:
            # Get optional category filter from query params
            category = request.query_params.get('category', None)

            # Build queryset
            queryset = Registration.objects.all()

            BNI_CHAPTERS = ['BNI_CHETTINAD', 'BNI_THALAIVAS', 'BNI_MADURAI']

            if category and category != 'ALL':
                if category == 'BNI_MEMBERS_PRIMARY':
                    queryset = queryset.filter(
                        registration_for__in=BNI_CHAPTERS,
                        is_primary_booker=True
                    )
                elif category == 'BNI_MEMBERS_GUEST':
                    queryset = queryset.filter(
                        registration_for__in=BNI_CHAPTERS,
                        is_primary_booker=False
                    )
                else:
                    queryset = queryset.filter(registration_for=category)

            registrations = queryset.order_by('ticket_no')

            if not registrations.exists():
                return Response({'error': 'No registrations found for the selected category'}, status=status.HTTP_404_NOT_FOUND)

            # Create in-memory ZIP
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
                for reg in registrations:
                    try:
                        img_buffer = generate_id_card(reg)
                        zf.writestr(f'id_card_{reg.ticket_no}.png', img_buffer.read())
                    except Exception:
                        # Skip registrations that fail to generate
                        continue

            zip_buffer.seek(0)

            # Determine filename
            if category and category != 'ALL':
                zip_filename = f'id_cards_{category}.zip'
            else:
                zip_filename = 'id_cards_all.zip'

            response = HttpResponse(zip_buffer.read(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'
            return response

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ScanLogViewSet(viewsets.ModelViewSet):
    """ViewSet for scan logs - tracks all ticket check-ins"""
    queryset = ScanLog.objects.all().select_related('registration')
    serializer_class = ScanLogSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def log_scan(self, request):
        """Create a new scan log entry"""
        ticket_no = request.data.get('ticket_no')
        if not ticket_no:
            return Response({'error': 'ticket_no is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Try to find the registration
        try:
            registration = Registration.objects.get(ticket_no=ticket_no)
            scan_log = ScanLog.objects.create(
                registration=registration,
                ticket_no=ticket_no,
                action=request.data.get('action', 'SCAN_SUCCESS'),
                scanned_by=request.user.username if request.user.is_authenticated else None,
                notes=request.data.get('notes', '')
            )
        except Registration.DoesNotExist:
            # Log failed scan
            scan_log = ScanLog.objects.create(
                registration=None,
                ticket_no=ticket_no,
                action='SCAN_FAILED',
                scanned_by=request.user.username if request.user.is_authenticated else None,
                notes=request.data.get('notes', 'Ticket not found')
            )

        serializer = self.get_serializer(scan_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['delete'])
    def delete_all(self, request):
        """Delete all scan logs - admin only"""
        try:
            deleted_count = ScanLog.objects.all().count()
            ScanLog.objects.all().delete()
            return Response({
                'success': True,
                'message': f'Successfully deleted {deleted_count} scan logs',
                'deleted_count': deleted_count
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f'Failed to delete logs: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EventSettingsViewSet(viewsets.ViewSet):
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def list(self, request):
        """Get event settings (public access)"""
        settings = EventSettings.get_settings()
        serializer = EventSettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Update event settings - PUT (requires authentication)"""
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        settings = EventSettings.get_settings()
        serializer = EventSettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        """Update event settings - PATCH (requires authentication)"""
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        settings = EventSettings.get_settings()
        serializer = EventSettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
@transaction.atomic
def bulk_registration(request):
    """
    Create multiple registrations in a single transaction
    Expected payload:
    {
        "primary_booker": {
            "name": "John Doe",
            "email": "john@example.com",
            "mobile": "1234567890"
        },
        "attendees": [
            {
                "name": "Person 1",
                "mobile_number": "1234567890",
                "email": "person1@example.com",
                "age": 25,
                "location": "City",
                "company_name": "Company",
                "registration_for": "PUBLIC"
            },
            {
                "name": "Person 2",
                ...
            }
        ]
    }
    """
    try:
        primary_booker = request.data.get('primary_booker', {})
        attendees = request.data.get('attendees', [])

        if not primary_booker or not attendees:
            return Response({
                'error': 'primary_booker and attendees are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(attendees) == 0:
            return Response({
                'error': 'At least one attendee is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        if len(attendees) > 20:
            return Response({
                'error': 'Maximum 20 attendees allowed per booking'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if registration is enabled
        settings = EventSettings.get_settings()
        if not settings.registration_enabled:
            return Response({
                'error': 'Registration is currently closed.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate seat availability for all categories
        category_counts = {}
        for attendee in attendees:
            category = attendee.get('registration_for')
            if category:
                category_group = Registration.get_category_group(category)
                if category_group:
                    category_counts[category_group] = category_counts.get(category_group, 0) + 1

        # Check availability for each category
        for category_group, count in category_counts.items():
            current_count = Registration.get_successful_registrations_count(category_group)

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
                continue

            available = limit - current_count
            if count > available:
                return Response({
                    'error': f'Not enough seats for {category_name}. Requested: {count}, Available: {available}',
                    'seats_full': True
                }, status=status.HTTP_400_BAD_REQUEST)

        # Generate unique booking group ID
        booking_group_id = f"BG_{uuid.uuid4().hex[:12].upper()}"

        # Create registrations
        created_registrations = []
        total_amount = 0

        for idx, attendee_data in enumerate(attendees):
            # Add bulk booking metadata
            attendee_data['booking_group_id'] = booking_group_id
            attendee_data['is_primary_booker'] = (idx == 0)
            attendee_data['primary_booker_name'] = primary_booker.get('name')
            attendee_data['primary_booker_email'] = primary_booker.get('email')
            attendee_data['primary_booker_mobile'] = primary_booker.get('mobile')

            # Calculate amount based on category
            category = attendee_data.get('registration_for')
            if category == 'STUDENTS':
                attendee_data['amount'] = 150
                total_amount += 150
            else:
                attendee_data['amount'] = 300
                total_amount += 300

            # Create registration
            serializer = RegistrationSerializer(data=attendee_data)
            if serializer.is_valid():
                registration = serializer.save()
                created_registrations.append(registration)
            else:
                # Rollback will happen automatically due to @transaction.atomic
                return Response({
                    'error': f'Invalid data for attendee {idx + 1}',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        # Return created registrations with ticket numbers
        return Response({
            'success': True,
            'booking_group_id': booking_group_id,
            'total_registrations': len(created_registrations),
            'total_amount': total_amount,
            'registrations': [
                {
                    'id': reg.id,
                    'ticket_no': reg.ticket_no,
                    'name': reg.name,
                    'registration_for': reg.registration_for,
                    'amount': float(reg.amount)
                }
                for reg in created_registrations
            ],
            'primary_booker': primary_booker
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SponsorViewSet(viewsets.ModelViewSet):
    """ViewSet for managing sponsors with Google Drive logos"""
    queryset = Sponsor.objects.all()
    serializer_class = SponsorSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'active_sponsors']:
            # Allow public access to view sponsors
            permission_classes = [AllowAny]
        else:
            # Only authenticated users (admin) can create/update/delete
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def active_sponsors(self, request):
        """Get all active sponsors grouped by category"""
        title_sponsors = self.queryset.filter(category='TITLE_SPONSORS', is_active=True)
        associate_sponsors = self.queryset.filter(category='ASSOCIATE_SPONSORS', is_active=True)
        co_sponsors = self.queryset.filter(category='CO_SPONSORS', is_active=True)

        return Response({
            'title_sponsors': SponsorSerializer(title_sponsors, many=True).data,
            'associate_sponsors': SponsorSerializer(associate_sponsors, many=True).data,
            'co_sponsors': SponsorSerializer(co_sponsors, many=True).data
        })


class SponsorTicketLimitViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for sponsor ticket limits - READ ONLY for frontend
    Admins can modify limits via Django admin panel
    """
    queryset = SponsorTicketLimit.objects.filter(is_active=True)
    serializer_class = SponsorTicketLimitSerializer
    permission_classes = [AllowAny]  # Public access to read ticket limits

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def all_limits(self, request):
        """Get all active sponsor ticket limits as a simple mapping"""
        limits = {}
        for limit_obj in self.queryset:
            limits[limit_obj.sponsor_type] = limit_obj.ticket_limit

        return Response({
            'limits': limits,
            'details': SponsorTicketLimitSerializer(self.queryset, many=True).data
        })


class BNIMemberViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BNI members - Full CRUD operations
    - GET: Public access to read members
    - POST/PUT/PATCH/DELETE: Requires authentication (admin only)
    """
    queryset = BNIMember.objects.filter(is_active=True)
    serializer_class = BNIMemberSerializer

    def get_permissions(self):
        """Public can read, only authenticated can create/update/delete"""
        if self.action in ['list', 'retrieve', 'by_chapter', 'search']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """Filter by chapter if provided"""
        queryset = self.queryset
        chapter = self.request.query_params.get('chapter', None)
        if chapter:
            queryset = queryset.filter(chapter=chapter)
        return queryset.order_by('name')

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def by_chapter(self, request):
        """Get all active members for a specific chapter"""
        chapter = request.query_params.get('chapter', 'BNI_CHETTINAD')
        members = self.queryset.filter(chapter=chapter).order_by('name')

        serializer = self.get_serializer(members, many=True)

        return Response({
            'chapter': chapter,
            'count': members.count(),
            'members': serializer.data
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def search(self, request):
        """Search members by name"""
        query = request.query_params.get('q', '')
        chapter = request.query_params.get('chapter', None)

        queryset = self.queryset
        if chapter:
            queryset = queryset.filter(chapter=chapter)

        if query:
            queryset = queryset.filter(name__icontains=query)

        serializer = self.get_serializer(queryset.order_by('name'), many=True)

        return Response({
            'query': query,
            'count': queryset.count(),
            'members': serializer.data
        })

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create new BNI member with automatic ticket limit"""
        sponsor_type = request.data.get('sponsor_type', 'BNI_MEMBERS')
        ticket_limit = SponsorTicketLimit.get_limit(sponsor_type)

        data = request.data.copy()
        data['ticket_limit'] = ticket_limit

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update member - auto-update ticket limit if sponsor type changes"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        data = request.data.copy()
        if 'sponsor_type' in data:
            data['ticket_limit'] = SponsorTicketLimit.get_limit(data['sponsor_type'])

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Soft delete - set is_active=False"""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    @transaction.atomic
    def bulk_create(self, request):
        """
        Bulk create/update from notebook/Excel
        Payload: {"chapter": "BNI_CHETTINAD", "members": [{name, company, sponsor_type}, ...]}
        """
        chapter = request.data.get('chapter', 'BNI_CHETTINAD')
        members_data = request.data.get('members', [])

        if not members_data:
            return Response({'error': 'No members provided'}, status=status.HTTP_400_BAD_REQUEST)

        created_count = 0
        updated_count = 0
        errors = []

        for member_data in members_data:
            try:
                name = member_data.get('name')
                company = member_data.get('company')
                sponsor_type = member_data.get('sponsor_type', 'BNI_MEMBERS')

                if not name or not company:
                    errors.append(f"Skip: missing data - {member_data}")
                    continue

                ticket_limit = SponsorTicketLimit.get_limit(sponsor_type)

                obj, created = BNIMember.objects.update_or_create(
                    name=name,
                    chapter=chapter,
                    defaults={
                        'company': company,
                        'sponsor_type': sponsor_type,
                        'ticket_limit': ticket_limit,
                        'is_active': True
                    }
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            except Exception as e:
                errors.append(f"Error: {member_data.get('name', 'unknown')} - {str(e)}")

        return Response({
            'success': True,
            'chapter': chapter,
            'created': created_count,
            'updated': updated_count,
            'total': len(members_data),
            'errors': errors
        }, status=status.HTTP_200_OK)


class IDCardTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ID card templates - Full CRUD operations
    - GET: Public access to read templates
    - POST/PUT/PATCH/DELETE: Requires authentication (admin only)
    """
    queryset = IDCardTemplate.objects.all()
    serializer_class = IDCardTemplateSerializer

    def get_permissions(self):
        """Public can read, only authenticated can create/update/delete"""
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """Optionally filter by category"""
        queryset = self.queryset
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        return queryset.order_by('category')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def sync_members_to_database(request):
    """
    Sync member data from frontend localStorage to backend database
    Expected payload: array of members with name, company, sponsorType, mobile
    """
    try:
        members = request.data.get('members', [])
        chapter = request.data.get('chapter', 'BNI_CHETTINAD')

        if not members:
            return Response({
                'error': 'No members provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        from .models import BNIMember

        updated_count = 0
        created_count = 0
        errors = []

        for member in members:
            name = member.get('name')
            company = member.get('company')
            sponsor_type = member.get('sponsorType') or 'BNI_MEMBERS'

            if not name or not company:
                errors.append(f"Skipped member with missing name or company")
                continue

            # Get ticket limit based on sponsor type
            ticket_limit = SponsorTicketLimit.get_limit(sponsor_type)

            # Update or create member in database
            obj, created = BNIMember.objects.update_or_create(
                name=name,
                chapter=chapter,
                defaults={
                    'company': company,
                    'sponsor_type': sponsor_type,
                    'ticket_limit': ticket_limit,
                    'is_active': True
                }
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        return Response({
            'success': True,
            'created': created_count,
            'updated': updated_count,
            'total': len(members),
            'errors': errors
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_bulk_registrations(request):
    """
    Get all bulk registrations grouped by booking_group_id
    Returns aggregated data for each bulk booking group
    """
    try:
        # Get all registrations with booking_group_id
        bulk_regs = Registration.objects.filter(
            booking_group_id__isnull=False
        ).order_by('-created_at')

        # Group by booking_group_id
        groups_dict = {}
        for reg in bulk_regs:
            group_id = reg.booking_group_id
            if group_id not in groups_dict:
                groups_dict[group_id] = []
            groups_dict[group_id].append(reg)

        # Build response data
        bulk_groups = []
        for group_id, registrations in groups_dict.items():
            # Find primary member
            primary_member = next((r for r in registrations if r.is_primary_booker), registrations[0])
            additional_members = [r for r in registrations if not r.is_primary_booker]

            # Calculate totals
            # For bulk bookings, only count the primary booker's amount (actual payment received)
            # Additional members show individual amounts but payment was made by primary
            primary_with_payment = next((r for r in registrations if r.is_primary_booker and r.payment_id), None)
            if primary_with_payment:
                # Use only the primary's payment amount (what was actually received from gateway)
                total_amount = float(primary_with_payment.amount)
            else:
                # Fallback to sum of all (for pending/failed bookings or old data)
                total_amount = sum(float(r.amount) for r in registrations)

            total_count = len(registrations)

            # Determine overall payment status
            payment_statuses = [r.payment_status for r in registrations]
            if all(s == 'SUCCESS' for s in payment_statuses):
                overall_status = 'SUCCESS'
            elif all(s == 'PENDING' for s in payment_statuses):
                overall_status = 'PENDING'
            elif all(s == 'FAILED' for s in payment_statuses):
                overall_status = 'FAILED'
            else:
                overall_status = 'MIXED'

            # Get category breakdown
            category_counts = {}
            for reg in registrations:
                cat = reg.registration_for
                category_counts[cat] = category_counts.get(cat, 0) + 1

            bulk_groups.append({
                'booking_group_id': group_id,
                'primary_booker': {
                    'id': primary_member.id,
                    'name': primary_member.primary_booker_name or primary_member.name,
                    'email': primary_member.primary_booker_email or primary_member.email,
                    'mobile': primary_member.primary_booker_mobile or primary_member.mobile_number,
                    'ticket_no': primary_member.ticket_no,
                },
                'total_attendees': total_count,
                'additional_count': len(additional_members),
                'total_amount': total_amount,
                'payment_status': overall_status,
                'category_breakdown': category_counts,
                'created_at': primary_member.created_at.isoformat(),
                'registrations': [
                    {
                        'id': r.id,
                        'ticket_no': r.ticket_no,
                        'name': r.name,
                        'mobile_number': r.mobile_number,
                        'email': r.email,
                        'age': r.age,
                        'location': r.location,
                        'company_name': r.company_name,
                        'registration_for': r.registration_for,
                        'payment_status': r.payment_status,
                        'amount': float(r.amount),
                        'is_primary_booker': r.is_primary_booker,
                    }
                    for r in registrations
                ]
            })

        # Sort by created_at (newest first)
        bulk_groups.sort(key=lambda x: x['created_at'], reverse=True)

        return Response({
            'success': True,
            'count': len(bulk_groups),
            'total_attendees': sum(g['total_attendees'] for g in bulk_groups),
            'bulk_groups': bulk_groups
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_bulk_group_details(request, booking_group_id):
    """
    Get detailed information for a specific bulk booking group
    """
    try:
        # Get all registrations in this booking group
        registrations = Registration.objects.filter(
            booking_group_id=booking_group_id
        ).order_by('-is_primary_booker', 'created_at')

        if not registrations.exists():
            return Response({
                'error': 'Booking group not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Serialize registration data
        serializer = RegistrationSerializer(registrations, many=True)

        # Calculate aggregated data
        total_amount = sum(float(r.amount) for r in registrations)
        primary_member = registrations.filter(is_primary_booker=True).first() or registrations.first()

        return Response({
            'success': True,
            'booking_group_id': booking_group_id,
            'total_attendees': registrations.count(),
            'total_amount': total_amount,
            'primary_booker': {
                'name': primary_member.primary_booker_name or primary_member.name,
                'email': primary_member.primary_booker_email or primary_member.email,
                'mobile': primary_member.primary_booker_mobile or primary_member.mobile_number,
            },
            'registrations': serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def scan_qr_dual_behavior(request, ticket_no):
    """
    DUAL-BEHAVIOR QR SCAN ENDPOINT:
    - If user is authenticated (volunteer/admin): Return attendance page data
    - If user is not authenticated (normal member): Return feedback form data
    """
    try:
        # Try to find the registration
        try:
            registration = Registration.objects.get(ticket_no=ticket_no)

            # Check if user is authenticated (volunteer/admin)
            if request.user.is_authenticated and request.user.is_staff:
                # VOLUNTEER FLOW - Return data for attendance marking
                return Response({
                    'flow': 'attendance',
                    'success': True,
                    'ticket_no': ticket_no,
                    'name': registration.name,
                    'mobile': registration.mobile_number,
                    'email': registration.email,
                    'company': registration.company_name,
                    'registration_for': registration.registration_for,
                    'payment_status': registration.payment_status,
                    'amount': str(registration.amount),
                    'message': 'Authenticated user - proceed to attendance page'
                }, status=status.HTTP_200_OK)
            else:
                # PUBLIC MEMBER FLOW - Return data for feedback form
                # Check if feedback already submitted
                feedback_exists = EventFeedback.objects.filter(registration=registration).exists()

                return Response({
                    'flow': 'feedback',
                    'success': True,
                    'ticket_no': ticket_no,
                    'name': registration.name,
                    'registration_for': registration.registration_for,
                    'feedback_submitted': feedback_exists,
                    'message': 'Please provide your feedback' if not feedback_exists else 'Feedback already submitted'
                }, status=status.HTTP_200_OK)

        except Registration.DoesNotExist:
            return Response({
                'error': 'Ticket not found. Please check the ticket number.'
            }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({
            'error': f'Error processing scan: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def scan_ticket(request, ticket_no):
    """
    Public endpoint to scan a ticket and return registration details
    Also logs the scan activity (LEGACY - kept for backward compatibility)
    """
    try:
        # Try to find the registration
        try:
            registration = Registration.objects.get(ticket_no=ticket_no)

            # Check if payment is successful
            if registration.payment_status != 'SUCCESS':
                # Log failed scan
                ScanLog.objects.create(
                    registration=registration,
                    ticket_no=ticket_no,
                    action='SCAN_FAILED',
                    scanned_by='scanner',
                    notes=f'Payment not successful: {registration.payment_status}'
                )

                return Response({
                    'error': f'Invalid ticket. Payment status: {registration.payment_status}',
                    'payment_status': registration.payment_status
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if this ticket was already scanned (duplicate check)
            previous_scan = ScanLog.objects.filter(
                ticket_no=ticket_no,
                action='CHECK_IN'
            ).order_by('-scanned_at').first()

            if previous_scan:
                # DUPLICATE SCAN - Already checked in
                # Create a log for the duplicate scan attempt
                ScanLog.objects.create(
                    registration=registration,
                    ticket_no=ticket_no,
                    action='CHECK_IN',
                    scanned_by='scanner',
                    notes=f'Duplicate scan - Already checked in at {previous_scan.scanned_at.strftime("%Y-%m-%d %H:%M:%S")}'
                )

                return Response({
                    'success': True,
                    'already_checked_in': True,
                    'first_scan_time': previous_scan.scanned_at.isoformat(),
                    'name': registration.name,
                    'mobile': registration.mobile_number,
                    'email': registration.email,
                    'payment_status': registration.payment_status,
                    'amount': str(registration.amount),
                    'registration_for': registration.registration_for,
                    'ticket_no': ticket_no,
                    'message': f'Already checked in at {previous_scan.scanned_at.strftime("%I:%M %p on %b %d")}'
                }, status=status.HTTP_200_OK)
            else:
                # FIRST TIME SCAN - Welcome!
                # Log successful scan
                ScanLog.objects.create(
                    registration=registration,
                    ticket_no=ticket_no,
                    action='CHECK_IN',
                    scanned_by='scanner',
                    notes='First time check-in - Welcome!'
                )

                # Return registration details with first_time flag
                return Response({
                    'success': True,
                    'already_checked_in': False,
                    'first_time': True,
                    'name': registration.name,
                    'mobile': registration.mobile_number,
                    'email': registration.email,
                    'payment_status': registration.payment_status,
                    'amount': str(registration.amount),
                    'registration_for': registration.registration_for,
                    'ticket_no': ticket_no,
                    'message': f'Welcome {registration.name}!'
                }, status=status.HTTP_200_OK)

        except Registration.DoesNotExist:
            # Log failed scan
            ScanLog.objects.create(
                registration=None,
                ticket_no=ticket_no,
                action='SCAN_FAILED',
                scanned_by='scanner',
                notes='Ticket not found'
            )

            return Response({
                'error': 'Ticket not found. Please check the ticket number.'
            }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({
            'error': f'Error processing scan: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== VIP REGISTRATION ENDPOINT ====================

@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def vip_registration(request):
    """
    VIP Registration endpoint - no payment required
    POST: Create a new VIP registration
    GET: List all VIP registrations (admin only)
    """
    if request.method == 'GET':
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        vip_regs = Registration.objects.filter(registration_for='VIP').order_by('-created_at')
        serializer = RegistrationSerializer(vip_regs, many=True)
        return Response({'success': True, 'count': vip_regs.count(), 'registrations': serializer.data})

    # POST - Create VIP registration
    name = request.data.get('name', '').strip()
    company_name = request.data.get('company_name', '').strip()
    registered_by = request.data.get('registered_by', '').strip()
    mobile_number = request.data.get('mobile_number', '').strip()

    if not name:
        return Response({'error': 'VIP Name is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not mobile_number:
        return Response({'error': 'Mobile Number is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not registered_by:
        return Response({'error': 'Registered By is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        registration = Registration.objects.create(
            name=name,
            mobile_number=mobile_number,
            company_name=company_name,
            primary_booker_name=registered_by,
            registration_for='VIP',
            payment_status='SUCCESS',
            amount=0,
            location='',
            is_primary_booker=True,
        )
        return Response({
            'success': True,
            'ticket_no': registration.ticket_no,
            'name': registration.name,
            'company_name': registration.company_name,
            'registered_by': registration.primary_booker_name,
            'registration_for': registration.registration_for,
            'message': f'VIP Registration successful! Ticket: {registration.ticket_no}'
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== SPECIAL REGISTRATION ENDPOINT (VOLUNTEERS & ORGANISERS) ====================

@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def special_registration(request):
    """
    Special Registration endpoint for Volunteers & Organisers - no payment required
    POST: Create a new Volunteer or Organiser registration
          Requires 'registration_for' field: VOLUNTEERS or ORGANISERS
    GET:  List registrations for a given category (admin only)
          Query param: ?category=VOLUNTEERS or ?category=ORGANISERS
    """
    ALLOWED_CATEGORIES = ['VOLUNTEERS', 'ORGANISERS']

    if request.method == 'GET':
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        category = request.query_params.get('category', '').upper()
        if category not in ALLOWED_CATEGORIES:
            return Response({'error': f'Invalid category. Must be one of: {", ".join(ALLOWED_CATEGORIES)}'}, status=status.HTTP_400_BAD_REQUEST)
        regs = Registration.objects.filter(registration_for=category).order_by('-created_at')
        serializer = RegistrationSerializer(regs, many=True)
        return Response({'success': True, 'count': regs.count(), 'registrations': serializer.data})

    # POST - Create registration
    registration_for = request.data.get('registration_for', '').strip().upper()
    name = request.data.get('name', '').strip()
    company_name = request.data.get('company_name', '').strip()
    registered_by = request.data.get('registered_by', '').strip()
    mobile_number = request.data.get('mobile_number', '').strip()

    if registration_for not in ALLOWED_CATEGORIES:
        return Response({'error': f'Invalid registration type. Must be one of: {", ".join(ALLOWED_CATEGORIES)}'}, status=status.HTTP_400_BAD_REQUEST)
    if not name:
        return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not mobile_number:
        return Response({'error': 'Mobile Number is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not registered_by:
        return Response({'error': 'Registered By is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        registration = Registration.objects.create(
            name=name,
            mobile_number=mobile_number,
            company_name=company_name,
            primary_booker_name=registered_by,
            registration_for=registration_for,
            payment_status='SUCCESS',
            amount=0,
            location='',
            is_primary_booker=True,
        )
        category_label = 'Volunteer' if registration_for == 'VOLUNTEERS' else 'Organiser'
        return Response({
            'success': True,
            'ticket_no': registration.ticket_no,
            'name': registration.name,
            'company_name': registration.company_name,
            'registered_by': registration.primary_booker_name,
            'registration_for': registration.registration_for,
            'message': f'{category_label} Registration successful! Ticket: {registration.ticket_no}'
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== FEEDBACK ENDPOINTS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def submit_feedback(request):
    """
    Submit event feedback for a ticket
    Public endpoint - allows anyone to submit feedback once per ticket
    """
    try:
        serializer = EventFeedbackSubmitSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            feedback = serializer.save()

            # Return success with feedback details
            response_serializer = EventFeedbackSerializer(feedback)
            return Response({
                'success': True,
                'message': 'Thank you for your feedback!',
                'feedback': response_serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'error': 'Invalid feedback data',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        return Response({
            'error': f'Error submitting feedback: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_feedback_status(request, ticket_no):
    """
    Check if feedback has been submitted for a ticket
    Public endpoint
    """
    try:
        registration = Registration.objects.get(ticket_no=ticket_no)
        feedback = EventFeedback.objects.filter(registration=registration).first()

        if feedback:
            return Response({
                'submitted': True,
                'submitted_at': feedback.submitted_at,
                'overall_rating': feedback.overall_rating
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'submitted': False,
                'message': 'No feedback submitted yet'
            }, status=status.HTTP_200_OK)

    except Registration.DoesNotExist:
        return Response({
            'error': 'Invalid ticket number'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_feedback(request):
    """
    Get all feedback submissions (admin only)
    Supports filtering by rating, category, etc.
    """
    try:
        feedbacks = EventFeedback.objects.all().select_related('registration')

        # Filter by category if provided
        category = request.query_params.get('category')
        if category:
            feedbacks = feedbacks.filter(registration__registration_for=category)

        # Filter by minimum rating if provided
        min_rating = request.query_params.get('min_rating')
        if min_rating:
            feedbacks = feedbacks.filter(overall_rating__gte=int(min_rating))

        serializer = EventFeedbackSerializer(feedbacks, many=True)

        # Calculate statistics
        total_feedback = feedbacks.count()
        avg_overall = feedbacks.aggregate(avg=models.Avg('overall_rating'))['avg'] or 0
        avg_speaker = feedbacks.aggregate(avg=models.Avg('speaker_rating'))['avg'] or 0

        # Count willingness to join BNI
        join_yes = feedbacks.filter(attend_future='YES').count()
        join_maybe = feedbacks.filter(attend_future='MAYBE').count()
        join_no = feedbacks.filter(attend_future='NO').count()

        return Response({
            'success': True,
            'total_feedback': total_feedback,
            'average_rating': round(avg_overall, 2),
            'average_speaker_rating': round(avg_speaker, 2),
            'join_bni': {
                'yes': join_yes,
                'maybe': join_maybe,
                'no': join_no
            },
            'feedback': serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_feedback(request, feedback_id):
    """
    Delete a specific feedback entry (admin only)
    """
    try:
        feedback = EventFeedback.objects.get(id=feedback_id)
        feedback.delete()

        return Response({
            'success': True,
            'message': 'Feedback deleted successfully'
        }, status=status.HTTP_200_OK)

    except EventFeedback.DoesNotExist:
        return Response({
            'error': 'Feedback not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
