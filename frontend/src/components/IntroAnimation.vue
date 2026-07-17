<script setup>
import { onMounted, ref } from 'vue'

const visible = ref(true)
const stage = ref('glitch') // glitch -> flash -> reveal -> done
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

onMounted(() => {
  if (reduceMotion) {
    visible.value = false
    return
  }

  // App.vue rendert dieses Component nur einmal beim initialen Mount, nicht bei
  // jeder SPA-Navigation (router-view wechselt, App.vue bleibt gemountet) — läuft
  // also automatisch nur einmal pro echtem Seitenaufruf, nicht pro Klick.
  setTimeout(() => { stage.value = 'flash' }, 150)
  setTimeout(() => { stage.value = 'reveal' }, 350)
  setTimeout(() => { stage.value = 'done' }, 650)
  setTimeout(() => { visible.value = false }, 950)
})
</script>

<template>
  <div v-if="visible" class="intro-fast-overlay" :class="`stage-${stage}`" aria-hidden="true">
    <div class="intro-fast-ring"></div>
    <div class="intro-fast-glyphs">
      <span>&#123;&#125;</span><span>&lt;/&gt;</span><span>=&gt;</span>
    </div>
    <div class="intro-fast-wordmark"><span>&#123;&#125;</span> code4trees</div>
  </div>
</template>
