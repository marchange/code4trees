<template>
  <header>
    <router-link class="logo" to="/">
      <span class="glyph">&#123;&#125;</span> code4trees
    </router-link>
    <nav class="nav">
      <router-link to="/" exact-active-class="active">Dashboard</router-link>
      <router-link to="/arena" active-class="active">Code-Arena</router-link>
      <router-link to="/#einreichen">Einreichen</router-link>
    </nav>
  </header>
</template>
