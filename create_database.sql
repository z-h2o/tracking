-- 埋点监控系统数据库建表脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS tracking_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE tracking_system;

-- ============================================================================
-- 用户追踪事件表 (tracking_events)
-- 记录用户的各种行为事件，如点击、浏览等
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracking_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  
  -- 会话和用户标识
  session_id VARCHAR(64) NOT NULL COMMENT '会话ID',
  user_id VARCHAR(64) DEFAULT NULL COMMENT '用户ID（可选）',
  
  -- 事件基本信息
  event_type ENUM('click', 'view', 'custom') NOT NULL DEFAULT 'click' COMMENT '事件类型',
  spm VARCHAR(255) DEFAULT NULL COMMENT 'SPM埋点标识',
  page_url TEXT NOT NULL COMMENT '页面URL',
  page_title VARCHAR(500) DEFAULT NULL COMMENT '页面标题',
  referrer TEXT DEFAULT NULL COMMENT '来源页面',
  
  -- 元素信息
  element_tag VARCHAR(50) DEFAULT NULL COMMENT '元素标签名',
  element_id VARCHAR(255) DEFAULT NULL COMMENT '元素ID',
  element_class TEXT DEFAULT NULL COMMENT '元素CSS类名',
  element_text TEXT DEFAULT NULL COMMENT '元素文本内容',
  element_attributes JSON DEFAULT NULL COMMENT '元素自定义属性',
  
  -- 位置信息
  element_x INT DEFAULT NULL COMMENT '元素X坐标',
  element_y INT DEFAULT NULL COMMENT '元素Y坐标',
  element_width INT DEFAULT NULL COMMENT '元素宽度',
  element_height INT DEFAULT NULL COMMENT '元素高度',
  
  -- 事件详细信息
  event_data JSON DEFAULT NULL COMMENT '事件详细数据',
  trigger_type ENUM('click', 'view', 'manual') NOT NULL DEFAULT 'click' COMMENT '触发方式',
  
  -- 浏览器和设备信息
  user_agent TEXT DEFAULT NULL COMMENT '用户代理字符串',
  browser_language VARCHAR(10) DEFAULT NULL COMMENT '浏览器语言',
  timezone VARCHAR(50) DEFAULT NULL COMMENT '时区',
  viewport_width INT DEFAULT NULL COMMENT '视口宽度',
  viewport_height INT DEFAULT NULL COMMENT '视口高度',
  
  -- 设备信息
  device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown' COMMENT '设备类型',
  os_name VARCHAR(50) DEFAULT NULL COMMENT '操作系统名称',
  browser_name VARCHAR(50) DEFAULT NULL COMMENT '浏览器名称',
  
  -- 业务信息
  app_version VARCHAR(20) DEFAULT NULL COMMENT '应用版本号',
  custom_data JSON DEFAULT NULL COMMENT '自定义业务数据',
  
  -- 时间戳
  event_timestamp BIGINT NOT NULL COMMENT '事件发生时间戳（毫秒）',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  
  -- 索引
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_spm (spm),
  INDEX idx_page_url (page_url(100)),
  INDEX idx_event_timestamp (event_timestamp),
  INDEX idx_created_at (created_at),
  INDEX idx_device_type (device_type),
  INDEX idx_trigger_type (trigger_type),
  
  -- 复合索引
  INDEX idx_session_event_time (session_id, event_timestamp),
  INDEX idx_spm_event_type (spm, event_type),
  INDEX idx_page_event_type (page_url(100), event_type),
  INDEX idx_user_event_time (user_id, event_timestamp)
  
) ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='用户行为追踪事件表';

