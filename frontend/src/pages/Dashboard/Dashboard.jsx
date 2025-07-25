import React, { useState, useEffect, useRef } from "react";
import { uploadPDF, getUserDocuments, getDashboardStats } from "../../api/redact";
import UploadList from "./UploadList";

export default function Dashboard() {
  // 状态管理
  const [modelStatus, setModelStatus] = useState({ name: "轻量模型 v1.2", status: "正常运行", mode: "CPU模式" });
  const [todayStats, setTodayStats] = useState({ total: 0, avg_time_per_mb: 0 });
  const [recentRecords, setRecentRecords] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState([]);
  const [userDocuments, setUserDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 拖拽状态
  const [isDragOver, setIsDragOver] = useState(false);
  const dropzoneRef = useRef(null);

  // 获取用户文档列表和仪表板统计数据
  useEffect(() => {
    loadUserDocuments();
    loadDashboardStats();
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

  const loadDashboardStats = async () => {
    try {
      const result = await getDashboardStats();
      console.log('🔍 Dashboard API响应:', result);
      
      if (result.success) {
        console.log('📊 原始stats数据:', result.stats);
        
        // 正确映射后端返回的字段名
        const mappedStats = {
          total: result.stats.total,
          avg_time_per_mb: result.stats.avg_time_per_mb
        };
        
        console.log('📊 映射后的stats数据:', mappedStats);
        
        setTodayStats(mappedStats);
        setModelStatus(result.model_status);
        setRecentRecords(result.recent_records);
      }
    } catch (err) {
      console.error('加载仪表板统计数据失败:', err);
      // 不显示错误，使用默认值
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
    
    // 重新加载文档列表和统计数据
    await loadUserDocuments();
    await loadDashboardStats();
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

  const getUploadStatusClass = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'duplicate': return 'duplicate';
      case 'fail': return 'fail';
      default: return '';
    }
  };

  return (
    <main className="dashboard-root">
      <header>
        <h1 className="dashboard-title">FADE -- PDF脱敏处理系统</h1>
      </header>
      
      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}
      
      <section className="dashboard-cards-grid">
        {/* 信息卡片 */}
        <article className="dashboard-info-card">
          <div className="dashboard-info-row">
            <span className={`dashboard-model-status ${modelStatus.status === '正常运行' ? 'ok' : 'fail'}`}></span>
            <span>{modelStatus.name} <strong>{modelStatus.status}</strong> / {modelStatus.mode}</span>
          </div>
          <div className="dashboard-stats">
            <div>
              <div className="dashboard-stats-num">{todayStats.total}</div>
              <div className="dashboard-stats-label">今日处理总数</div>
            </div>
            <div>
              <div className="dashboard-stats-num">
                {console.log('【DEBUG】平均处理用时 avg_time_per_mb:', todayStats.avg_time_per_mb)}
                {todayStats.avg_time_per_mb} 秒/MB
              </div>
              <div className="dashboard-stats-label">平均处理用时</div>
            </div>
          </div>
          <div className="dashboard-recent">
            <h3 className="dashboard-recent-title">最近处理</h3>
            <ul className="dashboard-recent-list">
              {recentRecords.length > 0 ? (
                recentRecords.map((r, i) => (
                  <li key={i} className={`dashboard-recent-item ${r.status}`}>
                    <span className="status-icon">
                      {r.status === 'success' ? '✔' : r.status === 'fail' ? '✖' : '○'}
                    </span>
                    <span className="time">{r.time}</span>
                    <span className="file-name">{r.name}</span>
                  </li>
                ))
              ) : (
                <li className="dashboard-recent-item">暂无处理记录</li>
              )}
            </ul>
          </div>
        </article>
        
        {/* 快捷上传卡片 */}
        <article className="dashboard-upload-card">
          <h3 className="dashboard-section-title">快捷上传PDF</h3>
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
              className="hidden-input"
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
              {/* <h4 className="dashboard-upload-list-title">上传文件</h4> */}
              <div className="dashboard-upload-list-table">
                <div className="dashboard-upload-list-header">
                  <span>文件名</span>
                  <span>页数</span>
                  <span>大小</span>
                  <span>状态</span>
                </div>
                {uploadFiles.map((f, i) => (
                  <div className="dashboard-upload-list-row" key={i}>
                    <span className="file-name">{f.name}</span>
                    <span>{f.pages}页</span>
                    <span>{(f.size/1024).toFixed(1)}KB</span>
                    <span>
                      {uploadStatus[i] && (
                        <span className={`dashboard-upload-status ${getUploadStatusClass(uploadStatus[i].status)}`}>
                          {uploadStatus[i].status}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </section>
      
      {/* 用户文档列表 */}
      <UploadList userDocuments={userDocuments} />
    </main>
  );
}
