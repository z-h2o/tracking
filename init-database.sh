#!/bin/bash

echo "🗄️  初始化埋点系统数据库..."

# 检查MySQL是否运行
if ! pgrep -x "mysqld" > /dev/null; then
    echo "❌ MySQL服务未运行，请先启动MySQL服务"
    echo "   macOS: brew services start mysql"
    echo "   Linux: sudo service mysql start"
    exit 1
fi

# 从.env文件读取数据库配置
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
else
    echo "❌ .env配置文件不存在，请先创建配置文件"
    exit 1
fi

echo "📋 数据库配置："
echo "   主机: ${DB_HOST:-localhost}"
echo "   端口: ${DB_PORT:-3306}"
echo "   用户: ${DB_USER:-root}"
echo "   数据库: ${DB_NAME:-tracking_system}"

# 创建数据库
echo "🔧 创建数据库 ${DB_NAME}..."

if [ -z "$DB_PASSWORD" ]; then
    # 无密码连接
    mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    MYSQL_EXIT_CODE=$?
else
    # 有密码连接
    mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASSWORD} -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    MYSQL_EXIT_CODE=$?
fi

if [ $MYSQL_EXIT_CODE -ne 0 ]; then
    echo "❌ 数据库创建失败，请检查MySQL连接配置"
    exit 1
fi

echo "✅ 数据库创建成功"

# 执行数据库表结构脚本
echo "📊 创建数据表..."

if [ -z "$DB_PASSWORD" ]; then
    mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} ${DB_NAME} < database/schema.sql
    MYSQL_EXIT_CODE=$?
else
    mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < database/schema.sql
    MYSQL_EXIT_CODE=$?
fi

if [ $MYSQL_EXIT_CODE -ne 0 ]; then
    echo "❌ 数据表创建失败"
    exit 1
fi

echo "✅ 数据表创建成功"

# 验证表是否创建成功
echo "🔍 验证数据表..."

if [ -z "$DB_PASSWORD" ]; then
    TABLE_COUNT=$(mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} ${DB_NAME} -e "SHOW TABLES;" | wc -l)
else
    TABLE_COUNT=$(mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SHOW TABLES;" | wc -l)
fi

# 减去表头行
TABLE_COUNT=$((TABLE_COUNT - 1))

echo "📈 共创建了 ${TABLE_COUNT} 个数据表"

if [ $TABLE_COUNT -ge 6 ]; then
    echo "🎉 数据库初始化完成！"
    echo ""
    echo "📋 已创建的表："
    if [ -z "$DB_PASSWORD" ]; then
        mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} ${DB_NAME} -e "SHOW TABLES;"
    else
        mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SHOW TABLES;"
    fi
    echo ""
    echo "🚀 现在可以启动服务了："
    echo "   npm start"
else
    echo "⚠️  数据表数量不符合预期，请检查创建过程"
fi