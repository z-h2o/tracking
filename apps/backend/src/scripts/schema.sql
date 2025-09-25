-- 创建数据库
CREATE DATABASE IF NOT EXISTS tracking_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tracking_system;

-- 用户埋点事件表 (重新设计)
CREATE TABLE IF NOT EXISTS tracking_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    
    -- 基础信息
    session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
    user_id VARCHAR(255) DEFAULT NULL COMMENT '用户ID',
    app_version VARCHAR(50) DEFAULT NULL COMMENT '应用版本号',
    category VARCHAR(50) NOT NULL DEFAULT 'default' COMMENT '埋点类别：default-普通埋点',
    sender VARCHAR(50) NOT NULL DEFAULT 'jsonp' COMMENT '数据上报方式：jsonp, image, xhr, fetch',
    
    -- 时间戳
    event_timestamp BIGINT UNSIGNED NOT NULL COMMENT '事件时间戳(毫秒)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    
    -- 页面信息
    page_url TEXT NOT NULL COMMENT '页面URL',
    page_title VARCHAR(500) DEFAULT NULL COMMENT '页面标题',
    page_referrer TEXT DEFAULT NULL COMMENT '来源页面URL',
    viewport_width INT UNSIGNED DEFAULT NULL COMMENT '视口宽度',
    viewport_height INT UNSIGNED DEFAULT NULL COMMENT '视口高度',
    
    -- 用户环境信息
    user_agent TEXT DEFAULT NULL COMMENT '用户代理字符串',
    user_language VARCHAR(20) DEFAULT NULL COMMENT '用户语言',
    user_timezone VARCHAR(100) DEFAULT NULL COMMENT '用户时区',
    
    -- 事件信息
    trigger_type VARCHAR(50) DEFAULT NULL COMMENT '触发类型：click, view, manual等',
    spm VARCHAR(500) DEFAULT NULL COMMENT 'SPM埋点标识',
    event_data JSON DEFAULT NULL COMMENT '事件附加数据',
    
    -- 元素信息 (仅点击事件有效)
    element_tag_name VARCHAR(50) DEFAULT NULL COMMENT '元素标签名',
    element_class_name TEXT DEFAULT NULL COMMENT '元素CSS类名',
    element_id VARCHAR(255) DEFAULT NULL COMMENT '元素ID',
    element_text TEXT DEFAULT NULL COMMENT '元素文本内容',
    element_attributes JSON DEFAULT NULL COMMENT '元素属性',
    
    -- 位置信息 (仅点击/曝光事件有效)
    position_x INT DEFAULT NULL COMMENT '元素X坐标',
    position_y INT DEFAULT NULL COMMENT '元素Y坐标',
    position_width INT UNSIGNED DEFAULT NULL COMMENT '元素宽度',
    position_height INT UNSIGNED DEFAULT NULL COMMENT '元素高度',
    
    -- 索引
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_trigger_type (trigger_type),
    INDEX idx_spm (spm),
    INDEX idx_page_url (page_url(255)),
    INDEX idx_event_timestamp (event_timestamp),
    INDEX idx_created_at (created_at),
    INDEX idx_session_timestamp (session_id, event_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户埋点事件表';

-- 错误监控表 (重新设计)
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    
    -- 基础信息
    session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
    user_id VARCHAR(255) DEFAULT NULL COMMENT '用户ID',
    app_version VARCHAR(50) DEFAULT NULL COMMENT '应用版本号',
    category VARCHAR(50) NOT NULL DEFAULT 'error' COMMENT '埋点类别：error-错误埋点',
    sender VARCHAR(50) NOT NULL DEFAULT 'jsonp' COMMENT '数据上报方式：jsonp, image, xhr, fetch',
    
    -- 时间戳
    error_timestamp BIGINT UNSIGNED NOT NULL COMMENT '错误时间戳(毫秒)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    
    -- 错误信息
    error_type VARCHAR(100) NOT NULL COMMENT '错误类型：javascript_error, promise_rejection, resource_error, network_error等',
    error_message TEXT NOT NULL COMMENT '错误消息',
    error_reason TEXT DEFAULT NULL COMMENT '错误原因（Promise rejection专用）',
    error_stack TEXT DEFAULT NULL COMMENT '错误堆栈信息',
    
    -- 页面信息
    page_url TEXT NOT NULL COMMENT '出错页面URL',
    page_title VARCHAR(500) DEFAULT NULL COMMENT '页面标题',
    page_referrer TEXT DEFAULT NULL COMMENT '来源页面URL',
    viewport_width INT UNSIGNED DEFAULT NULL COMMENT '视口宽度',
    viewport_height INT UNSIGNED DEFAULT NULL COMMENT '视口高度',
    
    -- 用户环境信息
    user_agent TEXT DEFAULT NULL COMMENT '用户代理字符串',
    user_language VARCHAR(20) DEFAULT NULL COMMENT '用户语言',
    user_timezone VARCHAR(100) DEFAULT NULL COMMENT '用户时区',
    
    -- 错误状态
    error_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium' COMMENT '错误级别',
    resolved BOOLEAN DEFAULT FALSE COMMENT '是否已解决',
    
    -- 索引
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    INDEX idx_category (category),
    INDEX idx_error_type (error_type),
    INDEX idx_error_level (error_level),
    INDEX idx_resolved (resolved),
    INDEX idx_page_url (page_url(255)),
    INDEX idx_error_timestamp (error_timestamp),
    INDEX idx_created_at (created_at),
    INDEX idx_session_timestamp (session_id, error_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='错误监控表';

-- 用户会话表 (重新设计)
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    
    -- 会话标识
    session_id VARCHAR(255) NOT NULL UNIQUE COMMENT '会话ID',
    user_id VARCHAR(255) DEFAULT NULL COMMENT '用户ID',
    app_version VARCHAR(50) DEFAULT NULL COMMENT '应用版本号',
    
    -- 会话时间信息
    session_start_time BIGINT UNSIGNED NOT NULL COMMENT '会话开始时间戳(毫秒)',
    session_end_time BIGINT UNSIGNED DEFAULT NULL COMMENT '会话结束时间戳(毫秒)',
    last_activity_time BIGINT UNSIGNED NOT NULL COMMENT '最后活跃时间戳(毫秒)',
    session_duration INT UNSIGNED DEFAULT NULL COMMENT '会话持续时间(秒)',
    
    -- 会话统计
    page_views_count INT UNSIGNED DEFAULT 0 COMMENT '页面浏览次数',
    events_count INT UNSIGNED DEFAULT 0 COMMENT '埋点事件总数',
    errors_count INT UNSIGNED DEFAULT 0 COMMENT '错误事件总数',
    unique_pages_count INT UNSIGNED DEFAULT 0 COMMENT '唯一页面数量',
    
    -- 第一个页面信息
    entry_page_url TEXT DEFAULT NULL COMMENT '入口页面URL',
    entry_page_title VARCHAR(500) DEFAULT NULL COMMENT '入口页面标题',
    entry_referrer TEXT DEFAULT NULL COMMENT '入口来源页面',
    
    -- 最后一个页面信息
    exit_page_url TEXT DEFAULT NULL COMMENT '退出页面URL',
    exit_page_title VARCHAR(500) DEFAULT NULL COMMENT '退出页面标题',
    
    -- 用户环境信息 (从第一个事件获取)
    user_agent TEXT DEFAULT NULL COMMENT '用户代理字符串',
    user_language VARCHAR(20) DEFAULT NULL COMMENT '用户语言',
    user_timezone VARCHAR(100) DEFAULT NULL COMMENT '用户时区',
    viewport_width INT UNSIGNED DEFAULT NULL COMMENT '视口宽度',
    viewport_height INT UNSIGNED DEFAULT NULL COMMENT '视口高度',
    
    -- 设备信息 (解析user_agent得出)
    device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown' COMMENT '设备类型',
    os_name VARCHAR(100) DEFAULT NULL COMMENT '操作系统名称',
    os_version VARCHAR(100) DEFAULT NULL COMMENT '操作系统版本',
    browser_name VARCHAR(100) DEFAULT NULL COMMENT '浏览器名称',
    browser_version VARCHAR(100) DEFAULT NULL COMMENT '浏览器版本',
    
    -- IP和地理位置信息 (可选)
    ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
    country VARCHAR(100) DEFAULT NULL COMMENT '国家',
    region VARCHAR(100) DEFAULT NULL COMMENT '地区/省份',
    city VARCHAR(100) DEFAULT NULL COMMENT '城市',
    
    -- 会话状态
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否活跃会话',
    is_bounce BOOLEAN DEFAULT FALSE COMMENT '是否跳出会话(只访问一个页面)',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_session_start_time (session_start_time),
    INDEX idx_last_activity_time (last_activity_time),
    INDEX idx_device_type (device_type),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at),
    INDEX idx_user_session_time (user_id, session_start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户会话表';

-- 创建视图：实时活跃会话统计
CREATE OR REPLACE VIEW active_sessions_stats AS
SELECT 
    COUNT(*) as active_sessions_count,
    COUNT(DISTINCT user_id) as active_users_count,
    AVG(events_count) as avg_events_per_session,
    AVG(page_views_count) as avg_page_views_per_session,
    SUM(errors_count) as total_errors
FROM user_sessions 
WHERE is_active = TRUE
    AND last_activity_time >= UNIX_TIMESTAMP(DATE_SUB(NOW(), INTERVAL 30 MINUTE)) * 1000;

-- 创建视图：页面访问统计
CREATE OR REPLACE VIEW page_visit_stats AS
SELECT 
    page_url,
    page_title,
    COUNT(*) as total_events,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    DATE(FROM_UNIXTIME(event_timestamp/1000)) as visit_date
FROM tracking_events 
WHERE category = 'default'
GROUP BY page_url, page_title, DATE(FROM_UNIXTIME(event_timestamp/1000))
ORDER BY total_events DESC;

-- 创建视图：错误统计
CREATE OR REPLACE VIEW error_stats AS
SELECT 
    error_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT session_id) as affected_sessions,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(CASE WHEN resolved = FALSE THEN 1 END) as unresolved_count,
    DATE(FROM_UNIXTIME(error_timestamp/1000)) as error_date
FROM error_logs
WHERE category = 'error'
GROUP BY error_type, DATE(FROM_UNIXTIME(error_timestamp/1000))
ORDER BY error_count DESC;

-- 创建视图：SPM点击统计
CREATE OR REPLACE VIEW spm_click_stats AS
SELECT 
    spm,
    COUNT(*) as click_count,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    page_url,
    DATE(FROM_UNIXTIME(event_timestamp/1000)) as click_date
FROM tracking_events 
WHERE category = 'default' 
    AND spm IS NOT NULL 
    AND trigger_type IN ('click', 'view')
GROUP BY spm, page_url, DATE(FROM_UNIXTIME(event_timestamp/1000))
ORDER BY click_count DESC;

-- 创建视图：设备类型统计
CREATE OR REPLACE VIEW device_type_stats AS
SELECT 
    device_type,
    COUNT(*) as session_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(session_duration) as avg_session_duration,
    AVG(page_views_count) as avg_page_views,
    SUM(errors_count) as total_errors
FROM user_sessions
GROUP BY device_type
ORDER BY session_count DESC;

