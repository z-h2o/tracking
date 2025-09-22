#!/bin/bash

echo "🚀 启动埋点后台服务..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查MySQL是否运行
if ! command -v mysql &> /dev/null; then
    echo "⚠️  警告: MySQL 命令未找到，请确保 MySQL 已安装并运行"
fi

# 检查.env文件是否存在
if [ ! -f .env ]; then
    echo "📝 创建配置文件..."
    cp .env.example .env
    echo "✅ 已创建 .env 配置文件，请根据实际情况修改数据库配置"
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 检查数据库连接
echo "🔍 检查数据库连接..."

# 提示用户创建数据库
echo "📊 请确保已执行以下步骤："
echo "   1. MySQL 服务已启动"
echo "   2. 已创建数据库: CREATE DATABASE tracking_system;"
echo "   3. 已执行数据库脚本: source database/schema.sql"

# 启动服务
echo "🌟 启动服务..."
npm run dev