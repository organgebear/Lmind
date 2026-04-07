# Lmind - AI 思维导图

基于 Next.js + ReactFlow 的 AI 驱动思维导图编辑器，支持 DeepSeek / ChatGPT / 通义千问等多模型，支持 XMind 导入导出。

## 本地开发

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:24701](http://localhost:24701) 查看。

## Docker 部署

### 构建镜像

```bash
cd web
docker build -t lmind .
```

### 运行容器

```bash
docker run -d -p 24701:24701 --name lmind lmind
```

## 1Panel 部署教程

[1Panel](https://1panel.cn/) 是一款现代化的 Linux 服务器运维管理面板，以下是通过 1Panel 部署 Lmind 的步骤。

### 前置条件

- 已安装 1Panel 面板
- 1Panel 中已安装 Docker / OpenResty

### 步骤一：上传镜像

在本地构建好镜像后，导出并上传到服务器：

```bash
# 本地打包
docker save -o lmind.tar lmind

# 上传到服务器后加载
docker load -i lmind.tar
```

或者直接在服务器上 clone 代码并构建：

```bash
cd web
docker build -t lmind .
```

### 步骤二：在 1Panel 中创建容器

1. 登录 1Panel 面板
2. 进入「容器」->「容器」->「创建容器」
3. 填写配置：
   - 名称：`lmind`
   - 镜像：`lmind`（选择刚才构建/加载的镜像）
   - 端口映射：宿主机端口 `24701` -> 容器端口 `24701`
   - 重启策略：`always`
4. 点击「确认」创建

### 步骤三：配置反向代理（可选）

如果需要通过域名访问：

1. 进入「网站」->「网站」->「创建网站」->「反向代理」
2. 填写配置：
   - 主域名：你的域名，如 `mind.example.com`
   - 代理地址：`http://127.0.0.1:24701`
3. 点击「确认」创建
4. 如需 HTTPS，在网站列表中点击该网站 ->「HTTPS」-> 申请/导入证书并开启

### 步骤四：验证

浏览器访问 `http://服务器IP:24701` 或配置的域名，看到思维导图编辑器即部署成功。
