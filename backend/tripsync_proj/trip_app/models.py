from django.db import models

# Create your models here.
class Trip(models.Model):
    name = models.CharField(max_length=255)

    # group_id = models.ForeignKey(Group) Put group here when its app is created

    city = models.CharField(max_length=60)
    state = models.CharField(max_length=60)
    country = models.CharField(max_length=60)