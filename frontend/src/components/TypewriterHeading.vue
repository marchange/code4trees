<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'

const html = ref('')
const text = 'Lade dein Zip hoch.<br>Lass <em>Bäume</em> wachsen.'
let timeoutId = null

function typeWriter() {
  let i = 0
  let isTag = false
  let textBuffer = ''

  function type() {
    if (i < text.length) {
      const char = text.charAt(i)
      textBuffer += char
      if (char === '<') isTag = true
      if (char === '>') isTag = false

      html.value = textBuffer + (i < text.length - 1 ? '<span class="cursor">_</span>' : '')
      i++
      timeoutId = setTimeout(type, isTag ? 0 : 50 + Math.random() * 50)
    } else {
      html.value = textBuffer
    }
  }
  timeoutId = setTimeout(type, 500)
}

onMounted(typeWriter)
onBeforeUnmount(() => clearTimeout(timeoutId))
</script>

<template>
  <h1 id="typewriter" v-html="html"></h1>
</template>
