# 安装部署指南

本指南将帮助你在生产环境中部署埋点监控系统。

## 环境要求

### 系统要求

- **操作系统**: Linux (推荐 Ubuntu 18.04+, CentOS 7+)
- **CPU**: 2 核心以上
- **内存**: 4GB RAM 以上
- **存储**: 20GB 以上可用空间
- **网络**: 稳定的网络连接

### 软件依赖

- **Node.js**: 16.0 或更高版本
- **MySQL**: 5.7 或更高版本（推荐 8.0+）
- **Nginx**: 1.18 或更高版本（可选，用于反向代理）
- **PM2**: 进程管理器（推荐）

## 快速部署

### 1. 克隆代码

```bash
# 克隆项目
git clone https://github.com/your-org/tracking-system.git
cd tracking-system

# 切换到生产分支
git checkout main
```

### 2. 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或者使用 npm
npm install
```

### 3. 数据库配置

#### 创建数据库

```sql
-- 连接到 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE tracking_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（生产环境推荐）
CREATE USER 'tracking_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON tracking_system.* TO 'tracking_user'@'localhost';
FLUSH PRIVILEGES;

-- 退出 MySQL
EXIT;
```

#### 初始化表结构

```bash
# 执行数据库初始化脚本
mysql -u tracking_user -p tracking_system < apps/backend/src/scripts/new_schema.sql

# 添加 sender 字段（如果需要）
mysql -u tracking_user -p tracking_system < apps/backend/src/scripts/add_sender_field.sql
```

### 4. 环境配置

创建生产环境配置文件：

```bash
# 后端配置
cat > apps/backend/.env << EOF
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=tracking_user
DB_PASSWORD=your_secure_password
DB_NAME=tracking_system

# 安全配置
JWT_SECRET=your_jwt_secret_key_here
API_KEY=your_api_key_here

# CORS 配置
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# 限流配置
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# 缓存配置（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
EOF
```

### 5. 构建项目

```bash
# 构建后端项目
cd apps/backend
npm run build

# 构建前端项目（如果需要）
cd ../frontend
npm run build

# 构建文档（如果需要）
cd ../docs
npm run build
```

### 6. 启动服务

#### 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动后端服务
cd apps/backend
pm2 start ecosystem.config.js

# 查看服务状态
pm2 status
pm2 logs tracking-backend

# 设置开机启动
pm2 startup
pm2 save
```

#### PM2 配置文件

```javascript
// apps/backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'tracking-backend',
    script: './src/server.js',
    instances: 'max', // 使用所有 CPU 核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
```

#### 直接启动（开发环境）

```bash
# 开发模式
cd apps/backend
npm run dev

# 生产模式
npm start
```

## Nginx 配置

### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. 配置反向代理

```nginx
# /etc/nginx/sites-available/tracking-system
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL 证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静态文件服务（前端应用）
    location / {
        root /path/to/tracking-system/apps/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存配置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 文档站点
    location /docs/ {
        alias /path/to/tracking-system/apps/docs/.vitepress/dist/;
        try_files $uri $uri/ /index.html;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:3000/api/health;
        access_log off;
    }
    
    # 日志配置
    access_log /var/log/nginx/tracking-system.access.log;
    error_log /var/log/nginx/tracking-system.error.log;
}
```

### 3. 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/tracking-system /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 设置开机启动
sudo systemctl enable nginx
```

## SSL 证书配置

### 使用 Let's Encrypt（推荐）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

### 使用自签名证书（测试环境）

```bash
# 生成私钥
sudo openssl genrsa -out /etc/ssl/private/tracking-system.key 2048

# 生成证书
sudo openssl req -new -x509 -key /etc/ssl/private/tracking-system.key -out /etc/ssl/certs/tracking-system.crt -days 365
```

## 数据库优化

### 1. MySQL 配置优化

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
# 基础配置
port = 3306
bind-address = 127.0.0.1

# 字符集配置
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 内存配置
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
innodb_log_buffer_size = 16M
innodb_flush_log_at_trx_commit = 2

# 连接配置
max_connections = 200
max_connect_errors = 10000

# 查询缓存
query_cache_type = 1
query_cache_size = 128M

# 慢查询日志
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# 二进制日志
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
expire_logs_days = 7
```

