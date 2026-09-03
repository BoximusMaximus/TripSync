from django.contrib import admin

from .models import Activity, ActivityVote

admin.site.register(Activity)
admin.site.register(ActivityVote)
