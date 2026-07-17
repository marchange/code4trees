<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

// --- Timeline (ms) ---
const GATHER_END = 1150   // Glyphen fliegen ein und formen den Baum
const BLOOM_END = 1700    // Baum leuchtet/schimmert, Wordmark erscheint
const RELEASE_END = 2350  // Glyphen verwehen wie Blätter, Seite erscheint

const GLYPHS = ['{', '}', '<', '>', '/', '=', ';', '(', ')', '[', ']', '0', '1', '*', '+']
const CANOPY_COLORS = ['#7FB069', '#A7C957', '#5E8B4C', '#A7C957'] // Grüntöne wie TreeCounter
const SUN = '#E8C547'
const BARK = '#8A6F4D'

const visible = ref(true)
const leaving = ref(false)
const wordmarkOn = ref(false)
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const canvasEl = ref(null)
let rafId = null
let t0 = 0
let particles = []
let ctx = null
let W = 0
let H = 0
let dpr = 1

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }

// Baumform (Dreieck-Krone + Stamm, wie TreeCounter/CertificateCard) offscreen
// rastern und Pixel als Zielpunkte für die Partikel sampeln.
function sampleTreePoints(count) {
  const scale = Math.min(H * 0.5, 420) / 180
  const treeW = 140 * scale
  const treeH = 180 * scale
  const ox = W / 2 - treeW / 2
  const oy = H / 2 - treeH / 2 - H * 0.03

  const off = document.createElement('canvas')
  off.width = Math.ceil(treeW)
  off.height = Math.ceil(treeH)
  const octx = off.getContext('2d')
  octx.scale(scale, scale)
  octx.fillStyle = '#fff'
  octx.beginPath() // Krone
  octx.moveTo(70, 10); octx.lineTo(122, 110); octx.lineTo(18, 110); octx.closePath()
  octx.fill()
  octx.fillRect(62, 110, 16, 60) // Stamm

  const data = octx.getImageData(0, 0, off.width, off.height).data
  const pts = []
  const step = 3
  for (let y = 0; y < off.height; y += step) {
    for (let x = 0; x < off.width; x += step) {
      if (data[(y * off.width + x) * 4 + 3] > 128) {
        const isTrunk = y / scale > 112
        pts.push({ x: ox + x, y: oy + y, isTrunk })
      }
    }
  }
  // Mischen und auf count reduzieren
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pts[i], pts[j]] = [pts[j], pts[i]]
  }
  return pts.slice(0, Math.min(count, pts.length))
}

function buildParticles() {
  const count = W < 600 ? 200 : 320
  const targets = sampleTreePoints(count)
  const cx = W / 2
  const cy = H / 2
  const R = Math.max(W, H) * 0.75

  particles = targets.map((t, i) => {
    const ang = Math.random() * Math.PI * 2
    const sx = cx + Math.cos(ang) * R * (0.7 + Math.random() * 0.5)
    const sy = cy + Math.sin(ang) * R * (0.7 + Math.random() * 0.5)
    // Kurvige Flugbahn: Versatz senkrecht zur Flugrichtung
    const dx = t.x - sx, dy = t.y - sy
    const len = Math.hypot(dx, dy) || 1
    const color = t.isTrunk
      ? BARK
      : (Math.random() < 0.07 ? SUN : CANOPY_COLORS[i % CANOPY_COLORS.length])
    // Streurichtung für die Release-Phase: nach außen + Wind nach oben rechts
    const outAng = Math.atan2(t.y - cy, t.x - cx)
    return {
      sx, sy, tx: t.x, ty: t.y,
      px: -dy / len, py: dx / len,
      curl: (Math.random() - 0.5) * 120,
      delay: (i / targets.length) * 420 * Math.random(),
      dur: 620 + Math.random() * 380,
      glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      size: 11 + Math.random() * 7,
      color,
      shimmer: Math.random() * Math.PI * 2,
      vx: Math.cos(outAng) * (40 + Math.random() * 130) + 50,
      vy: Math.sin(outAng) * (30 + Math.random() * 90) - 90 - Math.random() * 60,
    }
  })
}

