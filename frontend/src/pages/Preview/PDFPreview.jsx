import React, { useState } from "react";

// 模拟识别信息
const mockFields = [
  { page: 1, type: "姓名", value: "张三", method: "遮挡", area: [100, 120, 180, 140] },
  { page: 1, type: "身份证号", value: "44010319******1234", method: "模糊", area: [200, 220, 320, 240] },
  { page: 2, type: "手机号", value: "138****5678", method: "替换", area: [110, 160, 200, 180] },
];

export default function PDFPreview() {
  const [page, setPage] = useState(1);
  const totalPages = 2;

  return (
    <div className="preview-root">
      <h1 className="preview-title">文件预览与敏感信息校正</h1>
      <div className="preview-main">
        {/* 左侧PDF预览区 */}
        <div className="preview-pdf-col">
          <div className="preview-pdf-area-row">
            <div className="preview-pdf-area">
              <div className="preview-pdf-placeholder"><span className="pdf-label">原图</span> PDF第{page}页预览</div>
            </div>
            <div className="preview-pdf-area">
              <div className="preview-pdf-placeholder"><span className="pdf-label redact">脱敏图</span> PDF第{page}页预览</div>
            </div>
          </div>
          <div className="preview-page-row">
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>&lt;</button>
            <span>第 {page} / {totalPages} 页</span>
            <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>&gt;</button>
          </div>
        </div>
        {/* 右侧识别信息列表 */}
        <div className="preview-info-col">
          <div className="preview-info-title">识别敏感信息</div>
          <ul className="preview-info-list">
            {mockFields.filter(f=>f.page===page).map((f,i)=>(
              <li key={i} className="preview-info-item">
                <span className="type">{f.type}</span>
                <span className="value">{f.value}</span>
                <span className="method">{f.method}</span>
                <button className="edit-btn">调整</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="preview-bottom-row">
        <button className="preview-main-btn">确认处理并生成脱敏文档</button>
      </div>
    </div>
  );
} 