-- ============================================================================
-- 错误日志表 (error_logs)
-- 记录前端JavaScript错误、Promise错误、资源加载错误等
-- ============================================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  
  -- 会话和用户标识
  session_id VARCHAR(64) NOT NULL COMMENT '会话ID',
  user_id VARCHAR(64) DEFAULT NULL COMMENT '用户ID（可选）',
  
  -- 错误类型和基本信息
  error_type ENUM('javascript_error', 'promise_rejection', 'resource_error', 'network_error', 'custom_error') 
    NOT NULL DEFAULT 'javascript_error' COMMENT '错误类型',
  error_message TEXT NOT NULL COMMENT '错误信息',
  error_stack TEXT DEFAULT NULL COMMENT '错误堆栈',
  
  -- 错误位置信息（JavaScript错误专用）
  error_filename VARCHAR(500) DEFAULT NULL COMMENT '错误发生的文件名',
  error_lineno INT DEFAULT NULL COMMENT '错误行号',
  error_colno INT DEFAULT NULL COMMENT '错误列号',
  
  -- 页面信息
  page_url TEXT NOT NULL COMMENT '页面URL',
  page_title VARCHAR(500) DEFAULT NULL COMMENT '页面标题',
  referrer TEXT DEFAULT NULL COMMENT '来源页面',
  
  -- 浏览器和设备信息
  user_agent TEXT DEFAULT NULL COMMENT '用户代理字符串',
  browser_language VARCHAR(10) DEFAULT NULL COMMENT '浏览器语言',
  timezone VARCHAR(50) DEFAULT NULL COMMENT '时区',
  
  -- 设备信息
  device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown' COMMENT '设备类型',
  os_name VARCHAR(50) DEFAULT NULL COMMENT '操作系统名称',
  browser_name VARCHAR(50) DEFAULT NULL COMMENT '浏览器名称',
  
  -- 业务信息
  app_version VARCHAR(20) DEFAULT NULL COMMENT '应用版本号',
  custom_data JSON DEFAULT NULL COMMENT '自定义数据',
  
  -- 错误级别和处理状态
  error_level ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium' COMMENT '错误级别',
  resolved BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已解决',
  
  -- 时间戳
  error_timestamp BIGINT NOT NULL COMMENT '错误发生时间戳（毫秒）',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  
  -- 索引
  INDEX idx_session_id (session_id),
  INDEX idx_user_id (user_id),
  INDEX idx_error_type (error_type),
  INDEX idx_error_level (error_level),
  INDEX idx_resolved (resolved),
  INDEX idx_error_timestamp (error_timestamp),
  INDEX idx_created_at (created_at),
  INDEX idx_page_url (page_url(100)),
  INDEX idx_device_type (device_type),
  
  -- 复合索引
  INDEX idx_session_error_time (session_id, error_timestamp),
  INDEX idx_error_type_level (error_type, error_level),
  INDEX idx_error_type_resolved (error_type, resolved),
  INDEX idx_page_error_type (page_url(100), error_type),
  INDEX idx_user_error_time (user_id, error_timestamp),
  
  -- 全文索引（用于错误信息搜索）
  FULLTEXT idx_error_message (error_message),
  FULLTEXT idx_error_stack (error_stack)
  
) ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='前端错误日志表';

-- ============================================================================
-- 会话信息表 (sessions) - 可选
-- 记录用户会话的基本信息，与事件表关联
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  session_id VARCHAR(64) NOT NULL UNIQUE COMMENT '会话ID',
  user_id VARCHAR(64) DEFAULT NULL COMMENT '用户ID（可选）',
  
  -- 会话基本信息
  first_page_url TEXT NOT NULL COMMENT '首次访问页面',
  last_page_url TEXT DEFAULT NULL COMMENT '最后访问页面',
  referrer TEXT DEFAULT NULL COMMENT '首次来源',
  
  -- 设备和浏览器信息
  user_agent TEXT DEFAULT NULL COMMENT '用户代理字符串',
  device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown' COMMENT '设备类型',
  os_name VARCHAR(50) DEFAULT NULL COMMENT '操作系统',
  browser_name VARCHAR(50) DEFAULT NULL COMMENT '浏览器',
  
  -- 地理位置信息（可选）
  ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
  country VARCHAR(50) DEFAULT NULL COMMENT '国家',
  city VARCHAR(100) DEFAULT NULL COMMENT '城市',
  
  -- 会话统计
  page_views INT NOT NULL DEFAULT 0 COMMENT '页面浏览数',
  event_count INT NOT NULL DEFAULT 0 COMMENT '事件总数',
  error_count INT NOT NULL DEFAULT 0 COMMENT '错误总数',
  duration_seconds INT DEFAULT NULL COMMENT '会话时长（秒）',
  
  -- 时间信息
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '会话开始时间',
  ended_at TIMESTAMP NULL DEFAULT NULL COMMENT '会话结束时间',
  last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后活动时间',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
  
  -- 索引
  INDEX idx_user_id (user_id),
  INDEX idx_device_type (device_type),
  INDEX idx_started_at (started_at),
  INDEX idx_ended_at (ended_at),
  INDEX idx_last_activity (last_activity_at),
  INDEX idx_duration (duration_seconds),
  
  -- 复合索引
  INDEX idx_user_started (user_id, started_at),
  INDEX idx_device_started (device_type, started_at)
  
) ENGINE=InnoDB 
DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='用户会话信息表';

-- ============================================================================
-- 数据分区 - 按时间分区提高查询性能（可选）
-- ============================================================================

