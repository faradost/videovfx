from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from .models import Project # Assuming Project is in the same app's models

User = get_user_model() # Already defined

class UserModelTests(TestCase):

    def test_create_client_user(self):
        """Test creating a user with user_type 'client'."""
        email = "client@example.com"
        password = "password123"
        full_name = "Test Client"
        user = User.objects.create_user(
            username="client_abs_uname",
            email=email,
            password=password,
            full_name=full_name,
            user_type='client'
        )
        self.assertEqual(user.email, email)
        self.assertEqual(user.full_name, full_name)
        self.assertEqual(user.user_type, 'client')
        self.assertTrue(user.check_password(password))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_freelancer_user(self):
        """Test creating a user with user_type 'freelancer'."""
        email = "freelancer@example.com"
        password = "password123"
        full_name = "Test Freelancer"
        user = User.objects.create_user(
            username="freelancer_abs_uname",
            email=email,
            password=password,
            full_name=full_name,
            user_type='freelancer',
            skills="Python, Django",
            bio="Experienced developer"
        )
        self.assertEqual(user.email, email)
        self.assertEqual(user.full_name, full_name)
        self.assertEqual(user.user_type, 'freelancer')
        self.assertEqual(user.skills, "Python, Django")
        self.assertEqual(user.bio, "Experienced developer")
        self.assertTrue(user.check_password(password))

    def test_user_email_is_username_field_for_login(self):
        """Test that the email field is used as the USERNAME_FIELD for authentication."""
        login_email = "loginfield@example.com"
        abstract_user_username_field_value = "internal_username_value"

        user = User.objects.create_user(
            username=abstract_user_username_field_value,
            email=login_email,
            password="password123",
            full_name="Test User",
            user_type='client'
        )
        self.assertEqual(user.get_username(), login_email)
        self.assertEqual(user.username, abstract_user_username_field_value)

    def test_create_user_with_username_field_as_none_fails(self):
        """Test creating a user where the USERNAME_FIELD (email) is None."""
        with self.assertRaisesMessage(ValueError, "The given username must be set"):
            User.objects.create_user(
                username=None, # This maps to USERNAME_FIELD (email)
                password="password123",
                full_name="Test User FullName", # Must be provided as it's required by our model's definition
                user_type='client',
                # The actual User.username (AbstractUser's field) also needs a value.
                # Django's BaseUserManager by default sets the AbstractUser.username field
                # to the value of the USERNAME_FIELD if 'username' is not in extra_fields.
                # So, we don't strictly need to pass another 'username_actual' here for this test's purpose,
                # as the failure for USERNAME_FIELD being None should occur first.
            )

    def test_email_uniqueness(self):
        """Test that email addresses (our USERNAME_FIELD) must be unique."""
        email = "unique@example.com"
        User.objects.create_user(username="user1_abs_uname", email=email, password="pass1", user_type='client', full_name="User One")
        with self.assertRaises(IntegrityError):
            User.objects.create_user(username="user2_abs_uname", email=email, password="pass2", user_type='freelancer', full_name="User Two")

    def test_actual_username_field_uniqueness(self):
        """Test that the AbstractUser 'username' field also remains unique."""
        common_username = "common_abstract_username"
        User.objects.create_user(username=common_username, email="email1@example.com", password="pass1", user_type='client', full_name="User One")
        with self.assertRaises(IntegrityError):
            User.objects.create_user(username=common_username, email="email2@example.com", password="pass2", user_type='freelancer', full_name="User Two")

    def test_user_str_representation(self):
        """Test the string representation of the User model."""
        email = "strrep@example.com"
        user = User.objects.create_user(
            username="strrep_abs_uname",
            email=email,
            password="password123",
            full_name="String Rep Test",
            user_type='client'
        )
        self.assertEqual(str(user), email)

    def test_create_superuser(self):
        """Test creating a superuser."""
        email = "super@example.com"
        password = "superpassword"
        # For create_superuser, we need to provide 'username' (for AbstractUser.username)
        # and 'email' (for User.email, our USERNAME_FIELD).
        # The manager will handle these.
        user = User.objects.create_superuser(
            username="super_abs_uname",
            email=email,
            password=password,
            full_name="Super User",
            user_type='client'
        )
        self.assertEqual(user.email, email)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.user_type, 'client')
        self.assertTrue(user.check_password(password))

    def test_create_user_missing_custom_required_fields(self):
        """Test creating user without custom required field 'full_name'."""
        # `full_name` is CharField, no default, not nullable. Expect empty string by default from manager.
        user_missing_fullname = User.objects.create_user(
            username="test_fn_abs_uname",
            email="testfn@example.com",
            password="password",
            user_type='client' # full_name is missing
        )
        self.assertEqual(user_missing_fullname.full_name, "")

        # user_type has a default, so not providing it should use the default.
        user_default_type = User.objects.create_user(
            username="test_dt_abs_uname",
            email="default_type@example.com",
            password="password",
            full_name="Full Name For Default Type"
            # user_type not provided
        )
        self.assertEqual(user_default_type.user_type, 'client')

        # Test missing the first positional argument to create_user (which maps to USERNAME_FIELD)
        # This first argument is 'username' for BaseUserManager, which becomes our 'email'.
        with self.assertRaisesMessage(TypeError, "create_user() missing 1 required positional argument: 'username'"):
             User.objects.create_user(password="pw", full_name="FN", user_type="client")


