from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    USER_TYPE_CHOICES = [
        ('client', _('Client')),
        ('freelancer', _('Freelancer')),
    ]

    # Username is inherited from AbstractUser but we are not using it for login.
    # We set it to None to enforce email as the unique identifier for login.
    # However, AbstractUser requires username. So we keep it, but make email primary.
    username = models.CharField(
        _('username'),
        max_length=150,
        unique=True, # Keep it unique as per AbstractUser, but email will be login field
        help_text=_('Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.'),
        # We can allow blank if email is truly the only thing we'll ever use,
        # but AbstractUser defaults to False. For now, let's keep it as AbstractUser defines.
        # Alternatively, make it non-editable and populate it automatically from email before the @.
        error_messages={
            'unique': _("A user with that username already exists."),
        },
    )
    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(_('full name'), max_length=255)
    user_type = models.CharField(
        _('user type'),
        max_length=20,
        choices=USER_TYPE_CHOICES,
        default='client' # Or set a sensible default
    )
    profile_picture_url = models.URLField(_('profile picture URL'), blank=True, null=True)
    skills = models.TextField(_('skills'), blank=True, null=True) # Relevant for freelancers
    bio = models.TextField(_('bio'), blank=True, null=True)

    # Set email as the field used for logging in
    USERNAME_FIELD = 'email'
    # Fields required when creating a user via createsuperuser command
    # email and password are required by default.
    REQUIRED_FIELDS = ['username', 'full_name', 'user_type']

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')


class Project(models.Model):
    STATUS_CHOICES = [
        ('open', _('Open')),
        ('in_progress', _('In Progress')),
        ('completed', _('Completed')),
        ('cancelled', _('Cancelled')),
    ]

    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'))
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='open'
    )
    budget_range_min = models.DecimalField(
        _('minimum budget'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    budget_range_max = models.DecimalField(
        _('maximum budget'),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    creation_date = models.DateTimeField(_('creation date'), auto_now_add=True)
    deadline_date = models.DateField(_('deadline date'), null=True, blank=True)
    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='projects_created',
        verbose_name=_('client')
    )
    selected_freelancer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projects_assigned',
        verbose_name=_('selected freelancer')
    )
    category = models.CharField(_('category'), max_length=100, blank=True, null=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = _('project')
        verbose_name_plural = _('projects')
        ordering = ['-creation_date']


class Bid(models.Model):
    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('accepted', _('Accepted')),
        ('rejected', _('Rejected')),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='bids',
        verbose_name=_('project')
    )
    freelancer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bids_made',
        verbose_name=_('freelancer')
    )
    bid_amount = models.DecimalField(_('bid amount'), max_digits=10, decimal_places=2)
    proposal_text = models.TextField(_('proposal text'))
    bid_date = models.DateTimeField(_('bid date'), auto_now_add=True)
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    def __str__(self):
        return f"Bid for {self.project.title} by {self.freelancer.email}"

    class Meta:
        verbose_name = _('bid')
        verbose_name_plural = _('bids')
        ordering = ['-bid_date']
        # Ensure a freelancer can bid only once per project
        unique_together = ('project', 'freelancer')


class Review(models.Model):
    RATING_CHOICES = [
        (1, _('1 Star')),
        (2, _('2 Stars')),
        (3, _('3 Stars')),
        (4, _('4 Stars')),
        (5, _('5 Stars')),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name=_('project')
    )
    reviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews_given',
        verbose_name=_('reviewer')
    )
    reviewee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews_received',
        verbose_name=_('reviewee')
    )
    rating = models.IntegerField(_('rating'), choices=RATING_CHOICES)
    comment = models.TextField(_('comment'))
    review_date = models.DateTimeField(_('review date'), auto_now_add=True)

    def __str__(self):
        return f"Review for {self.project.title} by {self.reviewer.email} for {self.reviewee.email}"

    class Meta:
        verbose_name = _('review')
        verbose_name_plural = _('reviews')
        ordering = ['-review_date']
        # Ensure one review per project from a specific reviewer to a specific reviewee
        unique_together = ('project', 'reviewer', 'reviewee')
        constraints = [
            models.CheckConstraint(
                check=~models.Q(reviewer=models.F('reviewee')),
                name='reviewer_cannot_be_reviewee'
            )
        ]
