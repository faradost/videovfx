from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Project, Bid, Review # Added Project, Bid, Review

# Register your models here.

class UserAdmin(BaseUserAdmin):
    # Define which fields to display in the list view
    list_display = ('email', 'username', 'full_name', 'user_type', 'is_staff', 'is_active')
    # Define which fields to use for searching
    search_fields = ('email', 'username', 'full_name')
    # Define which fields to use for filtering
    list_filter = ('user_type', 'is_staff', 'is_active')

    # Use the default fieldsets for editing, but ensure custom fields are included
    # Or, customize fieldsets if needed:
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('username', 'full_name', 'user_type', 'profile_picture_url', 'skills', 'bio')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'full_name', 'user_type', 'password_1', 'password_2'),
        }),
    )
    ordering = ('email',)

admin.site.register(User, UserAdmin)

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'client', 'status', 'creation_date', 'deadline_date', 'selected_freelancer', 'category')
    list_filter = ('status', 'category', 'creation_date')
    search_fields = ('title', 'description', 'client__email', 'selected_freelancer__email')
    date_hierarchy = 'creation_date'
    raw_id_fields = ('client', 'selected_freelancer') # For easier selection of users

@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ('project_title', 'freelancer_email', 'bid_amount', 'bid_date', 'status')
    list_filter = ('status', 'bid_date')
    search_fields = ('project__title', 'freelancer__email', 'proposal_text')
    date_hierarchy = 'bid_date'
    raw_id_fields = ('project', 'freelancer')

    def project_title(self, obj):
        return obj.project.title
    project_title.short_description = 'Project Title'

    def freelancer_email(self, obj):
        return obj.freelancer.email
    freelancer_email.short_description = 'Freelancer Email'

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('project_title', 'reviewer_email', 'reviewee_email', 'rating', 'review_date')
    list_filter = ('rating', 'review_date')
    search_fields = ('project__title', 'reviewer__email', 'reviewee__email', 'comment')
    date_hierarchy = 'review_date'
    raw_id_fields = ('project', 'reviewer', 'reviewee')

    def project_title(self, obj):
        return obj.project.title
    project_title.short_description = 'Project Title'

    def reviewer_email(self, obj):
        return obj.reviewer.email
    reviewer_email.short_description = 'Reviewer Email'

    def reviewee_email(self, obj):
        return obj.reviewee.email
    reviewee_email.short_description = 'Reviewee Email'