### 2. 数据库索引优化

```sql
-- 为常用查询添加索引
USE tracking_system;

-- 埋点事件表索引
ALTER TABLE tracking_events 
ADD INDEX idx_user_timestamp (user_id, event_timestamp),
ADD INDEX idx_session_timestamp (session_id, event_timestamp),
ADD INDEX idx_spm (spm),
ADD INDEX idx_page_url (page_url(255)),
ADD INDEX idx_created_at (created_at);

-- 错误日志表索引
ALTER TABLE error_logs 
ADD INDEX idx_user_timestamp (user_id, error_timestamp),
ADD INDEX idx_session_timestamp (session_id, error_timestamp),
ADD INDEX idx_error_type (error_type),
ADD INDEX idx_error_level (error_level),
ADD INDEX idx_resolved (resolved);

-- 用户会话表索引
ALTER TABLE user_sessions 
ADD INDEX idx_user_start_time (user_id, session_start_time),
ADD INDEX idx_last_activity (last_activity_time),
ADD INDEX idx_device_type (device_type);
```

### 3. 数据库备份

```bash
#!/bin/bash
# backup.sh - 数据库备份脚本

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mysql"
DB_NAME="tracking_system"
DB_USER="tracking_user"
DB_PASS="your_secure_password"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/tracking_system_$DATE.sql.gz

# 删除 7 天前的备份
find $BACKUP_DIR -name "tracking_system_*.sql.gz" -mtime +7 -delete

echo "Backup completed: tracking_system_$DATE.sql.gz"
```

```bash
# 设置定时备份
sudo crontab -e
# 添加以下行（每天凌晨 2 点备份）
0 2 * * * /path/to/backup.sh
```

## 监控和日志

### 1. 应用监控

```bash
# 安装监控工具
npm install -g pm2-logrotate

# 配置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 2. 系统监控

```bash
# 安装 htop
sudo apt install htop

# 安装 iotop
sudo apt install iotop

# 监控脚本
cat > monitor.sh << 'EOF'
#!/bin/bash
# 系统监控脚本

echo "=== System Monitor $(date) ==="

# CPU 使用率
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1"%"}'

# 内存使用率
echo "Memory Usage:"
free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }'

# 磁盘使用率
echo "Disk Usage:"
df -h | awk '$NF=="/"{printf "Disk Usage: %d/%dGB (%s)\n", $3,$2,$5}'

# 检查服务状态
echo "Service Status:"
pm2 status

echo "=========================="
EOF

chmod +x monitor.sh
```

### 3. 日志管理

```bash
# 配置 logrotate
sudo cat > /etc/logrotate.d/tracking-system << 'EOF'
/path/to/tracking-system/apps/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## 安全配置

### 1. 防火墙配置

```bash
# 安装 ufw
sudo apt install ufw

# 默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许 SSH
sudo ufw allow ssh

# 允许 HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 允许应用端口（仅本地访问）
sudo ufw allow from 127.0.0.1 to any port 3000

# 启用防火墙
sudo ufw enable
```

### 2. 应用安全

```javascript
// apps/backend/src/config/security.js
export const securityConfig = {
  // API 密钥验证
  apiKeyRequired: process.env.NODE_ENV === 'production',
  
  // IP 白名单
  ipWhitelist: process.env.IP_WHITELIST?.split(',') || [],
  
  // 请求大小限制
  maxRequestSize: '1mb',
  
  // 速率限制
  rateLimit: {
    windowMs: 60 * 1000, // 1 分钟
    max: 1000, // 最多 1000 次请求
    message: 'Too many requests from this IP'
  }
}
```

### 3. 数据库安全

```sql
-- 删除默认用户
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- 删除测试数据库
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';

-- 刷新权限
FLUSH PRIVILEGES;
```

## 性能优化

