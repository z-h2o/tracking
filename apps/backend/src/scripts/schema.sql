-- 创建数据库
CREATE DATABASE IF NOT EXISTS tracking_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tracking_system;

-- 用户埋点事件表
CREATE TABLE IF NOT EXISTS tracking_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
    user_id VARCHAR(255) DEFAULT NULL COMMENT '用户ID',
    event_type ENUM('click', 'view', 'manual', 'page_view') NOT NULL COMMENT '事件类型',
    spm VARCHAR(500) DEFAULT NULL COMMENT 'SPM位置标识',
    page_url TEXT NOT NULL COMMENT '页面URL',
    page_title VARCHAR(500) DEFAULT NULL COMMENT '页面标题',
    referrer TEXT DEFAULT NULL COMMENT '来源页面',
    
    -- 元素信息
    element_tag VARCHAR(50) DEFAULT NULL COMMENT '元素标签',
    element_id VARCHAR(255) DEFAULT NULL COMMENT '元素ID',
    element_class TEXT DEFAULT NULL COMMENT '元素类名',
    element_text TEXT DEFAULT NULL COMMENT '元素文本内容',
    element_attributes JSON DEFAULT NULL COMMENT '元素自定义属性',
    
    -- 位置信息
    element_x INT DEFAULT NULL COMMENT '元素X坐标',
    element_y INT DEFAULT NULL COMMENT '元素Y坐标',
    element_width INT DEFAULT NULL COMMENT '元素宽度',
    element_height INT DEFAULT NULL COMMENT '元素高度',
    
    -- 事件信息
    event_data JSON DEFAULT NULL COMMENT '事件详细数据',
    trigger_type VARCHAR(50) DEFAULT NULL COMMENT '触发类型',
    
    -- 浏览器信息
    user_agent TEXT DEFAULT NULL COMMENT '用户代理',
    browser_language VARCHAR(10) DEFAULT NULL COMMENT '浏览器语言',
    timezone VARCHAR(50) DEFAULT NULL COMMENT '时区',
    viewport_width INT DEFAULT NULL COMMENT '视口宽度',
    viewport_height INT DEFAULT NULL COMMENT '视口高度',
    
    -- 设备信息
    device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown' COMMENT '设备类型',
    os_name VARCHAR(50) DEFAULT NULL COMMENT '操作系统',
    browser_name VARCHAR(50) DEFAULT NULL COMMENT '浏览器名称',
    
    -- 业务信息
    app_version VARCHAR(50) DEFAULT NULL COMMENT '应用版本',
    custom_data JSON DEFAULT NULL COMMENT '自定义数据',
    
    -- 时间戳
    event_timestamp BIGINT UNSIGNED NOT NULL COMMENT '事件时间戳',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_event_type (event_type),
    INDEX idx_spm (spm),
    INDEX idx_page_url (page_url(255)),
    INDEX idx_event_timestamp (event_timestamp),
    INDEX idx_created_at (created_at),
    INDEX idx_device_type (device_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户埋点事件表';

-- 错误监控表
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
    user_id VARCHAR(255) DEFAULT NULL COMMENT '用户ID',
    error_type ENUM('javascript_error', 'promise_rejection', 'resource_error', 'network_error') NOT NULL COMMENT '错误类型',
    
    -- 错误信息
    error_message TEXT NOT NULL COMMENT '错误消息',
    error_stack TEXT DEFAULT NULL COMMENT '错误堆栈',
    error_filename VARCHAR(500) DEFAULT NULL COMMENT '错误文件名',
    error_lineno INT DEFAULT NULL COMMENT '错误行号',
    error_colno INT DEFAULT NULL COMMENT '错误列号',
    
    -- 页面信息
    page_url TEXT NOT NULL COMMENT '页面URL',
    page_title VARCHAR(500) DEFAULT NULL COMMENT '页面标题',
    referrer TEXT DEFAULT NULL COMMENT '来源页面',
    
    -- 浏览器信息
    user_agent TEXT DEFAULT NULL COMMENT '用户代理',
    browser_language VARCHAR(10) DEFAULT NULL COMMENT '浏览器语言',
    timezone VARCHAR(50) DEFAULT NULL COMMENT '时区',
    
    -- 设备信息
    device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown' COMMENT '设备类型',
    os_name VARCHAR(50) DEFAULT NULL COMMENT '操作系统',
    browser_name VARCHAR(50) DEFAULT NULL COMMENT '浏览器名称',
    
    -- 业务信息
    app_version VARCHAR(50) DEFAULT NULL COMMENT '应用版本',
    custom_data JSON DEFAULT NULL COMMENT '自定义数据',
    
    -- 错误级别和状态
    error_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium' COMMENT '错误级别',
    resolved BOOLEAN DEFAULT FALSE COMMENT '是否已解决',
    
    -- 时间戳
    error_timestamp BIGINT UNSIGNED NOT NULL COMMENT '错误时间戳',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_error_type (error_type),
    INDEX idx_error_level (error_level),
    INDEX idx_resolved (resolved),
    INDEX idx_page_url (page_url(255)),
    INDEX idx_error_timestamp (error_timestamp),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='错误监控表';

-- 页面性能监控表
CREATE TABLE IF NOT EXISTS performance_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
    user_id VARCHAR(255) DEFAULT NULL COMMENT '用户ID',
    page_url TEXT NOT NULL COMMENT '页面URL',
    page_title VARCHAR(500) DEFAULT NULL COMMENT '页面标题',
    
    -- 性能指标
    load_time INT DEFAULT NULL COMMENT '页面加载时间(ms)',
    dom_ready_time INT DEFAULT NULL COMMENT 'DOM就绪时间(ms)',
    first_paint_time INT DEFAULT NULL COMMENT '首次绘制时间(ms)',
    first_contentful_paint INT DEFAULT NULL COMMENT '首次内容绘制时间(ms)',
    largest_contentful_paint INT DEFAULT NULL COMMENT '最大内容绘制时间(ms)',
    first_input_delay INT DEFAULT NULL COMMENT '首次输入延迟(ms)',
    cumulative_layout_shift DECIMAL(10,4) DEFAULT NULL COMMENT '累积布局偏移',
    
    -- 资源信息
    resource_count INT DEFAULT NULL COMMENT '资源数量',
    resource_size BIGINT DEFAULT NULL COMMENT '资源总大小(bytes)',
    
    -- 浏览器信息
    user_agent TEXT DEFAULT NULL COMMENT '用户代理',
    browser_language VARCHAR(10) DEFAULT NULL COMMENT '浏览器语言',
    
    -- 设备信息
    device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown' COMMENT '设备类型',
    os_name VARCHAR(50) DEFAULT NULL COMMENT '操作系统',
    browser_name VARCHAR(50) DEFAULT NULL COMMENT '浏览器名称',
    
    -- 网络信息
    connection_type VARCHAR(50) DEFAULT NULL COMMENT '连接类型',
    connection_effective_type VARCHAR(50) DEFAULT NULL COMMENT '有效连接类型',
    
    -- 时间戳
    performance_timestamp BIGINT UNSIGNED NOT NULL COMMENT '性能时间戳',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 索引
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_page_url (page_url(255)),
    INDEX idx_load_time (load_time),
    INDEX idx_device_type (device_type),
    INDEX idx_performance_timestamp (performance_timestamp),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面性能监控表';

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE COMMENT '会话ID',
    user_id VARCHAR(255) DEFAULT NULL COMMENT '用户ID',
    
    -- 会话信息
    start_time TIMESTAMP NOT NULL COMMENT '会话开始时间',
    end_time TIMESTAMP DEFAULT NULL COMMENT '会话结束时间',
    duration INT DEFAULT NULL COMMENT '会话持续时间(秒)',
    page_views INT DEFAULT 0 COMMENT '页面浏览量',
    events_count INT DEFAULT 0 COMMENT '事件总数',
    errors_count INT DEFAULT 0 COMMENT '错误总数',
    
    -- 第一个页面信息
    entry_page TEXT DEFAULT NULL COMMENT '入口页面',
    entry_referrer TEXT DEFAULT NULL COMMENT '入口来源',
    exit_page TEXT DEFAULT NULL COMMENT '退出页面',
    
    -- 设备信息
    user_agent TEXT DEFAULT NULL COMMENT '用户代理',
    device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown' COMMENT '设备类型',
    os_name VARCHAR(50) DEFAULT NULL COMMENT '操作系统',
    browser_name VARCHAR(50) DEFAULT NULL COMMENT '浏览器名称',
    browser_language VARCHAR(10) DEFAULT NULL COMMENT '浏览器语言',
    timezone VARCHAR(50) DEFAULT NULL COMMENT '时区',
    
    -- IP和地理位置
    ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
    country VARCHAR(50) DEFAULT NULL COMMENT '国家',
    region VARCHAR(50) DEFAULT NULL COMMENT '地区',
    city VARCHAR(50) DEFAULT NULL COMMENT '城市',
    
    -- 会话状态
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否活跃',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_start_time (start_time),
    INDEX idx_device_type (device_type),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户会话表';

-- 创建分区表（按月分区）
-- ALTER TABLE tracking_events PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
--     PARTITION p202401 VALUES LESS THAN (202402),
--     PARTITION p202402 VALUES LESS THAN (202403),
--     PARTITION p202403 VALUES LESS THAN (202404)
-- );

-- 创建视图：热门页面统计
CREATE OR REPLACE VIEW popular_pages AS
SELECT 
    page_url,
    page_title,
    COUNT(*) as page_views,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    DATE(created_at) as date
FROM tracking_events 
WHERE event_type = 'page_view'
GROUP BY page_url, page_title, DATE(created_at)
ORDER BY page_views DESC;

-- 创建视图：错误统计
CREATE OR REPLACE VIEW error_statistics AS
SELECT 
    error_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT session_id) as affected_sessions,
    COUNT(DISTINCT user_id) as affected_users,
    DATE(created_at) as date
FROM error_logs
GROUP BY error_type, DATE(created_at)
ORDER BY error_count DESC;
