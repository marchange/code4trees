import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Bestehende Styles 1:1 übernommen
import './assets/css/style.css'
import './assets/css/style_training.css'

const app = createApp(App).use(router)

// v-reveal: Element beim ersten Sichtbarwerden sanft einblenden (Scroll-Reveal).
// Optionaler Wert = Verzögerung in ms für Stagger-Effekte, z.B. v-reveal="120".
// Arbeitet nur mit Inline-Styles und räumt sie nach der Animation wieder weg,
// damit bestehende Hover-Transitions (z.B. .step) nicht beeinflusst werden.
app.directive('reveal', {
  mounted(el, binding) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const delay = Number(binding.value) || 0
    el.style.opacity = '0'
    el.style.transform = 'translateY(26px)'
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      el.style.transition = `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
      requestAnimationFrame(() => {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      })
      setTimeout(() => {
        el.style.removeProperty('opacity')
        el.style.removeProperty('transform')
        el.style.removeProperty('transition')
      }, 750 + delay)
    }, { threshold: 0.15 })
    io.observe(el)
  }
})

app.mount('#app')
