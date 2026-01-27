import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 创作助手",
  description: "智能内容创作，一键生成精彩文章",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✨</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
