import React, { useState, useEffect, useRef } from "react";
import { uploadPDF, getUserDocuments } from "../../api/redact";

export default function Dashboard() {
  // 状态管理
  const [modelStatus] = useState({ name: "轻量模型 v1.2", status: "正常运行", mode: "CPU模式" });
  const [todayStats] = useState({ total: 18, successRate: 97 });
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState([]);
  const [userDocuments, setUserDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 拖拽状态
  const [isDragOver, setIsDragOver] = useState(false);
  const dropzoneRef = useRef(null);

  // 获取用户文档列表
  useEffect(() => {
    loadUserDocuments();
  }, []);

  const loadUserDocuments = async () => {
    try {
      const result = await getUserDocuments();
      if (result.success) {
        setUserDocuments(result.documents);
      }
    } catch (err) {
      console.error('加载文档列表失败:', err);
      setError('加载文档列表失败');
    }
  };

  // 处理文件上传的通用函数
  async function processFiles(files) {
    const pdfFiles = Array.from(files).filter(f => f.name.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      setError('请选择PDF文件');
      return;
    }

    setLoading(true);
    setError('');
    setUploadFiles(pdfFiles.map(f => ({ name: f.name, size: f.size, pages: Math.floor(Math.random()*10)+1 })));
    
    const statusArr = [];
    for (const file of pdfFiles) {
      try {
        const result = await uploadPDF(file);
        if (result.success) {
          statusArr.push({ name: file.name, status: 'success', document: result.document });
          // 保存第一个文件对象用于后续处理
          window.selectedPDFFile = file;
          window.selectedDocumentCode = result.document.document_code;
        } else {
          // 处理重复文件的情况
          if (result.error === '文件已存在') {
            statusArr.push({ 
              name: file.name, 
              status: 'duplicate', 
              message: result.message,
              existing_document: result.existing_document,
              duplicate_reason: result.duplicate_reason
            });
          } else {
            statusArr.push({ name: file.name, status: 'fail', error: result.error });
          }
        }
      } catch (err) {
        console.error('上传失败:', err);
        statusArr.push({ name: file.name, status: 'fail', error: err.message });
      }
    }
    
    setUploadStatus(statusArr);
    setLoading(false);
    
    // 重新加载文档列表
    await loadUserDocuments();
  }

  // 上传文件处理
  async function handleFileChange(e) {
    await processFiles(e.target.files);
  }

  // 拖拽事件处理
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有当鼠标真正离开dropzone时才设置false
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  // 获取最近处理的文档
  const recentRecords = userDocuments.slice(0, 5).map(doc => ({
    name: doc.filename,
    time: new Date(doc.upload_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    status: doc.status === 'processed' ? 'success' : doc.status === 'failed' ? 'fail' : 'pending'
  }));

  return (
    <div className="dashboard-root">
      <h1 className="dashboard-title">FADE -- PDF脱敏处理系统</h1>
      
      {error && (
        <div style={{ 
          background: '#fee', 
          color: '#c33', 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '16px' 
        }}>
          {error}
        </div>
      )}
      
      <div className="dashboard-cards-grid">
        {/* 信息卡片 */}
        <div className="dashboard-info-card">
          <div className="dashboard-info-row">
            <span className={`dashboard-model-status ${modelStatus.status === '正常运行' ? 'ok' : 'fail'}`}></span>
            <span>{modelStatus.name} <b>{modelStatus.status}</b> / {modelStatus.mode}</span>
          </div>
          <div className="dashboard-info-row dashboard-stats">
            <div>
              <div className="dashboard-stats-num">{todayStats.total}</div>
              <div className="dashboard-stats-label">今日处理总数</div>
            </div>
            <div>
              <div className="dashboard-stats-num">{todayStats.successRate}%</div>
              <div className="dashboard-stats-label">敏感字段识别成功率</div>
            </div>
          </div>
          <div className="dashboard-info-row dashboard-recent">
            <div className="dashboard-recent-title">最近处理</div>
            <ul className="dashboard-recent-list">
              {recentRecords.length > 0 ? (
                recentRecords.map((r, i) => (
                  <li key={i} className={`dashboard-recent-item ${r.status}`}>
                    {r.name} <span>{r.time}</span>
                  </li>
                ))
              ) : (
                <li className="dashboard-recent-item">暂无处理记录</li>
              )}
            </ul>
          </div>
          <button 
            className="dashboard-main-btn" 
            onClick={() => window.location.href = '/config'}
            disabled={loading}
          >
            {loading ? '处理中...' : '开始处理'}
          </button>
        </div>
        
        {/* 快捷上传卡片 */}
        <div className="dashboard-upload-card">
          <div className="dashboard-section-title">快捷上传PDF</div>
          <div 
            ref={dropzoneRef}
            className={`dashboard-upload-dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !loading && dropzoneRef.current?.querySelector('input')?.click()}
          >
            <input 
              type="file" 
              multiple 
              accept=".pdf" 
              style={{display:'none'}} 
              onChange={handleFileChange}
              disabled={loading}
            />
            <span>
              {loading ? '上传中...' : 
               isDragOver ? '释放鼠标上传文件' : '拖拽或点击选择PDF文件上传'}
            </span>
          </div>
          
          {uploadFiles.length > 0 && (
            <div className="dashboard-upload-list">
              <div className="dashboard-upload-list-title">已选文件</div>
              <ul>
                {uploadFiles.map((f, i) => (
                  <li key={i}>
                    {f.name} <span>{f.pages}页</span> <span>{(f.size/1024).toFixed(1)}KB</span>
                    {uploadStatus[i] && (
                      <span style={{
                        marginLeft: 8, 
                        color: uploadStatus[i].status === 'success' ? 'green' : 
                               uploadStatus[i].status === 'duplicate' ? 'orange' : 'red'
                      }}>
                        {uploadStatus[i].status === 'success' ? '上传成功' : 
                         uploadStatus[i].status === 'duplicate' ? uploadStatus[i].message : 
                         `上传失败: ${uploadStatus[i].error}`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {uploadStatus.some(s => s.status === 'success' || s.status === 'duplicate') && (
                <button 
                  className="dashboard-main-btn" 
                  onClick={() => window.location.href = '/config'}
                  disabled={loading}
                >
                  去配置
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 用户文档列表 */}
      {userDocuments.length > 0 && (
        <div className="dashboard-upload-list" style={{ marginTop: '32px' }}>
          <div className="dashboard-upload-list-title">我的文档</div>
          <ul>
            {userDocuments.map((doc, i) => (
              <li key={i}>
                {doc.filename} 
                <span>{doc.file_size_mb}MB</span> 
                <span>{doc.page_count}页</span>
                <span style={{
                  marginLeft: 8,
                  color: doc.status === 'processed' ? 'green' : 
                         doc.status === 'failed' ? 'red' : 'orange'
                }}>
                  {doc.status === 'uploaded' ? '已上传' :
                   doc.status === 'processing' ? '处理中' :
                   doc.status === 'processed' ? '已处理' : '处理失败'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
