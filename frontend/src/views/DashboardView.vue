<script setup>
import TypewriterHeading from '../components/TypewriterHeading.vue'
import TreeCounter from '../components/TreeCounter.vue'
import SubmitForm from '../components/SubmitForm.vue'
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
            <div><span class="hash">usr_091</span> <span class="tree">🌱</span> <span class="msg">Python-Skript validiert</span> <span class="time">gerade eben</span></div>
            <div><span class="hash">usr_442</span> <span class="tree">🌱</span> <span class="msg">Portfolio-Website hochgeladen</span> <span class="time">vor 2 Min</span></div>
            <div><span class="hash">usr_881</span> <span class="tree">🌱</span> <span class="msg">Uni-Abgabe JS eingereicht</span> <span class="time">vor 14 Min</span></div>
            <div><span class="hash">usr_012</span> <span class="tree">🌱</span> <span class="msg">React-App geprüft</span> <span class="time">vor 1 Std</span></div>
            <div><span class="cursor">_</span></div>
          </div>
        </div>
      </div>
    </div>

    <TreeCounter />

    <section id="ablauf">
      <h2>Lernen mit gutem Gewissen</h2>
      <p class="section-intro">Unser Ziel: Deine digitale Bildung fördern und gleichzeitig der Umwelt helfen. Keine strengen Professoren, sondern smarte KI-Unterstützung für dein Projekt.</p>
      <div class="steps">
        <div class="step">
          <span class="tag">01 / Packen</span>
          <h3>Code zippen</h3>
          <p>Egal ob Uni-Hausübung, Side-Project oder Hackathon. Packe deinen Ordner in ein .zip-Archiv.</p>
        </div>
        <div class="step">
          <span class="tag">02 / Scan</span>
          <h3>Projekt prüfen</h3>
          <p>Lade die Zip-Datei hoch. Unser KI-System scannt die Dateistruktur, gibt Feedback und verifiziert das Projekt.</p>
        </div>
        <div class="step">
          <span class="tag">03 / Impact</span>
          <h3>Wald aufforsten</h3>
          <p>War das Projekt valide? Super! Dein Erfolg triggert unsere API und wir finanzieren die Pflanzung eines echten Baumes.</p>
        </div>
      </div>
    </section>

    <SubmitForm />
  </main>
</template>
