# FADE - AI-based Document De-identification Engine

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Django](https://img.shields.io/badge/Django-5.2+-green.svg)](https://www.djangoproject.com/)

## 📖 项目简介

FADE (Fagogo AI-based De-identification Engine) 是一个基于人工智能的法律文档脱敏系统。系统自动识别和脱敏法律文档中的敏感信息（如姓名、地址、身份证号等），保护隐私同时保持文档可读性。

---

## ✨ 主要功能

- 用户注册、登录与Token认证，支持会话管理和权限控制
- PDF文档上传、解析、批量处理，支持多格式
- AI脱敏引擎：OCR识别、NER实体识别、正则检测、坐标映射、马赛克/模糊/遮盖多种脱敏方式
- 处理结果预览、历史记录、导出、状态跟踪
- 脱敏规则与系统参数自定义

---

## 🏗️ 技术架构

### 后端
- Django 5.2+，Django REST Framework
- PostgreSQL 12.0+
- Token认证，CORS支持
- AI/ML：NER、OCR、正则、图像处理
- Celery异步任务队列

### 前端
- React 19.1.0 + Vite 7.0.0
- React Router DOM，Axios
- 组件化页面结构，支持仪表盘、配置、预览、历史等模块

### AI/ML
- RapidOCR（PaddleOCR）
- ERNIE-3.0中文NER模型
- Transformers, HuggingFace Hub
- OpenCV, Pillow, PyMuPDF, pdf2docx, img2pdf
- PyTorch, TorchVision

---

## 📦 目录结构

```bash
legal-doc-redactor/
├── backend/                # Django后端
│   ├── backend/            # 配置、主路由、WSGI/ASGI
│   ├── documents/          # 文档处理核心app
│   │   ├── models.py       # 文档/处理结果模型
│   │   ├── process.py      # 脱敏主流程
│   │   ├── utils/          # detector/ocr/ner等AI工具
│   │   ├── views.py        # 上传、处理、历史、结果API
│   │   ├── serializers.py  # DRF序列化
│   │   ├── urls.py         # API路由
│   ├── users/              # 用户认证app
│   ├── media/              # 文件存储
│   ├── manage.py
├── frontend/               # React前端
│   ├── src/
│   │   ├── pages/          # Auth, Dashboard, Config, Preview等页面
│   │   ├── api/            # 后端API封装
│   │   ├── App.jsx         # 路由与主结构
│   │   ├── main.jsx        # 挂载入口
│   │   ├── index.css       # 全局样式
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
├── requirements.txt        # Python依赖
├── package.json            # 根依赖
├── README.md
```

---

## 🚀 业务流程与核心逻辑

### 后端（Django）
1. **文档上传**：用户通过API上传PDF，后端保存文件、计算hash、提取页数、存储元数据。
2. **文档处理**：用户选择脱敏配置，提交处理请求，后端校验、查重、分发Celery异步任务。
3. **AI脱敏主流程**（见`process.py`）：
   - PDF转图片
   - OCR识别文字及坐标（`detector.py`/`ocr.py`）
   - 文本拼接，NER模型识别敏感实体（`ner.py`）
   - 正则检测邮箱/长数字
   - 坐标映射，图像处理（马赛克/模糊/遮盖，`img.py`）
   - 合成脱敏后PDF，保存结果
4. **结果管理**：支持历史记录、结果预览、导出、删除等API

### 前端（React）
- 登录/注册页：Token登录，状态持久化
- 仪表盘：上传文档、查看上传列表、选择处理
- 配置页：自定义脱敏规则、选择处理方式、模型/算力选项
- 预览页：展示处理结果，支持导出/删除/历史切换
- 路由保护：未登录自动跳转登录页
- API交互：所有操作均通过Axios与后端RESTful接口通信

---

## ⚙️ 主要配置与环境

- Python 3.8+，Node.js 16+，PostgreSQL 12+
- Conda用于AI环境管理
- `.env`支持自定义密钥、数据库、模型路径、脱敏参数等
- CORS配置详见`settings.py`

---

## 🔗 主要API接口

- `POST /api/users/register/` 用户注册
- `POST /api/users/login/` 用户登录
- `POST /api/upload/` 上传文档
- `POST /api/redact_all/` 文档脱敏处理
- `GET /api/history/` 获取历史记录
- `GET /api/results/{task_id}/` 获取处理结果

---

## 🧠 AI脱敏技术细节

- 支持姓名、地址、公司名（NER）、邮箱/长数字（正则）等多类型敏感信息
- 支持马赛克、模糊、彩色遮盖多种处理方式
- OCR结果缓存，避免重复识别
- 支持多页PDF批量处理，逐页处理防止内存溢出
- GPU加速NER推理，参数可自定义

---

## 🛠️ 启动与测试

1. `npm install` 安装前后端依赖
2. 配置数据库，修改`settings.py`与`.env`
3. `python manage.py migrate` 初始化数据库
4. 配置Celery的服务器url，修改`settings.py`的 `CELERY_BROKER_URL = `
5. 启动Redis服务器
6. `npm run FADE` 一键启动前后端
7. 访问 http://localhost:5173 前端，http://localhost:8000 后端API
8. 后端测试：`python manage.py test`，前端测试：`npm test`

---

## 📢 注意事项

- 大文件处理建议使用GPU
- 项目持续开发中，API和功能可能变动

---

如需详细技术文档、API说明或二次开发支持，请查阅源码或联系维护者。
