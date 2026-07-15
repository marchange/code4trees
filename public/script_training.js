document.addEventListener("DOMContentLoaded", () => {
    // --- Ambient Background Effects ---
    function generateAmbientCode() {
      const container = document.getElementById('floatingCodeContainer');
      if (!container) return;
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
    generateAmbientCode();
  
    // --- Data Structure ---
    const categories = [
      { id: 'cat-chal', icon: '📚', name: 'Challenges' },
      { id: 'cat-bug', icon: '🐞', name: 'Bug Hunter' },
      { id: 'cat-algo', icon: '🧠', name: 'Algorithms' },
      { id: 'cat-str', icon: '🔤', name: 'Strings' },
      { id: 'cat-arr', icon: '📦', name: 'Arrays' }
    ];
  
    const tasks = [
      { id: 1, catId: 'cat-arr', type: 'challenge', title: 'Two Sum Basics', difficulty: 'Easy', xp: 100, fnName: 'twoSum',
        desc: 'Gegeben ist ein Array mit Zahlen (nums) und ein Zielwert (target). Finde die Indizes der zwei Zahlen, deren Summe genau den Zielwert ergibt.',
        example: 'Input: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]',
        code: 'function twoSum(nums, target) {\n    // Code here\n    \n}',
        tests: [{ inputs: [[2, 7, 11, 15], 9], expected: [0, 1] }, { inputs: [[3, 2, 4], 6], expected: [1, 2] }]
      },
      { id: 2, catId: 'cat-str', type: 'challenge', title: 'Reverse String', difficulty: 'Easy', xp: 100, fnName: 'reverseString',
        desc: 'Drehe die Zeichenreihenfolge des übergebenen Strings um.',
        example: 'Input: "hello"\nOutput: "olleh"',
        code: 'function reverseString(str) {\n    // Code here\n    \n}',
        tests: [{ inputs: ["hello"], expected: "olleh" }, { inputs: ["a"], expected: "a" }]
      },
      { id: 3, catId: 'cat-algo', type: 'challenge', title: 'Find Maximum Number', difficulty: 'Easy', xp: 100, fnName: 'findMax',
        desc: 'Finde die größte Zahl in dem übergebenen Array.',
        example: 'Input: [3, 8, 2, 10, 5]\nOutput: 10',
        code: 'function findMax(numbers) {\n    // Code here\n    \n}',
        tests: [{ inputs: [[3, 8, 2, 10, 5]], expected: 10 }, { inputs: [[-1, -5, -2, -10]], expected: -1 }]
      },
      { id: 4, catId: 'cat-bug', type: 'bug', title: 'Array Calculator Bug', difficulty: 'Easy', xp: 150, fnName: 'calculateSum',
        desc: 'Die Funktion liefert fehlerhafte Ergebnisse (String-Verkettung). Finde und behebe den Fehler.',
        example: 'Erwartet bei [1, 2, 3]: 6\nAktuell: "123"',
        code: 'function calculateSum(numbers) {\n    let sum = ""; // Datentyp prüfen!\n    for(let i = 0; i < numbers.length; i++){\n        sum += numbers[i];\n    }\n    return sum;\n}',
        tests: [{ inputs: [[1, 2, 3, 4]], expected: 10 }, { inputs: [[10, 20]], expected: 30 }]
      },
      { id: 5, catId: 'cat-bug', type: 'bug', title: 'Login Validation Bug', difficulty: 'Easy', xp: 150, fnName: 'validateLogin',
        desc: 'Die Login-Funktion akzeptiert jeden beliebigen Nutzernamen. Finde den Syntax-Fehler.',
        example: 'Erwartet bei ("hacker", "1234"): false\nAktuell: true',
        code: 'function validateLogin(username, password){\n    if(username = "admin" && password == "1234"){\n        return true;\n    }\n    return false;\n}',
        tests: [{ inputs: ["admin", "1234"], expected: true }, { inputs: ["hacker", "1234"], expected: false }]
      },
      { id: 6, catId: 'cat-bug', type: 'bug', title: 'Shopping Cart Bug', difficulty: 'Medium', xp: 200, fnName: 'calculateTotal',
        desc: 'Der Warenkorb gibt immer nur den Preis des LETZTEN Artikels zurück anstatt die Summe.',
        example: 'Erwartet bei [{price: 10}, {price: 20}]: 30',
        code: 'function calculateTotal(items){\n    let total = 0;\n    items.forEach(item => {\n        total = item.price;\n    });\n    return total;\n}',
        tests: [{ inputs: [[{price: 10}, {price: 20}]], expected: 30 }, { inputs: [[{price: 5}, {price: 5}]], expected: 10 }]
      },
      { id: 7, catId: 'cat-bug', type: 'bug', title: 'User Search Bug', difficulty: 'Medium', xp: 200, fnName: 'searchUser',
        desc: 'Die Suche findet keine Nutzer, obwohl diese im Array existieren. Arrow-Function Return fehlt?',
        example: 'Erwartet bei "Bob": {name: "Bob"}\nAktuell: undefined',
        code: 'function searchUser(users, name){\n    return users.find(user => {\n        user.name.toLowerCase() === name.toLowerCase();\n    });\n}',
        tests: [{ inputs: [[{name: "Alice"}, {name: "Bob"}], "bob"], expected: {name: "Bob"} }, { inputs: [[{name: "Tom"}], "Jerry"], expected: undefined }]
      },
      { id: 8, catId: 'cat-bug', type: 'bug', title: 'Number Converter Bug', difficulty: 'Easy', xp: 150, fnName: 'convertTemperature',
        desc: 'Die Funktion soll Celsius in Fahrenheit umwandeln, aber die Formel ist leicht defekt.',
        example: 'Erwartet bei 0°C: 32\nAktuell: -32',
        code: 'function convertTemperature(celsius){\n    return celsius * 9 / 5 - 32;\n}',
        tests: [{ inputs: [0], expected: 32 }, { inputs: [100], expected: 212 }]
      }
    ];
  
    let state = JSON.parse(localStorage.getItem('ideState')) || { completed: [], xp: 0, codes: {} };
    let activeTaskId = null;
  
    const explorerEl = document.getElementById('explorer');
    const placeholderEl = document.getElementById('placeholder');
    const workspaceEl = document.getElementById('workspace');
    const textareaEl = document.getElementById('editor-textarea');
    const linesEl = document.getElementById('editor-lines');
    const consoleEl = document.getElementById('console');
    const btnReset = document.getElementById('btn-reset');
    const btnRun = document.getElementById('btn-run');
    const btnNext = document.getElementById('btn-next');
  
    function renderSidebar() {
      explorerEl.innerHTML = '';
      categories.forEach(cat => {
        const catTasks = tasks.filter(t => t.catId === cat.id);
        if(catTasks.length === 0) return;
        const catEl = document.createElement('div');
        catEl.className = 'category-item';
        
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.innerHTML = `<span class="category-icon">${cat.icon}</span> ${cat.name} <span class="category-chevron">▶</span>`;
        btn.onclick = () => catEl.classList.toggle('open');
        
        const list = document.createElement('ul');
        list.className = 'task-list';
        
        catTasks.forEach((t, i) => {
          const isSolved = state.completed.includes(t.id);
          const isActive = activeTaskId === t.id;
          if (isActive) catEl.classList.add('open');
          const li = document.createElement('li');
          const tBtn = document.createElement('button');
          tBtn.className = `task-btn ${isSolved ? 'solved' : ''} ${isActive ? 'active' : ''}`;
          tBtn.innerHTML = `<span class="status">${isSolved ? '✓' : String(i+1).padStart(2,'0')}</span> ${t.title}`;
          tBtn.onclick = () => loadTask(t.id);
          li.appendChild(tBtn);
          list.appendChild(li);
        });
        catEl.appendChild(btn);
        catEl.appendChild(list);
        explorerEl.appendChild(catEl);
      });
      document.getElementById('xp-display').textContent = `${state.xp} XP`;
      document.getElementById('progress-display').textContent = `${state.completed.length} / ${tasks.length} gelöst`;
    }
  
    function loadTask(id) {
      activeTaskId = id;
      const task = tasks.find(t => t.id === id);
      placeholderEl.style.display = 'none';
      workspaceEl.style.display = 'flex';
      document.getElementById('t-title').textContent = task.title;
      const diffEl = document.getElementById('t-diff');
      diffEl.textContent = task.difficulty;
      diffEl.className = `badge ${task.difficulty.toLowerCase()}`;
      document.getElementById('t-xp').textContent = `+${task.xp} XP`;
      document.getElementById('t-desc').textContent = task.desc;
      document.getElementById('t-example').textContent = task.example;
      document.getElementById('t-filename').textContent = `${task.fnName}.js`;
      
      if(task.type === 'bug') {
        btnRun.textContent = '🐞 Find Bug';
        btnRun.className = 'action-btn btn-bug';
      } else {
        btnRun.textContent = '▶ Run Code';
        btnRun.className = 'action-btn btn-run';
      }
      btnNext.style.display = 'none';
      textareaEl.value = state.codes[id] || task.code;
      updateLines();
      logToConsole(`> Task loaded: ${task.title}. Ready to compile.`, 'sys');
      renderSidebar();
    }
  
    function updateLines() {
      const count = textareaEl.value.split('\n').length;
      linesEl.innerHTML = Array(count).fill(0).map((_, i) => i + 1).join('<br>');
    }
  
    textareaEl.addEventListener('input', () => {
      updateLines();
      if(activeTaskId) {
        state.codes[activeTaskId] = textareaEl.value;
        saveState();
      }
    });
    
    textareaEl.addEventListener('scroll', () => {
      linesEl.scrollTop = textareaEl.scrollTop;
    });
  
    textareaEl.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 4;
        updateLines();
      }
    });
  
    btnReset.addEventListener('click', () => {
      if(activeTaskId && confirm("Code zurücksetzen?")) {
        const task = tasks.find(t => t.id === activeTaskId);
        textareaEl.value = task.code;
        state.codes[activeTaskId] = task.code;
        saveState();
        updateLines();
        logToConsole('> Code reset to original state.', 'sys');
      }
    });
  
    function saveState() { localStorage.setItem('ideState', JSON.stringify(state)); }
  
    function logToConsole(htmlString, type = 'sys') {
      const div = document.createElement('div');
      div.className = `log-line log-${type}`;
      div.innerHTML = htmlString;
      consoleEl.appendChild(div);
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  
    function clearConsole() { consoleEl.innerHTML = ''; }
  
    function deepEqual(a, b) {
      if (a === b) return true;
      if (a == null || typeof a != "object" || b == null || typeof b != "object") return false;
      let keysA = Object.keys(a), keysB = Object.keys(b);
      if (keysA.length != keysB.length) return false;
      for (let key of keysA) {
        if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
      }
      return true;
    }
  
    btnRun.addEventListener('click', () => {
      if(!activeTaskId) return;
      const task = tasks.find(t => t.id === activeTaskId);
      const code = textareaEl.value;
      clearConsole();
      logToConsole(`> Compiling and running tests for ${task.fnName}...`, 'sys');
      
      setTimeout(() => {
        try {
          const executor = new Function(`
            ${code}
            if(typeof ${task.fnName} !== 'function') throw new Error("Function ${task.fnName} not found.");
            return ${task.fnName};
          `);
          const fn = executor();
          let passedAll = true;
  
          task.tests.forEach((tst, i) => {
            try {
              const argsCopy = JSON.parse(JSON.stringify(tst.inputs));
              const res = fn(...argsCopy);
              const passed = deepEqual(res, tst.expected);
              if(passed) {
                logToConsole(`<div class="log-test pass">✓ Test ${i+1} passed</div>`, 'success');
              } else {
                passedAll = false;
                logToConsole(`<div class="log-test fail">✗ Test ${i+1} failed<br><span style="opacity:0.6;font-size:0.85em">Input: ${JSON.stringify(tst.inputs)}<br>Expected: ${JSON.stringify(tst.expected)}<br>Got: ${JSON.stringify(res)}</span></div>`, 'error');
              }
            } catch(err) {
              passedAll = false;
              logToConsole(`<div class="log-test fail">✗ Test ${i+1} Runtime Error: ${err.message}</div>`, 'error');
            }
          });
  
          if(passedAll) {
            logToConsole('<br>> ALL TESTS PASSED! 🎉', 'success');
            if(!state.completed.includes(task.id)) {
              state.completed.push(task.id);
              state.xp += task.xp;
              saveState();
              renderSidebar();
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            const currentIndex = tasks.findIndex(t => t.id === task.id);
            if(currentIndex < tasks.length - 1) {
              btnNext.style.display = 'flex';
            }
          } else {
            logToConsole('<br>> Execution finished with errors.', 'error');
          }
        } catch(e) {
          logToConsole(`> Syntax/Compilation Error:<br><span style="color:#ff6b6b">${e.message}</span>`, 'error');
        }
      }, 300);
    });
  
    btnNext.addEventListener('click', () => {
      const currentIndex = tasks.findIndex(t => t.id === activeTaskId);
      if(currentIndex < tasks.length - 1) {
        loadTask(tasks[currentIndex + 1].id);
      }
    });
  
    renderSidebar();
  });