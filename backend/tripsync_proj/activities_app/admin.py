from django.contrib import admin
from .models import Activity, ActivityGeocode, ActivityVote, Lodging


#inline so the activity page shows google's receipt row
class ActivityGeocodeInline(admin.StackedInline):
    model = ActivityGeocode


class ActivityAdmin(admin.ModelAdmin):
    inlines = [ActivityGeocodeInline]


admin.site.register(Activity, ActivityAdmin)
admin.site.register(ActivityGeocode)
admin.site.register(ActivityVote)
admin.site.register(Lodging)
