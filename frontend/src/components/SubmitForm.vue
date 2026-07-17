<script setup>
import { ref, reactive } from 'vue'
import JSZip from 'jszip'
import confetti from 'canvas-confetti'
import { useTrees } from '../composables/useTrees'

const { API_BASE, setCount } = useTrees()

// --- Form State ---
const name = ref('')
const project = ref('')
const fileInput = ref(null)
const dropzoneEl = ref(null)
const formEl = ref(null)

const locked = ref(false)          // Felder nach Erfolg sperren
const submitting = ref(false)
const grown = ref(false)
const sproutIcon = ref('📁')
const btnIcon = ref('🌱')
const btnText = ref('Projekt-Archiv als Samen pflanzen')

const chosen = reactive({ visible: false, color: 'var(--paper-dim)', background: '', text: '' })
const consoleLines = ref([])       // { html, cls }
const consoleVisible = ref(false)

const successVisible = ref(false)
const treeId = ref('TREE-XXXXX')
const copied = ref(false)

// --- Dropzone / Zip-Validierung (Client-side Check, 1:1 portiert) ---
function openFilePicker(e) {
  if (locked.value) return
  if (e.target !== fileInput.value) fileInput.value.click()
}

function onFileChange(e) {
  if (e.target.files.length > 0) showFile(e.target.files[0])
}

function showFile(file) {
  if (!file) return

  // 1. Einfacher Extension-Check
  if (!file.name.toLowerCase().endsWith('.zip')) {
    Object.assign(chosen, { visible: true, color: 'var(--sun)', text: '⚠️ Bitte wähle eine .zip-Datei.' })
    fileInput.value.value = ''
    return
  }

  // 2. Inhalt der Zip-Datei prüfen
  Object.assign(chosen, { visible: true, color: 'var(--paper-dim)', text: 'Analysiere Archiv-Inhalt...' })

  const reader = new FileReader()
  reader.onload = (event) => {
    JSZip.loadAsync(event.target.result).then(zip => {
      const fileNames = Object.keys(zip.files)

      if (fileNames.length === 0) {
        Object.assign(chosen, { color: 'var(--sun)', text: '⚠️ Das Zip-Archiv ist leer!' })
        fileInput.value.value = ''
        return
      }

      // Mindestens eine typische Projektdatei (Ordner ausschließen)
      const hasValidProjectFile = fileNames.some(n => {
        if (zip.files[n].dir) return false
        const lowerName = n.toLowerCase()
        return lowerName.endsWith('readme.md') ||
               lowerName.endsWith('.js') ||
               lowerName.endsWith('.py') ||
               lowerName.endsWith('.html') ||
               lowerName.endsWith('.css') ||
               lowerName.endsWith('.java') ||
               lowerName.endsWith('.cpp') ||
               lowerName.endsWith('.c') ||
               lowerName.endsWith('.cs') ||
               lowerName.endsWith('.json')
      })

      if (!hasValidProjectFile) {
        Object.assign(chosen, {
          color: 'var(--sun)',
          text: '⚠️ Kein gültiges Projekt! Das Zip muss mindestens eine Projektdatei enthalten (z. B. README.md, .js, .py, .html, .java).'
        })
        fileInput.value.value = ''
        if (dropzoneEl.value) dropzoneEl.value.style.borderColor = 'var(--sun)'
        return
      }

      // Alles passt!
      Object.assign(chosen, {
        color: 'var(--leaf)',
        text: '✓ ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB) — Bereit zum Pflanzen!'
      })
      sproutIcon.value = '📦'
      if (dropzoneEl.value) dropzoneEl.value.style.borderColor = 'var(--leaf)'
    }).catch(err => {
      console.error('Zip-Parsing Fehler:', err)
      Object.assign(chosen, { color: 'var(--sun)', text: '⚠️ Die Zip-Datei konnte nicht gelesen werden (eventuell beschädigt).' })
      fileInput.value.value = ''
    })
  }
  reader.readAsArrayBuffer(file)
}

// --- Konfetti ---
function fireTreeConfetti() {
  const duration = 2500
  const end = Date.now() + duration

  function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#7FB069', '#A7C957', '#E8C547'] })
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#7FB069', '#A7C957', '#E8C547'] })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

// --- Tree-ID Fallback (falls Backend keine liefert) ---
function generateTreeId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `TREE-${timestamp}-${random}`.toUpperCase()
}

// --- Copy to Clipboard ---
async function copyTreeId() {
  try {
    await navigator.clipboard.writeText(treeId.value)
  } catch {
    // Fallback für ältere Browser
    const ta = document.createElement('textarea')
    ta.value = treeId.value
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } catch (err) { console.error('Fallback copy failed', err) }
    document.body.removeChild(ta)
  }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// --- Submit & Backend Call ---
function log(html, cls = 'sys') {
  consoleLines.value.push({ html, cls })
}

