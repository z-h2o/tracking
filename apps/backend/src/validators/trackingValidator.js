import Joi from 'joi';
import { ValidationError } from '../middlewares/errorHandler.js';

// 基础验证规则
const baseValidationRules = {
  sessionId: Joi.string().min(10).max(255).required(),
  userId: Joi.string().min(1).max(255).optional().allow(null),
  timestamp: Joi.number().integer().positive().required(),
  url: Joi.string().uri().max(2000).required(),
  userAgent: Joi.string().max(1000).optional().allow(null),
  appVersion: Joi.string().max(50).optional().allow(null)
};

// SPM验证规则
const spmRules = {
  spm: Joi.string().max(500).optional().allow(null)
};

// 页面信息验证规则
const pageInfoRules = {
  pageTitle: Joi.string().max(500).optional().allow(null),
  referrer: Joi.string().uri().max(2000).optional().allow(null, ''),
  viewport: Joi.object({
    width: Joi.number().integer().min(0).max(10000).optional(),
    height: Joi.number().integer().min(0).max(10000).optional()
  }).optional()
};

// 元素信息验证规则
const elementRules = {
  element: Joi.object({
    tagName: Joi.string().max(50).optional(),
    id: Joi.string().max(255).optional().allow(''),
    className: Joi.string().max(1000).optional().allow(''),
    text: Joi.string().max(500).optional().allow(''),
    attributes: Joi.object().pattern(Joi.string(), Joi.any()).optional()
  }).optional(),
  position: Joi.object({
    x: Joi.number().integer().min(0).optional(),
    y: Joi.number().integer().min(0).optional(),
    width: Joi.number().integer().min(0).optional(),
    height: Joi.number().integer().min(0).optional()
  }).optional()
};

// 设备信息验证规则
const deviceRules = {
  user: Joi.object({
    userAgent: Joi.string().max(1000).optional(),
    language: Joi.string().max(10).optional(),
    timezone: Joi.string().max(50).optional()
  }).optional(),
  deviceType: Joi.string().valid('desktop', 'mobile', 'tablet', 'unknown').optional(),
  osName: Joi.string().max(50).optional(),
  browserName: Joi.string().max(50).optional()
};

// 单个埋点事件验证Schema
const trackingEventSchema = Joi.object({
  // 基础信息
  ...baseValidationRules,
  ...spmRules,
  ...pageInfoRules,
  ...elementRules,
  ...deviceRules,
  
  // 事件类型
  eventType: Joi.string().valid('click', 'view', 'manual', 'page_view').optional(),
  trigger: Joi.string().valid('click', 'view', 'manual').optional(),
  triggerType: Joi.string().max(50).optional(),
  
  // 事件数据
  eventData: Joi.object().optional(),
  customData: Joi.object().optional(),
  custom: Joi.object().optional(),
  
  // 页面信息（兼容不同格式）
  page: Joi.object({
    title: Joi.string().max(500).optional(),
    referrer: Joi.string().max(2000).optional().allow(''),
    viewport: Joi.object({
      width: Joi.number().integer().min(0).max(10000).optional(),
      height: Joi.number().integer().min(0).max(10000).optional()
    }).optional()
  }).optional(),
  
  // 事件信息（点击事件）
  event: Joi.object({
    type: Joi.string().optional(),
    clientX: Joi.number().integer().optional(),
    clientY: Joi.number().integer().optional(),
    button: Joi.number().integer().optional()
  }).optional()
}).unknown(true); // 允许未知字段，便于扩展

// 批量埋点事件验证Schema
const batchTrackingEventsSchema = Joi.array()
  .items(trackingEventSchema)
  .min(1)
  .max(100)
  .required();

