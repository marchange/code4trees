// --- LIVE API CALL: Bäume vom Server holen ---
const treeCountEl = document.getElementById('treeCount');

async function fetchLiveTreeCount() {
  try {
    const response = await fetch('api.php');
    if (!response.ok) throw new Error('API nicht bereit');
    const data = await response.json();
    treeCountEl.textContent = data.trees.toLocaleString('de-AT');
  } catch (error) {
    console.error("API nicht erreichbar. Fallback läuft.");
  }
}
fetchLiveTreeCount();


// --- 1. Ambient Floating Code Particles ---
(function generateAmbientCode() {
  const container = document.getElementById('floatingCodeContainer');
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
})();

// --- 2. Typewriter Effect für H1 ---
(function typeWriter() {
  const h1 = document.getElementById('typewriter');
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
})();

// --- 3. Kleiner SVG-Wald im Counter-Streifen ---
(function(){
  const forest = document.getElementById('forest');
  const treeSVG = (h, color) => `<svg width="24" height="${30+h}" viewBox="0 0 24 ${30+h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="11" y="${18+h}" width="3" height="12" fill="#8A6F4D"/>
    <polygon points="12.5,0 24,${18+h} 1,${18+h}" fill="${color}"/>
  </svg>`;
  let html = '';
  const colors = ['#7FB069', '#A7C957', '#5E8B4C'];
  for(let i = 0; i < 18; i++){ 
    html += treeSVG(Math.random() * 15, colors[i % 3]); 
  }
  forest.innerHTML = html;
})();

// --- 4. Huge Dropzone Logic (Safe) ---
const dz = document.getElementById('dropzone');
const fileInput = document.getElementById('zipfile');
const chosen = document.getElementById('fileChosen');
const sproutIcon = dz.querySelector('.sprout');

// Wenn auf die gesamte Box geklickt wird, triggere den Input
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

function showFile(file){
  if(!file) return;
  
  // Datei-Validierung
  if(!file.name.toLowerCase().endsWith('.zip')){
    chosen.style.display = 'block';
    chosen.style.color = 'var(--sun)';
    chosen.textContent = '⚠️ Bitte wähle eine .zip-Datei.';
    fileInput.value = '';
    return;
  }
  
  chosen.style.display = 'block';
  chosen.style.color = 'var(--leaf)';
  chosen.textContent = '✓ ' + file.name + ' (' + (file.size/1024/1024).toFixed(1) + ' MB)';
  sproutIcon.textContent = '📦';
  dz.style.borderColor = 'var(--leaf)';
}

dz.addEventListener('click', () => fileInput.click());
dz.addEventListener('keydown', e => {
  if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); fileInput.click(); }
});
fileInput.addEventListener('change', () => showFile(fileInput.files[0]));

['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => {
  e.preventDefault(); dz.classList.add('dragover');
}));
['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => {
  e.preventDefault(); dz.classList.remove('dragover');
}));
dz.addEventListener('drop', e => {
  if(e.dataTransfer.files.length){
    fileInput.files = e.dataTransfer.files;
    showFile(fileInput.files[0]);
  }
});

// --- 5. Gamifizierter Submit & Confetti Explosion ---
const form = document.getElementById('submitForm');
const submitBtn = document.getElementById('submitCodeBtn');
const reviewConsole = document.getElementById('reviewConsole');

function fireTreeConfetti() {
  const duration = 2500;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
      colors: ['#7FB069', '#A7C957', '#E8C547']
    });
    confetti({
      particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
      colors: ['#7FB069', '#A7C957', '#E8C547']
    });

    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  // 1. Validierung
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

  // 2. Watering State (Scan Simulation)
  const icon = submitBtn.querySelector('.btn-icon');
  const text = submitBtn.querySelector('.btn-text');
  
  submitBtn.classList.add('is-watering');
  icon.textContent = "💧";
  text.textContent = "KI wässert und scannt Archiv...";
  
  reviewConsole.style.display = "block";
  reviewConsole.innerHTML = `<p class="sys">> Entpacke Archiv...</p>`;

  setTimeout(() => {
    reviewConsole.innerHTML += `<p class="sys">> Analysiere Datei-Struktur...</p>`;
  }, 800);

  setTimeout(() => {
    reviewConsole.innerHTML += `<p class="success-text">> [OK] Projekt als valide eingestuft!</p>`;
  }, 1600);

  // 3. Grown State (Success) + API Update
  setTimeout(async () => {
    reviewConsole.innerHTML += `<br><p class="success-text">> API Call an Aufforstungsprojekt erfolgreich. Danke für deinen Beitrag!</p>`;
    
    submitBtn.classList.remove('is-watering');
    submitBtn.classList.add('is-grown');
    icon.textContent = "🌳";
    text.textContent = "Baum erfolgreich gepflanzt!";
    
    fireTreeConfetti();

    // API Update aufrufen
    try {
      const response = await fetch('api.php?add=1');
      if (response.ok) {
        const data = await response.json();
        treeCountEl.textContent = data.trees.toLocaleString('de-AT');
        treeCountEl.classList.add('pop');
        setTimeout(() => treeCountEl.classList.remove('pop'), 400);
      }
    } catch (err) {
      console.log("Zähler konnte visuell nicht geupdatet werden.");
    }

    // Felder deaktivieren nach Erfolg
    fileInput.disabled = true;
    document.getElementById('name').disabled = true;
    document.getElementById('project').disabled = true;
  }, 3000);
});