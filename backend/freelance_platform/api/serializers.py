from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Project, User, Bid, Review # Import Project, User, Bid, Review models

# User = get_user_model() # We are using User from .models

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'full_name', 'user_type', 'username', 'profile_picture_url', 'skills', 'bio')
        extra_kwargs = {
            'username': {'required': True},
            'full_name': {'required': True},
            'user_type': {'required': True},
        }

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            user_type=validated_data['user_type'],
            profile_picture_url=validated_data.get('profile_picture_url'),
            skills=validated_data.get('skills'),
            bio=validated_data.get('bio')
        )
        return user

class ProjectSerializer(serializers.ModelSerializer):
    client = serializers.PrimaryKeyRelatedField(
        read_only=True # Set in perform_create based on request.user
    )
    # Example of how you might include more detailed user info (optional)
    # client_info = UserSerializer(source='client', read_only=True)

    selected_freelancer = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(user_type='freelancer'), # Restrict to freelancers
        allow_null=True,
        required=False
    )
    # Example for selected_freelancer details (optional)
    # selected_freelancer_info = UserSerializer(source='selected_freelancer', read_only=True, allow_null=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description', 'status', 'budget_range_min',
            'budget_range_max', 'creation_date', 'deadline_date', 'client', # 'client_info',
            'selected_freelancer', 'category' # , 'selected_freelancer_info'
        ]
        # client is set via perform_create.
        # creation_date is auto_now_add=True.
        # status is 'open' by default; updates to status might be handled by specific actions
        # rather than direct PATCH, so make it read-only for general updates.
        read_only_fields = ('client', 'creation_date', 'status')


class BidSerializer(serializers.ModelSerializer):
    freelancer = serializers.PrimaryKeyRelatedField(
        read_only=True # Set in perform_create based on request.user
    )
    # To display freelancer details (optional):
    # freelancer_info = UserSerializer(source='freelancer', read_only=True)

    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all() # Allow bidding on any project
        # Add filtering here if needed, e.g., Project.objects.filter(status='open')
        # This queryset is for validation; actual filtering for "open" projects is in the view.
    )
    # To display project details (optional):
    # project_info = ProjectSerializer(source='project', read_only=True)

    class Meta:
        model = Bid
        fields = [
            'id', 'project', 'freelancer', 'bid_amount', 'proposal_text',
            'bid_date', 'status',
            # 'project_info', 'freelancer_info' # if using nested serializers
        ]
        # freelancer is set in perform_create.
        # bid_date is auto_now_add.
        # status is 'pending' by default. Updates to status are handled by specific actions
        # in the ViewSet (accept/reject) or by the freelancer (withdraw/edit if pending).
        read_only_fields = ('freelancer', 'bid_date', 'status')

    def validate_project(self, project):
        """
        Check that the project is open for bidding.
        """
        if project.status != 'open':
            raise serializers.ValidationError("This project is not open for bidding.")
        return project

    def validate(self, data):
        """
        Check that the bidder is not the project client.
        This validation requires access to the request object, which is not directly
        available in the serializer by default. It's better to move this logic
        to the view's perform_create method or pass request context to the serializer.

        For now, we'll assume this check is primarily handled in the view.
        If request context is passed:
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            if data['project'].client == request.user:
                raise serializers.ValidationError("You cannot bid on your own project.")
        """
        return data


class ReviewSerializer(serializers.ModelSerializer):
    reviewer = serializers.PrimaryKeyRelatedField(
        read_only=True # Set in perform_create based on request.user
    )
    # Optional: To display reviewer details:
    # reviewer_info = UserSerializer(source='reviewer', read_only=True)

    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.filter(status='completed') # Only allow reviews for completed projects
    )
    # Optional: To display project details:
    # project_info = ProjectSerializer(source='project', read_only=True)

    reviewee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all() # Can be any user initially, validation in view/serializer.validate()
    )
    # Optional: To display reviewee details:
    # reviewee_info = UserSerializer(source='reviewee', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'project', 'reviewer', 'reviewee', 'rating', 'comment', 'review_date',
            # 'project_info', 'reviewer_info', 'reviewee_info' # if using nested serializers
        ]
        read_only_fields = ('reviewer', 'review_date')

    def validate(self, data):
        project = data['project']
        # Reviewer is set in the view from request.user
        # This means self.context['request'].user should be the reviewer
        reviewer = self.context['request'].user
        reviewee = data['reviewee']

        # 1. Check reviewer is not reviewee
        if reviewer == reviewee:
            raise serializers.ValidationError("You cannot review yourself.")

        # 2. Check project status is 'completed' (also handled by queryset on project field, but good for explicitness)
        if project.status != 'completed':
            raise serializers.ValidationError("Reviews can only be submitted for completed projects.")

        # 3. Check reviewer is client or selected_freelancer for the project
        is_client = (project.client == reviewer)
        is_selected_freelancer = (project.selected_freelancer == reviewer)
        if not (is_client or is_selected_freelancer):
            raise serializers.ValidationError("You must be the client or the selected freelancer to review this project.")

        # 4. Check reviewee is the other party
        if is_client and project.selected_freelancer != reviewee:
            raise serializers.ValidationError(f"As the client, you can only review the selected freelancer ({project.selected_freelancer.email if project.selected_freelancer else 'N/A'}).")
        if is_selected_freelancer and project.client != reviewee:
            raise serializers.ValidationError(f"As the freelancer, you can only review the client ({project.client.email}).")

        # Ensure the reviewee is actually part of the project
        if reviewee not in [project.client, project.selected_freelancer]:
            raise serializers.ValidationError("The reviewee is not associated with this project.")


        # 5. Check for duplicate review (reviewer -> reviewee for this project)
        existing_review = Review.objects.filter(project=project, reviewer=reviewer, reviewee=reviewee).exists()
        if existing_review:
            raise serializers.ValidationError("You have already submitted a review for this user on this project.")

        return data
