from django.shortcuts import render
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from trip_app.models import Trip
from .models import Group
from .serializers import GroupSerializer
from rest_framework.permissions import IsAuthenticated


class GroupById(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, group_id):
        group = get_object_or_404(Group, id=group_id)
        serializer = GroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)

class AllUserGroups(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        current_user = request.user
        groups = Group.objects.filter(auth_user=current_user)
        serializer = GroupSerializer(groups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class GroupByTripId(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, trip_id):
        group = get_object_or_404(Group, trip=trip_id)
        serializer = GroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CreateGroup(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            trip = get_object_or_404(Trip, id=request.data.get("trip_id"))
        except (ValueError, TypeError):
            return Response(
                {"detail": "\"trip_id\" must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group, created = Group.objects.get_or_create(trip=trip)
        group.auth_user.add(request.user)

        serializer = GroupSerializer(group)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