-- 为tracking_events表创建按月分区
-- ALTER TABLE tracking_events 
-- PARTITION BY RANGE (TO_DAYS(created_at)) (
--   PARTITION p202401 VALUES LESS THAN (TO_DAYS('2024-02-01')),
--   PARTITION p202402 VALUES LESS THAN (TO_DAYS('2024-03-01')),
--   PARTITION p202403 VALUES LESS THAN (TO_DAYS('2024-04-01')),
--   PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- 为error_logs表创建按月分区
-- ALTER TABLE error_logs 
-- PARTITION BY RANGE (TO_DAYS(created_at)) (
--   PARTITION p202401 VALUES LESS THAN (TO_DAYS('2024-02-01')),
--   PARTITION p202402 VALUES LESS THAN (TO_DAYS('2024-03-01')),
--   PARTITION p202403 VALUES LESS THAN (TO_DAYS('2024-04-01')),
--   PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- ============================================================================
-- 创建视图 - 常用查询的便捷视图
-- ============================================================================

-- 实时统计视图
CREATE OR REPLACE VIEW realtime_stats AS
SELECT 
  COUNT(*) as total_events,
  COUNT(DISTINCT session_id) as active_sessions,
  COUNT(DISTINCT user_id) as active_users,
  AVG(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) * 100 as mobile_rate
FROM tracking_events 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE);

-- 错误统计视图
CREATE OR REPLACE VIEW error_stats AS
SELECT 
  error_type,
  error_level,
  COUNT(*) as error_count,
  COUNT(DISTINCT session_id) as affected_sessions,
  MAX(created_at) as last_occurrence
FROM error_logs 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY error_type, error_level
ORDER BY error_count DESC;

-- 热门页面视图
CREATE OR REPLACE VIEW popular_pages AS
SELECT 
  page_url,
  page_title,
  COUNT(*) as page_views,
  COUNT(DISTINCT session_id) as unique_visitors,
  AVG(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) * 100 as mobile_rate
FROM tracking_events 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY page_url, page_title
ORDER BY page_views DESC
LIMIT 50;

-- ============================================================================
-- 存储过程 - 数据清理和维护
-- ============================================================================

DELIMITER //

-- 清理过期数据的存储过程
CREATE OR REPLACE PROCEDURE CleanExpiredData(IN days_to_keep INT)
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE deleted_events INT DEFAULT 0;
  DECLARE deleted_errors INT DEFAULT 0;
  DECLARE deleted_sessions INT DEFAULT 0;
  
  -- 清理过期的追踪事件
  DELETE FROM tracking_events 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
  SET deleted_events = ROW_COUNT();
  
  -- 清理过期的错误日志
  DELETE FROM error_logs 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
  SET deleted_errors = ROW_COUNT();
  
  -- 清理过期的会话记录
  DELETE FROM sessions 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
  SET deleted_sessions = ROW_COUNT();
  
  -- 返回清理统计
  SELECT 
    deleted_events as events_deleted,
    deleted_errors as errors_deleted,
    deleted_sessions as sessions_deleted,
    NOW() as cleanup_time;
    
END//

-- 会话统计更新存储过程
CREATE OR REPLACE PROCEDURE UpdateSessionStats(IN p_session_id VARCHAR(64))
BEGIN
  DECLARE session_exists INT DEFAULT 0;
  
  -- 检查会话是否存在
  SELECT COUNT(*) INTO session_exists 
  FROM sessions 
  WHERE session_id = p_session_id;
  
  IF session_exists > 0 THEN
    -- 更新现有会话统计
    UPDATE sessions SET
      page_views = (
        SELECT COUNT(DISTINCT page_url) 
        FROM tracking_events 
        WHERE session_id = p_session_id
      ),
      event_count = (
        SELECT COUNT(*) 
        FROM tracking_events 
        WHERE session_id = p_session_id
      ),
      error_count = (
        SELECT COUNT(*) 
        FROM error_logs 
        WHERE session_id = p_session_id
      ),
      last_activity_at = (
        SELECT MAX(created_at) 
        FROM tracking_events 
        WHERE session_id = p_session_id
      ),
      last_page_url = (
        SELECT page_url 
        FROM tracking_events 
        WHERE session_id = p_session_id 
        ORDER BY created_at DESC 
        LIMIT 1
      ),
      updated_at = NOW()
    WHERE session_id = p_session_id;
  END IF;
END//

DELIMITER ;

-- ============================================================================
-- 初始化数据和默认设置
-- ============================================================================

-- 创建定时任务清理过期数据（需要开启事件调度器）
-- SET GLOBAL event_scheduler = ON;

-- CREATE EVENT IF NOT EXISTS cleanup_expired_data
-- ON SCHEDULE EVERY 1 DAY
-- STARTS CURRENT_TIMESTAMP
-- DO CALL CleanExpiredData(90);

-- 显示建表完成信息
SELECT 
  'Database setup completed successfully!' as message,
  'tracking_events, error_logs, sessions tables created' as tables_created,
  'Views and procedures created' as additional_features,
  NOW() as setup_time;
