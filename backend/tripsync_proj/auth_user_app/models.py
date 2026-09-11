from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from .validators import  username_format_validate, email_format_validate

class AuthUserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        email = self.normalize_email(email)
        user = self.model(
            email = email,
            username = username,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields["is_staff"] = True
        extra_fields["is_superuser"] = True
        return self.create_user(email=email, username=username, password=password, **extra_fields)



# Create your models here.
class Auth_User (AbstractUser):
    username:str = models.CharField(
        max_length=30,
        unique=True,
        null=False,
        blank=False,
        validators=[username_format_validate],
    )
    email:str = models.EmailField(
        max_length=254,
        unique=True,
        null=False,
        blank=False,
        validators=[email_format_validate],
    )

    USERNAME_FIELD="username"
    REQUIRED_FIELDS=[]
    objects = AuthUserManager()

    def __str__(self):
        return self.username