<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import TypewriterHeading from '../components/TypewriterHeading.vue'
import TreeCounter from '../components/TreeCounter.vue'
import SubmitForm from '../components/SubmitForm.vue'

// --- Live-Feed: rotiert dieselbe Art von Ambient-Einträgen wie bisher, ---
// --- nur dass alle paar Sekunden ein neuer oben hereinrutscht.         ---
const FEED_POOL = [
  { user: 'usr_091', msg: 'Python-Skript validiert' },
  { user: 'usr_442', msg: 'Portfolio-Website hochgeladen' },
  { user: 'usr_881', msg: 'Uni-Abgabe JS eingereicht' },
  { user: 'usr_012', msg: 'React-App geprüft' },
  { user: 'usr_307', msg: 'Java-Projekt verifiziert' },
  { user: 'usr_558', msg: 'C++ Aufgabe hochgeladen' },
  { user: 'usr_764', msg: 'HTML-Portfolio validiert' },
  { user: 'usr_129', msg: 'SQL-Übung eingereicht' },
]
const TIME_LABELS = ['gerade eben', 'vor 2 Min', 'vor 14 Min', 'vor 1 Std']
const FEED_INTERVAL_MS = 6000

let nextId = 4
let poolIndex = 4
let feedInterval = null

const feed = ref(FEED_POOL.slice(0, 4).map((e, i) => ({ ...e, id: i })))

function rotateFeed() {
  if (document.hidden) return
  const entry = FEED_POOL[poolIndex % FEED_POOL.length]
  poolIndex++
  feed.value = [{ ...entry, id: nextId++ }, ...feed.value.slice(0, 3)]
}

onMounted(() => {
  feedInterval = setInterval(rotateFeed, FEED_INTERVAL_MS)
})

onBeforeUnmount(() => {
  clearInterval(feedInterval)
})
</script>

<template>
  <main>
    <div class="hero">
      <div class="hero-content">
        <div class="eyebrow">// Coding meets Green Tech</div>
        <TypewriterHeading />
        <p class="lead">Reiche dein fertiges Code-Projekt als Zip ein, erhalte sofortiges Feedback von unserer KI und baue deinen digitalen Wald auf. Für jedes Projekt pflanzen wir einen echten Baum.</p>
        <div class="btn-wrapper">
          <a class="btn btn-primary" href="#einreichen">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4m4 4l-4-4"></path></svg>
            Zip hochladen
          </a>
          <a class="btn btn-ghost" href="#ablauf">Wie funktioniert das?</a>
        </div>
      </div>

      <div class="log-wrapper">
        <div class="log" aria-label="Live-Aktivität">
          <div class="log-bar"><span></span><span></span><span></span><em>live-feed — campus</em></div>
          <div class="log-body">
            <TransitionGroup name="feed">
              <div v-for="(e, i) in feed" :key="e.id">
                <span class="hash">{{ e.user }}</span> <span class="tree">🌱</span> <span class="msg">{{ e.msg }}</span> <span class="time">{{ TIME_LABELS[i] }}</span>
              </div>
            </TransitionGroup>
            <div><span class="cursor">_</span></div>
          </div>
        </div>
      </div>
    </div>

    <TreeCounter />

    <section id="ablauf">
      <h2 v-reveal>Lernen mit gutem Gewissen</h2>
      <p class="section-intro" v-reveal="80">Unser Ziel: Deine digitale Bildung fördern und gleichzeitig der Umwelt helfen. Keine strengen Professoren, sondern smarte KI-Unterstützung für dein Projekt.</p>
      <div class="steps">
        <div class="step" v-reveal="140">
          <span class="tag">01 / Packen</span>
          <h3>Code zippen</h3>
          <p>Egal ob Uni-Hausübung, Side-Project oder Hackathon. Packe deinen Ordner in ein .zip-Archiv.</p>
        </div>
        <div class="step" v-reveal="260">
          <span class="tag">02 / Scan</span>
          <h3>Projekt prüfen</h3>
          <p>Lade die Zip-Datei hoch. Unser KI-System scannt die Dateistruktur, gibt Feedback und verifiziert das Projekt.</p>
        </div>
        <div class="step" v-reveal="380">
          <span class="tag">03 / Impact</span>
          <h3>Wald aufforsten</h3>
          <p>War das Projekt valide? Super! Dein Erfolg triggert unsere API und wir finanzieren die Pflanzung eines echten Baumes.</p>
        </div>
      </div>
    </section>

    <SubmitForm />
  </main>
</template>
