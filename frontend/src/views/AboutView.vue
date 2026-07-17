<template>
  <main>
    <section id="about-intro">
      <span class="tag" style="display: block; text-align: center; margin-bottom: 16px;">// Project Deep-Dive</span>
      <h2>Über code4trees</h2>
      <p class="section-intro">
        code4trees ist ein Studierendenprojekt: Für jedes eingereichte Code-Projekt pflanzen wir
        einen echten Baum. Diese Seite erklärt, warum wir das machen, wie die Seite technisch
        aufgebaut ist und welche Probleme wir unterwegs lösen mussten.
      </p>
    </section>

    <section id="about-why">
      <h2>Warum code4trees?</h2>
      <p class="section-intro">
        Viele Studierende schreiben jede Woche Code für Übungen, Uni-Projekte oder eigene Ideen —
        der landet danach meist ungesehen in einem Ordner. code4trees gibt diesem Code einen
        greifbaren Zweck: Reich dein Projekt als Zip ein, lass es automatisch validieren, und wir
        finanzieren dafür die Pflanzung eines echten Baumes. Lernen und Klimaschutz in einer
        Aktion — ohne strenge Bewertung, nur ein einfacher Check, ob dein Projekt echt ist.
      </p>
    </section>

    <section id="about-stack">
      <h2>Tech-Stack</h2>
      <p class="section-intro">Die Seite wurde von einer statischen HTML/PHP-Version auf ein modernes Frontend/Backend-Setup umgebaut.</p>
      <div class="steps">
        <div class="step">
          <span class="tag">Frontend</span>
          <h3>Vue 3 + Vite</h3>
          <p>Single-Page-App mit Vue Router (Dashboard &amp; Code-Arena). Die Styles wurden 1:1 aus der alten statischen Version übernommen, die Struktur in wiederverwendbare Komponenten aufgeteilt.</p>
        </div>
        <div class="step">
          <span class="tag">Backend</span>
          <h3>Python + FastAPI</h3>
          <p>Ersetzt das ursprüngliche <code>api.php</code>. Verwaltet den Baumzähler, validiert hochgeladene Zip-Archive serverseitig und limitiert Schreibzugriffe pro IP.</p>
        </div>
        <div class="step">
          <span class="tag">Deployment</span>
          <h3>GitHub Actions</h3>
          <p>Das Frontend wird bei jedem Push automatisch gebaut und per SFTP auf den IONOS-Webspace deployed. Das Backend läuft unabhängig davon auf einem eigenen Server.</p>
        </div>
      </div>
    </section>

    <section id="about-challenges">
      <h2>Herausforderungen</h2>
      <p class="section-intro">Ein paar Dinge, an denen wir unterwegs länger gesessen sind als geplant.</p>
      <div class="steps">
        <div class="step">
          <span class="tag">Migration</span>
          <h3>Von PHP zu FastAPI</h3>
          <p>Zähler, Rate-Limiting und die Zip-Validierung mussten 1:1 von <code>api.php</code> nach Python portiert werden, ohne dass sich am Verhalten für Nutzer:innen etwas ändert.</p>
        </div>
        <div class="step">
          <span class="tag">Ehrliche Zahlen</span>
          <h3>Ghost-Traffic unter Kontrolle</h3>
          <p>Ein Hintergrund-Task simuliert Live-Aktivität, damit der Zähler nicht still steht. Während der Pilotphase begrenzen wir diesen simulierten Anteil bewusst, damit die Zahl nicht schneller wächst als reale Einreichungen.</p>
        </div>
        <div class="step">
          <span class="tag">Deep-Links</span>
          <h3>SPA-Routing auf Shared Hosting</h3>
          <p>Damit Links wie <code>/arena</code> auf dem IONOS-Webspace direkt funktionieren (statt nur über die Startseite), rewritet eine <code>.htaccess</code>-Regel alle unbekannten Pfade auf <code>index.html</code>, wo Vue Router übernimmt.</p>
        </div>
      </div>
    </section>
  </main>
</template>
