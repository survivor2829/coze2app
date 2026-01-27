# AI 创作助手

基于 Coze 工作流的智能内容创作应用。极简设计，一键部署。

## 特性

- 极简聊天界面，访问即用
- 智能内容生成，支持文章 + 配图
- Token 安全存储在服务端
- 一键部署到 Vercel

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## Vercel 部署

### 方式一：一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### 方式二：手动部署

1. Fork 本项目到你的 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量：
   - `COZE_API_ENDPOINT`: Coze 工作流端点
   - `COZE_API_TOKEN`: Coze API Token
4. 部署完成

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `COZE_API_ENDPOINT` | 是 | Coze 专属工作流端点 |
| `COZE_API_TOKEN` | 是 | Coze API Token |

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **部署**: Vercel Serverless
