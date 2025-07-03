import React, { useState } from "react";

// 模拟数据
const recentRecords = [
  { name: "合同A.pdf", time: "10:23", status: "success" },
  { name: "起诉状.pdf", time: "09:50", status: "success" },
  { name: "协议书.pdf", time: "09:10", status: "fail" },
  { name: "证明材料.pdf", time: "08:45", status: "success" },
  { name: "附件1.pdf", time: "08:20", status: "success" },
];

export default function Dashboard() {
  // 模拟状态
  const [modelStatus] = useState({ name: "轻量模型 v1.2", status: "正常运行", mode: "CPU模式" });
  const [todayStats] = useState({ total: 18, successRate: 97 });
  const [uploadFiles, setUploadFiles] = useState([]);

  // 上传文件处理
  function handleFileChange(e) {
    const files = Array.from(e.target.files).filter(f => f.name.endsWith('.pdf'));
    setUploadFiles(files.map(f => ({ name: f.name, size: f.size, pages: Math.floor(Math.random()*10)+1 })));
  }

  return (
    <div className="dashboard-root">
      <h1 className="dashboard-title">FADE -- PDF脱敏处理系统</h1>
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
              {recentRecords.map((r, i) => (
                <li key={i} className={`dashboard-recent-item ${r.status}`}>{r.name} <span>{r.time}</span></li>
              ))}
            </ul>
          </div>
          <button className="dashboard-main-btn" onClick={()=>window.location.href='/upload'}>开始处理</button>
        </div>
        {/* 快捷上传卡片 */}
        <div className="dashboard-upload-card">
          <div className="dashboard-section-title">快捷上传PDF</div>
          <label className="dashboard-upload-dropzone">
            <input type="file" multiple accept=".pdf" style={{display:'none'}} onChange={handleFileChange} />
            <span>拖拽或点击选择PDF文件上传</span>
          </label>
          {uploadFiles.length > 0 && (
            <div className="dashboard-upload-list">
              <div className="dashboard-upload-list-title">已选文件</div>
              <ul>
                {uploadFiles.map((f, i) => (
                  <li key={i}>{f.name} <span>{f.pages}页</span> <span>{(f.size/1024).toFixed(1)}KB</span></li>
                ))}
              </ul>
              <button className="dashboard-main-btn" onClick={()=>window.location.href='/config'}>去配置</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
