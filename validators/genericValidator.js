const Joi = require('joi');

// 通用事件数据验证模式
const genericEventSchema = Joi.object({
  event: Joi.string().required().max(100), // 事件名称
  properties: Joi.object().pattern(/./, Joi.any()).default({}), // 事件属性
  timestamp: Joi.number().integer().positive().optional(), // 时间戳（可选）
  user_id: Joi.string().max(100).optional(), // 用户ID（可选）
  session_id: Joi.string().max(100).optional(), // 会话ID（可选）
  distinct_id: Joi.string().max(100).optional(), // 唯一标识（可选）
  lib: Joi.object().optional(), // SDK信息（可选）
  page_url: Joi.string().uri().optional(), // 页面URL（可选）
  page_title: Joi.string().max(500).optional() // 页面标题（可选）
});

// 批量通用事件数据验证
const genericEventBatchSchema = Joi.array().items(genericEventSchema).min(1).max(100);

// JSONP请求验证（兼容多种callback参数名）
const flexibleJsonpRequestSchema = Joi.object({
  data: Joi.string().required(), // JSON字符串
  callback: Joi.string().pattern(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/).optional(),
  jsonp: Joi.string().pattern(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/).optional(),
  cb: Joi.string().pattern(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/).optional()
});

module.exports = {
  genericEventSchema,
  genericEventBatchSchema,
  flexibleJsonpRequestSchema
};