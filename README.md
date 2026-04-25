# <img src="public/LmindLogo.svg" alt="Lmind Logo" width="36" height="36" style="vertical-align: middle;" /> Lmind - AI 思维导图

基于 Next.js + ReactFlow 的 AI 驱动思维导图编辑器，支持 DeepSeek / ChatGPT / 通义千问等多模型，支持 XMind 导入导出。

## 功能特性

- **AI 辅助创作**：支持 DeepSeek、ChatGPT（OpenAI）、通义千问等兼容 OpenAI 协议的模型
- **思维导图编辑**：基于 ReactFlow 的可视化画布，支持节点增删改、拖拽布局
- **AI 节点扩展**：对单个节点调用 AI 进行内容扩展
- **XMind 导入导出**：兼容 XMind 格式文件
- **多文档管理**：创建、保存、管理多个思维导图文档
- **大纲视图**：支持大纲模式浏览和导航
- **用户认证**：支持密码登录（邮箱/用户名）和安全码登录
- **管理面板**：用户增删改查、安全码管理、全局 AI API 设置
- **全局 AI 配置**：管理员可设置默认 AI API Key，用户未配置时自动使用全局默认值
- **双数据库**：支持 SQLite（开箱即用）和 MySQL 8.x
- **Redis 缓存**：可选 Redis 支持
- **国际化**：基于 i18next 的多语言支持

## 技术栈

- **框架**：Next.js 16 + React 19
- **思维导图**：@xyflow/react + elkjs（自动布局）
- **状态管理**：Jotai + Zustand
- **样式**：Tailwind CSS 4
- **数据库**：SQLite / MySQL 8.x
- **缓存**：Redis（可选）
- **HTTP**：ky
- **数据获取**：TanStack Query

## 本地开发

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:24701](http://localhost:24701) 查看。首次启动会进入 Setup 页面配置数据库。

### 本地 MySQL + Redis 开发环境

如需在本地使用 MySQL 和 Redis 开发：

```bash
# 启动 MySQL + Redis 容器
docker compose up -d

# 启动应用（连接本地 Docker 中的 MySQL）
pnpm dev
```

启动后在 Setup 页面填写：
- **MySQL**: host=`localhost`, port=`24703`, database=`Lmind`, user=`Lmind`, password=`Lmind24703`
- **Redis**: `redis://:redis6379@localhost:24704`

## 管理员系统

系统内置一个预置管理员账号，同时首个注册的用户也会自动成为管理员。

### 默认管理员

| 用户名 | 密码 | 说明 |
|--------|------|------|
| `admin` | `admin123` | 内置超级管理员，首次启动时自动创建 |

使用 **密码登录** 选项卡，输入用户名和密码即可登录。管理员登录后自动跳转到管理面板。

### 管理面板

登录后在 设置 → 账号安全 → 「管理面板 →」进入，或直接访问 `/admin`。

### 用户管理（增删改查）

| 操作 | 说明 |
|------|------|
| 添加用户 | 填写邮箱、用户名、密码、安全码、角色，一键创建 |
| 编辑用户 | 修改用户名、重置密码 |
| 搜索/查看 | 用户列表展示邮箱、用户名、角色、安全码状态 |
| 升为管理员/降级 | 切换用户角色 |
| 重置安全码 | 为用户生成新的安全码 |
| 启用/禁用安全码 | 控制用户是否可用安全码登录 |
| 删除用户 | 不可删除最后一个管理员 |

### 全局 AI API 设置

管理员可为所有提供商（DeepSeek、ChatGPT、千问）设置全局默认 API Key、模型和 Base URL。

**优先级：** 用户自己的 API Key > 全局默认 API Key

当用户未配置自己的 API Key 时，系统自动使用全局默认值。用户仍可随时在设置中覆盖为自己的 Key。

## 登录方式

| 方式 | 说明 |
|------|------|
| 密码登录 | 输入邮箱或用户名 + 密码，系统自动识别身份 |
| 安全码登录 | 输入 6 位数字安全码快速登录 |

## Docker 部署

### 构建镜像

```bash
docker build -t lmind .
```

### 方式一：环境变量配置（推荐）

通过环境变量注入数据库配置，无需 Setup 页面：

```bash
docker run -d -p 24701:24701 \
  -e DB_TYPE=mysql \
  -e DB_HOST=your-mysql-host \
  -e DB_PORT=3306 \
  -e DB_NAME=Lmind \
  -e DB_USER=Lmind \
  -e DB_PASS=Lmind24703 \
  -e REDIS_URL=redis://:redis6379@your-redis-host:6379 \
  --name lmind lmind
```

### 方式二：Setup 页面配置

```bash
docker run -d -p 24701:24701 -v lmind_data:/app/data --name lmind lmind
```

启动后访问 `http://localhost:24701`，在 Setup 页面配置数据库连接。

### 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_TYPE` | 数据库类型 `mysql` / `sqlite` | - |
| `DB_HOST` | MySQL 主机地址 | `localhost` |
| `DB_PORT` | MySQL 端口 | `3306` |
| `DB_NAME` | MySQL 数据库名 | `lmind` |
| `DB_USER` | MySQL 用户名 | `root` |
| `DB_PASS` | MySQL 密码 | - |
| `DB_PATH` | SQLite 文件路径 | `./data/lmind.db` |
| `REDIS_URL` | Redis 连接地址 | - |

## 1Panel 部署

[1Panel](https://1panel.cn/) 是一款现代化的 Linux 服务器运维管理面板。

### 前置条件

- 已安装 1Panel 面板
- 1Panel 中已安装 Docker / OpenResty
- MySQL 8.x 数据库（1Panel 应用商店安装或已有）
- Redis（可选，1Panel 应用商店安装）

### 步骤一：上传镜像

在本地构建好镜像后，导出并上传到服务器：

```bash
# 本地打包
docker save -o lmind.tar lmind

# 上传到服务器后加载
docker load -i lmind.tar
```

### 步骤二：使用 docker-compose 部署

将 `docker-compose.prod.yml` 上传到服务器，根据实际环境修改数据库连接信息后：

```bash
docker compose -f docker-compose.prod.yml up -d
```

> 注意：如果 MySQL/Redis 运行在 1Panel 的 Docker 网络中，需要取消 `docker-compose.prod.yml` 中 networks 的注释，并修改 `DB_HOST` 为 MySQL 容器名。

### 步骤三：配置反向代理（可选）

1. 进入「网站」->「网站」->「创建网站」->「反向代理」
2. 填写配置：
   - 主域名：如 `mind.example.com`
   - 代理地址：`http://127.0.0.1:24701`
3. 点击「确认」创建
4. 如需 HTTPS，在网站列表中点击该网站 ->「HTTPS」-> 申请/导入证书并开启

### 步骤四：验证

浏览器访问 `http://服务器IP:24701` 或配置的域名，看到登录页面即部署成功。
