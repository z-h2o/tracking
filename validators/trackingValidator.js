const Joi = require('joi');

// 事件数据验证模式
const eventSchema = Joi.object({
  event_name: Joi.string().required().max(100),
  event_category: Joi.string().max(50),
  user_id: Joi.string().required().max(100),
  session_id: Joi.string().max(100),
  page_url: Joi.string().uri().allow(''),
  page_title: Joi.string().max(255).allow(''),
  referrer: Joi.string().uri().allow(''),
  properties: Joi.object().default({}),
  timestamp: Joi.number().integer().positive(),
  ip_address: Joi.string().ip().allow(''),
  user_agent: Joi.string().allow('')
});

// 页面访问数据验证模式
const pageViewSchema = Joi.object({
  user_id: Joi.string().required().max(100),
  session_id: Joi.string().max(100),
  page_url: Joi.string().uri().required(),
  page_title: Joi.string().max(255).allow(''),
  referrer: Joi.string().uri().allow(''),
  duration: Joi.number().integer().min(0).default(0),
  scroll_depth: Joi.number().min(0).max(100).default(0),
  timestamp: Joi.number().integer().positive(),
  ip_address: Joi.string().ip().allow(''),
  user_agent: Joi.string().allow('')
});

// 错误日志数据验证模式
const errorLogSchema = Joi.object({
  user_id: Joi.string().max(100).allow(''),
  session_id: Joi.string().max(100).allow(''),
  error_type: Joi.string().required().max(100),
  error_message: Joi.string().allow(''),
  error_stack: Joi.string().allow(''),
  page_url: Joi.string().uri().allow(''),
  timestamp: Joi.number().integer().positive(),
  user_agent: Joi.string().allow('')
});

// 用户数据验证模式
const userSchema = Joi.object({
  user_id: Joi.string().required().max(100),
  device_id: Joi.string().max(100).allow(''),
  user_agent: Joi.string().allow(''),
  platform: Joi.string().max(50).allow('')
});

module.exports = {
  eventSchema,
  pageViewSchema,
  errorLogSchema,
  userSchema
};