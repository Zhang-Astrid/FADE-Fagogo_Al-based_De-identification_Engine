from django.urls import path
from .views import register_view, login_view, delete_user

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('delete/<int:user_id>/', delete_user, name='delete_user'),
] 