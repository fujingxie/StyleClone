import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "StyleClone",
  description: "主播分身直播台词生成工作台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
