import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  getPreviewFiles, 
  getProcessedDocumentInfo, 
  downloadProcessedDocument,
  reprocessDocument 
} from "../../api/redact";

export default function PDFPreview() {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [sensitiveFields, setSensitiveFields] = useState([]);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // 从URL参数或location.state获取文档信息
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const documentCode = params.get('document_code') || location.state?.documentCode;
    const processedDocumentId = params.get('processed_id') || location.state?.processedDocumentId;
    
    if (!documentCode || !processedDocumentId) {
      setError('缺少必要的文档信息');
      setLoading(false);
      return;
    }

    loadPreviewData(documentCode, processedDocumentId);
  }, [location]);

  const loadPreviewData = async (documentCode, processedDocumentId) => {
    try {
      setLoading(true);
      setError('');

      // 并行获取预览文件和文档信息
      const [previewResult, infoResult] = await Promise.all([
        getPreviewFiles(documentCode, processedDocumentId),
        getProcessedDocumentInfo(processedDocumentId)
      ]);

      if (previewResult.success) {
        setPreviewData(previewResult);
        setTotalPages(previewResult.total_pages || 1);
      }

      if (infoResult.success) {
        setDocumentInfo(infoResult.document);
        setSensitiveFields(infoResult.sensitive_fields || []);
      }

    } catch (err) {
      console.error('加载预览数据失败:', err);
      setError(err.message || '加载预览数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleFieldEdit = () => {
    // 跳转到配置页面，传递当前配置信息
    const currentConfig = sensitiveFields.reduce((acc, field) => {
      acc[field.type] = field.method;
      return acc;
    }, {});

    navigate('/config', {
      state: {
        documentCode: documentInfo?.document_code,
        currentConfig,
        fromPreview: true,
        processedDocumentId: location.state?.processedDocumentId || 
                           new URLSearchParams(location.search).get('processed_id')
      }
    });
  };

  const handleReprocess = async () => {
    if (!documentInfo?.document_code) {
      setError('缺少文档信息');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // 构造当前配置
      const config = sensitiveFields.reduce((acc, field) => {
        acc[field.type] = field.method;
        return acc;
      }, {});

      const result = await reprocessDocument(documentInfo.document_code, config);
      
      if (result.success) {
        // 重新加载预览数据
        await loadPreviewData(documentInfo.document_code, result.processed_document.id);
        alert('文档重新处理完成！');
      }
    } catch (err) {
      console.error('重新处理失败:', err);
      setError(err.message || '重新处理失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!location.state?.processedDocumentId && !new URLSearchParams(location.search).get('processed_id')) {
      setError('缺少处理后文档ID');
      return;
    }

    const processedDocumentId = location.state?.processedDocumentId || 
                               new URLSearchParams(location.search).get('processed_id');

    try {
      await downloadProcessedDocument(processedDocumentId);
    } catch (err) {
      console.error('下载失败:', err);
      setError(err.message || '下载失败');
    }
  };

  const handleConfirmAndDownload = async () => {
    await handleDownload();
    // 下载完成后返回Dashboard
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="preview-root">
        <div className="preview-loading">
          <div className="loading-spinner"></div>
          <p>正在加载预览数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preview-root">
        <div className="preview-error">
          <h2>加载失败</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')}>返回Dashboard</button>
        </div>
      </div>
    );
  }

  // 过滤当前页面的敏感信息
  const currentPageFields = sensitiveFields.filter(field => field.page === page);

  return (
    <div className="preview-root">
      <h1 className="preview-title">文件预览与敏感信息校正</h1>
      
      {documentInfo && (
        <div className="preview-document-info">
          <strong>文档:</strong> {documentInfo.filename} ({documentInfo.file_size_mb}MB)
        </div>
      )}

      <div className="preview-main">
        {/* 左侧PDF预览区 */}
        <div className="preview-pdf-col">
          <div className="preview-pdf-area-row">
            <div className="preview-pdf-area">
              {previewData?.original_url ? (
                <iframe 
                  src={previewData.original_url} 
                  title="原文件预览"
                  className="pdf-iframe"
                />
              ) : (
                <div className="preview-pdf-placeholder">
                  <span className="pdf-label">原图</span> PDF第{page}页预览
                </div>
              )}
            </div>
            <div className="preview-pdf-area">
              {previewData?.processed_url ? (
                <iframe 
                  src={previewData.processed_url} 
                  title="处理后文件预览"
                  className="pdf-iframe"
                />
              ) : (
                <div className="preview-pdf-placeholder">
                  <span className="pdf-label redact">脱敏图</span> PDF第{page}页预览
                </div>
              )}
            </div>
          </div>
          <div className="preview-page-row">
            <button 
              disabled={page <= 1} 
              onClick={() => handlePageChange(page - 1)}
            >
              &lt;
            </button>
            <span>第 {page} / {totalPages} 页</span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => handlePageChange(page + 1)}
            >
              &gt;
            </button>
          </div>
        </div>

        {/* 右侧识别信息列表 */}
        <div className="preview-info-col">
          <div className="preview-info-title">识别敏感信息</div>
          {currentPageFields.length > 0 ? (
            <ul className="preview-info-list">
              {currentPageFields.map((field, index) => (
                <li key={index} className="preview-info-item">
                  <span className="type">{field.type}</span>
                  <span className="value">{field.value}</span>
                  <span className="method">{field.method}</span>
                  <button 
                    className="edit-btn"
                    onClick={() => handleFieldEdit(index)}
                  >
                    调整
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="preview-no-fields">
              <p>当前页面未识别到敏感信息</p>
            </div>
          )}
          
          {sensitiveFields.length > 0 && (
            <div className="preview-actions">
              <button 
                className="preview-action-btn"
                onClick={handleReprocess}
                disabled={processing}
              >
                {processing ? '重新处理中...' : '重新处理'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="preview-bottom-row">
        <button 
          className="preview-secondary-btn"
          onClick={() => navigate('/dashboard')}
        >
          返回Dashboard
        </button>
        <button 
          className="preview-main-btn"
          onClick={handleConfirmAndDownload}
        >
          确认并下载脱敏文档
        </button>
      </div>
    </div>
  );
} 