FROM node:20-alpine AS base

# --- 依赖安装 ---
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile

# --- 构建 ---
FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- 运行 ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# data 目录用于存放 config.json（文件配置模式）和 SQLite 数据库
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
# 创建 .env 文件并赋予 nextjs 写权限（Setup 页面需要）
RUN touch /app/.env && chown nextjs:nodejs /app/.env

USER nextjs
EXPOSE 24701
ENV PORT=24701
ENV HOSTNAME="0.0.0.0"

# 数据库配置（通过环境变量注入，也可用 setup 页面配置）
# DB_TYPE=mysql|sqlite
# DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
# DB_PATH (sqlite only)
# REDIS_URL=redis://:password@host:port

CMD ["node", "server.js"]
