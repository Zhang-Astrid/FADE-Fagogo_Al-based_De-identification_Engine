#!/usr/bin/env python
"""
清空文档相关数据库数据的脚本
"""
import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from documents.models import Document, ProcessedDocument, ProcessingLog
import shutil

def clear_documents():
    """清空文档相关数据"""
    print("开始清空文档相关数据...")
    
    # 清空处理日志
    log_count = ProcessingLog.objects.count()
    ProcessingLog.objects.all().delete()
    print(f"已删除 {log_count} 条处理日志记录")
    
    # 清空处理后的文档
    processed_count = ProcessedDocument.objects.count()
    ProcessedDocument.objects.all().delete()
    print(f"已删除 {processed_count} 条处理后文档记录")
    
    # 清空原始文档
    doc_count = Document.objects.count()
    Document.objects.all().delete()
    print(f"已删除 {doc_count} 条原始文档记录")
    
    # 清空用户数据
    user_count = User.objects.count()
    User.objects.all().delete()
    print(f"已删除 {user_count} 个用户")
    
    # 清空media文件夹
    media_path = os.path.join(os.path.dirname(__file__), 'media')
    if os.path.exists(media_path):
        shutil.rmtree(media_path)
        print("已清空media文件夹")
    else:
        print("media文件夹不存在")
    
    print("文档数据清空完成！")

if __name__ == '__main__':
    clear_documents() 