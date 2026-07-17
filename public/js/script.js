const API_PATH = 'api/api.php'; // Define the API path as a constant
const LEADERBOARD_API_PATH = 'api/leaderboard.php';
// Hinweis: AUTH_API_PATH und SETUP_DATA_PATH werden hier nicht mehr gebraucht —
// der komplette Auth-/Modal-/Session-Teil lebt jetzt ausschließlich in js/auth.js.

document.addEventListener("DOMContentLoaded", () => {

  const FETCH_INTERVAL_MS = 10000; // Update counter every 10 seconds
  const RANDOM_ADD_INTERVAL_MS = 15000; // Attempt a random add every 15 seconds
  const LEADERBOARD_INTERVAL_MS = 30000; // Refresh leaderboard every 30 seconds

  const treeCountEl = document.getElementById('treeCount');
  let currentDisplayedCount = -1;
  let activeAnimationFrame = null;
  let liveDisplayedValue = 0;

  // Fixed Arrays for deterministic colors and heights
  const treeColors = ['#7FB069', '#A7C957', '#5E8B4C'];
  const heightOffsets = [5, 12, 2, 8, 14, 4, 10, 1, 7, 11, 3, 13, 6, 9, 0, 15];

  // --- 1. DYNAMIC GROWING FOREST LOGIC ---
  function updateForestVisuals(currentFloat, targetNum) {
      const forest = document.getElementById('forest');
      if (!forest) return;

      if (currentFloat === 0) {
          forest.innerHTML = '';
          window.currentMagnitudeStep = -1;
          return;
      }

      let step = 1;
      const breakpoints = [
          { limit: 20, step: 1 },        // 1 to 20 trees
          { limit: 100, step: 5 },       // 4 to 20 trees (1 SVG = 5)
          { limit: 200, step: 10 },      // 10 to 20 trees (1 SVG = 10)
          { limit: 1000, step: 50 },     // 4 to 20 trees (1 SVG = 50)
          { limit: 2000, step: 100 },    // 10 to 20 trees (1 SVG = 100)
          { limit: 10000, step: 500 },   // 4 to 20 trees (1 SVG = 500)
          { limit: 20000, step: 1000 },  // 10 to 20 trees (1 SVG = 1000)
          { limit: 100000, step: 5000 },
          { limit: 200000, step: 10000 },
          { limit: 1000000, step: 50000 },
          { limit: 2000000, step: 100000 }
      ];

      for (let bp of breakpoints) {
          if (targetNum <= bp.limit) {
              step = bp.step;
              break;
          }
      }

      if (targetNum > 2000000) {
          step = Math.pow(10, Math.floor(Math.log10(targetNum / 20)));
      }

      if (window.currentMagnitudeStep !== step) {
          forest.innerHTML = '';
          window.currentMagnitudeStep = step;
      }

      const fullTrees = Math.floor(currentFloat / step);
      const remainder = currentFloat % step;
      const fractionalScale = remainder / step;

      const totalNodesNeeded = remainder > 0 ? fullTrees + 1 : fullTrees;
      const existingNodes = forest.children;

      while (existingNodes.length < totalNodesNeeded) {
          const idx = existingNodes.length;
          const hOffset = heightOffsets[idx % heightOffsets.length];
          const color = treeColors[idx % treeColors.length];

          const treeHTML = `<div class="tree-wrapper" style="margin: 0 -4px; transform-origin: bottom center; transform: scaleY(0);">
            <svg width="24" height="${30 + hOffset}" viewBox="0 0 24 ${30 + hOffset}" xmlns="http://www.w3.org/2000/svg" class="tree-svg">
              <rect x="11" y="${18 + hOffset}" width="3" height="12" fill="#8A6F4D"/>
              <polygon points="12.5,0 24,${18 + hOffset} 1,${18 + hOffset}" fill="${color}"/>
            </svg>
          </div>`;

          forest.insertAdjacentHTML('beforeend', treeHTML);
      }

      while (existingNodes.length > totalNodesNeeded) {
          forest.removeChild(forest.lastChild);
      }

      for (let i = 0; i < existingNodes.length; i++) {
          if (i === existingNodes.length - 1 && remainder > 0) {
              const displayScale = Math.pow(fractionalScale, 0.3);
              existingNodes[i].style.transform = `scaleY(${displayScale})`;
          } else {
              existingNodes[i].style.transform = 'scaleY(1)';
          }
      }
  }

  // --- 2. ODOMETER ANIMATION FUNCTION ---
  function animateValue(obj, start, end) {
    if (!obj || start === end) return;

    if (activeAnimationFrame) {
      window.cancelAnimationFrame(activeAnimationFrame);
      activeAnimationFrame = null;
    }

    const diff = end - start;
    const duration = Math.min(Math.max(diff * 400, 500), 3000);

    let startTimestamp = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;

      const rawProgress = Math.min((timestamp - startTimestamp) / duration, 1);
      const progress = 1 - Math.pow(1 - rawProgress, 3);

      const currentNumFloat = progress * diff + start;
      const currentNumInt = Math.floor(currentNumFloat);

      obj.innerHTML = currentNumInt.toLocaleString('de-AT');
      liveDisplayedValue = currentNumInt;

      updateForestVisuals(currentNumFloat, end);

      if (rawProgress < 1) {
        activeAnimationFrame = window.requestAnimationFrame(step);
      } else {
        obj.innerHTML = end.toLocaleString('de-AT');
        liveDisplayedValue = end;
        updateForestVisuals(end, end);
        activeAnimationFrame = null;
      }
    };
    activeAnimationFrame = window.requestAnimationFrame(step);
  }

  // --- LIVE API CALL ---
  async function fetchLiveTreeCount() {
    try {
      const response = await fetch(API_PATH, { cache: 'no-store' });
      if (!response.ok) throw new Error('API down');

      const data = await response.json();
      const newCount = data.trees;

      if (currentDisplayedCount === -1) {
        currentDisplayedCount = 0;
        liveDisplayedValue = 0;
        animateValue(treeCountEl, 0, newCount);
        currentDisplayedCount = newCount;
      }
      else if (newCount > currentDisplayedCount) {
        animateValue(treeCountEl, liveDisplayedValue, newCount);
        currentDisplayedCount = newCount;
      }
    } catch (error) {
      console.error("API error", error);
    }
  }

  fetchLiveTreeCount();
  setInterval(fetchLiveTreeCount, FETCH_INTERVAL_MS);

  // --- RANDOM BACKGROUND INCREMENTS ---
  setInterval(async () => {
      if (Math.random() < 0.2) return;
      const randomTrees = Math.floor(Math.random() * 7) + 1;
      try {
          await fetch(`${API_PATH}?add=${randomTrees}`);
      } catch (e) {
          console.error("Random add failed", e);
      }
  }, RANDOM_ADD_INTERVAL_MS);

  // --- Floating Code Particles ---
  function generateAmbientCode() {
    const container = document.getElementById('floatingCodeContainer');
    if (!container) return;
    container.innerHTML = '';

    const symbols = ['{}', '</>', '[]', '()', '=>', '&&', '||', ';'];
    for (let i = 0; i < 15; i++) {
      const el = document.createElement('div');
      el.className = 'code-particle';
      el.innerText = symbols[Math.floor(Math.random() * symbols.length)];
      el.style.left = `${Math.random() * 100}vw`;
      el.style.animationDuration = `${10 + Math.random() * 20}s`;
      el.style.animationDelay = `${Math.random() * 10}s`;
      el.style.fontSize = `${1 + Math.random() * 1.5}rem`;
      container.appendChild(el);
    }
  }
  window.addEventListener('pageshow', generateAmbientCode);

  // --- Typewriter Effect für H1 ---
  function typeWriter() {
    const h1 = document.getElementById('typewriter');
    if (!h1) return;

    const text = "Lade dein Zip hoch.<br>Lass <em>Bäume</em> wachsen.";
    let i = 0;
    let isTag = false;
    let textBuffer = "";

    function type() {
      if (i < text.length) {
        const char = text.charAt(i);
        textBuffer += char;
        if (char === '<') isTag = true;
        if (char === '>') isTag = false;

        h1.innerHTML = textBuffer + (i < text.length - 1 ? '<span class="cursor">_</span>' : '');
        i++;
        setTimeout(type, isTag ? 0 : 50 + Math.random() * 50);
      } else {
        h1.innerHTML = textBuffer;
      }
    }
    setTimeout(type, 500);
  }

  // --- Dropzone Logic ---
  const dz = document.getElementById('dropzone');
  const fileInput = document.getElementById('zipfile');
  const chosen = document.getElementById('fileChosen');
  const sproutIcon = dz ? dz.querySelector('.sprout') : null;

  if (dz && fileInput && chosen) {
    dz.addEventListener('click', (e) => {
      if (e.target !== fileInput) fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) showFile(e.target.files[0]);
    });
  }

  function showFile(file){
    if(!file) return;
    if(!file.name.toLowerCase().endsWith('.zip')){
      chosen.style.display = 'block';
      chosen.style.color = 'var(--sun)';
      chosen.textContent = '⚠️ Bitte wähle eine .zip-Datei.';
      fileInput.value = '';
      return;
    }

    chosen.style.display = 'block';
    chosen.style.color = 'var(--paper-dim)';
    chosen.textContent = 'Analysiere Archiv-Inhalt...';

    const reader = new FileReader();
    reader.onload = function(event) {
      const arrayBuffer = event.target.result;
      JSZip.loadAsync(arrayBuffer).then(zip => {
        const fileNames = Object.keys(zip.files);
        if (fileNames.length === 0) {
          chosen.style.color = 'var(--sun)';
          chosen.textContent = '⚠️ Das Zip-Archiv ist leer!';
          fileInput.value = '';
          return;
        }

        const hasValidProjectFile = fileNames.some(name => {
          const isDir = zip.files[name].dir;
          if (isDir) return false;
          const lowerName = name.toLowerCase();
          return lowerName.endsWith('readme.md') || lowerName.endsWith('.js') ||
                 lowerName.endsWith('.py') || lowerName.endsWith('.html') ||
                 lowerName.endsWith('.css') || lowerName.endsWith('.java') ||
                 lowerName.endsWith('.cpp') || lowerName.endsWith('.c') ||
                 lowerName.endsWith('.cs') || lowerName.endsWith('.json');
        });

        if (!hasValidProjectFile) {
          chosen.style.color = 'var(--sun)';
          chosen.textContent = '⚠️ Kein gültiges Projekt!';
          fileInput.value = '';
          dz.style.borderColor = 'var(--sun)';
          return;
        }

        chosen.style.color = 'var(--leaf)';
        chosen.textContent = '✓ ' + file.name + ' Bereit zum Pflanzen!';
        if (sproutIcon) sproutIcon.textContent = '📦';
        dz.style.borderColor = 'var(--leaf)';
      }).catch(err => {
        chosen.style.color = 'var(--sun)';
        chosen.textContent = '⚠️ Fehler beim Lesen des Zips.';
        fileInput.value = '';
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // --- 5. Submit & Backend Call Fix ---
  const form = document.getElementById('submitForm');
  const submitBtn = document.getElementById('submitCodeBtn');
  const reviewConsole = document.getElementById('reviewConsole');
  const successState = document.getElementById('successState');
  const treeIdValue = document.getElementById('treeIdValue');
  const copyTreeIdBtn = document.getElementById('copyTreeIdBtn');

  function fireTreeConfetti() {
    const duration = 2500;
    const end = Date.now() + duration;
    function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#7FB069', '#A7C957', '#E8C547'] });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#7FB069', '#A7C957', '#E8C547'] });
        if (Date.now() < end) requestAnimationFrame(frame);
    }
    frame();
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if(!form.checkValidity()){ form.reportValidity(); return; }
      if(!fileInput.files.length){ return; }

      const icon = submitBtn.querySelector('.btn-icon');
      const text = submitBtn.querySelector('.btn-text');

      submitBtn.disabled = true;
      submitBtn.classList.add('is-watering');
      if (icon) icon.textContent = "💧";
      if (text) text.textContent = "Lade Archiv hoch und prüfe...";

      if (reviewConsole) {
        reviewConsole.style.display = "block";
        reviewConsole.innerHTML = `<p class="sys">> Sende Daten an Backend...</p>`;
      }
      if (successState) successState.style.display = "none";

      const formData = new FormData(form);

      try {
        const response = await fetch(API_PATH, { method: 'POST', body: formData });
        const data = await response.json();

        if (data.status === 'success' || data.success) {
          if (reviewConsole) reviewConsole.innerHTML += `<br><p class="success-text">> [OK] ${data.message}</p>`;

          submitBtn.classList.remove('is-watering');
          submitBtn.classList.add('is-grown');
          if (icon) icon.textContent = "🌳";
          if (text) text.textContent = "Baum erfolgreich gepflanzt!";

          fireTreeConfetti();

          if (data.newCount > currentDisplayedCount) {
              animateValue(treeCountEl, liveDisplayedValue, data.newCount);
              currentDisplayedCount = data.newCount;
          }

          // Zuweisung der echten UUID aus der API-Response
          const serverTreeId = data.treeId || "TREE-UNKNOWN";
          if (treeIdValue) treeIdValue.textContent = serverTreeId;
          if (successState) successState.style.display = "block";

          fileInput.disabled = true;
          if (document.getElementById('name')) document.getElementById('name').disabled = true;
          if (document.getElementById('project')) document.getElementById('project').disabled = true;

        } else {
          if (reviewConsole) reviewConsole.innerHTML += `<br><p class="sys" style="color: #FF5F56;">> [ERROR] ${data.message}</p>`;
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-watering');
          if (icon) icon.textContent = "🌱";
          if (text) text.textContent = "Erneut versuchen";
        }
      } catch (err) {
        console.error(err);
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-watering');
      }
    });
  }

  // --- Clipboard Copy ---
  if (copyTreeIdBtn) {
    copyTreeIdBtn.addEventListener('click', () => {
      const idText = treeIdValue ? treeIdValue.textContent : '';
      if (idText && navigator.clipboard) {
        navigator.clipboard.writeText(idText).then(() => {
          copyTreeIdBtn.querySelector('.copy-text').textContent = 'Kopiert!';
          setTimeout(() => { copyTreeIdBtn.querySelector('.copy-text').textContent = 'Kopieren'; }, 2000);
        });
      }
    });
  }

  // --- 6. Automated PDF Certificate Generation Fix ---
  const downloadCertBtn = document.getElementById('downloadCertBtn');

  if(downloadCertBtn){
    downloadCertBtn.addEventListener('click', () => {
      const name = document.getElementById('name').value || "Developer";
      const project = document.getElementById('project').value || "Code Project";
      const id = document.getElementById('treeIdValue').textContent;

      window.open(
        `api/certificate.php?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}&project=${encodeURIComponent(project)}`,
        '_blank'
      );
    });
  }

  // Hinweis: Der komplette Auth-Teil (Modal öffnen/schließen, Login/Register-
  // Submit, Session-Check, Uni/Fakultät-Dropdowns) wurde hier entfernt und lebt
  // jetzt ausschließlich in js/auth.js — so gibt es keine doppelten Event-
  // Listener mehr auf #authNavBtn, #registerForm, #loginForm etc.

  // =====================================================================
  // --- LIVE-LEADERBOARD ("Der Semester-Fight")
  // =====================================================================

  const leaderboardListEl = document.getElementById('leaderboardList');

  function renderLeaderboard(entries) {
    if (!leaderboardListEl) return;

    if (!entries || entries.length === 0) {
      leaderboardListEl.innerHTML = '<li class="leaderboard-empty">Noch keine Daten verfügbar.</li>';
      return;
    }

    leaderboardListEl.innerHTML = entries.map((entry, index) => {
      const rank = index + 1;
      const uniName = entry.university_name || entry.name || 'Unbekannte Uni';
      const treeCount = Number(entry.trees ?? entry.tree_count ?? 0).toLocaleString('de-AT');

      let medal = '';
      if (rank === 1) medal = '🥇';
      else if (rank === 2) medal = '🥈';
      else if (rank === 3) medal = '🥉';

      return `
        <li class="leaderboard-row">
          <span class="lb-rank">${medal || `#${rank}`}</span>
          <span class="lb-name">${uniName}</span>
          <span class="lb-count">${treeCount} 🌳</span>
        </li>
      `;
    }).join('');
  }

  async function fetchLeaderboard() {
    if (!leaderboardListEl) return; // Sektion existiert (noch) nicht im DOM

    try {
      const response = await fetch(LEADERBOARD_API_PATH, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const entries = data.leaderboard || data.universities || [];
      renderLeaderboard(entries);
    } catch (error) {
      console.error('Leaderboard-Fehler:', error);
      leaderboardListEl.innerHTML = '<li class="leaderboard-empty">Leaderboard momentan nicht verfügbar.</li>';
    }
  }

  fetchLeaderboard();
  setInterval(fetchLeaderboard, LEADERBOARD_INTERVAL_MS);

  typeWriter();
});