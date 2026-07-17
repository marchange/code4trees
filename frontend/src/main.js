import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Bestehende Styles 1:1 übernommen
import './assets/css/style.css'
import './assets/css/style_training.css'

createApp(App).use(router).mount('#app')
