// Vue 3 + TypeScript 类型声明

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 扩展全局类型
declare global {
  namespace NodeJS {
    interface Timeout {}
  }
}

export {}
