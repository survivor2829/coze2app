"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "仪表板", icon: "📊" },
  { href: "/admin/workflows", label: "工作流管理", icon: "⚡" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 登录页不使用后台布局
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-animate">
      {/* 顶部导航 */}
      <header className="glass border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <span className="text-white text-lg">⚙️</span>
              </div>
              <span className="text-lg font-semibold text-gray-800">管理后台</span>
            </Link>

            {/* 导航链接 */}
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === item.href
                      ? "bg-white/80 text-purple-600 shadow-sm"
                      : "text-gray-600 hover:bg-white/50 hover:text-gray-800"
                  }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* 返回前台 */}
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-white/50 hover:text-gray-800 transition-all"
            >
              返回前台
            </Link>

            {/* 登出 */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 rounded-lg bg-white/60 hover:bg-white/80 text-gray-700 text-sm font-medium transition-all border border-white/40 disabled:opacity-50"
            >
              {isLoggingOut ? "登出中..." : "登出"}
            </button>
          </div>
        </div>
      </header>

      {/* 移动端导航 */}
      <nav className="sm:hidden glass border-b border-white/20 px-4 py-2 flex gap-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              pathname === item.href
                ? "bg-white/80 text-purple-600 shadow-sm"
                : "text-gray-600 hover:bg-white/50"
            }`}
          >
            <span className="mr-1">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
