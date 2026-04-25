import fs from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env");

export type DbConfig =
  | { type: "sqlite"; path: string }
  | { type: "mysql"; host: string; port: number; database: string; user: string; password: string };

export interface AppConfig {
  db: DbConfig;
  redis?: { url: string };
}

/**
 * 读取 .env 文件并解析为 key=value 对（不依赖 dotenv 库）
 */
function parseEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const content = fs.readFileSync(ENV_PATH, "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    result[key] = val;
  }
  return result;
}

/**
 * 获取配置值：优先 .env 文件（Setup 页面写入的值），其次 process.env（Docker 默认值）
 */
function getEnv(key: string, fallback = ""): string {
  return parseEnvFile()[key] || process.env[key] || fallback;
}

/**
 * 是否已初始化（INITIALIZED=true 时跳过 setup 页面）
 */
export function isConfigured(): boolean {
  return getEnv("INITIALIZED") === "true";
}

/**
 * 读取完整配置
 */
export function readConfig(): AppConfig {
  const dbType = getEnv("DB_TYPE", "sqlite");

  let db: DbConfig;
  if (dbType === "mysql") {
    db = {
      type: "mysql",
      host: getEnv("DB_HOST", "localhost"),
      port: Number(getEnv("DB_PORT", "3306")),
      database: getEnv("DB_NAME", "Lmind"),
      user: getEnv("DB_USER", "root"),
      password: getEnv("DB_PASS", ""),
    };
  } else {
    db = {
      type: "sqlite",
      path: getEnv("DB_PATH", "./data/lmind.db"),
    };
  }

  const config: AppConfig = { db };
  const redisUrl = getEnv("REDIS_URL");
  if (redisUrl) {
    config.redis = { url: redisUrl };
  }
  return config;
}

/**
 * 写入 .env 文件（Setup 页面使用）
 */
export function writeEnvFile(values: Record<string, string>): void {
  const existing = parseEnvFile();
  const merged = { ...existing, ...values };

  const lines: string[] = [
    "# Lmind 项目配置（由 Setup 页面自动生成）",
    "",
  ];
  for (const [key, val] of Object.entries(merged)) {
    lines.push(`${key}=${val}`);
  }
  fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n");

  // 同步更新 process.env（兼容 Edge Runtime 等不同上下文）
  for (const [key, val] of Object.entries(values)) {
    process.env[key] = val;
  }
}
