<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useTrees } from '../composables/useTrees'

const FETCH_INTERVAL_MS = 10000 // Zähler alle 10 Sekunden aktualisieren

const { targetCount, fetchLiveTreeCount } = useTrees()

const treeCountEl = ref(null)
const forestEl = ref(null)

let currentDisplayedCount = -1
let activeAnimationFrame = null
let liveDisplayedValue = 0
let currentMagnitudeStep = -1
let pollInterval = null

// Feste Arrays für deterministische Farben und Höhen
const treeColors = ['#7FB069', '#A7C957', '#5E8B4C']
const heightOffsets = [5, 12, 2, 8, 14, 4, 10, 1, 7, 11, 3, 13, 6, 9, 0, 15]

// --- 1. DYNAMIC GROWING FOREST LOGIC ---
function updateForestVisuals(currentFloat, targetNum) {
  const forest = forestEl.value
  if (!forest) return

  if (currentFloat === 0) {
    forest.innerHTML = ''
    currentMagnitudeStep = -1
    return
  }

  // Eigene Breakpoints, damit die Baumanzahl schön mit dem Gesamtwert skaliert
  let step = 1
  const breakpoints = [
    { limit: 20, step: 1 },
    { limit: 100, step: 5 },
    { limit: 200, step: 10 },
    { limit: 1000, step: 50 },
    { limit: 2000, step: 100 },
    { limit: 10000, step: 500 },
    { limit: 20000, step: 1000 },
    { limit: 100000, step: 5000 },
    { limit: 200000, step: 10000 },
    { limit: 1000000, step: 50000 },
    { limit: 2000000, step: 100000 }
  ]

  for (let bp of breakpoints) {
    if (targetNum <= bp.limit) {
      step = bp.step
      break
    }
  }

  // Fallback, falls die App unglaublich viral geht
  if (targetNum > 2000000) {
    step = Math.pow(10, Math.floor(Math.log10(targetNum / 20)))
  }

  if (currentMagnitudeStep !== step) {
    forest.innerHTML = ''
    currentMagnitudeStep = step
  }

  const fullTrees = Math.floor(currentFloat / step)
  const remainder = currentFloat % step
  const fractionalScale = remainder / step

  const totalNodesNeeded = remainder > 0 ? fullTrees + 1 : fullTrees
  const existingNodes = forest.children

  while (existingNodes.length < totalNodesNeeded) {
    const idx = existingNodes.length
    const hOffset = heightOffsets[idx % heightOffsets.length]
    const color = treeColors[idx % treeColors.length]

    const treeHTML = `<div class="tree-wrapper" style="margin: 0 -4px; transform-origin: bottom center; transform: scaleY(0);">
      <svg width="24" height="${30 + hOffset}" viewBox="0 0 24 ${30 + hOffset}" xmlns="http://www.w3.org/2000/svg" class="tree-svg">
        <rect x="11" y="${18 + hOffset}" width="3" height="12" fill="#8A6F4D"/>
        <polygon points="12.5,0 24,${18 + hOffset} 1,${18 + hOffset}" fill="${color}"/>
      </svg>
    </div>`

    forest.insertAdjacentHTML('beforeend', treeHTML)
  }

  while (existingNodes.length > totalNodesNeeded) {
    forest.removeChild(forest.lastChild)
  }

  for (let i = 0; i < existingNodes.length; i++) {
    if (i === existingNodes.length - 1 && remainder > 0) {
      // Wrapper vertikal strecken
      const displayScale = Math.pow(fractionalScale, 0.3)
      existingNodes[i].style.transform = `scaleY(${displayScale})`
    } else {
      existingNodes[i].style.transform = 'scaleY(1)'
    }
  }
}

// --- 2. ODOMETER ANIMATION FUNCTION ---
function animateValue(obj, start, end) {
  if (!obj || start === end) return

  if (activeAnimationFrame) {
    window.cancelAnimationFrame(activeAnimationFrame)
    activeAnimationFrame = null
  }

  const diff = end - start
  const duration = Math.min(Math.max(diff * 400, 500), 3000)

  let startTimestamp = null

  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp

    const rawProgress = Math.min((timestamp - startTimestamp) / duration, 1)
    const progress = 1 - Math.pow(1 - rawProgress, 3) // Cubic ease-out

    // 1. Exakten FLOAT-Wert berechnen für butterweiche Grafik
    const currentNumFloat = progress * diff + start

    // 2. INTEGER für die Textanzeige
    const currentNumInt = Math.floor(currentNumFloat)

    obj.innerHTML = currentNumInt.toLocaleString('de-AT')
    liveDisplayedValue = currentNumInt

    // 3. Grafik mit dem präzisen Float aktualisieren!
    updateForestVisuals(currentNumFloat, end)

    if (rawProgress < 1) {
      activeAnimationFrame = window.requestAnimationFrame(step)
    } else {
      // Am letzten Frame sauber auf den Endwert snappen
      obj.innerHTML = end.toLocaleString('de-AT')
      liveDisplayedValue = end
      updateForestVisuals(end, end)
      activeAnimationFrame = null
    }
  }
  activeAnimationFrame = window.requestAnimationFrame(step)
}

// Reagiert auf jede Änderung des Zielwerts — egal ob durch Polling
// oder durch einen erfolgreichen Upload (SubmitForm → useTrees.setCount)
watch(targetCount, (newCount) => {
  if (newCount < 0) return

  // Beim ersten Laden von 0 hochrollen
  if (currentDisplayedCount === -1) {
    currentDisplayedCount = 0
    liveDisplayedValue = 0
    animateValue(treeCountEl.value, 0, newCount)
    currentDisplayedCount = newCount
  } else if (newCount > currentDisplayedCount) {
    animateValue(treeCountEl.value, liveDisplayedValue, newCount)
    currentDisplayedCount = newCount
  }
})

onMounted(() => {
  // Sofort laden, dann im Intervall
  fetchLiveTreeCount()
  pollInterval = setInterval(fetchLiveTreeCount, FETCH_INTERVAL_MS)
})

onBeforeUnmount(() => {
  clearInterval(pollInterval)
  if (activeAnimationFrame) window.cancelAnimationFrame(activeAnimationFrame)
})
</script>

<template>
  <div class="counter">
    <div class="counter-inner">
      <div>
        <div class="num" ref="treeCountEl">0</div>
        <div class="label">Bäume durch Studenten gepflanzt</div>
      </div>
      <div class="forest" ref="forestEl" aria-hidden="true"></div>
    </div>
  </div>
</template>
