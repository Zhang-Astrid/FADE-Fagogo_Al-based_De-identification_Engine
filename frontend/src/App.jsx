import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Config from "./pages/Config/Config.jsx";
import Settings from "./pages/Settings/Settings.jsx";
import Results from "./pages/Results/Results.jsx";
import Result from "./pages/History/History.jsx";
import PDFPreview from "./pages/Preview/PDFPreview.jsx";

function App() {
  return (
    
    <Router>
      <div className="app-root">
        <nav className="main-nav-bar">
          <div className="main-nav-container">
            <Link to="/dashboard" className="main-nav-link">首页</Link>
            <Link to="/config" className="main-nav-link">处理配置</Link>
            <Link to="/preview" className="main-nav-link">预览与导出</Link>
            <Link to="/result" className="main-nav-link">处理结果</Link>
            <Link to="/settings" className="main-nav-link">系统设置</Link>
          </div>
        </nav>
        <div className="main-content-container">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/config" element={<Config />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/results" element={<Results />} />
            <Route path="/result" element={<Result />} />
            <Route path="/preview" element={<PDFPreview />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;