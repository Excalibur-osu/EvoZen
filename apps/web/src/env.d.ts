/// <reference types="vite/client" />

/**
 * TypeScript 全局声明文件
 * 声明外部模块和 CSS 引用以防止编译器报错
 */

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.css' {
  const content: string
  export default content
}
