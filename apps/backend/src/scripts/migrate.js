import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from '../config/database.js';
import logger from '../middlewares/logger.js';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 数据库迁移脚本
 */
class DatabaseMigrator {
  
  /**
   * 执行数据库迁移
   */
  static async migrate() {
    try {
      logger.info('Starting database migration...');
      
      // 测试数据库连接
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }
      
      // 读取SQL文件
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }
      
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // 分割SQL语句
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      logger.info(`Found ${statements.length} SQL statements to execute`);
      
      // 执行每个SQL语句
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        try {
          logger.info(`Executing statement ${i + 1}/${statements.length}`);
          await query(statement);
          logger.info(`Statement ${i + 1} executed successfully`);
        } catch (error) {
          logger.error(`Failed to execute statement ${i + 1}:`, {
            statement: statement.substring(0, 100) + '...',
            error: error.message
          });
          
          // 某些语句失败是可以接受的（比如CREATE DATABASE IF NOT EXISTS）
          if (!this.isAcceptableError(error)) {
            throw error;
          }
        }
      }
      
      logger.info('Database migration completed successfully');
      return true;
      
    } catch (error) {
      logger.error('Database migration failed:', error);
      throw error;
    }
  }
  
  /**
   * 检查是否为可接受的错误
   */
  static isAcceptableError(error) {
    const acceptableErrors = [
      'Table already exists',
      'Database exists',
      'Duplicate key name',
      'already exists'
    ];
    
    return acceptableErrors.some(acceptable => 
      error.message.toLowerCase().includes(acceptable.toLowerCase())
    );
  }
  
  /**
   * 验证数据库结构
   */
  static async validateSchema() {
    try {
      logger.info('Validating database schema...');
      
      // 检查必要的表是否存在
      const requiredTables = [
        'tracking_events',
        'error_logs',
        'performance_logs',
        'user_sessions'
      ];
      
      for (const table of requiredTables) {
        const result = await query(`SHOW TABLES LIKE '${table}'`);
        if (result.length === 0) {
          throw new Error(`Required table '${table}' not found`);
        }
        logger.info(`Table '${table}' exists`);
      }
      
      // 检查视图是否存在
      const requiredViews = ['popular_pages', 'error_statistics'];
      
      for (const view of requiredViews) {
        try {
          await query(`SELECT 1 FROM ${view} LIMIT 1`);
          logger.info(`View '${view}' exists and accessible`);
        } catch (error) {
          logger.warn(`View '${view}' may not exist or be accessible:`, error.message);
        }
      }
      
      logger.info('Database schema validation completed');
      return true;
      
    } catch (error) {
      logger.error('Database schema validation failed:', error);
      throw error;
    }
  }
  
  /**
   * 创建索引
   */
  static async createIndexes() {
    try {
      logger.info('Creating additional indexes...');
      
      const indexes = [
        {
          table: 'tracking_events',
          name: 'idx_composite_query',
          columns: ['session_id', 'event_type', 'created_at']
        },
        {
          table: 'error_logs',
          name: 'idx_error_composite',
          columns: ['error_type', 'created_at', 'resolved']
        }
      ];
      
      for (const index of indexes) {
        try {
          const sql = `CREATE INDEX ${index.name} ON ${index.table} (${index.columns.join(', ')})`;
          await query(sql);
          logger.info(`Index '${index.name}' created successfully`);
        } catch (error) {
          if (!this.isAcceptableError(error)) {
            logger.warn(`Failed to create index '${index.name}':`, error.message);
          }
        }
      }
      
      logger.info('Index creation completed');
      return true;
      
    } catch (error) {
      logger.error('Index creation failed:', error);
      throw error;
    }
  }
  
  /**
   * 插入初始数据
   */
  static async seedData() {
    try {
      logger.info('Seeding initial data...');
      
      // 这里可以插入一些初始数据，比如默认配置、测试数据等
      // 目前保持空实现
      
      logger.info('Data seeding completed');
      return true;
      
    } catch (error) {
      logger.error('Data seeding failed:', error);
      throw error;
    }
  }
  
  /**
   * 完整的数据库初始化
   */
  static async initialize() {
    try {
      logger.info('Starting database initialization...');
      
      await this.migrate();
      await this.validateSchema();
      await this.createIndexes();
      await this.seedData();
      
      logger.info('Database initialization completed successfully');
      return true;
      
    } catch (error) {
      logger.error('Database initialization failed:', error);
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'migrate';
  
  switch (command) {
    case 'migrate':
      DatabaseMigrator.migrate().then(() => {
        logger.info('Migration completed');
        process.exit(0);
      }).catch((error) => {
        logger.error('Migration failed:', error);
        process.exit(1);
      });
      break;
      
    case 'validate':
      DatabaseMigrator.validateSchema().then(() => {
        logger.info('Validation completed');
        process.exit(0);
      }).catch((error) => {
        logger.error('Validation failed:', error);
        process.exit(1);
      });
      break;
      
    case 'init':
      DatabaseMigrator.initialize().then(() => {
        logger.info('Initialization completed');
        process.exit(0);
      }).catch((error) => {
        logger.error('Initialization failed:', error);
        process.exit(1);
      });
      break;
      
    default:
      logger.error('Unknown command. Available commands: migrate, validate, init');
      process.exit(1);
  }
}

export default DatabaseMigrator;
