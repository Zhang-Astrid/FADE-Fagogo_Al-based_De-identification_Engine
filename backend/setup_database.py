#!/usr/bin/env python
"""
设置数据库脚本 - 运行迁移并清空文档数据
"""
import os
import sys
import django
import subprocess

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def run_migrations():
    """运行数据库迁移"""
    print("运行数据库迁移...")
    try:
        subprocess.run(['python', 'manage.py', 'migrate'], check=True)
        print("数据库迁移完成！")
    except subprocess.CalledProcessError as e:
        print(f"数据库迁移失败: {e}")
        return False
    return True

def clear_documents():
    """清空文档数据"""
    print("清空文档相关数据...")
    try:
        from django.contrib.auth.models import User
        from documents.models import Document, ProcessedDocument, ProcessingLog
        import shutil
        
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
        return True
    except Exception as e:
        print(f"清空数据失败: {e}")
        return False

def main():
    """主函数"""
    print("开始设置数据库...")
    
    # 运行迁移
    if not run_migrations():
        return
    
    # 清空数据
    if not clear_documents():
        return
    
    print("数据库设置完成！")
    print("现在可以启动服务器并测试重复文件检测功能了。")

if __name__ == '__main__':
    main() 