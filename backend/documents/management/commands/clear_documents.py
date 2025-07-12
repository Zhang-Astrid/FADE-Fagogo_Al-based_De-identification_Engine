from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from documents.models import Document, ProcessedDocument, ProcessingLog
import os
import shutil

class Command(BaseCommand):
    help = '清空所有文档相关的数据库数据和文件'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            action='store_true',
            help='同时清空用户数据',
        )
        parser.add_argument(
            '--media',
            action='store_true',
            help='同时清空media文件夹',
        )

    def handle(self, *args, **options):
        self.stdout.write('开始清空文档相关数据...')
        
        # 清空处理日志
        log_count = ProcessingLog.objects.count()
        ProcessingLog.objects.all().delete()
        self.stdout.write(f'已删除 {log_count} 条处理日志记录')
        
        # 清空处理后的文档
        processed_count = ProcessedDocument.objects.count()
        ProcessedDocument.objects.all().delete()
        self.stdout.write(f'已删除 {processed_count} 条处理后文档记录')
        
        # 清空原始文档
        doc_count = Document.objects.count()
        Document.objects.all().delete()
        self.stdout.write(f'已删除 {doc_count} 条原始文档记录')
        
        # 可选：清空用户数据
        if options['users']:
            user_count = User.objects.count()
            User.objects.all().delete()
            self.stdout.write(f'已删除 {user_count} 个用户')
        
        # 可选：清空media文件夹
        if options['media']:
            media_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'media')
            if os.path.exists(media_path):
                shutil.rmtree(media_path)
                self.stdout.write('已清空media文件夹')
            else:
                self.stdout.write('media文件夹不存在')
        
        self.stdout.write(
            self.style.SUCCESS('文档数据清空完成！')
        ) 