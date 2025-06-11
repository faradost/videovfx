from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserRegistrationView, ProjectViewSet, BidViewSet, ReviewViewSet # Added ReviewViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'bids', BidViewSet, basename='bid')
router.register(r'reviews', ReviewViewSet, basename='review') # Added ReviewViewSet to router

# The API URLs are now determined automatically by the router.
# Additionally, we include the user registration URL.
urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='user_register'),
    path('', include(router.urls)), # Include the router URLs
]
