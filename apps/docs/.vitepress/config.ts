import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '埋点监控系统',
  description: '一个完整的前端埋点监控解决方案',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/getting-started' },
      { text: 'API 文档', link: '/api/tracking' },
      { text: '示例', link: '/examples/basic' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '项目架构', link: '/guide/architecture' },
            { text: '数据库设计', link: '/guide/database' }
          ]
        },
        {
          text: '集成指南',
          items: [
            { text: '前端集成', link: '/guide/frontend-integration' },
            { text: '配置选项', link: '/guide/configuration' },
            { text: '事件类型', link: '/guide/event-types' },
            { text: '上报方式', link: '/guide/sender-types' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '埋点接口', link: '/api/tracking' },
            { text: '错误监控', link: '/api/error-logging' },
            { text: '数据查询', link: '/api/analytics' },
            { text: '会话管理', link: '/api/session' }
          ]
        },
        {
          text: '数据模型',
          items: [
            { text: '埋点事件', link: '/api/models/tracking-event' },
            { text: '错误日志', link: '/api/models/error-log' },
            { text: '用户会话', link: '/api/models/user-session' }
          ]
        }
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '基础用法', link: '/examples/basic' },
            { text: '高级配置', link: '/examples/advanced' },
            { text: '错误监控', link: '/examples/error-tracking' },
            { text: '自定义事件', link: '/examples/custom-events' }
          ]
        }
      ],
      '/deployment/': [
        {
          text: '部署',
          items: [
            { text: '环境要求', link: '/deployment/requirements' },
            { text: '安装部署', link: '/deployment/installation' },
            { text: '配置说明', link: '/deployment/configuration' },
            { text: '性能优化', link: '/deployment/optimization' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/tracking-system' }
    ],

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2024 埋点监控系统团队'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/your-org/tracking-system/edit/main/apps/docs/:path',
      text: '在 GitHub 上编辑此页面'
    }
  },

  markdown: {
    lineNumbers: true,
    config: (md) => {
      // 可以在这里添加 markdown-it 插件
    }
  }
})
