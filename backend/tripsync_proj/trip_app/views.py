from django.shortcuts import render
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Trip
from .serializers import TripSerializer
from rest_framework.permissions import IsAuthenticated
from group_app.models import Group


class CreateTrip(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TripSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trip = serializer.save()

        group = Group.objects.create(trip=trip)
        group.auth_user.add(request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TripById(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id)
        serializer = TripSerializer(trip)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id)
        serializer = TripSerializer(trip, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id)
        trip.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

