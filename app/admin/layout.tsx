"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "仪表盘", icon: "📊", exact: true },
  { href: "/admin/workflows", label: "工作流", icon: "📦", exact: false },
  { href: "/admin/settings", label: "设置", icon: "⚙️", exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const isActive = (item: typeof NAV_ITEMS[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 左侧导航栏 - 深色背景 */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-[#1e293b] z-50
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo 区域 */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-700">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md">
            <span className="text-white text-sm">🎨</span>
          </div>
          <span className="text-base font-semibold text-white">管理后台</span>
        </div>

        {/* 导航菜单 */}
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                ${isActive(item)
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 底部操作区 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
          >
            <span className="text-lg">🏠</span>
            返回前台
          </Link>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all disabled:opacity-50"
          >
            <span className="text-lg">🚪</span>
            {isLoggingOut ? "登出中..." : "登出"}
          </button>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <div className="lg:ml-64">
        {/* 顶部标题栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* 页面标题 - 根据路由显示 */}
          <h1 className="text-lg font-semibold text-gray-800 hidden lg:block">
            {NAV_ITEMS.find(item => isActive(item))?.label || "管理后台"}
          </h1>

          {/* 右侧操作 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">
              Coze2App 管理系统
            </span>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
