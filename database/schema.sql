-- 埋点系统数据库设计
-- 创建数据库
CREATE DATABASE IF NOT EXISTS tracking_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tracking_system;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE COMMENT '用户唯一标识',
    device_id VARCHAR(100) COMMENT '设备ID',
    user_agent TEXT COMMENT '用户代理',
    platform VARCHAR(50) COMMENT '平台',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_device_id (device_id)
) ENGINE=InnoDB COMMENT='用户信息表';

-- 事件表
CREATE TABLE IF NOT EXISTS events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL COMMENT '事件唯一标识',
    user_id VARCHAR(100) NOT NULL COMMENT '用户ID',
    session_id VARCHAR(100) COMMENT '会话ID',
    event_name VARCHAR(100) NOT NULL COMMENT '事件名称',
    event_category VARCHAR(50) COMMENT '事件分类',
    page_url TEXT COMMENT '页面URL',
    page_title VARCHAR(255) COMMENT '页面标题',
    referrer TEXT COMMENT '来源页面',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    timestamp BIGINT NOT NULL COMMENT '事件时间戳',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_event_name (event_name),
    INDEX idx_event_category (event_category),
    INDEX idx_timestamp (timestamp),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='事件记录表';

-- 事件属性表
CREATE TABLE IF NOT EXISTS event_properties (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL COMMENT '事件ID',
    property_key VARCHAR(100) NOT NULL COMMENT '属性键',
    property_value TEXT COMMENT '属性值',
    property_type VARCHAR(20) DEFAULT 'string' COMMENT '属性类型：string, number, boolean, object',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_id (event_id),
    INDEX idx_property_key (property_key),
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='事件属性表';

-- 页面访问记录表
CREATE TABLE IF NOT EXISTS page_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL COMMENT '用户ID',
    session_id VARCHAR(100) COMMENT '会话ID',
    page_url TEXT NOT NULL COMMENT '页面URL',
    page_title VARCHAR(255) COMMENT '页面标题',
    referrer TEXT COMMENT '来源页面',
    duration INT DEFAULT 0 COMMENT '停留时间（秒）',
    scroll_depth DECIMAL(5,2) DEFAULT 0 COMMENT '滚动深度百分比',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    timestamp BIGINT NOT NULL COMMENT '访问时间戳',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_page_url (page_url(255)),
    INDEX idx_timestamp (timestamp),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='页面访问记录表';

-- 错误日志表
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(100) COMMENT '用户ID',
    session_id VARCHAR(100) COMMENT '会话ID',
    error_type VARCHAR(100) NOT NULL COMMENT '错误类型',
    error_message TEXT COMMENT '错误信息',
    error_stack TEXT COMMENT '错误堆栈',
    page_url TEXT COMMENT '发生错误的页面',
    user_agent TEXT COMMENT '用户代理',
    timestamp BIGINT NOT NULL COMMENT '错误时间戳',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_error_type (error_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='错误日志表';

-- 统计汇总表（按天）
CREATE TABLE IF NOT EXISTS daily_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL COMMENT '统计日期',
    total_events INT DEFAULT 0 COMMENT '总事件数',
    total_users INT DEFAULT 0 COMMENT '总用户数',
    total_sessions INT DEFAULT 0 COMMENT '总会话数',
    total_page_views INT DEFAULT 0 COMMENT '总页面访问数',
    avg_session_duration DECIMAL(10,2) DEFAULT 0 COMMENT '平均会话时长（分钟）',
    bounce_rate DECIMAL(5,2) DEFAULT 0 COMMENT '跳出率',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date (stat_date),
    INDEX idx_stat_date (stat_date)
) ENGINE=InnoDB COMMENT='每日统计汇总表';