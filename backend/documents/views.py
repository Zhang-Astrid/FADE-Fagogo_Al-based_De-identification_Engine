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
import random
from .models import Document, ProcessedDocument, ProcessingLog
from .serializers import (
    DocumentSerializer, ProcessedDocumentSerializer, ProcessingLogSerializer,
    DocumentUploadSerializer, DocumentConfigSerializer
)
import fitz  # PyMuPDF
from .process import process
import asyncio
from time import time
import logging
logger = logging.getLogger(__name__)
from django.db import IntegrityError, transaction

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
    """
    上传文档API（多端并发安全版）
    """
    try:
        serializer = DocumentUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        uploaded_file = serializer.validated_data['file']

        # 先将文件内容读入内存，后续所有操作都用副本
        uploaded_file.seek(0)
        file_bytes = uploaded_file.read()
        file_size = len(file_bytes)
        file_name = uploaded_file.name
        content_type = uploaded_file.content_type if hasattr(uploaded_file, 'content_type') else 'application/pdf'

        # 计算hash
        file_hash = hashlib.md5(file_bytes).hexdigest()

        # 计算页数
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype='pdf')
            page_count = doc.page_count
        except Exception:
            page_count = 0

        # 构造InMemoryUploadedFile用于保存
        import io
        from django.core.files.uploadedfile import InMemoryUploadedFile
        file_stream = io.BytesIO(file_bytes)
        uploaded_file_for_save = InMemoryUploadedFile(
            file_stream, None, file_name, content_type, file_size, None
        )

        # 日志输出，便于多端并发调试
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"[UPLOAD] 当前用户: {request.user.id}, 用户名: {request.user.username}, 文件hash: {file_hash}, 文件名: {file_name}")

        try:
            from django.db import transaction, IntegrityError
            with transaction.atomic():
                document, created = Document.objects.get_or_create(
                    user=request.user,
                    file_hash=file_hash,
                    defaults={
                        'original_file': uploaded_file_for_save,
                        'filename': file_name,
                        'file_size': file_size,
                        'page_count': page_count,
                        'status': 'uploaded'
                    }
                )
                if not created:
                    doc_serializer = DocumentSerializer(document, context={'request': request})
                    return Response({
                        'success': False,
                        'error': '文件已存在',
                        'message': f'文件 "{file_name}" 已存在于您的文档列表中',
                        'existing_document': doc_serializer.data,
                        'duplicate_reason': 'file_content'
                    }, status=status.HTTP_409_CONFLICT)
        except IntegrityError:
            document = Document.objects.get(user=request.user, file_hash=file_hash)
            doc_serializer = DocumentSerializer(document, context={'request': request})
            return Response({
                'success': False,
                'error': '文件已存在',
                'message': f'文件 "{file_name}" 已存在于您的文档列表中',
                'existing_document': doc_serializer.data,
                'duplicate_reason': 'file_content'
            }, status=status.HTTP_409_CONFLICT)
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
    """
    处理文档API（异步队列版）
    """
    import logging
    logger = logging.getLogger(__name__)
    from .tasks import process_document_task
    # 验证请求数据
    serializer = DocumentConfigSerializer(data=request.data)
    if not serializer.is_valid():
        logger.warning(f"[PROCESS] 配置无效: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    document_code = serializer.validated_data['document_code']
    config = serializer.validated_data['config']
    logger.warning(f"[PROCESS] 用户: {request.user.id}, 用户名: {request.user.username}, 文档: {document_code}, 配置: {config}")
    # 获取文档
    try:
        document = Document.objects.get(document_code=document_code, user=request.user)
    except Document.DoesNotExist:
        logger.warning(f"[PROCESS] 文档不存在: {document_code} 用户: {request.user.id}")
        return Response({'success': False, 'error': '文档不存在'}, status=status.HTTP_404_NOT_FOUND)
    # 生成配置hash
    import json, hashlib
    config_str = json.dumps(config, sort_keys=True)
    config_hash = hashlib.md5(config_str.encode()).hexdigest()
    # 检查是否已有相同配置的处理结果
    existing_processed = ProcessedDocument.objects.filter(document=document, config_hash=config_hash).first()
    if existing_processed:
        logger.warning(f"[PROCESS] 使用缓存结果: processed_id={existing_processed.id}")
        processed_serializer = ProcessedDocumentSerializer(existing_processed, context={'request': request})
        return Response({'success': True, 'message': '使用缓存的处理结果', 'processed_document': processed_serializer.data})
    # 创建新的处理记录
    processed_doc = ProcessedDocument.objects.create(
        document=document,
        config_hash=config_hash,
        config_data=config,
        status='pending'
    )
    # 分发Celery异步任务（全部用default队列）
    task = process_document_task.apply_async(
        args=[document.id, config, config_hash]
        # 不指定queue，全部走default
    )
    logger.warning(f"[PROCESS] 分发Celery任务: document_id={document.id}, config_hash={config_hash}, queue=default, task_id={task.id}")
    processed_doc.status = 'pending'
    processed_doc.save()
    return Response({
        'success': True,
        'message': '任务已提交，正在排队处理',
        'task_id': task.id,
        'processed_document_id': processed_doc.id,
        'status': 'pending'
    })

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_processed_documents(request):
    """
    获取当前用户所有处理过的文件（ProcessedDocument）
    """
    try:
        processed_docs = ProcessedDocument.objects.filter(document__user=request.user).order_by('-process_time')
        print(f"[DEBUG] 查询到{processed_docs.count()}条处理记录")
        for doc in processed_docs[:3]:
            print(f"[DEBUG] 记录: id={doc.id}, 文件={doc.document.filename}, 配置={doc.config_data}, 状态={doc.status}, 时间={doc.process_time}")
        serializer = ProcessedDocumentSerializer(processed_docs, many=True, context={'request': request})
        return Response({
            'success': True,
            'processed_documents': serializer.data
        })
    except Exception as e:
        print(f"[ERROR] 获取处理记录失败: {e}")
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def preview_document(request, document_code, processed_id):
    """
    获取原始PDF和处理后PDF的URL
    """
    from .models import Document, ProcessedDocument
    try:
        document = Document.objects.get(document_code=document_code, user=request.user)
        processed = ProcessedDocument.objects.get(id=processed_id, document__user=request.user, document=document)
        original_url = request.build_absolute_uri(document.original_file.url) if document.original_file else None
        processed_url = request.build_absolute_uri(processed.processed_file.url) if processed.processed_file else None
        # 可选：返回总页数
        page_count = document.page_count
        return Response({
            'success': True,
            'original_url': original_url,
            'processed_url': processed_url,
            'total_pages': page_count
        })
    except Document.DoesNotExist:
        return Response({'success': False, 'error': '文档不存在'}, status=404)
    except ProcessedDocument.DoesNotExist:
        return Response({'success': False, 'error': '处理记录不存在'}, status=404)
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def processed_document_info(request, processed_id):
    """
    获取处理后文档的详细信息，包括配置、状态、识别到的敏感字段等
    """
    from .models import ProcessedDocument, ProcessingLog
    try:
        processed = ProcessedDocument.objects.get(id=processed_id, document__user=request.user)
        # 处理配置、状态等
        document = processed.document
        doc_info = {
            'document_code': document.document_code,
            'filename': document.filename,
            'file_size': document.file_size,
            'file_size_mb': round(document.file_size / (1024*1024), 2),
            'page_count': document.page_count,
            'upload_time': document.upload_time,
        }
        # 敏感字段（如有）
        logs = ProcessingLog.objects.filter(processed_document=processed)
        sensitive_fields = [
            {
                'type': log.field_name,
                'value': '',  # 可根据需要补充原文内容
                'method': log.processing_method,
                'page': None, # 如有页码可补充
                'status': log.status,
                'confidence': log.confidence,
            }
            for log in logs
        ]
        return Response({
            'success': True,
            'document': doc_info,
            'config': processed.config_data,
            'status': processed.status,
            'process_time': processed.process_time,
            'sensitive_fields': sensitive_fields
        })
    except ProcessedDocument.DoesNotExist:
        return Response({'success': False, 'error': '处理记录不存在'}, status=404)
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.http import StreamingHttpResponse
import zipfile
import io

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_all_processed_documents(request):
    """导出当前用户所有已完成的处理文档为zip"""
    processed_docs = ProcessedDocument.objects.filter(document__user=request.user, status='completed').select_related('document')
    if not processed_docs.exists():
        return Response({'success': False, 'error': '暂无已完成的处理文档'}, status=404)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for pd in processed_docs:
            if pd.processed_file and pd.processed_file.name:
                file_path = pd.processed_file.path
                if not os.path.exists(file_path):
                    continue
                # 文件名格式: 原文件名-配置hash.pdf
                base_name = os.path.splitext(pd.document.filename)[0]
                zip_name = f"{base_name}-{pd.config_hash[:8]}.pdf"
                with open(file_path, 'rb') as f:
                    zip_file.writestr(zip_name, f.read())
    zip_buffer.seek(0)
    response = StreamingHttpResponse(zip_buffer, content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="all_processed_documents.zip"'
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_stats(request):
    """获取仪表板统计数据"""
    try:
        from django.utils import timezone
        from datetime import datetime, timedelta
        from django.db.models import Count, Q
        
        # 获取今天的开始时间
        today = timezone.now().date()
        today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        today_end = timezone.make_aware(datetime.combine(today, datetime.max.time()))
        
        # 今日处理总数
        today_processed = ProcessedDocument.objects.filter(
            document__user=request.user,
            process_time__gte=today_start,
            process_time__lte=today_end
        ).count()
        
        # 今日成功处理数
        today_success = ProcessedDocument.objects.filter(
            document__user=request.user,
            process_time__gte=today_start,
            process_time__lte=today_end,
            status='completed'
        ).count()
        
        # 获取模型状态（这里可以根据实际情况调整）
        model_status = {
            'name': 'ERNIE-3.0-base-chinese',
            'status': '正常运行',
            'mode': 'CPU模式'
        }
        
        # 获取最近处理的文档（最近5个）
        recent_documents = Document.objects.filter(
            user=request.user
        ).order_by('-upload_time')[:5]
        
        recent_records = []
        for doc in recent_documents:
            # 获取最新的处理状态
            latest_processed = ProcessedDocument.objects.filter(
                document=doc
            ).order_by('-process_time').first()
            
            status = 'pending'
            if latest_processed:
                if latest_processed.status == 'completed':
                    status = 'success'
                elif latest_processed.status == 'failed':
                    status = 'fail'
            
            recent_records.append({
                'name': doc.filename,
                'time': doc.upload_time.strftime('%H:%M'),
                'status': status
            })
        
        # 今日已完成处理的所有记录
        today_completed_docs = ProcessedDocument.objects.filter(
            document__user=request.user,
            process_time__gte=today_start,
            process_time__lte=today_end,
            status='completed'
        )
        total_processing_time = sum([doc.processing_time for doc in today_completed_docs])
        total_file_size = sum([doc.document.file_size for doc in today_completed_docs])
        total_file_size_mb = total_file_size / (1024 * 1024) if total_file_size > 0 else 0
        avg_time_per_mb = round(total_processing_time / total_file_size_mb, 2) if total_file_size_mb > 0 else 0
        
        return Response({
            'success': True,
            'stats': {
                'total': today_processed,
                'avg_time_per_mb': avg_time_per_mb
            },
            'model_status': model_status,
            'recent_records': recent_records
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_system_config_options(request):
    """获取系统支持的配置选项"""
    try:
        config_options = {
            'compute_modes': [
                {'value': 'cpu', 'label': 'CPU', 'description': '使用CPU进行计算，适合所有环境'},
                {'value': 'gpu', 'label': 'GPU', 'description': '使用GPU加速计算，需要CUDA环境支持'}
            ],
            'model_types': [
                {'value': 'ner', 'label': 'NER', 'description': '使用NER技术进行文字识别和敏感信息检测'},
                {'value': 'llm', 'label': 'LLM', 'description': '使用大语言模型进行智能文本分析和敏感信息识别'}
            ],
            'processing_methods': [
                {'value': 'black', 'label': '黑条遮挡', 'description': '用黑色矩形遮挡敏感信息'},
                {'value': 'mosaic', 'label': '马赛克', 'description': '用马赛克效果模糊敏感信息'},
                {'value': 'blur', 'label': '高斯模糊', 'description': '用高斯模糊效果处理敏感信息'}
            ],
            'sensitive_fields': [
                {'key': 'name', 'label': '姓名 (NER)', 'description': '识别文档中的个人姓名'},
                {'key': 'address', 'label': '地址 (NER)', 'description': '识别文档中的地址信息'},
                {'key': 'company', 'label': '公司名 (NER)', 'description': '识别文档中的公司名称'},
                {'key': 'email', 'label': '邮箱 (正则)', 'description': '识别文档中的邮箱地址'},
                {'key': 'sens_number', 'label': '长数字字母混合 (正则)', 'description': '识别身份证号、手机号等长数字字母组合'}
            ],
            'defaults': {
                'compute_mode': 'cpu',
                'model_type': 'ner',
                'processing_method': 'black'
            }
        }
        
        return Response({
            'success': True,
            'config_options': config_options
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
