from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.http import FileResponse, Http404
from django.conf import settings
import os
import hashlib
import json
from .models import Document, ProcessedDocument, ProcessingLog
from .serializers import (
    DocumentSerializer, ProcessedDocumentSerializer, ProcessingLogSerializer,
    DocumentUploadSerializer, DocumentConfigSerializer
)
import fitz  # PyMuPDF

def calculate_file_hash(file):
    """计算文件的MD5哈希值"""
    hash_md5 = hashlib.md5()
    for chunk in file.chunks():
        hash_md5.update(chunk)
    return hash_md5.hexdigest()

def check_duplicate_file(user, file_hash, filename, file_size):
    """检查是否为重复文件"""
    # 检查是否存在相同哈希的文件
    if file_hash:
        existing_doc = Document.objects.filter(
            user=user, 
            file_hash=file_hash
        ).first()
        if existing_doc:
            return {
                'is_duplicate': True,
                'existing_document': existing_doc,
                'reason': 'file_content'
            }
    
    # 检查是否存在相同文件名和大小的文件
    existing_doc = Document.objects.filter(
        user=user,
        filename=filename,
        file_size=file_size
    ).first()
    if existing_doc:
        return {
            'is_duplicate': True,
            'existing_document': existing_doc,
            'reason': 'filename_size'
        }
    
    return {'is_duplicate': False}

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_document(request):
    """上传文档API"""
    try:
        # 验证上传数据
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = serializer.validated_data['file']
        
        # 计算文件哈希
        file_hash = calculate_file_hash(uploaded_file)
        
        # 检查是否为重复文件
        duplicate_check = check_duplicate_file(request.user, file_hash, uploaded_file.name, uploaded_file.size)
        
        if duplicate_check['is_duplicate']:
            existing_doc = duplicate_check['existing_document']
            doc_serializer = DocumentSerializer(existing_doc, context={'request': request})
            return Response({
                'success': False,
                'error': '文件已存在',
                'message': f'文件 "{uploaded_file.name}" 已存在于您的文档列表中',
                'existing_document': doc_serializer.data,
                'duplicate_reason': duplicate_check['reason']
            }, status=status.HTTP_409_CONFLICT)
        
        # 读取PDF页数
        page_count = 0
        try:
            uploaded_file.seek(0)
            doc = fitz.open(stream=uploaded_file.read(), filetype='pdf')
            page_count = doc.page_count
            uploaded_file.seek(0)
        except Exception as e:
            page_count = 0
        
        # 创建文档记录
        document = Document.objects.create(
            user=request.user,
            original_file=uploaded_file,
            filename=uploaded_file.name,
            file_size=uploaded_file.size,
            file_hash=file_hash,
            page_count=page_count,
            status='uploaded'
        )
        
        # 返回文档信息
        doc_serializer = DocumentSerializer(document, context={'request': request})
        return Response({
            'success': True,
            'message': '文档上传成功',
            'document': doc_serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_documents(request):
    """获取用户的文档列表"""
    try:
        documents = Document.objects.filter(user=request.user)
        serializer = DocumentSerializer(documents, many=True, context={'request': request})
        return Response({
            'success': True,
            'documents': serializer.data
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_document_detail(request, document_code):
    """获取文档详情"""
    try:
        document = Document.objects.get(document_code=document_code, user=request.user)
        serializer = DocumentSerializer(document, context={'request': request})
        return Response({
            'success': True,
            'document': serializer.data
        })
    except Document.DoesNotExist:
        return Response({
            'success': False,
            'error': '文档不存在'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_document(request):
    """处理文档API"""
    try:
        # 验证请求数据
        serializer = DocumentConfigSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        document_code = serializer.validated_data['document_code']
        config = serializer.validated_data['config']
        
        # 获取文档
        try:
            document = Document.objects.get(document_code=document_code, user=request.user)
        except Document.DoesNotExist:
            return Response({
                'success': False,
                'error': '文档不存在'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 生成配置哈希
        config_str = json.dumps(config, sort_keys=True)
        config_hash = hashlib.md5(config_str.encode()).hexdigest()
        
        # 检查是否已有相同配置的处理结果
        existing_processed = ProcessedDocument.objects.filter(
            document=document,
            config_hash=config_hash
        ).first()
        
        if existing_processed:
            # 如果已存在，直接返回
            processed_serializer = ProcessedDocumentSerializer(
                existing_processed, context={'request': request}
            )
            return Response({
                'success': True,
                'message': '使用缓存的处理结果',
                'processed_document': processed_serializer.data
            })
        
        # 创建新的处理记录
        processed_doc = ProcessedDocument.objects.create(
            document=document,
            config_hash=config_hash,
            config_data=config,
            status='pending'
        )
        
        # TODO: 这里应该启动异步任务进行实际处理
        # 目前先模拟处理过程
        processed_doc.status = 'processing'
        processed_doc.save()
        
        # 模拟处理完成
        processed_doc.status = 'completed'
        processed_doc.total_fields = len(config)
        processed_doc.processed_fields = len(config)
        processed_doc.processing_time = 2.5  # 模拟处理时间
        processed_doc.save()
        
        # 创建处理日志
        for field_name, method in config.items():
            ProcessingLog.objects.create(
                processed_document=processed_doc,
                field_name=field_name,
                field_type='custom',
                processing_method=method,
                status='success',
                confidence=0.95,
                processing_time=0.5
            )
        
        processed_serializer = ProcessedDocumentSerializer(
            processed_doc, context={'request': request}
        )
        
        return Response({
            'success': True,
            'message': '文档处理完成',
            'processed_document': processed_serializer.data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_processing_logs(request, processed_document_id):
    """获取处理日志"""
    try:
        processed_doc = ProcessedDocument.objects.get(
            id=processed_document_id,
            document__user=request.user
        )
        logs = ProcessingLog.objects.filter(processed_document=processed_doc)
        serializer = ProcessingLogSerializer(logs, many=True)
        return Response({
            'success': True,
            'logs': serializer.data
        })
    except ProcessedDocument.DoesNotExist:
        return Response({
            'success': False,
            'error': '处理记录不存在'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_processed_document(request, processed_document_id):
    """下载处理后的文档"""
    try:
        processed_doc = ProcessedDocument.objects.get(
            id=processed_document_id,
            document__user=request.user
        )
        
        if not processed_doc.processed_file:
            return Response({
                'success': False,
                'error': '处理后的文件不存在'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 返回文件下载响应
        file_path = processed_doc.processed_file.path
        if os.path.exists(file_path):
            response = FileResponse(
                open(file_path, 'rb'),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="{processed_doc.document.filename.replace(".pdf", "_processed.pdf")}"'
            return response
        else:
            return Response({
                'success': False,
                'error': '文件不存在'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except ProcessedDocument.DoesNotExist:
        return Response({
            'success': False,
            'error': '处理记录不存在'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_document(request, document_code):
    """删除文档"""
    try:
        document = Document.objects.get(document_code=document_code, user=request.user)
        
        # 删除相关文件
        if document.original_file:
            if os.path.exists(document.original_file.path):
                os.remove(document.original_file.path)
        
        # 删除文档记录(级联删除相关处理记录)
        document.delete()
        
        return Response({
            'success': True,
            'message': '文档删除成功'
        })
        
    except Document.DoesNotExist:
        return Response({
            'success': False,
            'error': '文档不存在'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
