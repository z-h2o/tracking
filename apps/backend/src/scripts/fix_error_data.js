import { query, transaction } from '../config/database.js';
import logger from '../middlewares/logger.js';

/**
 * 数据修复脚本：将错误存储在tracking_events表中的错误数据移动到error_logs表
 */
async function fixErrorData() {
  try {
    logger.info('Starting error data migration...');
    
    // 查询所有category='error'的tracking_events记录
    const errorEvents = await query(`
      SELECT * FROM tracking_events 
      WHERE category = 'error'
      ORDER BY id
    `);
    
    if (errorEvents.length === 0) {
      logger.info('No error events found in tracking_events table');
      return;
    }
    
    logger.info(`Found ${errorEvents.length} error events to migrate`);
    
    await transaction(async (connection) => {
      let migratedCount = 0;
      
      for (const event of errorEvents) {
        try {
          // 插入到error_logs表
          const [insertResult] = await connection.execute(`
            INSERT INTO error_logs (
              session_id, user_id, app_version, category,
              error_timestamp,
              error_type, error_message, error_reason, error_stack,
              page_url, page_title, page_referrer, viewport_width, viewport_height,
              user_agent, user_language, user_timezone,
              error_level, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            event.session_id,
            event.user_id,
            event.app_version,
            'error', // 确保category为error
            event.event_timestamp,
            // 错误信息 - 从event_data中提取或使用默认值
            'unknown_error', // error_type - 需要从原始数据推断
            'Migrated error event', // error_message - 占位符
            null, // error_reason
            null, // error_stack
            event.page_url,
            event.page_title,
            event.page_referrer,
            event.viewport_width,
            event.viewport_height,
            event.user_agent,
            event.user_language,
            event.user_timezone,
            'medium', // 默认错误级别
            event.created_at
          ]);
          
          // 从tracking_events表中删除
          await connection.execute(`
            DELETE FROM tracking_events WHERE id = ?
          `, [event.id]);
          
          migratedCount++;
          logger.info(`Migrated error event ID ${event.id} to error_logs ID ${insertResult.insertId}`);
          
        } catch (error) {
          logger.error(`Failed to migrate error event ID ${event.id}:`, error.message);
        }
      }
      
      logger.info(`Migration completed. ${migratedCount}/${errorEvents.length} events migrated successfully`);
    });
    
  } catch (error) {
    logger.error('Error data migration failed:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  fixErrorData()
    .then(() => {
      console.log('Error data migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error data migration failed:', error);
      process.exit(1);
    });
}

export { fixErrorData };
