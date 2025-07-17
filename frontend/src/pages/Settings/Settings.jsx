import React, { useState } from "react";

export default function Settings() {
  const [mode, setMode] = useState("cpu");
  const [regexList, setRegexList] = useState(["姓名：([\\u4e00-\\u9fa5]{2,4})", "身份证：\\d{17}[\\dXx]"]);
  const [newRegex, setNewRegex] = useState("");
//   const [theme, setTheme] = useState("light");
  const [logOptions, setLogOptions] = useState({ raw: false, confidence: false });

  function addRegex() {
    if (newRegex.trim()) {
      setRegexList(list => [...list, newRegex.trim()]);
      setNewRegex("");
    }
  }
  function removeRegex(idx) {
    setRegexList(list => list.filter((_, i) => i !== idx));
  }
  function handleLogOption(opt) {
    setLogOptions(opts => ({ ...opts, [opt]: !opts[opt] }));
  }
//   function handleThemeSwitch() {
//     setTheme(t => t === "light" ? "dark" : "light");
//     // 这里可集成全局主题切换逻辑
//   }

  return (
    <div className="settings-root">
      {/* <button className="settings-theme-switch" onClick={handleThemeSwitch}>{theme === "light" ? "🌞" : "🌙"}</button> */}
      <h1 className="settings-title">系统设置</h1>
      <div className="settings-card">
        <div className="settings-section-title">模型运行配置</div>
        <div className="settings-radio-group">
          <label><input type="radio" name="mode" value="cpu" checked={mode === "cpu"} onChange={() => setMode("cpu")} /> CPU优先</label>
          <label><input type="radio" name="mode" value="gpu" checked={mode === "gpu"} onChange={() => setMode("gpu")} /> GPU加速</label>
        </div>
      </div>
      {/*<div className="settings-card">*/}
      {/*  <div className="settings-section-title">正则表达式管理</div>*/}
      {/*  <ul className="settings-regex-list">*/}
      {/*    {regexList.map((r, i) => (*/}
      {/*      <li key={i} className="settings-regex-item">*/}
      {/*        <span>{r}</span>*/}
      {/*        <button className="settings-regex-del" onClick={()=>removeRegex(i)}>删除</button>*/}
      {/*      </li>*/}
      {/*    ))}*/}
      {/*  </ul>*/}
      {/*  <div className="settings-regex-add-row">*/}
      {/*    <input className="settings-regex-input" value={newRegex} onChange={e=>setNewRegex(e.target.value)} placeholder="添加正则表达式" />*/}
      {/*    <button className="settings-btn" onClick={addRegex}>添加</button>*/}
      {/*  </div>*/}
      {/*  <div className="settings-regex-batch-row">*/}
      {/*    <button className="settings-btn">批量导入</button>*/}
      {/*    <button className="settings-btn">批量导出</button>*/}
      {/*  </div>*/}
      {/*</div>*/}
      <div className="settings-card">
        <div className="settings-section-title">日志导出选项</div>
        <label><input type="checkbox" checked={logOptions.raw} onChange={()=>handleLogOption("raw")} /> 包含原始文本</label>
        <label><input type="checkbox" checked={logOptions.confidence} onChange={()=>handleLogOption("confidence")} /> 包含置信度</label>
      </div>
    </div>
  );
} 