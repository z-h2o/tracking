#!/bin/bash

# 埋点监控系统文档站点启动脚本

echo "🚀 启动埋点监控系统文档站点..."

# 检查 Node.js 版本
NODE_VERSION=$(node --version)
echo "📦 Node.js 版本: $NODE_VERSION"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📥 安装依赖..."
    npm install
fi

# 启动开发服务器
echo "🌐 启动文档服务器..."
echo "📖 文档地址: http://localhost:5173"
echo "💡 按 Ctrl+C 停止服务"

npm run dev
