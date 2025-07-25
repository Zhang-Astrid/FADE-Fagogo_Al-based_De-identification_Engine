import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { 
  getPreviewFiles, 
  getProcessedDocumentInfo, 
  downloadProcessedDocument,
  getUserProcessedDocuments, // 新增
  deleteDocument, // 新增
  exportAllProcessedDocuments // 新增
} from "../../api/redact";

export default function PDFPreview() {
  const [loading, setLoading] = useState(false); // 初始不加载
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [processedList, setProcessedList] = useState([]);
  const [selectedProcessedId, setSelectedProcessedId] = useState(null); // 只存id
  // 获取当前选中项
  const selectedProcessed = processedList.find(item => item.id === selectedProcessedId);
  // 记录上一次选中记录的状态
  const [lastSelectedStatus, setLastSelectedStatus] = useState(null);
  const [rowHighlight, setRowHighlight] = useState({}); // {id: true/false}
  
  const navigate = useNavigate();

  // 页面加载时获取所有处理记录
  useEffect(() => {
    loadProcessedList();
  }, []);

  // 处理记录加载后，自动选中最新一条
  useEffect(() => {
    if (processedList.length > 0 && selectedProcessedId == null) {
      setSelectedProcessedId(processedList[0].id);
    }
  }, [processedList]);

  // 用户点击“预览”按钮
  const handleSelectProcessed = (item) => {
    setSelectedProcessedId(item.id);
  };

  // 只在selectedProcessedId变化或状态变化时加载预览数据
  useEffect(() => {
    if (!selectedProcessed) return;
    setLastSelectedStatus(selectedProcessed.status);
    loadPreviewData(selectedProcessed.document.document_code, selectedProcessed.id);
    // eslint-disable-next-line
  }, [selectedProcessedId]);

  // 检测当前选中记录的状态由processing/pending变为completed时，自动刷新预览区
  useEffect(() => {
    if (!selectedProcessed) return;
    if (
      (lastSelectedStatus === 'pending' || lastSelectedStatus === 'processing') &&
      selectedProcessed.status === 'completed'
    ) {
      loadPreviewData(selectedProcessed.document.document_code, selectedProcessed.id);
    }
    setLastSelectedStatus(selectedProcessed.status);
  }, [selectedProcessed, lastSelectedStatus]);

  // 智能轮询：只在有未完成的记录时轮询
  useEffect(() => {
    const hasProcessing = processedList.some(
      item => item.status === 'pending' || item.status === 'processing'
    );
    if (!hasProcessing) return; // 没有需要处理的就不轮询

    const interval = setInterval(() => {
      loadProcessedList(); // 只刷新列表，不刷新预览区
    }, 3000);

    return () => clearInterval(interval);
  }, [processedList]);

  // 检查处理状态变化，给刚完成的行高亮+动画
  useEffect(() => {
    if (processedList.length === 0) return;
    // 构建当前状态map
    const currStatusMap = {};
    processedList.forEach(item => {
      currStatusMap[item.id] = item.status;
    });
    // 检查哪些id的状态发生了变化
    Object.entries(currStatusMap).forEach(([id, status]) => {
      const prev = lastSelectedStatus && selectedProcessed && selectedProcessed.id === Number(id) ? lastSelectedStatus : undefined;
      if ((prev === 'pending' || prev === 'processing') && status === 'completed') {
        setRowHighlight(h => ({ ...h, [id]: true }));
        setTimeout(() => {
          setRowHighlight(h => ({ ...h, [id]: false }));
        }, 2000);
      }
    });
  }, [processedList]);

  // 加载所有处理记录
  const loadProcessedList = async () => {
    try {
      const result = await getUserProcessedDocuments();
      if (result.success) {
        setProcessedList(result.processed_documents);
        // console.log('[前端DEBUG] 已获取处理结果列表:', result.processed_documents);
      } else {
        console.warn('[前端DEBUG] 获取处理结果列表失败:', result);
      }
    } catch (err) {
      console.error('获取处理结果列表失败:', err);
    }
  };

  // 加载预览数据
  const loadPreviewData = async (documentCode, processedDocumentId) => {
    try {
      setLoading(true);
      setError('');
      const [previewResult, infoResult] = await Promise.all([
        getPreviewFiles(documentCode, processedDocumentId),
        getProcessedDocumentInfo(processedDocumentId)
      ]);
      if (previewResult.success) {
        setPreviewData(previewResult);
      }
      if (infoResult.success) {
        setDocumentInfo(infoResult.document);
      }
    } catch (err) {
      console.error('加载预览数据失败:', err);
      setError(err.message || '加载预览数据失败');
    } finally {
      setLoading(false);
    }
  };





  // 新增删除处理记录的函数
  const handleDeleteProcessed = async (item) => {
    if (!window.confirm(`确定要删除文档“${item.document.filename}”及其所有处理记录吗？`)) return;
    try {
      await deleteDocument(item.document.document_code);
      await loadProcessedList();
    } catch (err) {
      alert('删除失败：' + (err.message || err));
    }
  };

  // 导出所有处理过的文档
  const handleExportAll = async () => {
    if (processedList.length === 0) {
      alert('暂无处理记录可导出');
      return;
    }
    try {
      await exportAllProcessedDocuments();
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败：' + (err.message || err));
    }
  };

  // 状态转中文
  function getStatusText(status) {
    switch (status) {
      case 'pending': return '正在处理';
      case 'processing': return '正在处理';
      case 'completed': return '已完成';
      case 'failed': return '处理失败';
      default: return status;
    }
  }

  return (
    <div className="preview-root">
      <h1 className="preview-title">文件预览与敏感信息校正</h1>
      {/* 历史处理结果表格始终显示 */}
      <div className="preview-processed-list">
        <div className="preview-header-row">
          <h2 className="preview-header-title">历史处理结果</h2>
          <button className="preview-export-btn" onClick={handleExportAll}>全部导出</button>
        </div>
        <table className="processed-table">
          <thead>
            <tr>
              <th>文档名</th>
              <th>处理时间</th>
              <th>配置摘要</th>
              <th>状态</th>
              <th>预览</th>
              <th>下载</th>
              <th>删除</th>
            </tr>
          </thead>
          <tbody>
            {processedList.map(item => (
              <tr key={item.id} className={
                (selectedProcessed && selectedProcessed.id === item.id ? 'selected ' : '') +
                (rowHighlight[item.id] ? 'highlight-animate ' : '')
              }>
                <td>{item.document.filename}</td>
                <td>{item.process_time ? new Date(item.process_time).toLocaleString() : '-'}</td>
                <td>{Object.entries(item.config_data)
                  .filter(([key, value]) => {
                    // 只保留五类敏感字段
                    const allowed = ['name', 'email', 'address', 'company', 'sens_number'];
                    return allowed.includes(key) && value !== 'empty';
                  })
                  .map(([key, value]) => {
                    // 字段名转换为中文
                    const fieldNameMap = {
                      'name': '姓名',
                      'address': '地址', 
                      'company': '公司名',
                      'email': '邮箱',
                      'sens_number': '长数字字母混合',
                    };
                    // 处理方式转换为中文
                    const methodMap = {
                      'mosaic': '马赛克',
                      'blur': '模糊',
                      'black': '遮盖',
                      'empty': '清空'
                    };
                    const fieldName = fieldNameMap[key] || key;
                    const methodName = methodMap[value] || value;
                    return `${fieldName}:${methodName}`;
                  }).join(', ')}</td>
                <td>{getStatusText(item.status)}</td>
                <td>
                  <button 
                    onClick={() => handleSelectProcessed(item)}
                    disabled={item.status !== "completed"}
                  >
                    预览
                  </button>
                </td>
                <td>
                  <button 
                    onClick={() => downloadProcessedDocument(item.id)}
                    disabled={item.status !== "completed"}
                  >
                    下载
                  </button>
                </td>
                <td>
                  <button 
                    onClick={() => handleDeleteProcessed(item)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {processedList.length === 0 && (
              <tr><td colSpan={7} className="preview-empty-message">暂无处理记录</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 预览区逻辑：只依赖selectedProcessed */}
      {selectedProcessed && !loading && !error && (
        <>
          <div className="preview-document-info">
            <strong>文档:</strong> {documentInfo?.filename} ({documentInfo?.file_size_mb}MB)
          </div>
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
                      <span className="pdf-label">原图</span> PDF预览
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
                      <span className="pdf-label redact">正在处理 请稍后...</span> PDF预览
                    </div>
                  )}
                </div>
              </div>
              {/* <div className="preview-page-row">
                <button 
                  disabled={page <= 1} 
                  onClick={() => setPage(page - 1)}
                >
                  &lt;
                </button>
                <span>第 {page} / {totalPages} 页</span>
                <button 
                  disabled={page >= totalPages} 
                  onClick={() => setPage(page + 1)}
                >
                  &gt;
                </button>
              </div> */}
            </div>
          </div>
          {/*<div className="preview-bottom-row">*/}
          {/*  <button */}
          {/*    className="preview-secondary-btn"*/}
          {/*    onClick={() => navigate('/dashboard')}*/}
          {/*  >*/}
          {/*    返回Dashboard*/}
          {/*  </button>*/}
          {/*  <button */}
          {/*    className="preview-main-btn"*/}
          {/*    onClick={handleConfirmAndDownload}*/}
          {/*  >*/}
          {/*    确认并下载脱敏文档*/}
          {/*  </button>*/}
          {/*</div>*/}
        </>
      )}
      {/* 没有选中处理记录时的提示 */}
      {!selectedProcessed && (
        <div className="preview-empty-message">请选择或新建处理记录</div>
      )}
      {/* 加载/错误提示 */}
      {loading && <div className="preview-loading"><div className="loading-spinner"></div><p>正在加载预览数据...</p></div>}
      {error && <div className="preview-error"><h2>加载失败</h2><p>{error}</p><button onClick={() => navigate('/dashboard')}>返回Dashboard</button></div>}
    </div>
  );
} 