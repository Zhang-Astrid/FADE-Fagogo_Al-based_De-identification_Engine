import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Config from "./pages/Config/Config.jsx";
import Settings from "./pages/Settings/Settings.jsx";
import Results from "./pages/Results/Results.jsx";
import Result from "./pages/History/History.jsx";
import PDFPreview from "./pages/Preview/PDFPreview.jsx";
import Login from "./pages/Auth/Login.jsx";
import Register from "./pages/Auth/Register.jsx";

// 受保护路由组件
function PrivateRoute({ user, children }) {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function App() {
  const [user, setUser] = useState(() => {
    // 页面刷新后自动从localStorage恢复登录状态
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
      return { token, username };
    }
    return null;
  });
  const [loginPrefill, setLoginPrefill] = useState({ username: '', password: '' });

  const handleLogin = (data) => {
    setUser(data);
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
  };
  const handleRegister = ({ username, password }) => {
    setLoginPrefill({ username, password });
    window.location.replace('/login');
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  return (
    <Router>
      <Routes>
        {/* 未登录时只能访问登录/注册 */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} switchToRegister={() => window.location.replace('/register')} initialUsername={loginPrefill.username} initialPassword={loginPrefill.password} />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register onRegister={handleRegister} switchToLogin={() => window.location.replace('/login')} />} />
        {/* 受保护页面 */}
        <Route path="/*" element={
          <PrivateRoute user={user}>
            <div className="app-root">
              <nav className="main-nav-bar">
                <div className="main-nav-container">
                  <Link to="/dashboard" className="main-nav-link">首页</Link>
                  <Link to="/config" className="main-nav-link">处理配置</Link>
                  <Link to="/preview" className="main-nav-link">预览导出</Link>
                  {/* <Link to="/result" className="main-nav-link">处理结果</Link> */}
                  <Link to="/settings" className="main-nav-link">系统设置</Link>
                  <span className="user-welcome">欢迎，{user?.username} <button onClick={handleLogout}>退出</button></span>
                </div>
              </nav>
              <div className="main-content-container">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/config" element={<Config />} />
                  <Route path="/settings" element={<Settings />} />
                  {/* <Route path="/results" element={<Results />} /> */}
                  {/* <Route path="/result" element={<Result />} /> */}
                  <Route path="/preview" element={<PDFPreview />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </div>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;