from django.db import models

# Create your models here.
class Trip(models.Model):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=60)
    state = models.CharField(max_length=60)
    country = models.CharField(max_length=60)
    def __str__(self):
        return f"TRIP: ID:{self.id} | Name:{self.name} | City:{self.city} | State:{self.state} | Country:{self.country}"