from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, viewsets, status as drf_status, serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .serializers import UserSerializer, ProjectSerializer, BidSerializer, ReviewSerializer # Added ReviewSerializer
from .models import Project, User, Bid, Review # Added Review model
from .permissions import (
    IsClientUser, IsOwnerOrReadOnly, IsFreelancerUser,
    IsBidOwnerOrProjectClient, CanUpdateOrDeleteBid,
    CanCreateReview, IsReviewOwnerOrReadOnly # Added Review permissions
)

# User = get_user_model() # Now using User from .models

class UserRegistrationView(generics.CreateAPIView):
    """
    View for user registration.
    Allows any user (authenticated or not) to create a new user account.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny] # Allow any user to register


class ProjectViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows projects to be viewed or edited.
    """
    queryset = Project.objects.all().order_by('-creation_date')
    serializer_class = ProjectSerializer

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'create':
            permission_classes = [permissions.IsAuthenticated, IsClientUser]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
        elif self.action in ['list', 'retrieve']:
            # For now, only authenticated users can see project listings and details.
            # Change to [permissions.AllowAny] if public viewing is desired.
            permission_classes = [permissions.IsAuthenticated]
        else:
            # Default for any other actions (e.g., custom actions on the viewset)
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """
        Automatically set the client of the project to the current logged-in user.
        """
        serializer.save(client=self.request.user)


class BidViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing Bids.
    """
    queryset = Bid.objects.all()
    serializer_class = BidSerializer

    def get_queryset(self):
        """
        Optionally restricts the returned bids to those made by the current user,
        or for a specific project if 'project_id' is in query_params.
        Admins would see all bids.
        For 'list' action, only return bids made by the current freelancer if not admin.
        """
        user = self.request.user
        if not user.is_authenticated:
            return Bid.objects.none()

        if self.action == 'list':
            if user.is_staff: # Admins see all
                return Bid.objects.all()
            if user.user_type == 'freelancer':
                return Bid.objects.filter(freelancer=user).order_by('-bid_date')
            # Clients don't list all bids directly, they see bids per project (handled by project endpoint or custom filter)
            return Bid.objects.none() # Or filter by projects they own: Bid.objects.filter(project__client=user)

        # For other actions (retrieve, update, etc.), the default queryset is fine,
        # as object-level permissions will handle access.
        return super().get_queryset()


    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [permissions.IsAuthenticated, IsFreelancerUser]
        elif self.action == 'retrieve':
            permission_classes = [permissions.IsAuthenticated, IsBidOwnerOrProjectClient]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, CanUpdateOrDeleteBid]
        elif self.action in ['accept_bid', 'reject_bid']:
            # Project owner (client) can accept/reject bids.
            # IsOwnerOrReadOnly checks obj.project.client based on how it's typically used for Project itself.
            # We need to ensure it's adapted or a new permission like IsProjectClient is used.
            # For now, IsOwnerOrReadOnly on the Bid's Project.
            permission_classes = [permissions.IsAuthenticated, IsClientUser, IsOwnerOrReadOnly] # IsOwnerOrReadOnly expects obj.client
                                                                                                # for a Bid, this needs to be obj.project.client
        else: # list, etc.
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        if self.request.user.user_type != 'freelancer':
            raise serializers.ValidationError("Only freelancers can place bids.", code='authorization')
        if project.client == self.request.user:
            raise serializers.ValidationError("You cannot bid on your own project.", code='invalid_bid')
        if project.status != 'open':
            raise serializers.ValidationError("This project is not open for bidding.", code='project_not_open')

        # Check for existing bid by the same freelancer on the same project
        existing_bid = Bid.objects.filter(project=project, freelancer=self.request.user).exists()
        if existing_bid:
            raise serializers.ValidationError("You have already placed a bid on this project.", code='duplicate_bid')

        serializer.save(freelancer=self.request.user)

    # Custom action for a client to accept a bid
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsClientUser]) # Add IsOwnerOrReadOnly later for project client
    def accept_bid(self, request, pk=None):
        bid = self.get_object()

        # Check if the current user is the client for the project of this bid
        if bid.project.client != request.user:
            return Response({'detail': 'You are not authorized to accept bids for this project.'},
                            status=drf_status.HTTP_403_FORBIDDEN)

        if bid.project.status != 'open':
            return Response({'detail': 'This project is not in a state to accept bids (e.g., already in progress or completed).'},
                            status=drf_status.HTTP_400_BAD_REQUEST)

        if bid.status != 'pending':
            return Response({'detail': 'This bid is not pending and cannot be accepted.'},
                            status=drf_status.HTTP_400_BAD_REQUEST)

        bid.status = 'accepted'
        bid.project.selected_freelancer = bid.freelancer
        bid.project.status = 'in_progress'

        bid.save()
        bid.project.save()

        # Optionally, reject other pending bids for the same project
        other_bids = Bid.objects.filter(project=bid.project, status='pending').exclude(pk=bid.pk)
        for other_bid in other_bids:
            other_bid.status = 'rejected'
            other_bid.save()

        return Response(BidSerializer(bid).data)

    # Custom action for a client to reject a bid
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsClientUser]) # Add IsOwnerOrReadOnly later for project client
    def reject_bid(self, request, pk=None):
        bid = self.get_object()

        # Check if the current user is the client for the project of this bid
        if bid.project.client != request.user:
            return Response({'detail': 'You are not authorized to reject bids for this project.'},
                            status=drf_status.HTTP_403_FORBIDDEN)

        if bid.status != 'pending':
            return Response({'detail': 'This bid is not pending and cannot be rejected.'},
                            status=drf_status.HTTP_400_BAD_REQUEST)

        bid.status = 'rejected'
        bid.save()
        return Response(BidSerializer(bid).data)

    # Need to refine permission for accept_bid/reject_bid to check project ownership.
    # The IsOwnerOrReadOnly permission class is designed for obj.client,
    # for a bid, obj.project.client needs to be checked.
    # A dedicated permission class like IsProjectClientForBidObject might be better.
    # For now, the check is manual within the action methods.


class ReviewViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing Reviews.
    """
    queryset = Review.objects.all().order_by('-review_date')
    serializer_class = ReviewSerializer

    def get_queryset(self):
        """
        Filter reviews based on query parameters 'project_id' or 'reviewee_id' (user_id).
        """
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project_id')
        reviewee_id = self.request.query_params.get('reviewee_id') # user_id of the one being reviewed

        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if reviewee_id:
            queryset = queryset.filter(reviewee_id=reviewee_id)

        return queryset

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [permissions.IsAuthenticated, CanCreateReview]
        elif self.action in ['list', 'retrieve']:
            permission_classes = [permissions.IsAuthenticated] # Or AllowAny if public
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsReviewOwnerOrReadOnly]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        """
        Sets the reviewer to the current user and performs comprehensive validation
        beyond what the serializer's basic validate method might do, leveraging
        the fact that `request.user` is available here directly as the reviewer.
        The serializer's `validate` method already does most of the checks
        assuming `request.user` is passed in its context.
        """
        project = serializer.validated_data['project']
        reviewee = serializer.validated_data['reviewee']
        reviewer = self.request.user

        # Basic validation (already in serializer but good for defense-in-depth)
        if reviewer == reviewee:
            raise drf_serializers.ValidationError("You cannot review yourself.")
        if project.status != 'completed':
            raise drf_serializers.ValidationError("Reviews can only be submitted for completed projects.")

        # Check reviewer's role in the project
        is_client_reviewer = (project.client == reviewer)
        is_freelancer_reviewer = (project.selected_freelancer == reviewer)

        if not (is_client_reviewer or is_freelancer_reviewer):
            raise drf_serializers.ValidationError("You must be the client or the selected freelancer to review this project.")

        # Check if reviewee is the other party
        if is_client_reviewer and project.selected_freelancer != reviewee:
            raise drf_serializers.ValidationError("As the client, you can only review the selected freelancer for this project.")
        if is_freelancer_reviewer and project.client != reviewee:
            raise drf_serializers.ValidationError("As the freelancer, you can only review the client for this project.")

        # Ensure reviewee is actually involved, this is a safeguard.
        if reviewee not in [project.client, project.selected_freelancer]:
             raise drf_serializers.ValidationError("The person being reviewed is not associated with this project.")

        # Prevent duplicate reviews (also in serializer, but good for defense)
        if Review.objects.filter(project=project, reviewer=reviewer, reviewee=reviewee).exists():
            raise drf_serializers.ValidationError("You have already submitted a review for this user on this project.")

        serializer.save(reviewer=reviewer)
