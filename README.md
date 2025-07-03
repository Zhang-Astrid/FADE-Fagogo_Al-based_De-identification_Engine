## 架构设计
```bash
legal-doc-redactor/                      # 📦 项目根目录
│
├── backend/                             # 🐍 Django 后端项目目录
│   ├── manage.py                        # ▶️ Django 管理脚本
│   ├── redactor/                        # ⚙️ Django 项目配置目录（项目名）
│   │   ├── __init__.py
│   │   ├── settings.py                  # 🔧 后端全局配置（数据库/CORS/静态文件）
│   │   ├── urls.py                      # 🔗 项目主路由入口，挂载API app
│   │   └── wsgi.py / asgi.py            # 🌐 服务器接口文件
│   │
│   ├── api/                             # 🧠 核心业务应用（脱敏逻辑）
│   │   ├── __init__.py
│   │   ├── models.py                    # 🗃️ 可定义上传任务、日志等数据库模型
│   │   ├── views.py                     # 🧩 处理上传、OCR、脱敏、导出等请求
│   │   ├── urls.py                      # 🚦 API 路由定义（如 /upload, /result）
│   │   ├── serializers.py               # 🔄 DRF 序列化器（模型转JSON）,将模型数据（Model）与 JSON 数据之间相互转换的模块。
│   │   ├── admin.py                     # 在 models.py 中定义的数据库模型，想让它出现在 http://127.0.0.1:8000/admin/ 后台页面，就需要在 admin.py 中注册它。
│   │   ├── utils/                       # 🔧 工具方法目录
│   │       ├── ocr.py                   # 🖼️ OCR 图像识别模块（如 EasyOCR）
│   │       ├── redact.py                # 🕵️ NLP 脱敏处理逻辑（替换/遮挡等）
│   │       └── pdf_utils.py             # 📄 PDF 读取与保存工具（fitz/PyMuPDF等）
│   │   └── migrations/
│   │       └── __init__.py              # Django 使用「迁移文件」记录模型（models.py）与数据库表之间的映射历史。每次执行：“python manage.py makemigrations”就会在 api/migrations/ 目录中生成一个 0001_initial.py 等文件，用于记录字段变动
│   │
│   └── media/                           # 🗂️ 用户上传文件与生成结果存放目录
│
├── frontend/                            # ⚛️ 前端 React + Vite 项目目录
│   ├── index.html                       # 🧩 页面入口文件
│   ├── package.json                     # 📦 前端依赖与脚本定义
│   ├── vite.config.js                   # ⚙️ 构建工具配置，含代理等设置
│   ├── postcss.config.js                # ✨ 样式处理配置│   │
│   ├── eslint.config.js                 # 🧩 是一个 JS / JSX / TS 代码语法检查和风格规范工具
│   └── src/                             # 🚀 前端源码目录
│       ├── main.jsx                     # 🚪 应用入口文件（挂载 React）
│       ├── App.jsx                      # 🧭 应用主结构（含路由）
│       ├── index.css                    # 🎨 全局样式（引入 tailwind）
│       │
│       ├── pages/                       # 📃 页面组件目录
│       │   ├── Dashboard/               # 首页（上传+字段选择）
│       │   │   ├── Dashboard.jsx
│       │   │   └── UploadList.jsx
│       │   │
│       │   ├── Settings/                # 配置面板
│       │   │   └── Settings.jsx
│       │   │
│       │   ├── Results/                 # 结果预览与导出
│       │   │   ├── Results.jsx
│       │   │   └── PDFPreview.jsx
│       │   │
│       │   └── History/                 # 历史记录
│       │       └── History.jsx
│       │
│       ├── components/                  # 🧱 通用组件
│       │   ├── UploadArea.jsx           # 拖拽上传区域
│       │   ├── FieldSelector.jsx        # 脱敏字段选择器
│       │   ├── DesensitizeOption.jsx    # 每种字段的处理方式配置
│       │   ├── ModeSelector.jsx         # CPU/GPU & 单/批处理选项
│       │   ├── LogExportSwitch.jsx      # 日志导出开关
│       │   ├── FilePreview.jsx          # 原图/脱敏图预览切换
│       │   └── TaskCard.jsx             # 单条任务历史卡片
│       │
│       ├── api/                         # 🌐 与后端交互的 API 方法
│       │   ├── redact.js                # 🔌 上传文件、配置脱敏接口封装
│       │   └── history.js               # 📜 获取历史任务API
│       │
│       ├── config/                      # ⚙️ 常量与配置文件（如字段选项）
│       │   └── redactFields.js
│       │
│       ├── img/                         # 🖼️ 图标、图片资源
│       └── hooks/                       # 🪝 自定义 React hooks（如 useUpload）
│
├── .env                                 # 🛠️ 环境变量配置（如后端地址、密钥）
├── requirements.txt                     # 📚 Python 后端依赖列表
├── README.md                            # 📘 项目说明文档
└── .gitignore                           # 🙈 Git 忽略文件配置


```