function frame(now) {
  const elapsed = now - t0
  ctx.clearRect(0, 0, W, H)

  // Sanfter Glow hinter dem Baum ab der Bloom-Phase
  const glowT = Math.min(Math.max((elapsed - (GATHER_END - 250)) / 500, 0), 1)
  if (glowT > 0) {
    const fade = elapsed > BLOOM_END ? Math.max(1 - (elapsed - BLOOM_END) / (RELEASE_END - BLOOM_END), 0) : 1
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.45)
    g.addColorStop(0, `rgba(167, 201, 87, ${0.16 * glowT * fade})`)
    g.addColorStop(1, 'rgba(167, 201, 87, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  const releaseT = elapsed > BLOOM_END ? (elapsed - BLOOM_END) / 1000 : 0

  for (const p of particles) {
    let x, y, alpha = 1, size = p.size

    if (releaseT > 0) {
      // Verwehen: von der Zielposition nach außen/oben, ausblenden
      x = p.tx + p.vx * releaseT
      y = p.ty + p.vy * releaseT + 40 * releaseT * releaseT
      alpha = Math.max(1 - releaseT / 0.62, 0)
      size = p.size * (1 - releaseT * 0.3)
    } else {
      const gt = Math.min(Math.max((elapsed - p.delay) / p.dur, 0), 1)
      if (gt <= 0) continue
      const e = easeOutCubic(gt)
      x = p.sx + (p.tx - p.sx) * e + p.px * Math.sin(e * Math.PI) * p.curl
      y = p.sy + (p.ty - p.sy) * e + p.py * Math.sin(e * Math.PI) * p.curl
      alpha = Math.min(gt * 2, 1)
      // Schimmern, sobald angekommen
      if (gt >= 1 && elapsed > GATHER_END - 150) {
        size = p.size * (1 + 0.12 * Math.sin(elapsed / 130 + p.shimmer))
      }
    }

    if (alpha <= 0) continue
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.font = `600 ${size}px "IBM Plex Mono", ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.glyph, x, y)
  }
  ctx.globalAlpha = 1

  if (!wordmarkOn.value && elapsed > GATHER_END) wordmarkOn.value = true
  if (!leaving.value && elapsed > BLOOM_END) leaving.value = true

  if (elapsed < RELEASE_END + 200) {
    rafId = requestAnimationFrame(frame)
  } else {
    visible.value = false
  }
}

// Klick/Taste überspringt direkt zur Release-Phase
function skip() {
  const now = performance.now()
  if (now - t0 < BLOOM_END) t0 = now - BLOOM_END
}

function start() {
  const c = canvasEl.value
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = window.innerWidth
  H = window.innerHeight
  c.width = W * dpr
  c.height = H * dpr
  ctx = c.getContext('2d')
  ctx.scale(dpr, dpr)
  buildParticles()
  t0 = performance.now()
  rafId = requestAnimationFrame(frame)
  window.addEventListener('keydown', skip)
}

onMounted(() => {
  // App.vue rendert dieses Component nur einmal beim initialen Mount, nicht bei
  // jeder SPA-Navigation — läuft also einmal pro echtem Seitenaufruf.
  if (reduceMotion) {
    visible.value = false
    return
  }
  start()
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('keydown', skip)
})
</script>

<template>
  <div
    v-if="visible"
    class="intro-canvas-overlay"
    :class="{ leaving }"
    aria-hidden="true"
    @click="skip"
  >
    <canvas ref="canvasEl" class="intro-canvas"></canvas>
    <div class="intro-canvas-wordmark" :class="{ on: wordmarkOn }">
      <span>&#123;&#125;</span> code4trees
    </div>
  </div>
</template>
