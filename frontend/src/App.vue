<script setup>
import AmbientBackground from './components/AmbientBackground.vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import { useRoute } from 'vue-router'
import { computed, watch } from 'vue'

const route = useRoute()
// Die Arena ist ein Vollbild-IDE-Layout ohne Footer (wie im Original training.html)
const showFooter = computed(() => route.name !== 'arena')

// style_training.css setzt html/body auf overflow:hidden + 100vh für das
// Vollbild-IDE-Layout der Arena — das darf nur dort gelten, sonst lässt sich
// auf allen anderen Seiten (Dashboard, About, ...) nicht mehr scrollen.
watch(
  () => route.name,
  (name) => document.body.classList.toggle('arena-view', name === 'arena'),
  { immediate: true }
)
</script>

<template>
  <AmbientBackground />
  <SiteHeader />
  <router-view />
  <SiteFooter v-if="showFooter" />
</template>
