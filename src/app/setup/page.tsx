"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type DbType = "sqlite" | "mysql";
type Status = "idle" | "testing" | "saving" | "success" | "error";

export default function SetupPage() {
  const router = useRouter();
  const [dbType, setDbType] = useState<DbType>("sqlite");
  const [sqlitePath, setSqlitePath] = useState("./data/lmind.db");
  const [mysql, setMysql] = useState({ host: "mysql", port: "3306", database: "Lmind", user: "Lmind", password: "" });
  const [redisUrl, setRedisUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getPayload = () =>
    dbType === "sqlite"
      ? { type: "sqlite", path: sqlitePath, redisUrl }
      : { type: "mysql", ...mysql, port: Number(mysql.port), redisUrl };

  const handleTest = async () => {
    setStatus("testing"); setMsg("");
    try {
      const res = await fetch("/api/setup/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(getPayload()) });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        console.error("[setup] test endpoint non-JSON response:", res.status, text.slice(0, 500));
        setStatus("error"); setMsg(`服务器错误 (${res.status})，请查看控制台`);
        return;
      }
      const data = await res.json();
      setStatus(data.ok ? "success" : "error");
      setMsg(data.ok ? "连接成功" : data.error || "未知错误");
    } catch (e) {
      console.error("[setup] test fetch failed:", e);
      setStatus("error"); setMsg("请求失败，请检查网络或控制台");
    }
  };

  const handleSave = async () => {
    setStatus("saving"); setMsg("");
    try {
      const res = await fetch("/api/setup/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(getPayload()) });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        console.error("[setup] save endpoint non-JSON response:", res.status, text.slice(0, 500));
        setStatus("error"); setMsg(`服务器错误 (${res.status})，请查看控制台`);
        return;
      }
      const data = await res.json();
      if (data.ok) window.location.href = "/login";
      else { setStatus("error"); setMsg(data.error || "保存失败"); }
    } catch (e) {
      console.error("[setup] save fetch failed:", e);
      setStatus("error"); setMsg("请求失败，请检查网络或控制台");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)]">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] p-10 shadow-[var(--shadow-lg)]">
        <div className="mb-6 flex flex-col items-center">
          <Logo size={48} className="mb-3" />
          <h1 className="text-title-xl text-[var(--color-text-primary)]">初始化配置</h1>
          <p className="mt-1 text-body-sm text-[var(--color-text-tertiary)]">选择数据存储方式以开始使用 Lmind</p>
        </div>

        {/* DB type toggle */}
        <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-gray-100)] p-1 mb-6">
          {(["sqlite", "mysql"] as DbType[]).map((t) => (
            <button key={t} type="button" onClick={() => { setDbType(t); setMsg(""); setStatus("idle"); }}
              className={cn(
                "flex-1 rounded-[var(--radius-sm)] px-3 py-2 text-body-sm font-medium transition-colors",
                dbType === t
                  ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}>
              {t === "sqlite" ? "SQLite（本地文件）" : "MySQL"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {dbType === "sqlite" ? (
            <div>
              <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">数据库文件路径</label>
              <Input value={sqlitePath} onChange={(e) => setSqlitePath(e.target.value)} placeholder="./data/lmind.db" />
              <p className="mt-1 text-body-xs text-[var(--color-text-tertiary)]">相对于项目根目录，无需额外安装数据库</p>
            </div>
          ) : (
            <>
              {/* MySQL password — always visible */}
              <div>
                <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">MySQL 密码</label>
                <Input
                  type="password"
                  value={mysql.password}
                  onChange={(e) => setMysql({ ...mysql, password: e.target.value })}
                  placeholder="输入 MySQL 密码"
                />
              </div>

              {/* More settings toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-body-sm text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] self-start"
              >
                {showAdvanced ? "收起设置" : "更多设置"}
              </button>

              {showAdvanced && (
                <>
                  <div>
                    <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">主机地址</label>
                    <Input value={mysql.host} onChange={(e) => setMysql({ ...mysql, host: e.target.value })} placeholder="mysql" />
                  </div>
                  <div>
                    <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">端口</label>
                    <Input value={mysql.port} onChange={(e) => setMysql({ ...mysql, port: e.target.value })} placeholder="3306" />
                  </div>
                  <div>
                    <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">数据库名</label>
                    <Input value={mysql.database} onChange={(e) => setMysql({ ...mysql, database: e.target.value })} placeholder="Lmind" />
                  </div>
                  <div>
                    <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">用户名</label>
                    <Input value={mysql.user} onChange={(e) => setMysql({ ...mysql, user: e.target.value })} placeholder="Lmind" />
                  </div>

                  {/* Redis 配置 */}
                  <div className="pt-4 border-t border-[var(--color-border-subtle)]">
                    <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">Redis 连接地址（可选）</label>
                    <Input
                      type="text"
                      value={redisUrl}
                      onChange={(e) => setRedisUrl(e.target.value)}
                      placeholder="redis://:password@host:port"
                    />
                    <p className="mt-1 text-body-xs text-[var(--color-text-tertiary)]">留空则不启用 Redis 缓存</p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {msg && (
          <p className={cn("mt-4 text-body-sm", status === "error" ? "text-[var(--color-error-500)]" : "text-green-600")}>
            {status === "success" && "✓ "}{msg}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" type="button" onClick={handleTest} disabled={status === "testing" || status === "saving"}>
            {status === "testing" ? "测试中..." : "测试连接"}
          </Button>
          <Button type="button" onClick={handleSave} disabled={status === "saving"} className="flex-1">
            {status === "saving" ? "保存中..." : "保存并继续"}
          </Button>
        </div>
      </div>
    </div>
  );
}
