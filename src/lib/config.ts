import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

export type DbConfig =
  | { type: "sqlite"; path: string }
  | { type: "mysql"; host: string; port: number; database: string; user: string; password: string };

export interface AppConfig {
  db: DbConfig;
}

export function isConfigured(): boolean {
  return fs.existsSync(CONFIG_PATH);
}

export function readConfig(): AppConfig {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

export function writeConfig(config: AppConfig): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
