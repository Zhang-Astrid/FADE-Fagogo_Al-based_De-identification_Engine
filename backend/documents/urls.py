from django.urls import path
from . import views

urlpatterns = [
    # 文档上传和管理
    path('upload/', views.upload_document, name='upload_document'),
    path('list/', views.get_user_documents, name='get_user_documents'),
    path('detail/<str:document_code>/', views.get_document_detail, name='get_document_detail'),
    path('delete/<str:document_code>/', views.delete_document, name='delete_document'),
    
    # 文档处理
    path('process/', views.process_document, name='process_document'),
    path('logs/<int:processed_document_id>/', views.get_processing_logs, name='get_processing_logs'),
    path('download/<int:processed_document_id>/', views.download_processed_document, name='download_processed_document'),
] 