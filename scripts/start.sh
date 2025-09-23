#!/bin/bash

# 埋点监控系统启动脚本
set -e

echo "🚀 启动埋点监控系统..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查 Node.js 版本
check_node() {
    echo -e "${BLUE}检查 Node.js 版本...${NC}"
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js >= 16.0.0${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    
    if ! node -p "process.versions.node.split('.').map(Number).every((v,i) => v >= '$REQUIRED_VERSION'.split('.')[i] || 0)" 2>/dev/null | grep -q true; then
        echo -e "${RED}❌ Node.js 版本过低，当前版本: $NODE_VERSION，需要 >= $REQUIRED_VERSION${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js 版本检查通过: $NODE_VERSION${NC}"
}

# 检查 pnpm
check_pnpm() {
    echo -e "${BLUE}检查 pnpm...${NC}"
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}⚠️  pnpm 未安装，正在安装...${NC}"
        npm install -g pnpm
    fi
    echo -e "${GREEN}✅ pnpm 已就绪${NC}"
}

# 检查 MySQL
check_mysql() {
    echo -e "${BLUE}检查 MySQL 连接...${NC}"
    if ! command -v mysql &> /dev/null; then
        echo -e "${YELLOW}⚠️  MySQL 客户端未找到，请确保 MySQL 服务器正在运行${NC}"
        return
    fi
    echo -e "${GREEN}✅ MySQL 客户端已找到${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "${BLUE}安装项目依赖...${NC}"
    pnpm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 检查环境配置
check_env() {
    echo -e "${BLUE}检查环境配置...${NC}"
    ENV_FILE="apps/backend/.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}⚠️  环境配置文件不存在，正在创建...${NC}"
        cp apps/backend/.env "$ENV_FILE"
        echo -e "${YELLOW}📝 请编辑 $ENV_FILE 文件配置数据库连接信息${NC}"
        echo -e "${YELLOW}   特别是 DB_HOST, DB_USER, DB_PASSWORD, DB_NAME 等配置${NC}"
        read -p "配置完成后按 Enter 继续..."
    fi
    echo -e "${GREEN}✅ 环境配置检查完成${NC}"
}

# 初始化数据库
init_database() {
    echo -e "${BLUE}初始化数据库...${NC}"
    
    # 检查是否可以连接到数据库
    echo -e "${YELLOW}正在测试数据库连接...${NC}"
    
    # 尝试运行数据库迁移
    if cd apps/backend && node src/scripts/migrate.js init; then
        echo -e "${GREEN}✅ 数据库初始化成功${NC}"
        cd ../..
    else
        echo -e "${RED}❌ 数据库初始化失败${NC}"
        echo -e "${YELLOW}请检查以下配置：${NC}"
        echo -e "  1. MySQL 服务是否正在运行"
        echo -e "  2. 数据库连接信息是否正确 (apps/backend/.env)"
        echo -e "  3. 数据库用户是否有足够权限"
        cd ../..
        exit 1
    fi
}

# 启动服务
start_services() {
    echo -e "${BLUE}启动服务...${NC}"
    echo -e "${GREEN}🌟 后端服务将在 http://localhost:3000 启动${NC}"
    echo -e "${GREEN}📊 API 文档: http://localhost:3000/api${NC}"
    echo -e "${GREEN}🏥 健康检查: http://localhost:3000/health${NC}"
    echo -e "${GREEN}📈 SDK 示例: packages/sdk/examples/example.html${NC}"
    echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
    echo ""
    
    # 启动后端开发服务器
    pnpm backend:dev
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}埋点监控系统启动脚本${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  --skip-deps         跳过依赖安装"
    echo "  --skip-db           跳过数据库初始化"
    echo "  --check-only        仅进行环境检查"
    echo ""
    echo "环境要求:"
    echo "  - Node.js >= 16.0.0"
    echo "  - pnpm >= 8.0.0"
    echo "  - MySQL >= 5.7"
    echo ""
}

# 主函数
main() {
    local skip_deps=false
    local skip_db=false
    local check_only=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --skip-deps)
                skip_deps=true
                shift
                ;;
            --skip-db)
                skip_db=true
                shift
                ;;
            --check-only)
                check_only=true
                shift
                ;;
            *)
                echo -e "${RED}未知选项: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo -e "${GREEN}==================================${NC}"
    echo -e "${GREEN}  埋点监控系统 启动脚本 v1.0.0${NC}"
    echo -e "${GREEN}==================================${NC}"
    echo ""
    
    # 环境检查
    check_node
    check_pnpm
    check_mysql
    
    if [ "$check_only" = true ]; then
        echo -e "${GREEN}✅ 环境检查完成${NC}"
        exit 0
    fi
    
    # 安装依赖
    if [ "$skip_deps" = false ]; then
        install_dependencies
    else
        echo -e "${YELLOW}⏭️  跳过依赖安装${NC}"
    fi
    
    # 环境配置
    check_env
    
    # 数据库初始化
    if [ "$skip_db" = false ]; then
        init_database
    else
        echo -e "${YELLOW}⏭️  跳过数据库初始化${NC}"
    fi
    
    # 启动服务
    start_services
}

# 错误处理
trap 'echo -e "\n${YELLOW}👋 服务已停止${NC}"; exit 0' INT TERM

# 执行主函数
main "$@"
