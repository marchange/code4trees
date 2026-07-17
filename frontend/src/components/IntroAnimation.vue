<script setup>
import { onMounted, ref } from 'vue'
import confetti from 'canvas-confetti'

const visible = ref(true)
const stage = ref('seed') // seed -> sprout -> tree -> done
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function fireLeafBurst() {
  confetti({
    particleCount: 40,
    spread: 60,
    startVelocity: 25,
    gravity: 0.9,
    scalar: 0.8,
    origin: { x: 0.5, y: 0.55 },
    colors: ['#A7C957', '#7FB069', '#E8C547']
  })
}

onMounted(() => {
  if (reduceMotion) {
    visible.value = false
    return
  }

  // App.vue rendert dieses Component nur einmal beim initialen Mount, nicht bei
  // jeder SPA-Navigation (router-view wechselt, App.vue bleibt gemountet) — läuft
  // also automatisch nur einmal pro echtem Seitenaufruf, nicht pro Klick.
  setTimeout(() => { stage.value = 'sprout' }, 300)
  setTimeout(() => { stage.value = 'tree' }, 700)
  setTimeout(() => { fireLeafBurst() }, 1300)
  setTimeout(() => { stage.value = 'done' }, 1800)
  setTimeout(() => { visible.value = false }, 2300)
})
</script>

<template>
  <div v-if="visible" class="intro-overlay" :class="`stage-${stage}`" aria-hidden="true">
    <svg class="intro-tree-svg" width="140" height="180" viewBox="0 0 140 180">
      <rect class="intro-trunk" x="62" y="110" width="16" height="60" fill="#8A6F4D" />
      <polygon class="intro-canopy" points="70,10 122,110 18,110" fill="#A7C957" />
      <circle class="intro-seed-dot" cx="70" cy="168" r="6" fill="#8A6F4D" />
    </svg>
    <div class="intro-wordmark"><span>&#123;&#125;</span> code4trees</div>
  </div>
</template>