### 1. Node.js 优化

```javascript
// apps/backend/src/config/performance.js
export const performanceConfig = {
  // 集群模式
  cluster: process.env.NODE_ENV === 'production',
  
  // 内存限制
  maxMemory: '1024mb',
  
  // 连接池配置
  database: {
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000
  },
  
  // 缓存配置
  cache: {
    ttl: 300, // 5 分钟
    max: 1000 // 最多 1000 个缓存项
  }
}
```

### 2. 数据库连接池

```javascript
// apps/backend/src/config/database.js
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // 连接池配置
  connectionLimit: 20,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  
  // 重连配置
  reconnect: true,
  idleTimeout: 300000,
  
  // 字符集
  charset: 'utf8mb4'
})

export default pool
```

## 部署脚本

### 1. 自动部署脚本

```bash
#!/bin/bash
# deploy.sh - 自动部署脚本

set -e

PROJECT_DIR="/var/www/tracking-system"
BACKUP_DIR="/var/backups/tracking-system"
BRANCH="main"

echo "Starting deployment..."

# 创建备份
echo "Creating backup..."
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).tar.gz -C $PROJECT_DIR .

# 更新代码
echo "Updating code..."
cd $PROJECT_DIR
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# 安装依赖
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# 构建项目
echo "Building project..."
cd apps/backend
npm run build

# 重启服务
echo "Restarting services..."
pm2 restart tracking-backend

# 检查服务状态
echo "Checking service status..."
sleep 5
pm2 status

# 健康检查
echo "Health check..."
curl -f http://localhost:3000/api/health || exit 1

echo "Deployment completed successfully!"
```

### 2. 回滚脚本

```bash
#!/bin/bash
# rollback.sh - 回滚脚本

BACKUP_DIR="/var/backups/tracking-system"
PROJECT_DIR="/var/www/tracking-system"

# 列出可用备份
echo "Available backups:"
ls -la $BACKUP_DIR/*.tar.gz

# 读取用户输入
read -p "Enter backup filename to restore: " BACKUP_FILE

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "Backup file not found!"
    exit 1
fi

# 停止服务
echo "Stopping services..."
pm2 stop tracking-backend

# 恢复备份
echo "Restoring backup..."
cd $PROJECT_DIR
tar -xzf $BACKUP_DIR/$BACKUP_FILE

# 重启服务
echo "Restarting services..."
pm2 start tracking-backend

echo "Rollback completed!"
```

## 验证部署

### 1. 健康检查

```bash
# 检查服务状态
curl -f http://localhost:3000/api/health

# 检查数据库连接
mysql -u tracking_user -p -e "SELECT 1 FROM tracking_system.tracking_events LIMIT 1;"

# 检查日志
tail -f apps/backend/logs/combined.log
```

### 2. 功能测试

```bash
# 发送测试埋点
curl -X POST http://localhost:3000/api/tracking/events \
  -H "Content-Type: application/json" \
  -d '[{
    "timestamp": '$(date +%s000)',
    "url": "http://test.com",
    "sessionId": "test_session",
    "userId": "test_user",
    "trigger": "test",
    "category": "default"
  }]'

# 查询数据
curl "http://localhost:3000/api/tracking/events?limit=1"
```

## 故障排查

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查端口占用
   lsof -i :3000
   
   # 检查日志
   pm2 logs tracking-backend
   ```

2. **数据库连接失败**
   ```bash
   # 检查 MySQL 状态
   sudo systemctl status mysql
   
   # 测试连接
   mysql -u tracking_user -p -h localhost
   ```

3. **内存不足**
   ```bash
   # 检查内存使用
   free -m
   
   # 重启服务
   pm2 restart tracking-backend
   ```

现在你的埋点监控系统已经成功部署到生产环境！

## 下一步

- [配置说明](./configuration.md) - 详细的配置选项说明
- [性能优化](./optimization.md) - 进一步优化系统性能
- [监控告警](./monitoring.md) - 设置系统监控和告警
- [运维手册](./operations.md) - 日常运维操作指南
