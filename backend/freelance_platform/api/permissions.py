from rest_framework import permissions
from .models import Review, Project, Bid, User # Import all models that might be checked

class IsClientUser(permissions.BasePermission):
    message = "Only client users are authorized to perform this action."
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.user_type == 'client'

class IsOwnerOrReadOnly(permissions.BasePermission): # Specifically for Project client owner
    message = "You do not have permission to edit this project as you are not the owner."
    def has_object_permission(self, request, view, obj): # obj is a Project
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.client == request.user

class IsFreelancerUser(permissions.BasePermission):
    message = "Only freelancer users are authorized to perform this action."
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.user_type == 'freelancer'

class IsBidOwnerOrProjectClient(permissions.BasePermission):
    message = "You must be the bid owner or the project client to view this bid."
    def has_object_permission(self, request, view, obj): # obj is a Bid
        if not request.user or not request.user.is_authenticated:
            return False
        return (obj.freelancer == request.user) or (obj.project.client == request.user)

class CanUpdateOrDeleteBid(permissions.BasePermission):
    message = "You can only update or delete your bid if it is still pending."
    def has_object_permission(self, request, view, obj): # obj is a Bid
        if not request.user or not request.user.is_authenticated:
            return False
        return (obj.freelancer == request.user) and (obj.status == 'pending')

class CanCreateReview(permissions.BasePermission):
    message = "You do not have permission to create a review under the current conditions."
    def has_permission(self, request, view):
        # Basic check; detailed logic is in serializer and view's perform_create.
        return request.user and request.user.is_authenticated

class IsReviewOwnerOrReadOnly(permissions.BasePermission): # Specifically for Review owner
    message = "You can only edit or delete reviews that you authored."
    def has_object_permission(self, request, view, obj): # obj is a Review
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.reviewer == request.user
