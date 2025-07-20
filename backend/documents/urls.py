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
    path('processed_list/', views.get_user_processed_documents, name='get_user_processed_documents'),
    path('preview/<str:document_code>/<int:processed_id>/', views.preview_document, name='preview_document'),
    path('processed-info/<int:processed_id>/', views.processed_document_info, name='processed_document_info'),
    path('export_all/', views.export_all_processed_documents, name='export_all_processed_documents'),
    
    # 系统配置
    path('config_options/', views.get_system_config_options, name='get_system_config_options'),
    
    # 仪表板统计
    path('dashboard_stats/', views.get_dashboard_stats, name='get_dashboard_stats'),
] 