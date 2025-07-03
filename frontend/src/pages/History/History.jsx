import React, { useState } from "react";

const mockLog = [
  { field: "姓名", result: "成功", time: "0.2s" },
  { field: "身份证号", result: "成功", time: "0.3s" },
  { field: "手机号", result: "失败", time: "-" },
];
const mockStats = {
  total: 3,
  success: 2,
  fail: 1,
  duration: "3.2s"
};

export default function Result() {
  const [showLog, setShowLog] = useState(true);
  const [showStats, setShowStats] = useState(true);

  return (
    <div className="result-root">
      <h1 className="result-title">处理结果</h1>
      <div className="result-card">
        <button className="result-download-btn">下载脱敏PDF</button>
        <div className="result-section">
          <div className="result-section-header" onClick={()=>setShowLog(v=>!v)}>
            <span>处理日志</span>
            <span className="result-toggle">{showLog ? '▼' : '▲'}</span>
          </div>
          {showLog && (
            <table className="result-log-table">
              <thead>
                <tr>
                  <th>字段</th>
                  <th>结果</th>
                  <th>耗时</th>
                </tr>
              </thead>
              <tbody>
                {mockLog.map((row,i)=>(
                  <tr key={i} className={row.result==="失败"?"fail":""}>
                    <td>{row.field}</td>
                    <td>{row.result}</td>
                    <td>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="result-section">
          <div className="result-section-header" onClick={()=>setShowStats(v=>!v)}>
            <span>统计数据</span>
            <span className="result-toggle">{showStats ? '▼' : '▲'}</span>
            <button className="result-export-btn">导出CSV</button>
            <button className="result-export-btn">导出JSON</button>
          </div>
          {showStats && (
            <div className="result-stats-row">
              <span>总字段数：{mockStats.total}</span>
              <span>成功：{mockStats.success}</span>
              <span>失败：{mockStats.fail}</span>
              <span>总耗时：{mockStats.duration}</span>
            </div>
          )}
        </div>
        <button className="result-retry-btn" onClick={()=>window.location.href='/upload'}>再处理新文件</button>
      </div>
    </div>
  );
}
