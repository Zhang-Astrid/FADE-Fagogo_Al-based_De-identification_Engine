from django.db import models
from django.contrib.auth.models import User
import uuid
import os

def user_document_path(instance, filename):
    """生成用户文档存储路径: media/用户名/文档编码/origin.pdf"""
    return f'{instance.user.username}/{instance.document_code}/origin.pdf'

def processed_document_path(instance, filename):
    """生成处理后文档存储路径: media/用户名/文档编码/processed_配置编码.pdf"""
    config_hash = f"{instance.config_hash}" if instance.config_hash else "default"
    return f'{instance.document.user.username}/{instance.document.document_code}/processed_{config_hash}.pdf'

class Document(models.Model):
    """文档模型 - 存储上传的原始文档信息"""
    document_code = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    original_file = models.FileField(upload_to=user_document_path)
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()  # 文件大小(bytes)
    file_hash = models.CharField(max_length=32, blank=True, null=True)  # 文件MD5哈希值
    page_count = models.IntegerField(default=0)  # PDF页数
    upload_time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('uploaded', '已上传'),
        ('processing', '处理中'),
        ('processed', '已处理'),
        ('failed', '处理失败')
    ], default='uploaded')
    
    # OCR识别结果存储
    ocr_text = models.TextField(blank=True, null=True)  # OCR识别的文本
    ocr_data = models.JSONField(default=dict)  # OCR识别的详细数据(坐标等)
    
    class Meta:
        ordering = ['-upload_time']
        # 添加唯一约束：同一用户不能上传相同哈希的文件
        unique_together = ['user', 'file_hash']
    
    def __str__(self):
        return f"{self.filename} ({self.user.username})"
    
    def get_storage_path(self):
        """获取文档存储路径"""
        return os.path.join('media', self.user.username, self.document_code)

class ProcessedDocument(models.Model):
    """
    处理后的文档模型 - 存储不同配置处理后的文档
    """
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='processed_versions')
    config_hash = models.CharField(max_length=64)  # 配置的哈希值
    config_data = models.JSONField()  # 处理配置(字段选择、模糊方式等)
    processed_file = models.FileField(upload_to=processed_document_path, blank=True, null=True)
    process_time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', '等待处理'),
        ('processing', '处理中'),
        ('completed', '处理完成'),
        ('failed', '处理失败')
    ], default='pending')
    
    # 处理结果统计
    total_fields = models.IntegerField(default=0)
    processed_fields = models.IntegerField(default=0)
    failed_fields = models.IntegerField(default=0)
    processing_time = models.FloatField(default=0.0)  # 处理耗时(秒)
    
    class Meta:
        ordering = ['-process_time']
        unique_together = ('document', 'config_hash')
    
    def __str__(self):
        return f"{self.document.filename} - {self.config_hash}"

class ProcessingLog(models.Model):
    """处理日志模型 - 记录处理过程中的详细信息"""
    processed_document = models.ForeignKey(ProcessedDocument, on_delete=models.CASCADE, related_name='logs')
    field_name = models.CharField(max_length=100)
    field_type = models.CharField(max_length=50)  # 字段类型(姓名、地址等)
    processing_method = models.CharField(max_length=50)  # 处理方式(模糊、遮挡等)
    status = models.CharField(max_length=20, choices=[
        ('success', '成功'),
        ('failed', '失败'),
        ('skipped', '跳过')
    ])
    confidence = models.FloatField(default=0.0)  # 识别置信度
    processing_time = models.FloatField(default=0.0)  # 单个字段处理时间
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.field_name} - {self.status}"
