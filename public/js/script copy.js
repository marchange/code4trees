const API_PATH = 'api/api.php'; // Define the API path as a constant

document.addEventListener("DOMContentLoaded", () => {

  const FETCH_INTERVAL_MS = 10000; // Update counter every 10 seconds
  const RANDOM_ADD_INTERVAL_MS = 15000; // Attempt a random add every 15 seconds

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

      //Custom breakpoints so that the number of trees scales nicely with the total count
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
      
      // Fallback just in case the app goes incredibly viral
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
            // Stretch the wrapper vertically
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
      const progress = 1 - Math.pow(1 - rawProgress, 3); // Cubic ease-out
      
      // 1. Calculate the exact FLOAT number for buttery smooth graphics
      const currentNumFloat = progress * diff + start;
      
      // 2. Calculate the INTEGER for the text display
      const currentNumInt = Math.floor(currentNumFloat);
      
      obj.innerHTML = currentNumInt.toLocaleString('de-AT');
      liveDisplayedValue = currentNumInt;
      
      // 3. Update graphics using the precise float!
      updateForestVisuals(currentNumFloat, end);
      
      if (rawProgress < 1) {
        activeAnimationFrame = window.requestAnimationFrame(step);
      } else {
        // Snap everything cleanly to the exact end value on the last frame
        obj.innerHTML = end.toLocaleString('de-AT'); 
        liveDisplayedValue = end;
        updateForestVisuals(end, end); 
        activeAnimationFrame = null;
      }
    };
    activeAnimationFrame = window.requestAnimationFrame(step);
  }

  // --- LIVE API CALL: Fetch and Animate ---
  async function fetchLiveTreeCount() {
    try {
      const response = await fetch(API_PATH, { cache: 'no-store' });
      if (!response.ok) throw new Error('API down');
      
      const data = await response.json();
      const newCount = data.trees;

      // If it's the first time loading the page, roll up from 0
      if (currentDisplayedCount === -1) {
        currentDisplayedCount = 0;
        liveDisplayedValue = 0;
        animateValue(treeCountEl, 0, newCount);
        currentDisplayedCount = newCount;
      } 
      // If the number grew, animate it
      else if (newCount > currentDisplayedCount) {
        animateValue(treeCountEl, liveDisplayedValue, newCount);
        currentDisplayedCount = newCount;
      }
    } catch (error) {
      console.error("API error", error);
    }
  }

  // Fire immediately on load, then loop
  fetchLiveTreeCount();
  setInterval(fetchLiveTreeCount, FETCH_INTERVAL_MS);

  // --- RANDOM BACKGROUND INCREMENTS ---
  setInterval(async () => {
      // 20% chance to skip adding, makes it feel more organic and random
      if (Math.random() < 0.2) return; 

      // Add between 1 and 7 trees randomly
      const randomTrees = Math.floor(Math.random() * 7) + 1; 

      try {
          await fetch(`${API_PATH}?add=${randomTrees}`);
      } catch (e) {
          console.error("Random add failed", e);
      }
  }, RANDOM_ADD_INTERVAL_MS);

  // --- 1. Ambient Floating Code Particles ---
  function generateAmbientCode() {
    const container = document.getElementById('floatingCodeContainer');
    if (!container) return; // Safety check

    // Clear existing particles so they don't double up or freeze on back navigation
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

  // Bind to pageshow so it fires even when returning via the back button
  window.addEventListener('pageshow', generateAmbientCode);

  // --- 2. Typewriter Effect für H1 ---
  function typeWriter() {
    const h1 = document.getElementById('typewriter');
    if (!h1) return; // Safety check
    
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

  // --- 4. Huge Dropzone Logic (Safe) ---
  const dz = document.getElementById('dropzone');
  const fileInput = document.getElementById('zipfile');
  const chosen = document.getElementById('fileChosen');
  const sproutIcon = dz ? dz.querySelector('.sprout') : null;

  if (!dz || !fileInput || !chosen) {
    console.error("Dropzone-Elemente im DOM nicht gefunden.");
  } else {
    dz.addEventListener('click', (e) => {
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        showFile(e.target.files[0]);
      }
    });
  }

  function showFile(file){
    if(!file) return;
    
    // 1. Einfacher Extension-Check
    if(!file.name.toLowerCase().endsWith('.zip')){
      chosen.style.display = 'block';
      chosen.style.color = 'var(--sun)';
      chosen.textContent = '⚠️ Bitte wähle eine .zip-Datei.';
      fileInput.value = '';
      return;
    }
    
    // 2. Inhalt der Zip-Datei prüfen (Client-side Check)
    chosen.style.display = 'block';
    chosen.style.color = 'var(--paper-dim)';
    chosen.textContent = 'Analysiere Archiv-Inhalt...';

    const reader = new FileReader();
    reader.onload = function(event) {
      const arrayBuffer = event.target.result;
      
      JSZip.loadAsync(arrayBuffer).then(zip => {
        const fileNames = Object.keys(zip.files);
        
        // Prüfen, ob das Zip komplett leer ist
        if (fileNames.length === 0) {
          chosen.style.color = 'var(--sun)';
          chosen.textContent = '⚠️ Das Zip-Archiv ist leer!';
          fileInput.value = '';
          return;
        }

        // Prüfen, ob mindestens eine typische Projektdatei im Zip liegt (Ordner ausschließen)
        const hasValidProjectFile = fileNames.some(name => {
          const isDir = zip.files[name].dir;
          if (isDir) return false;

          const lowerName = name.toLowerCase();
          return lowerName.endsWith('readme.md') ||
                 lowerName.endsWith('.js') ||
                 lowerName.endsWith('.py') ||
                 lowerName.endsWith('.html') ||
                 lowerName.endsWith('.css') ||
                 lowerName.endsWith('.java') ||
                 lowerName.endsWith('.cpp') ||
                 lowerName.endsWith('.c') ||
                 lowerName.endsWith('.cs') ||
                 lowerName.endsWith('.json');
        });

        if (!hasValidProjectFile) {
          chosen.style.color = 'var(--sun)';
          chosen.textContent = '⚠️ Kein gültiges Projekt! Das Zip muss mindestens eine Projektdatei enthalten (z. B. README.md, .js, .py, .html, .java).';
          fileInput.value = ''; // Input zurücksetzen
          dz.style.borderColor = 'var(--sun)';
          return;
        }

        // Wenn alles passt: Erfolgreich anzeigen!
        chosen.style.color = 'var(--leaf)';
        chosen.textContent = '✓ ' + file.name + ' (' + (file.size/1024/1024).toFixed(1) + ' MB) — Bereit zum Pflanzen!';
        if (sproutIcon) sproutIcon.textContent = '📦';
        dz.style.borderColor = 'var(--leaf)';

      }).catch(err => {
        console.error("Zip-Parsing Fehler:", err);
        chosen.style.color = 'var(--sun)';
        chosen.textContent = '⚠️ Die Zip-Datei konnte nicht gelesen werden (eventuell beschädigt).';
        fileInput.value = '';
      });
    };

    reader.readAsArrayBuffer(file);
  }

  // --- 5. Gamifizierter Submit & Backend Call ---
  const form = document.getElementById('submitForm');
  const submitBtn = document.getElementById('submitCodeBtn');
  const reviewConsole = document.getElementById('reviewConsole');
  
  // Da "successState" und "treeIdValue" mehrfach im HTML vergeben sind, selektieren wir hier alle Vorkommen
  const successStates = document.querySelectorAll('#successState');
  const treeIdValues = document.querySelectorAll('#treeIdValue');
  const copyTreeIdBtn = document.getElementById('copyTreeIdBtn');

  function fireTreeConfetti() {
    const duration = 2500;
    const end = Date.now() + duration;

    function frame() {
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#7FB069', '#A7C957', '#E8C547']
        });

        confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#7FB069', '#A7C957', '#E8C547']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }

    frame();
  }

  // Copy to Clipboard functionality
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        // Visual feedback
        if (copyTreeIdBtn) {
          copyTreeIdBtn.classList.add('copied');
          const copyTextEl = copyTreeIdBtn.querySelector('.copy-text');
          const copyIconEl = copyTreeIdBtn.querySelector('.copy-icon');
          const originalText = copyTextEl ? copyTextEl.textContent : 'Kopieren';
          
          if (copyTextEl) copyTextEl.textContent = 'Kopiert!';
          if (copyIconEl) copyIconEl.textContent = '✓';
          
          setTimeout(() => {
            copyTreeIdBtn.classList.remove('copied');
            if (copyTextEl) copyTextEl.textContent = originalText;
            if (copyIconEl) copyIconEl.textContent = '📋';
          }, 2000);
        }
      }).catch(() => {
        console.error('Failed to copy to clipboard');
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      if (copyTreeIdBtn) {
        copyTreeIdBtn.classList.add('copied');
        const copyTextEl = copyTreeIdBtn.querySelector('.copy-text');
        const copyIconEl = copyTreeIdBtn.querySelector('.copy-icon');
        const originalText = copyTextEl ? copyTextEl.textContent : 'Kopieren';
        
        if (copyTextEl) copyTextEl.textContent = 'Kopiert!';
        if (copyIconEl) copyIconEl.textContent = '✓';
        
        setTimeout(() => {
          copyTreeIdBtn.classList.remove('copied');
          if (copyTextEl) copyTextEl.textContent = originalText;
          if (copyIconEl) copyIconEl.textContent = '📋';
        }, 2000);
      }
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textarea);
  }

  // Copy button event listener
  if (copyTreeIdBtn) {
    copyTreeIdBtn.addEventListener('click', () => {
      // Nehme den Wert aus dem ersten TreeID Feld
      const firstTreeIdVal = document.querySelector('#treeIdValue');
      const treeId = firstTreeIdVal ? firstTreeIdVal.textContent : '';
      if (treeId) {
        copyToClipboard(treeId);
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if(!form.checkValidity()){ 
        form.reportValidity(); 
        return; 
      }
      if(!fileInput.files.length){
        chosen.style.display = 'block';
        chosen.style.color = 'var(--sun)';
        chosen.style.background = 'rgba(232, 197, 71, 0.1)';
        chosen.textContent = '⚠️ Bitte ziehe zuerst dein Projekt-Zip in die Box!';
        return;
      }

      const icon = submitBtn.querySelector('.btn-icon');
      const text = submitBtn.querySelector('.btn-text');
      
      // Deaktiviere den Button sofort, um Mehrfach-Klicks komplett zu sperren
      submitBtn.disabled = true;
      submitBtn.classList.add('is-watering');
      if (icon) icon.textContent = "💧";
      if (text) text.textContent = "Lade Archiv hoch und prüfe...";
      
      if (reviewConsole) {
        reviewConsole.style.display = "block";
        reviewConsole.innerHTML = `<p class="sys">> Sende Daten an Backend...</p>`;
      }

      successStates.forEach(state => state.style.display = "none");
      
      const formData = new FormData(form);

      try {
        const response = await fetch(API_PATH, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data.status === 'success' || data.success) {
          if (reviewConsole) {
            reviewConsole.innerHTML += `<br><p class="success-text">> [OK] ${data.message}</p>`;
          }
          
          submitBtn.classList.remove('is-watering');
          submitBtn.classList.add('is-grown');
          if (icon) icon.textContent = "🌳";
          if (text) text.textContent = "Baum erfolgreich gepflanzt!";
          
          fireTreeConfetti();

          // Trigger animation for the manual upload
          if (data.newCount > currentDisplayedCount) {
              animateValue(treeCountEl, liveDisplayedValue, data.newCount);
              currentDisplayedCount = data.newCount;
          }
          
          // --- FIX: ID VOM BACKEND NEHMEN STATT LOKAL ZU GENERIEREN ---
          const serverTreeId = data.treeId;

window.certificateData = {
    name: document.getElementById('name').value,
    project: document.getElementById('project').value,
    treeId: serverTreeId
};

treeIdValues.forEach(el => el.textContent = serverTreeId);
          
          // Eingabefelder bei Erfolg sperren
          fileInput.disabled = true;
          const nameInput = document.getElementById('name');
          const projInput = document.getElementById('project');
          if (nameInput) nameInput.disabled = true;
          if (projInput) projInput.disabled = true;

        } else {
          if (reviewConsole) {
            reviewConsole.innerHTML += `<br><p class="sys" style="color: #FF5F56;">> [ERROR] ${data.message}</p>`;
          }
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-watering');
          if (icon) icon.textContent = "🌱";
          if (text) text.textContent = "Erneut versuchen";
        }

      } catch (err) {
        console.error(err);
        if (reviewConsole) {
          reviewConsole.innerHTML += `<br><p class="sys" style="color: #FF5F56;">> [ERROR] Verbindung zum Server fehlgeschlagen.</p>`;
        }
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-watering');
        if (icon) icon.textContent = "🌱";
        if (text) text.textContent = "Erneut versuchen";
      }
    });
  }

  // --- 6. Automated PDF Certificate Generation (Issue #12) ---
  const downloadCertBtn = document.getElementById('downloadCertBtn');

  if (downloadCertBtn) {
    downloadCertBtn.addEventListener('click', () => {
      // Werte dynamisch aus den Feldern holen
      const userName = window.certificateData.name;
      const projectName = window.certificateData.project;
      const finalTreeId = window.certificateData.treeId;

      // Daten ins unsichtbare HTML-Template injizieren, bevor html2pdf es abgreift
      document.getElementById('pdfName').textContent = userName;
      document.getElementById('pdfProject').textContent = projectName;
      document.getElementById('pdfTreeId').textContent = finalTreeId;

      const element = document.getElementById('pdfTemplate');
      const opt = {
        margin:       0,
        filename:     `code4trees-Zertifikat-${finalTreeId}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        // Passt das html2canvas Rendering exakt an die Maße unseres Designs an
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#050a07', width: 1050, height: 740 },
        jsPDF:        { unit: 'pt', format: [1050, 740], orientation: 'landscape' }
      };

      // Sichtbar schalten fürs System
      element.parentElement.style.display = 'block';
      
      html2pdf().set(opt).from(element).save().then(() => {
        // Direkt danach wieder unsichtbar machen
        element.parentElement.style.display = 'none';
      });
    });
  }

  typeWriter();

});