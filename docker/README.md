# Akasha 项目 nginx 配置指南

## 概述

通过 nginx 反向代理，统一前后端访问地址，用户只需访问 `http://localhost` 即可，无需手动配置后端地址。

## 为什么使用 nginx？

**问题**：目前访问前端页面后，需要手动在开发者选项中输入后端地址（如 `http://localhost:8787`）才能正常使用。

**解决方案**：使用 nginx 作为反向代理服务器，将前后端统一到一个域名/IP 下：

```
用户访问 http://localhost (nginx, 端口 80)
│
├── / (根路径) → 前端 Vite 开发服务器 或 静态文件
├── /api/* → 后端服务 (端口 8787)
├── /supabase/* → Supabase 服务 (端口 8000)
└── /tts/* → TTS 服务 (端口 9191)
```

## 方案一：Docker 方式（推荐用于快速测试）

### 适用场景
- 快速测试环境
- 隔离的开发环境
- 不想在本地安装 nginx

### 启动步骤

```bash
# 1. 确保已安装 Docker Desktop

# 2. 进入项目目录
cd path/to/akasha

# 3. 启动所有服务（前端、后端、nginx）
docker compose -f docker/docker-compose.nginx.yml up

# 4. 访问 http://localhost
```

### 停止服务

```bash
docker compose -f docker/docker-compose.nginx.yml down
```

### 注意事项

- 第一次启动需要下载 Node.js 和 nginx 镜像
- 容器会挂载本地代码，修改后会自动重载（前端 Vite HMR）
- 需要设置环境变量 `SUPABASE_SERVICE_ROLE_KEY`

## 方案二：Windows 本地 nginx（推荐用于日常开发）

### 适用场景
- 已有本地开发环境
- 需要更高性能
- 不想使用 Docker

### 安装步骤

1. **下载 nginx for Windows**
   - 访问：https://nginx.org/en/download.html
   - 下载稳定版（stable release）
   - 解压到例如：`C:\nginx`

2. **配置 nginx**

   方法 A：替换配置文件
   ```bash
   # 复制配置文件
   copy docker\nginx.windows.dev.conf C:\nginx\conf\nginx.conf
   ```

   方法 B：手动编辑 `C:\nginx\conf\nginx.conf`

3. **启动 nginx**
   ```bash
   cd C:\nginx
   start nginx
   ```

4. **启动前端和后端服务**

   使用提供的批处理脚本（推荐）：
   ```bash
   # 在项目目录执行
   docker\start-windows-native.bat
   ```

   或手动启动：
   ```bash
   # 终端 1 - 启动前端
   npm run start

   # 终端 2 - 启动后端
   npm run server
   ```

5. **访问 http://localhost**

### 停止服务

使用批处理脚本：
```bash
docker\stop-windows-native.bat
```

或手动停止：
```bash
# 停止 nginx
cd C:\nginx
nginx -s stop

# 手动关闭前端和后端窗口
```

## 方案三：Linux/Mac 本地 nginx

### 安装

```bash
# Ubuntu/Debian
sudo apt-get install nginx

# macOS (使用 Homebrew)
brew install nginx

# 启动
sudo systemctl start nginx  # Linux
brew services start nginx   # macOS
```

### 配置

将 `docker/nginx.production.conf` 内容添加到 nginx 配置：
- Linux: `/etc/nginx/sites-available/default` 或 `/etc/nginx/nginx.conf`
- macOS: `/usr/local/etc/nginx/nginx.conf`

### 修改生产环境配置

编辑 `nginx.production.conf`，修改：
```nginx
root /path/to/akasha/dist;  # 改为你的项目 dist 目录绝对路径
```

## 生产环境部署

### 构建前端

```bash
# 设置生产环境变量
export VITE_API_URL=/api
npm run build
```

### nginx 配置要点

1. **修改 root 路径**
   ```nginx
   root /path/to/akasha/dist;
   ```

2. **配置 HTTPS（推荐）**
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       # ... 其他配置
   }
   ```

3. **启用 gzip 压缩**（已在 production.conf 中配置）

## 前端配置说明

使用 nginx 后，前端默认使用相对路径 `/api` 访问后端：

### 默认行为
- `src/logic/api.ts` 中 `DEFAULT_API_URL = "/api"`
- 通过 nginx 访问时，请求自动转发到后端
- 无需手动配置

### 特殊情况
如果访问远程后端，仍可在开发者设置中配置自定义地址。

## 环境变量

### .env 文件示例

```bash
# 前端环境变量
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=/api

# 后端环境变量
SUPABASE_URL=http://localhost:8000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TTS_BASE_URL=http://localhost:9191
PORT=8787
```

## 常见问题

### 1. 502 Bad Gateway
**原因**：后端服务未运行
**解决**：检查后端服务是否运行在 8787 端口

### 2. 前端页面不显示
**开发环境**：检查 Vite 是否运行在 5173 端口
**生产环境**：检查 dist 目录路径是否正确

### 3. CORS 错误
nginx 配置已处理 CORS，确保请求通过 nginx 转发而非直接访问后端

### 4. Supabase 连接失败
- 确保 Supabase 运行在 8000 端口
- 检查 `SUPABASE_SERVICE_ROLE_KEY` 环境变量

### 5. 配置修改后未生效
- nginx 配置修改后需要重新加载：`nginx -s reload`
- 清除浏览器缓存

## 文件说明

```
docker/
├── nginx.conf                        # Docker 开发环境配置
├── nginx.windows.dev.conf            # Windows 本地开发配置
├── nginx.production.conf             # 生产环境配置
├── docker-compose.nginx.yml          # Docker Compose 配置
├── start.bat                         # Docker 启动脚本
├── start-windows-native.bat          # Windows 本地启动脚本
├── stop-windows-native.bat           # Windows 本地停止脚本
└── README.md                         # 本文档
```

## 快速参考

### Windows 用户快速开始

1. 安装 nginx for Windows
2. 运行 `docker\start-windows-native.bat`
3. 访问 http://localhost

### Docker 用户快速开始

1. 确保 Docker Desktop 运行
2. 运行 `docker compose -f docker/docker-compose.nginx.yml up`
3. 访问 http://localhost

### 开发完成后

- 本地访问：http://localhost
- 前端开发服务器：http://localhost:5173（不通过 nginx）
- 后端 API：http://localhost:8787（不通过 nginx）
