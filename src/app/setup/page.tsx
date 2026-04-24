"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type DbType = "sqlite" | "mysql";
type Status = "idle" | "testing" | "saving" | "success" | "error";

export default function SetupPage() {
  const router = useRouter();
  const [dbType, setDbType] = useState<DbType>("sqlite");
  const [sqlitePath, setSqlitePath] = useState("./data/lmind.db");
  const [mysql, setMysql] = useState({ host: "localhost", port: "3306", database: "lmind", user: "root", password: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState("");

  const getPayload = () =>
    dbType === "sqlite"
      ? { type: "sqlite", path: sqlitePath }
      : { type: "mysql", ...mysql, port: Number(mysql.port) };

  const handleTest = async () => {
    setStatus("testing"); setMsg("");
    const res = await fetch("/api/setup/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(getPayload()) });
    const data = await res.json();
    setStatus(data.ok ? "success" : "error");
    setMsg(data.ok ? "连接成功" : data.error);
  };

  const handleSave = async () => {
    setStatus("saving"); setMsg("");
    const res = await fetch("/api/setup/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(getPayload()) });
    const data = await res.json();
    if (data.ok) router.push("/login");
    else { setStatus("error"); setMsg(data.error); }
  };

  const mysqlFields: [keyof typeof mysql, string, string][] = [
    ["host", "主机地址", "localhost"],
    ["port", "端口", "3306"],
    ["database", "数据库名", "lmind"],
    ["user", "用户名", "root"],
    ["password", "密码", ""],
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)]">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-lg)]">
        <div className="mb-6 flex flex-col items-center">
          <svg className="mb-3 h-10 w-10 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11h6M9 15h4" />
          </svg>
          <h1 className="text-title-xl text-[var(--color-text-primary)]">初始化配置</h1>
          <p className="mt-1 text-body-sm text-[var(--color-text-tertiary)]">选择数据存储方式以开始使用 Lmind</p>
        </div>

        {/* DB type toggle */}
        <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-gray-100)] p-1 mb-6">
          {(["sqlite", "mysql"] as DbType[]).map((t) => (
            <button key={t} type="button" onClick={() => { setDbType(t); setMsg(""); setStatus("idle"); }}
              className={cn(
                "flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-body-sm font-medium transition-colors",
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
            mysqlFields.map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">{label}</label>
                <Input
                  type={key === "password" ? "password" : "text"}
                  value={mysql[key]}
                  onChange={(e) => setMysql({ ...mysql, [key]: e.target.value })}
                  placeholder={placeholder}
                />
              </div>
            ))
          )}
        </div>

        {msg && (
          <p className={cn("mt-4 text-body-sm", status === "error" ? "text-[var(--color-error-500)]" : "text-green-600")}>
            {status === "success" && "✓ "}{msg}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={handleTest} disabled={status === "testing" || status === "saving"}>
            {status === "testing" ? "测试中..." : "测试连接"}
          </Button>
          <Button onClick={handleSave} disabled={status === "saving"} className="flex-1">
            {status === "saving" ? "保存中..." : "保存并继续"}
          </Button>
        </div>
      </div>
    </div>
  );
}
