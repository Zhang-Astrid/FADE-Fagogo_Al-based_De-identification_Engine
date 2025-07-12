from django.contrib import admin
from .models import Document, ProcessedDocument, ProcessingLog

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['document_code', 'user', 'filename', 'file_size', 'status', 'upload_time']
    list_filter = ['status', 'upload_time']
    search_fields = ['document_code', 'filename', 'user__username']
    readonly_fields = ['document_code', 'upload_time']
    ordering = ['-upload_time']

@admin.register(ProcessedDocument)
class ProcessedDocumentAdmin(admin.ModelAdmin):
    list_display = ['id', 'document', 'config_hash', 'status', 'process_time', 'processing_time']
    list_filter = ['status', 'process_time']
    search_fields = ['document__filename', 'config_hash']
    readonly_fields = ['process_time', 'processing_time']
    ordering = ['-process_time']

@admin.register(ProcessingLog)
class ProcessingLogAdmin(admin.ModelAdmin):
    list_display = ['field_name', 'field_type', 'processing_method', 'status', 'confidence', 'created_at']
    list_filter = ['status', 'field_type', 'processing_method', 'created_at']
    search_fields = ['field_name', 'error_message']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
