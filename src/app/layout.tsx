import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lmind - AI 思维导图",
  description: "AI 驱动的智能思维导图应用",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
