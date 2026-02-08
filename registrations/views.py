from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Registration, EventSettings
from .serializers import RegistrationSerializer, EventSettingsSerializer

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
