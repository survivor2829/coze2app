export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-gray-500 text-sm">系统配置和偏好设置</p>
      </div>

      {/* API 配置 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>🔑</span>
          API 配置
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DeepSeek API Key
            </label>
            <input
              type="password"
              placeholder="sk-..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none"
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">通过 .env.local 文件配置</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DeepSeek Base URL
            </label>
            <input
              type="text"
              placeholder="https://api.deepseek.com/v1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none"
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">通过 .env.local 文件配置</p>
          </div>
        </div>
      </div>

      {/* 系统信息 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>ℹ️</span>
          系统信息
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">版本</span>
            <span className="text-sm font-medium text-gray-800">1.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600">框架</span>
            <span className="text-sm font-medium text-gray-800">Next.js 14</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">状态</span>
            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              正常运行
            </span>
          </div>
        </div>
      </div>

      {/* 帮助 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>💡</span>
          帮助
        </h2>
        <div className="space-y-3 text-sm text-gray-600">
          <p>• 工作流配置：在「工作流」页面添加和管理 Coze 工作流</p>
          <p>• 智能引导：用户可通过引导页一步步生成内容</p>
          <p>• API 配置：在 .env.local 文件中配置 DeepSeek API</p>
        </div>
      </div>
    </div>
  );
}
