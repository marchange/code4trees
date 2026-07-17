<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const menuOpen = ref(false)
const route = useRoute()

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

// Menü schließen, sobald sich die Route ändert (z.B. nach Klick auf einen Link)
watch(() => route.fullPath, closeMenu)
</script>

<template>
  <header>
    <router-link class="logo" to="/" @click="closeMenu">
      <span class="glyph">&#123;&#125;</span> code4trees
    </router-link>

    <button
      type="button"
      class="nav-toggle"
      :class="{ open: menuOpen }"
      :aria-expanded="menuOpen"
      aria-controls="site-nav"
      aria-label="Menü umschalten"
      @click="toggleMenu"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>

    <nav id="site-nav" class="nav" :class="{ open: menuOpen }">
      <router-link to="/" exact-active-class="active" @click="closeMenu">Dashboard</router-link>
      <router-link to="/arena" active-class="active" @click="closeMenu">Code-Arena</router-link>
      <router-link to="/about" active-class="active" @click="closeMenu">Über uns</router-link>
      <router-link to="/#einreichen" @click="closeMenu">Einreichen</router-link>
    </nav>
  </header>
</template>
