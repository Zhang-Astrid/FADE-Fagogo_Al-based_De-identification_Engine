#!/usr/bin/env node
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8000';

async function testAPI() {
  console.log('🧪 测试API连接...');
  
  try {
    // 测试注册API
    console.log('📝 测试注册API...');
    const registerResponse = await fetch(`${API_BASE}/api/users/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123',
        is_staff: false
      })
    });
    
    console.log('注册响应状态:', registerResponse.status);
    const registerData = await registerResponse.json();
    console.log('注册响应数据:', registerData);
    
    // 测试登录API
    console.log('🔑 测试登录API...');
    const loginResponse = await fetch(`${API_BASE}/api/users/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      })
    });
    
    console.log('登录响应状态:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('登录响应数据:', loginData);
    
    if (loginResponse.ok) {
      console.log('✅ API测试成功！');
    } else {
      console.log('❌ API测试失败！');
    }
    
  } catch (error) {
    console.error('❌ API测试出错:', error.message);
    console.log('💡 请确保Django服务器正在运行: python manage.py runserver 8000');
  }
}

testAPI(); 