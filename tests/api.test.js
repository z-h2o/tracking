const request = require('supertest');
const app = require('../server');

describe('Tracking API', () => {
  // 测试健康检查
  test('GET /api/tracking/health', async () => {
    const response = await request(app)
      .get('/api/tracking/health')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('服务运行正常');
  });

  // 测试事件记录
  test('POST /api/tracking/event', async () => {
    const eventData = {
      event_name: 'test_event',
      event_category: 'test',
      user_id: 'test_user_123',
      session_id: 'test_session_456',
      page_url: 'https://test.com',
      properties: {
        test_property: 'test_value'
      }
    };

    const response = await request(app)
      .post('/api/tracking/event')
      .send(eventData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('事件记录成功');
  });

  // 测试页面访问记录
  test('POST /api/tracking/pageview', async () => {
    const pageViewData = {
      user_id: 'test_user_123',
      session_id: 'test_session_456',
      page_url: 'https://test.com/page',
      page_title: '测试页面',
      duration: 30,
      scroll_depth: 75.5
    };

    const response = await request(app)
      .post('/api/tracking/pageview')
      .send(pageViewData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('页面访问记录成功');
  });

  // 测试错误日志记录
  test('POST /api/tracking/error', async () => {
    const errorData = {
      user_id: 'test_user_123',
      session_id: 'test_session_456',
      error_type: 'javascript_error',
      error_message: 'Test error message',
      page_url: 'https://test.com/error-page'
    };

    const response = await request(app)
      .post('/api/tracking/error')
      .send(errorData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('错误日志记录成功');
  });

  // 测试数据验证
  test('POST /api/tracking/event - validation error', async () => {
    const invalidData = {
      // 缺少必需的字段
      event_category: 'test'
    };

    const response = await request(app)
      .post('/api/tracking/event')
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('数据验证失败');
  });
});

describe('Analytics API', () => {
  // 测试实时数据获取
  test('GET /api/analytics/realtime', async () => {
    const response = await request(app)
      .get('/api/analytics/realtime')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('activeUsers');
    expect(response.body.data).toHaveProperty('eventCount');
    expect(response.body.data).toHaveProperty('pageViewCount');
  });

  // 测试事件统计
  test('GET /api/analytics/events', async () => {
    const response = await request(app)
      .get('/api/analytics/events')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // 测试数据概览
  test('GET /api/analytics/overview', async () => {
    const response = await request(app)
      .get('/api/analytics/overview')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('realTime');
    expect(response.body.data).toHaveProperty('summary');
  });
});

describe('API Routes', () => {
  // 测试API根路由
  test('GET /api', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('埋点后台服务 API');
    expect(response.body).toHaveProperty('endpoints');
  });

  // 测试404处理
  test('GET /nonexistent-route', async () => {
    const response = await request(app)
      .get('/nonexistent-route')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('请求的资源不存在');
  });
});