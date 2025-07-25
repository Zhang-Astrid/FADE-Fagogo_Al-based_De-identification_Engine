from celery import shared_task
from .models import Document, ProcessedDocument
from .process import process

@shared_task(bind=True)
def process_document_task(self, document_id, config, config_hash):
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"[CELERY TASK] 收到参数: document_id={document_id}, config={config}, config_hash={config_hash}")
    try:
        doc = Document.objects.get(id=document_id)
        root_path = doc.get_storage_path()
        import time
        start_time = time.time()
        process(root_path, config, config_hash)
        end_time = time.time()
        elapsed = end_time - start_time
        # 查找对应的ProcessedDocument
        processed_doc = ProcessedDocument.objects.get(document=doc, config_hash=config_hash)
        processed_pdf_name = f"processed_{config_hash}.pdf"
        processed_doc.processed_file.name = f"{doc.user.username}/{doc.document_code}/{processed_pdf_name}"
        processed_doc.status = 'completed'
        processed_doc.processing_time = elapsed
        processed_doc.save()
        return {'status': 'success', 'document_id': document_id}
    except Exception as e:
        processed_doc = ProcessedDocument.objects.filter(document_id=document_id, config_hash=config_hash).first()
        if processed_doc:
            processed_doc.status = 'failed'
            processed_doc.save()
        return {'status': 'failed', 'error': str(e), 'document_id': document_id} 