from django.shortcuts import render
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Trip



# Create your views here.
class TripById(APIView):
    def get(self, request, trip_id):
        trip = get_object_or_404(Trip, id=trip_id,)
        if trip.is_valid():
            pass