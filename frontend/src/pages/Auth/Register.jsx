import React, { useState } from 'react';

const Register = ({ onRegister, switchToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/users/register/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password, is_staff: isStaff })
      });
      
      if (response.status === 403) {
        setError('访问被拒绝，请检查服务器配置');
        return;
      }
      
      const data = await response.json();
      if (response.ok && data.success) {
        // 注册成功，自动跳转到登录并自动填充
        onRegister({ username, password });
      } else {
        setError(data.error || '注册失败');
      }
    } catch (err) {
      console.error('Register error:', err);
      setError('网络错误，请检查服务器是否启动');
    }
  };

  return (
    <div className="auth-container">
      <h2>注册</h2>
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
        {/*<label>*/}
        {/*  <input*/}
        {/*    type="checkbox"*/}
        {/*    checked={isStaff}*/}
        {/*    onChange={e => setIsStaff(e.target.checked)}*/}
        {/*  />*/}
        {/*  管理员*/}
        {/*</label>*/}
        <button type="submit">注册</button>
      </form>
      {error && <div className="error">{error}</div>}
      <p>已有账号？<button onClick={switchToLogin}>登录</button></p>
    </div>
  );
};

export default Register; 