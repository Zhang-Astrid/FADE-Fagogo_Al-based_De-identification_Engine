from rest_framework import serializers
from .models import Document, ProcessedDocument, ProcessingLog
from django.contrib.auth.models import User

class DocumentSerializer(serializers.ModelSerializer):
    """文档序列化器"""
    user = serializers.ReadOnlyField(source='user.username')
    file_url = serializers.SerializerMethodField()
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'document_code', 'user', 'filename', 'file_size', 'file_size_mb',
            'page_count', 'upload_time', 'status', 'file_url'
        ]
        read_only_fields = ['document_code', 'upload_time', 'status']
    
    def get_file_url(self, obj):
        """获取文件URL"""
        if obj.original_file:
            return self.context['request'].build_absolute_uri(obj.original_file.url)
        return None
    
    def get_file_size_mb(self, obj):
        """获取文件大小(MB)"""
        return round(obj.file_size / (1024 * 1024), 2)

class ProcessedDocumentSerializer(serializers.ModelSerializer):
    """处理后文档序列化器"""
    document = DocumentSerializer(read_only=True)
    processed_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProcessedDocument
        fields = [
            'id', 'document', 'config_hash', 'config_data', 'processed_file_url',
            'process_time', 'status', 'total_fields', 'processed_fields', 
            'failed_fields', 'processing_time'
        ]
        read_only_fields = ['process_time', 'processing_time']
    
    def get_processed_file_url(self, obj):
        """获取处理后文件URL"""
        if obj.processed_file:
            return self.context['request'].build_absolute_uri(obj.processed_file.url)
        return None

class ProcessingLogSerializer(serializers.ModelSerializer):
    """处理日志序列化器"""
    class Meta:
        model = ProcessingLog
        fields = [
            'id', 'field_name', 'field_type', 'processing_method', 'status',
            'confidence', 'processing_time', 'error_message', 'created_at'
        ]
        read_only_fields = ['created_at']

class DocumentUploadSerializer(serializers.Serializer):
    """文档上传序列化器"""
    file = serializers.FileField()
    
    def validate_file(self, value):
        """验证上传的文件"""
        # 检查文件类型
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError("只支持PDF文件上传")
        
        # 检查文件大小 (限制为50MB)
        if value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("文件大小不能超过50MB")
        
        return value

class DocumentConfigSerializer(serializers.Serializer):
    """文档处理配置序列化器"""
    document_code = serializers.CharField()
    config = serializers.JSONField()
    
    def validate_config(self, value):
        """验证配置格式"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("配置必须是JSON对象")
        
        # 验证配置中的字段和方式
        for field_name, method in value.items():
            if not isinstance(field_name, str) or not isinstance(method, str):
                raise serializers.ValidationError("配置格式错误")
            
            if method not in ['blur', 'cover', 'replace', 'smear']:
                raise serializers.ValidationError(f"不支持的处理方式: {method}")
        
        return value 