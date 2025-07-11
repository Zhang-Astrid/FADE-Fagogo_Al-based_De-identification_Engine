import React, { useState } from 'react';

const Login = ({ onLogin, switchToRegister, initialUsername = '', initialPassword = '' }) => {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState(initialPassword);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/users/login/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });
      
      if (response.status === 403) {
        setError('访问被拒绝，请检查服务器配置');
        return;
      }
      
      const data = await response.json();
      if (response.ok) {
        onLogin(data);
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('网络错误，请检查服务器是否启动');
    }
  };

  return (
    <div className="auth-container">
      <h2>登录</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit">登录</button>
      </form>
      {error && <div className="error">{error}</div>}
      <p>没有账号？<button onClick={switchToRegister}>注册</button></p>
    </div>
  );
};

export default Login; 