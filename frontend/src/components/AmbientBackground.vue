<script setup>
import { onMounted, ref } from 'vue'

const container = ref(null)
const symbols = ['{}', '</>', '[]', '()', '=>', '&&', '||', ';']

function generateAmbientCode() {
  if (!container.value) return
  container.value.innerHTML = ''
  for (let i = 0; i < 15; i++) {
    const el = document.createElement('div')
    el.className = 'code-particle'
    el.innerText = symbols[Math.floor(Math.random() * symbols.length)]
    el.style.left = `${Math.random() * 100}vw`
    el.style.animationDuration = `${10 + Math.random() * 20}s`
    el.style.animationDelay = `${Math.random() * 10}s`
    el.style.fontSize = `${1 + Math.random() * 1.5}rem`
    container.value.appendChild(el)
  }
}

onMounted(() => {
  generateAmbientCode()
  // Feuert auch beim Zurück-Navigieren über den Browser-Back-Button
  window.addEventListener('pageshow', generateAmbientCode)
})
</script>

<template>
  <div class="ambient-bg"></div>
  <div class="floating-code" ref="container"></div>
</template>
