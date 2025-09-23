-- 埋点监控系统简化版数据库建表脚本
-- 适用于快速部署和测试环境

-- 创建数据库
CREATE DATABASE IF NOT EXISTS tracking_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE tracking_system;

-- ============================================================================
-- 用户追踪事件表 (tracking_events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracking_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  -- 基本标识
  session_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) DEFAULT NULL,
  
  -- 事件信息
  event_type ENUM('click', 'view', 'custom') NOT NULL DEFAULT 'click',
  spm VARCHAR(255) DEFAULT NULL,
  page_url TEXT NOT NULL,
  page_title VARCHAR(500) DEFAULT NULL,
  referrer TEXT DEFAULT NULL,
  
  -- 元素信息
  element_tag VARCHAR(50) DEFAULT NULL,
  element_id VARCHAR(255) DEFAULT NULL,
  element_class TEXT DEFAULT NULL,
  element_text TEXT DEFAULT NULL,
  element_attributes JSON DEFAULT NULL,
  
  -- 位置信息
  element_x INT DEFAULT NULL,
  element_y INT DEFAULT NULL,
  element_width INT DEFAULT NULL,
  element_height INT DEFAULT NULL,
  
  -- 事件数据
  event_data JSON DEFAULT NULL,
  trigger_type ENUM('click', 'view', 'manual') NOT NULL DEFAULT 'click',
  
  -- 设备信息
  user_agent TEXT DEFAULT NULL,
  browser_language VARCHAR(10) DEFAULT NULL,
  timezone VARCHAR(50) DEFAULT NULL,
  viewport_width INT DEFAULT NULL,
  viewport_height INT DEFAULT NULL,
  device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown',
  os_name VARCHAR(50) DEFAULT NULL,
  browser_name VARCHAR(50) DEFAULT NULL,
  
  -- 业务信息
  app_version VARCHAR(20) DEFAULT NULL,
  custom_data JSON DEFAULT NULL,
  
  -- 时间戳
  event_timestamp BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 基本索引
  INDEX idx_session_id (session_id),
  INDEX idx_spm (spm),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 错误日志表 (error_logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS error_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  
  -- 基本标识
  session_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) DEFAULT NULL,
  
  -- 错误信息
  error_type ENUM('javascript_error', 'promise_rejection', 'resource_error', 'network_error', 'custom_error') 
    NOT NULL DEFAULT 'javascript_error',
  error_message TEXT NOT NULL,
  error_stack TEXT DEFAULT NULL,
  error_filename VARCHAR(500) DEFAULT NULL,
  error_lineno INT DEFAULT NULL,
  error_colno INT DEFAULT NULL,
  
  -- 页面信息
  page_url TEXT NOT NULL,
  page_title VARCHAR(500) DEFAULT NULL,
  referrer TEXT DEFAULT NULL,
  
  -- 设备信息
  user_agent TEXT DEFAULT NULL,
  browser_language VARCHAR(10) DEFAULT NULL,
  timezone VARCHAR(50) DEFAULT NULL,
  device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown',
  os_name VARCHAR(50) DEFAULT NULL,
  browser_name VARCHAR(50) DEFAULT NULL,
  
  -- 业务信息
  app_version VARCHAR(20) DEFAULT NULL,
  custom_data JSON DEFAULT NULL,
  error_level ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 时间戳
  error_timestamp BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 基本索引
  INDEX idx_session_id (session_id),
  INDEX idx_error_type (error_type),
  INDEX idx_error_level (error_level),
  INDEX idx_created_at (created_at)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 插入测试数据（可选）
-- ============================================================================

-- 插入一些测试的追踪事件
INSERT INTO tracking_events (
  session_id, event_type, spm, page_url, page_title, 
  element_tag, trigger_type, user_agent, device_type, 
  event_timestamp
) VALUES 
('session_test_001', 'click', 'home.button.login', 'http://localhost:3000', '首页', 'button', 'click', 'Mozilla/5.0 (test)', 'desktop', UNIX_TIMESTAMP() * 1000),
('session_test_001', 'view', 'home.banner.main', 'http://localhost:3000', '首页', 'div', 'view', 'Mozilla/5.0 (test)', 'desktop', UNIX_TIMESTAMP() * 1000);

-- 插入一些测试的错误日志
INSERT INTO error_logs (
  session_id, error_type, error_message, page_url, 
  user_agent, device_type, error_timestamp
) VALUES 
('session_test_001', 'javascript_error', 'Uncaught TypeError: Cannot read property of undefined', 'http://localhost:3000', 'Mozilla/5.0 (test)', 'desktop', UNIX_TIMESTAMP() * 1000),
('session_test_002', 'promise_rejection', 'Promise rejection test error', 'http://localhost:3000', 'Mozilla/5.0 (test)', 'mobile', UNIX_TIMESTAMP() * 1000);

-- 显示建表完成信息
SELECT 
  'Simple database setup completed!' as message,
  COUNT(*) as test_events_count
FROM tracking_events;

SELECT 
  'Error logs table ready!' as message,
  COUNT(*) as test_errors_count  
FROM error_logs;