// 错误监控数据验证Schema
const errorLogSchema = Joi.object({
  // 基础信息
  sessionId: Joi.string().min(10).max(255).required(),
  userId: Joi.string().min(1).max(255).optional().allow(null),
  timestamp: Joi.number().integer().positive().required(),
  
  // 错误信息
  type: Joi.string().valid('javascript_error', 'promise_rejection', 'resource_error', 'network_error').required(),
  message: Joi.string().max(2000).required(),
  filename: Joi.string().max(500).optional().allow(null),
  lineno: Joi.number().integer().min(0).optional().allow(null),
  colno: Joi.number().integer().min(0).optional().allow(null),
  stack: Joi.string().max(5000).optional().allow(null),
  reason: Joi.string().max(2000).optional().allow(null),
  
  // 页面信息
  url: Joi.string().uri().max(2000).required(),
  pageTitle: Joi.string().max(500).optional().allow(null),
  referrer: Joi.string().uri().max(2000).optional().allow(null, ''),
  
  // 浏览器和设备信息
  userAgent: Joi.string().max(1000).optional().allow(null),
  browserLanguage: Joi.string().max(10).optional().allow(null),
  timezone: Joi.string().max(50).optional().allow(null),
  deviceType: Joi.string().valid('desktop', 'mobile', 'tablet', 'unknown').optional(),
  
  // 业务信息
  appVersion: Joi.string().max(50).optional().allow(null),
  customData: Joi.object().optional()
}).unknown(true);

// 查询参数验证Schema
const queryParamsSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  sessionId: Joi.string().min(10).max(255).optional(),
  userId: Joi.string().min(1).max(255).optional(),
  eventType: Joi.string().valid('click', 'view', 'manual', 'page_view').optional(),
  spm: Joi.string().max(500).optional(),
  pageUrl: Joi.string().max(2000).optional(),
  deviceType: Joi.string().valid('desktop', 'mobile', 'tablet', 'unknown').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),
  sortBy: Joi.string().valid('created_at', 'event_timestamp', 'id').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// 验证中间件工厂
const createValidator = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      throw new ValidationError('Validation failed', details);
    }

    // 将验证后的数据重新赋值
    req[source] = value;
    next();
  };
};

// 数据清理和标准化函数
export const normalizeTrackingData = (data) => {
  const normalized = { ...data };
  
  // 标准化时间戳
  if (normalized.timestamp) {
    normalized.eventTimestamp = normalized.timestamp;
    delete normalized.timestamp;
  }
  
  // 标准化事件类型
  if (normalized.trigger && !normalized.eventType) {
    normalized.eventType = normalized.trigger === 'manual' ? 'manual' : 
                           normalized.trigger === 'view' ? 'view' : 'click';
  }
  
  // 标准化页面信息
  if (normalized.page) {
    if (normalized.page.title && !normalized.pageTitle) {
      normalized.pageTitle = normalized.page.title;
    }
    if (normalized.page.referrer && !normalized.referrer) {
      normalized.referrer = normalized.page.referrer;
    }
    if (normalized.page.viewport) {
      normalized.viewportWidth = normalized.page.viewport.width;
      normalized.viewportHeight = normalized.page.viewport.height;
    }
  }
  
  // 标准化用户信息
  if (normalized.user) {
    if (normalized.user.userAgent && !normalized.userAgent) {
      normalized.userAgent = normalized.user.userAgent;
    }
    if (normalized.user.language && !normalized.browserLanguage) {
      normalized.browserLanguage = normalized.user.language;
    }
    if (normalized.user.timezone && !normalized.timezone) {
      normalized.timezone = normalized.user.timezone;
    }
  }
  
  // 标准化元素信息
  if (normalized.element) {
    normalized.elementTag = normalized.element.tagName;
    normalized.elementId = normalized.element.id;
    normalized.elementClass = normalized.element.className;
    normalized.elementText = normalized.element.text;
    normalized.elementAttributes = normalized.element.attributes;
  }
  
  // 标准化位置信息
  if (normalized.position) {
    normalized.elementX = normalized.position.x;
    normalized.elementY = normalized.position.y;
    normalized.elementWidth = normalized.position.width;
    normalized.elementHeight = normalized.position.height;
  }
  
  // 标准化URL
  if (normalized.url && !normalized.pageUrl) {
    normalized.pageUrl = normalized.url;
  }
  
  return normalized;
};

// 导出验证中间件
export const validateTrackingEvent = createValidator(trackingEventSchema);
export const validateBatchTrackingEvents = createValidator(batchTrackingEventsSchema);
export const validateErrorLog = createValidator(errorLogSchema);
export const validateQueryParams = createValidator(queryParamsSchema, 'query');

// 导出Schema供其他地方使用
export {
  trackingEventSchema,
  batchTrackingEventsSchema,
  errorLogSchema,
  queryParamsSchema
};

export default {
  validateTrackingEvent,
  validateBatchTrackingEvents,
  validateErrorLog,
  validateQueryParams,
  normalizeTrackingData
};
