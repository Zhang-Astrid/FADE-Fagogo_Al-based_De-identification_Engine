from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .serializers import UserRegisterSerializer, UserLoginSerializer
from django.contrib.auth.models import User
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.permissions import AllowAny
from django.http import JsonResponse
import json
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser

@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            is_staff = data.get('is_staff', False)
            if not username or not password:
                return JsonResponse({'error': '用户名和密码不能为空'}, status=400)
            if User.objects.filter(username=username).exists():
                return JsonResponse({'error': '用户名已存在'}, status=400)
            user = User.objects.create_user(username=username, password=password, is_staff=is_staff)
            return JsonResponse({'success': True, 'user_id': user.id})
        except Exception as e:
            return JsonResponse({'error': 'Server error', 'details': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    return JsonResponse({'error': '用户已被禁用'}, status=403)
                token, created = Token.objects.get_or_create(user=user)
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
                return JsonResponse({
                    'token': token.key,
                    'user_id': user.id,
                    'username': user.username,
                    'is_staff': user.is_staff
                })
            else:
                return JsonResponse({'error': '用户名或密码错误'}, status=401)
        except Exception as e:
            return JsonResponse({'error': 'Server error', 'details': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_user(request, user_id):
    try:
        user = User.objects.get(pk=user_id)
        if user.is_superuser:
            return JsonResponse({'error': '不能删除超级管理员'}, status=403)
        user.delete()
        return JsonResponse({'success': True})
    except User.DoesNotExist:
        return JsonResponse({'error': '用户不存在'}, status=404)
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'details': str(e)}, status=500)
