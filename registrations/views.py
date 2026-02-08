from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Registration, EventSettings, ScanLog
from .serializers import RegistrationSerializer, EventSettingsSerializer, ScanLogSerializer

class RegistrationViewSet(viewsets.ModelViewSet):
    queryset = Registration.objects.all()
    serializer_class = RegistrationSerializer

    def get_permissions(self):
        if self.action == 'create':
            # Allow anyone to create registration (public form)
            permission_classes = [AllowAny]
        else:
            # Only authenticated users (admin) can view/update/delete
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

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


class EventSettingsViewSet(viewsets.ViewSet):
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def list(self, request):
        """Get event settings (public access)"""
        settings = EventSettings.get_settings()
        serializer = EventSettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

    def update(self, request, pk=None):
        """Update event settings (requires authentication)"""
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        settings = EventSettings.get_settings()
        serializer = EventSettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
