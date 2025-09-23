import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { TrackingSDK } from '@tracking/index'

const tracker = new TrackingSDK({
  endpoint: 'http://localhost:3000/api/tracking/events',
  sender: 'jsonp', // 可选: jsonp, image, xhr, fetch
  debug: false,
  logToPage: true,
  
  // 错误监控配置
  errorMonitoring: {
    enabled: true,
    captureJSErrors: true,
    capturePromiseRejections: true,
    captureResourceErrors: true,
    captureNetworkErrors: true,
    maxErrorsPerSession: 20,
    errorSamplingRate: 1.0,
    ignoreErrors: ['Script error', /network/i],
    beforeErrorSend: (errorData) => {
        console.log('准备发送错误:', errorData);
        return errorData;
    }
  },
  
  // 数据处理
  dataProcessor: (data) => {
    // 可以在这里添加通用字段
    data.appVersion = '1.0.0';
    data.userId = 'user123';
    return data;
  },
  
});

window.tracker = tracker;

tracker.start();


// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 全局样式
import './styles/index.scss'

// NProgress
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// NProgress配置
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200
})

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
