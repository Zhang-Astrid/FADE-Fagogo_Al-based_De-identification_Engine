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
from .process import process
import asyncio
from time import time
import logging
logger = logging.getLogger(__name__)

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
        
        print(f"[DEBUG] 接收到的 config 参数: {config}")
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
        print(f"[DEBUG] 传递给 process.py 的参数: 路径={document.get_storage_path()}, config={config}, config_hash={config_hash}")
        
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
        start_time = 0
        # task = asyncio.create_task(process(document.get_storage_path(), config, config_hash))
        logger.info(f"文件地址：{document.get_storage_path()}")
        result = process(document.get_storage_path(), config, config_hash)
        # 处理过程
        processed_doc.status = 'processing'
        processed_doc.save()
        
        # 处理完成
        end_time = 1
        if result:
            # 保存处理后PDF到processed_file字段
            processed_pdf_path = os.path.join(document.get_storage_path(), 'outputs', config_hash, 'result.pdf')
            if os.path.exists(processed_pdf_path):
                from django.core.files import File
                with open(processed_pdf_path, 'rb') as f:
                    processed_doc.processed_file.save(f'processed_{config_hash}.pdf', File(f), save=False)
            processed_doc.status = 'completed'
            processed_doc.total_fields = len(config)
            processed_doc.processed_fields = len(config)
            processed_doc.processing_time = end_time - start_time
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
        processed = ProcessedDocument.objects.get(id=processed_id, document=document)
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
