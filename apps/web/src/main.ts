/**
 * Vue 应用程序入口
 * 负责实例化 Vue App、挂载 Pinia 状态树并连接 DOM
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