async function onSubmit() {
  if (!formEl.value.checkValidity()) {
    formEl.value.reportValidity()
    return
  }
  if (!fileInput.value.files.length) {
    Object.assign(chosen, {
      visible: true,
      color: 'var(--sun)',
      background: 'rgba(232, 197, 71, 0.1)',
      text: '⚠️ Bitte ziehe zuerst dein Projekt-Zip in die Box!'
    })
    return
  }

  // Button sofort sperren, um Mehrfach-Klicks zu verhindern
  submitting.value = true
  btnIcon.value = '💧'
  btnText.value = 'Lade Archiv hoch und prüfe...'

  consoleVisible.value = true
  consoleLines.value = []
  log('> Sende Daten an Backend...')

  successVisible.value = false

  const formData = new FormData()
  formData.append('name', name.value)
  formData.append('project', project.value)
  formData.append('zipfile', fileInput.value.files[0])

  try {
    const response = await fetch(`${API_BASE}/submit`, { method: 'POST', body: formData })
    const data = await response.json()

    if (data.status === 'success') {
      log(`> [OK] ${data.message}`, 'success-text')

      grown.value = true
      btnIcon.value = '🌳'
      btnText.value = 'Baum erfolgreich gepflanzt!'

      fireTreeConfetti()

      // Zähler-Animation für den manuellen Upload triggern
      if (typeof data.newCount === 'number') setCount(data.newCount)

      // Tree-ID anzeigen (vom Backend, sonst clientseitig generieren)
      treeId.value = data.treeId || generateTreeId()
      successVisible.value = true

      // Eingabefelder bei Erfolg sperren
      locked.value = true
    } else {
      log(`> [ERROR] ${data.message}`, 'sys error-text')
      // Bei Fehler: reaktivieren für neuen Versuch
      submitting.value = false
      btnIcon.value = '🌱'
      btnText.value = 'Erneut versuchen'
    }
  } catch (err) {
    log('> [ERROR] Verbindung zum Server fehlgeschlagen.', 'sys error-text')
    submitting.value = false
    btnIcon.value = '🌱'
    btnText.value = 'Erneut versuchen'
  }
}
</script>

<template>
  <section id="einreichen">
    <h2>Projekt einreichen</h2>
    <p class="section-intro">Zieh dein fertiges <strong>.zip Archiv</strong> einfach in die Box. Sobald die KI dein Projekt validiert hat, wächst dein Baum!</p>

    <form class="form-card" ref="formEl" novalidate @submit.prevent="onSubmit">

      <div v-show="successVisible" style="margin-bottom: 20px; padding: 20px; background: rgba(127, 176, 105, 0.15); border: 1px solid var(--leaf); border-radius: 8px;">
        <h3 style="color: var(--leaf); margin-top: 0;">🎉 Baum erfolgreich gepflanzt!</h3>
        <p>Dein Projekt wurde verifiziert. Hier ist deine einzigartige Baum-ID:</p>

        <div style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px; font-family: var(--mono); margin: 15px 0;">
          <span style="font-weight: bold; color: #FFF;">{{ treeId }}</span>

          <button type="button" class="btn-ghost" :class="{ copied }" style="padding: 4px 8px; font-size: 0.8rem; display: flex; align-items: center; gap: 5px; cursor: pointer;" @click="copyTreeId">
            <span class="copy-icon">{{ copied ? '✓' : '📋' }}</span>
            <span class="copy-text">{{ copied ? 'Kopiert!' : 'Kopieren' }}</span>
          </button>
        </div>

        <p style="font-size: 0.9rem; margin-bottom: 0;">Teile diese ID in den sozialen Medien, um deinen Beitrag zum Klimaschutz zu zeigen!</p>
      </div>

      <div class="form-grid">
        <div class="field">
          <label for="name">Dein Vorname (oder Nickname)</label>
          <input type="text" id="name" name="name" v-model="name" required placeholder="z.B. Alex" :disabled="locked">
        </div>
        <div class="field">
          <label for="project">Projektname</label>
          <input type="text" id="project" name="project" v-model="project" required placeholder="z.B. Wetter-App" :disabled="locked">
        </div>

        <div class="field dropzone-container">
          <div class="dropzone" ref="dropzoneEl" role="button" tabindex="0" @click="openFilePicker" @keydown.enter.prevent="openFilePicker" @keydown.space.prevent="openFilePicker">
            <span class="sprout" aria-hidden="true">{{ sproutIcon }}</span>
            <strong>Zip hierher ziehen oder klicken</strong>
            <small>Max. 50 MB (z.B. Python, Web, Java...)</small>
            <input type="file" ref="fileInput" id="zipfile" name="zipfile" accept=".zip,application/zip" required :disabled="locked" @change="onFileChange">
            <div class="file-chosen" v-show="chosen.visible" :style="{ display: 'block', color: chosen.color, background: chosen.background }">{{ chosen.text }}</div>
          </div>
        </div>
      </div>

      <div class="review-console" v-show="consoleVisible" style="display: block;">
        <p v-for="(line, i) in consoleLines" :key="i" :class="line.cls" v-html="line.html"></p>
      </div>

      <!-- Gamified Submit Button -->
      <button type="submit" class="gamified-btn" :class="{ 'is-watering': submitting && !grown, 'is-grown': grown }" :disabled="submitting">
        <div class="btn-bg"></div>
        <span class="btn-icon">{{ btnIcon }}</span>
        <span class="btn-text">{{ btnText }}</span>
      </button>

    </form>
  </section>
</template>
