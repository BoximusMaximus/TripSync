from django.db import models

# Create your models here.
class Trip(models.Model):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=60)
    state = models.CharField(max_length=60)
    # optional - many destinations have no US-style code; default="" keeps the migration honest
    # (existing rows get '' without a one-off prompt) and matches Activity.zip / Lodging.zip
    zip = models.CharField(max_length=255, blank=True, default="")
    country = models.CharField(max_length=60)
    def __str__(self):
        return f"TRIP: ID:{self.id} | Name:{self.name} | City:{self.city} | State:{self.state} | Zip:{self.zip} | Country:{self.country}"