const Joi = require('joi');

// SPM埋点数据验证模式
const spmDataSchema = Joi.object({
  spm: Joi.string().required().max(200),
  timestamp: Joi.number().integer().positive().required(),
  url: Joi.string().uri().required(),
  
  element: Joi.object({
    tagName: Joi.string().max(50),
    className: Joi.string().max(500).allow(''),
    id: Joi.string().max(100).allow(''),
    text: Joi.string().max(100).allow(''),
    attributes: Joi.object().pattern(/./, Joi.string().max(200))
  }).required(),
  
  position: Joi.object({
    x: Joi.number().integer(),
    y: Joi.number().integer(),
    width: Joi.number().integer().min(0),
    height: Joi.number().integer().min(0)
  }).required(),
  
  page: Joi.object({
    title: Joi.string().max(500).allow(''),
    referrer: Joi.string().uri().allow(''),
    viewport: Joi.object({
      width: Joi.number().integer().min(1),
      height: Joi.number().integer().min(1)
    })
  }).required(),
  
  user: Joi.object({
    userAgent: Joi.string().max(1000).allow(''),
    language: Joi.string().max(10).allow(''),
    timezone: Joi.string().max(50).allow('')
  }).required(),
  
  trigger: Joi.string().valid('click', 'view', 'custom').default('click'),
  
  // 事件信息（点击事件时存在）
  event: Joi.object({
    type: Joi.string().max(20),
    clientX: Joi.number().integer(),
    clientY: Joi.number().integer(),
    button: Joi.number().integer()
  }).optional(),
  
  custom: Joi.object().pattern(/./, Joi.any()).default({})
});

// 批量SPM数据验证
const spmBatchSchema = Joi.array().items(spmDataSchema).min(1).max(50);

// JSONP请求验证
const jsonpRequestSchema = Joi.object({
  data: Joi.string().required(), // JSON字符串
  callback: Joi.string().pattern(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/).required()
});

// GET请求参数验证（图片请求方式）
const imageRequestSchema = Joi.object({
  data: Joi.string().required(), // URL编码的JSON字符串
  t: Joi.number().integer().positive() // 时间戳防缓存
});

module.exports = {
  spmDataSchema,
  spmBatchSchema,
  jsonpRequestSchema,
  imageRequestSchema
};