# FADE - AI-based Document De-identification Engine

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Django](https://img.shields.io/badge/Django-5.2+-green.svg)](https://www.djangoproject.com/)

## 📖 项目简介

FADE (Fagogo AI-based De-identification Engine) 是一个基于人工智能的法律文档脱敏系统。该系统能够自动识别和脱敏法律文档中的敏感信息，如个人姓名、地址、身份证号等，保护隐私的同时保持文档的可读性。

## ✨ 主要功能

### 🔐 用户认证系统
- 用户注册和登录
- Token-based 身份验证
- 管理员权限控制
- 用户会话管理

### 📄 文档处理
- 支持PDF文档上传
- 自动文档解析和预处理
- 多格式文档支持
- 批量文档处理

### 🤖 AI脱敏引擎
- 基于NLP的敏感信息识别
- 智能实体识别（NER）
- 自动脱敏处理
- 可配置的脱敏规则

### 📊 结果管理
- 处理结果预览
- 历史记录管理
- 结果导出功能
- 处理状态跟踪

### ⚙️ 系统配置
- 脱敏规则配置
- 系统参数设置
- 用户偏好设置
- 处理选项定制

## 🏗️ 技术架构

### 后端技术栈
- **框架**: Django 5.2+
- **API**: Django REST Framework
- **数据库**: PostgreSQL 12.0+
- **认证**: Token Authentication
- **CORS**: django-cors-headers
- **AI/ML**: PaddleOCR, LangChain, OpenAI

### 前端技术栈
- **框架**: React 19.1.0
- **构建工具**: Vite 7.0.0
- **路由**: React Router DOM 7.6.3
- **HTTP客户端**: Axios 1.10.0
- **代码规范**: ESLint 9.29.0

### AI/ML 技术栈
- **OCR**: PaddleOCR 2.6.1.3
- **NLP**: LangChain 0.3.26
- **大语言模型**: OpenAI GPT
- **文档处理**: PyMuPDF, pdf2docx
- **图像处理**: OpenCV, Pillow

## 📦 项目结构

```bash
legal-doc-redactor/                      # 📦 项目根目录
│
├── backend/                             # 🐍 Django 后端项目目录
│   ├── manage.py                        # ▶️ Django 管理脚本
│   ├── backend/                         # ⚙️ Django 项目配置目录
│   │   ├── __init__.py                  # 🐍 Python 包标识文件
│   │   ├── settings.py                  # 🔧 后端全局配置（数据库/CORS/静态文件）
│   │   ├── urls.py                      # 🔗 项目主路由入口，挂载API app
│   │   ├── wsgi.py                      # 🌐 WSGI 服务器接口文件
│   │   └── asgi.py                      # 🌐 ASGI 服务器接口文件
│   │
│   └── users/                           # 👤 用户认证应用
│       ├── __init__.py                  # 🐍 Python 包标识文件
│       ├── apps.py                      # ⚙️ Django 应用配置
│       ├── models.py                    # 🗃️ 数据库模型（使用Django默认User）
│       ├── views.py                     # 🧩 用户认证视图（登录/注册）
│       ├── urls.py                      # 🚦 用户API路由（/api/users/login, /register）
│       ├── serializers.py               # 🔄 DRF 序列化器（用户数据转换）
│       ├── admin.py                     # 🔧 Django Admin 配置
│       ├── tests.py                     # 🧪 测试文件
│       └── migrations/                  # 📊 数据库迁移文件目录
│           └── __init__.py              # 🐍 迁移包标识文件
│
├── frontend/                            # ⚛️ 前端 React + Vite 项目目录
│   ├── index.html                       # 🧩 页面入口文件
│   ├── package.json                     # 📦 前端依赖与脚本定义
│   ├── vite.config.js                   # ⚙️ Vite 构建工具配置
│   ├── eslint.config.js                 # 🧩 JS/JSX/TS 代码语法检查工具
│   └── src/                             # 🚀 前端源码目录
│       ├── main.jsx                     # 🚪 应用入口文件（挂载 React）
│       ├── App.jsx                      # 🧭 应用主结构（含路由）
│       ├── index.css                    # 🎨 全局样式
│       │
│       ├── pages/                       # 📃 页面组件目录
│       │   ├── Auth/                    # 🔐 用户认证页面
│       │   │   ├── Login.jsx            # 🔑 登录页面
│       │   │   └── Register.jsx         # 📝 注册页面
│       │   │
│       │   ├── Dashboard/               # 🏠 首页（上传+字段选择）
│       │   │   ├── Dashboard.jsx        # 🧭 主仪表板
│       │   │   └── UploadList.jsx       # 📋 上传文件列表
│       │   │
│       │   ├── Config/                  # ⚙️ 配置页面
│       │   │   └── Config.jsx           # 🔧 系统配置
│       │   │
│       │   ├── Settings/                # ⚙️ 设置页面
│       │   │   └── Settings.jsx         # 🔧 用户设置
│       │   │
│       │   ├── Preview/                 # 👀 预览页面
│       │   │   └── PDFPreview.jsx       # 📄 PDF 预览组件
│       │   │
│       │   ├── Results/                 # 📊 结果页面
│       │   │   └── Results.jsx          # 📈 处理结果展示
│       │   │
│       │   └── History/                 # 📜 历史记录页面
│       │       └── History.jsx          # 📋 历史任务列表
│       │
│       ├── api/                         # 🌐 与后端交互的 API 方法
│       │   └── redact.js                # 🔌 文档脱敏接口封装
│       │
│       └── img/                         # 🖼️ 图标、图片资源
│
├── requirements.txt                     # 📚 Python 后端依赖列表
├── package.json                        # 📦 根目录包配置（使用npm workspaces）
├── package-lock.json                   # 📦 根目录依赖锁定
├── cleanup.js                          # 🧹 项目结构清理脚本
└── README.md                           # 📘 项目说明文档
```

## 🚀 快速启动

### 环境要求
- **Node.js**: 16.0+ 
- **Python**: 3.8+
- **PostgreSQL**: 12.0+
- **Git**: 最新版本

### 1. 克隆项目
```bash
git clone https://github.com/Zhang-Astrid/FADE-Fagogo_Al-based_De-identification_Engine.git
cd legal-doc-redactor
```

### 2. 安装依赖

#### 一键安装所有依赖（推荐）
```bash
npm install
```
这个命令会自动安装：
- 根目录的依赖（concurrently, wait-on）
- 前端目录的依赖（React, Vite等）

#### 安装后端依赖
```bash
cd backend
pip install -r ../requirements.txt
cd ..
```

### 3. 配置数据库

#### 创建PostgreSQL数据库
```sql
CREATE DATABASE legal_doc_redactor;
CREATE USER postgres WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE legal_doc_redactor TO postgres;
```

#### 配置数据库连接
编辑 `backend/backend/settings.py` 中的数据库配置：
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'legal_doc_redactor',
        'USER': 'postgres',
        'PASSWORD': 'your_password',  # 修改为你的密码
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### 4. 初始化数据库
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
cd ..
```

### 5. 启动项目

#### 方式一：一键启动（推荐）
```bash
npm run FADE
```
这个命令会：
1. 启动Django后端服务器（端口8000）
2. 等待后端启动完成后启动前端开发服务器（端口5173）

#### 方式二：分别启动

**启动后端**
```bash
npm run backend
# 或者
cd backend && python manage.py runserver 8000
```

**启动前端**
```bash
npm run frontend
# 或者
cd frontend && npm run dev
```

### 6. 访问应用
- **前端**: http://localhost:5173
- **后端API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin

## 📋 可用脚本

### 根目录脚本
```bash
npm run FADE          # 一键启动前后端服务
npm run backend       # 启动Django后端服务
npm run frontend      # 启动React前端服务
npm run dev           # 开发模式启动（同FADE）
npm run build         # 构建前端生产版本
npm run lint          # 代码规范检查
npm run install:all   # 安装所有依赖
```

### 前端脚本
```bash
cd frontend
npm run dev           # 开发模式启动
npm run build         # 构建生产版本
npm run preview       # 预览构建结果
npm run lint          # 代码规范检查
```

## 🔧 配置说明

### 环境变量配置
创建 `.env` 文件在项目根目录：
```bash
# 后端配置
DJANGO_SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://postgres:password@localhost:5432/legal_doc_redactor

# AI服务配置
OPENAI_API_KEY=your-openai-api-key
PADDLE_OCR_MODEL_PATH=/path/to/ocr/model

# 文件存储配置
MEDIA_ROOT=/path/to/media/files
STATIC_ROOT=/path/to/static/files
```

### CORS配置
在 `backend/backend/settings.py` 中配置允许的前端域名：
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

## 🔐 API接口

### 用户认证接口
- `POST /api/users/register/` - 用户注册
- `POST /api/users/login/` - 用户登录
- `DELETE /api/users/{user_id}/` - 删除用户（管理员）

### 文档处理接口
- `POST /api/upload/` - 上传文档
- `POST /api/redact_all/` - 文档脱敏处理
- `GET /api/history/` - 获取处理历史
- `GET /api/results/{task_id}/` - 获取处理结果

## 🧪 测试

### 后端测试
```bash
cd backend
python manage.py test
```

### 前端测试
```bash
cd frontend
npm test
```