class ProjectAPITests(TestCase):
    def setUp(self):
        self.client_api = APIClient() # For making API requests

        # Create users
        self.client_user = User.objects.create_user(
            username="clientuser_abs_uname", # AbstractUser username
            email="clientuser@example.com",   # Our USERNAME_FIELD
            password="password123",
            full_name="Project API Client",
            user_type='client'
        )
        self.freelancer_user = User.objects.create_user(
            username="freelanceruser_abs_uname", # AbstractUser username
            email="freelanceruser@example.com",    # Our USERNAME_FIELD
            password="password123",
            full_name="Project API Freelancer",
            user_type='freelancer'
        )

        # Create a project by the client_user
        self.project1 = Project.objects.create(
            client=self.client_user,
            title="Test Project 1 by API Client",
            description="A description for test project 1.",
            category="Web Development",
            budget_range_min=100,
            budget_range_max=500
        )

        # Make sure your project's urls.py has `router.register(r'projects', ProjectViewSet, basename='project')`
        # or similar for this to work if using DefaultRouter.
        # If you defined urlpatterns manually, use the name you gave to the projects list view.
        try:
            self.projects_url = reverse('project-list')
        except Exception as e:
            # Fallback or specific name if 'project-list' is not found.
            # This might happen if the basename in router registration is different,
            # or if not using a router and the url name is different.
            # e.g., if app_name='api' is set in api/urls.py, it might be 'api:project-list'
            # For now, we assume 'project-list' is standard for a ModelViewSet.
            print(f"Warning: Could not reverse 'project-list'. Ensure your URL patterns are named correctly. Error: {e}")
            self.projects_url = '/api/projects/' # Fallback to direct path


    def test_unauthenticated_user_cannot_list_projects(self):
        """Test that unauthenticated users receive 401 when listing projects."""
        response = self.client_api.get(self.projects_url)
        # Projects list view requires authentication (as per ProjectViewSet permissions)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_client_can_list_projects(self):
        """Test that an authenticated client user can list projects."""
        self.client_api.force_authenticate(user=self.client_user)
        response = self.client_api.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # If pagination is active, response.data is a dict with 'results'.
        # If not, response.data is directly the list of projects.
        if isinstance(response.data, dict):
            project_list = response.data.get('results')
        else:
            project_list = response.data # Direct list

        self.assertIsNotNone(project_list, "Project list should not be None")
        self.assertEqual(len(project_list), 1)
        self.assertEqual(project_list[0]['title'], self.project1.title)

    def test_authenticated_freelancer_can_list_projects(self):
        """Test that an authenticated freelancer user can list projects."""
        self.client_api.force_authenticate(user=self.freelancer_user)
        response = self.client_api.get(self.projects_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if isinstance(response.data, dict):
            project_list = response.data.get('results')
        else:
            project_list = response.data

        self.assertIsNotNone(project_list, "Project list should not be None")
        self.assertEqual(len(project_list), 1)
        self.assertEqual(project_list[0]['title'], self.project1.title)

    def test_create_project_unauthenticated(self):
        """Test that unauthenticated user cannot create a project."""
        payload = {
            "title": "New Project Unauth",
            "description": "Desc",
            "category": "Test",
            "budget_range_min": 50,
            "budget_range_max": 100
        }
        response = self.client_api.post(self.projects_url, payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_project_by_freelancer_fails(self):
        """Test that a freelancer user cannot create a project (permission denied)."""
        self.client_api.force_authenticate(user=self.freelancer_user)
        payload = {
            "title": "Project By Freelancer",
            "description": "Desc",
            "category": "Test",
            "budget_range_min": 50,
            "budget_range_max": 100
        }
        response = self.client_api.post(self.projects_url, payload)
        # ProjectViewSet's create action requires IsClientUser permission
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_project_by_client_succeeds(self):
        """Test that a client user can create a project."""
        self.client_api.force_authenticate(user=self.client_user)
        initial_project_count = Project.objects.count()
        payload = {
            "title": "New Project By Client",
            "description": "A detailed description.",
            "category": "Graphic Design",
            "budget_range_min": 200,
            "budget_range_max": 600
            # deadline_date is optional
        }
        response = self.client_api.post(self.projects_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), initial_project_count + 1)
        self.assertEqual(response.data['title'], payload['title'])
        # Client is set automatically by perform_create in the ViewSet
        self.assertEqual(response.data['client'], self.client_user.id)
        # Check if status defaults to 'open'
        self.assertEqual(response.data['status'], 'open')
