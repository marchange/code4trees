<script setup>
import AmbientBackground from './components/AmbientBackground.vue'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
// Die Arena ist ein Vollbild-IDE-Layout ohne Footer (wie im Original training.html)
const showFooter = computed(() => route.name !== 'arena')
</script>

<template>
  <AmbientBackground />
  <SiteHeader />
  <router-view />
  <SiteFooter v-if="showFooter" />
</template>
