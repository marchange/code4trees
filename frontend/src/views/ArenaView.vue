<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import confetti from 'canvas-confetti'

// --- Stammdaten (1:1 aus script_training.js) ---
const categories = [
  { id: 'cat-chal', icon: '📚', name: 'Challenges' },
  { id: 'cat-bug', icon: '🐞', name: 'Bug Hunter' },
  { id: 'cat-algo', icon: '🧠', name: 'Algorithms' },
  { id: 'cat-str', icon: '🔤', name: 'Strings' },
  { id: 'cat-arr', icon: '📦', name: 'Arrays' }
]

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
    tests: [{ inputs: ['hello'], expected: 'olleh' }, { inputs: ['a'], expected: 'a' }]
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
    tests: [{ inputs: ['admin', '1234'], expected: true }, { inputs: ['hacker', '1234'], expected: false }]
  },
  { id: 6, catId: 'cat-bug', type: 'bug', title: 'Shopping Cart Bug', difficulty: 'Medium', xp: 200, fnName: 'calculateTotal',
    desc: 'Der Warenkorb gibt immer nur den Preis des LETZTEN Artikels zurück anstatt die Summe.',
    example: 'Erwartet bei [{price: 10}, {price: 20}]: 30',
    code: 'function calculateTotal(items){\n    let total = 0;\n    items.forEach(item => {\n        total = item.price;\n    });\n    return total;\n}',
    tests: [{ inputs: [[{ price: 10 }, { price: 20 }]], expected: 30 }, { inputs: [[{ price: 5 }, { price: 5 }]], expected: 10 }]
  },
  { id: 7, catId: 'cat-bug', type: 'bug', title: 'User Search Bug', difficulty: 'Medium', xp: 200, fnName: 'searchUser',
    desc: 'Die Suche findet keine Nutzer, obwohl diese im Array existieren. Arrow-Function Return fehlt?',
    example: 'Erwartet bei "Bob": {name: "Bob"}\nAktuell: undefined',
    code: 'function searchUser(users, name){\n    return users.find(user => {\n        user.name.toLowerCase() === name.toLowerCase();\n    });\n}',
    tests: [{ inputs: [[{ name: 'Alice' }, { name: 'Bob' }], 'bob'], expected: { name: 'Bob' } }, { inputs: [[{ name: 'Tom' }], 'Jerry'], expected: undefined }]
  },
  { id: 8, catId: 'cat-bug', type: 'bug', title: 'Number Converter Bug', difficulty: 'Easy', xp: 150, fnName: 'convertTemperature',
    desc: 'Die Funktion soll Celsius in Fahrenheit umwandeln, aber die Formel ist leicht defekt.',
    example: 'Erwartet bei 0°C: 32\nAktuell: -32',
    code: 'function convertTemperature(celsius){\n    return celsius * 9 / 5 - 32;\n}',
    tests: [{ inputs: [0], expected: 32 }, { inputs: [100], expected: 212 }]
  }
]

// --- Persistenter State (localStorage, Schlüssel wie im Original) ---
const state = ref(JSON.parse(localStorage.getItem('ideState')) || { completed: [], xp: 0, codes: {} })
function saveState() { localStorage.setItem('ideState', JSON.stringify(state.value)) }

const activeTaskId = ref(null)
const activeTask = computed(() => tasks.find(t => t.id === activeTaskId.value) || null)
const editorCode = ref('')
const openCategories = ref(new Set())
const showNext = ref(false)
const allTasksSolved = computed(() => state.value.completed.length === tasks.length)
const showCompletionBanner = ref(false)

const consoleLines = ref([
  { html: '> IDE initialized.', cls: 'log-sys' },
  { html: '> Workspace connected to main server.', cls: 'log-sys' },
  { html: '> Waiting for execution...', cls: 'log-sys' }
])
const consoleEl = ref(null)
const textareaEl = ref(null)
const linesEl = ref(null)

const lineNumbers = computed(() => {
  const count = editorCode.value.split('\n').length
  return Array(count).fill(0).map((_, i) => i + 1).join('<br>')
})

const categoriesWithTasks = computed(() =>
  categories
    .map(cat => ({ ...cat, tasks: tasks.filter(t => t.catId === cat.id) }))
    .filter(cat => cat.tasks.length > 0)
)

function toggleCategory(id) {
  const s = new Set(openCategories.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openCategories.value = s
}

function logToConsole(html, cls = 'sys') {
  consoleLines.value.push({ html, cls: `log-${cls}` })
  nextTick(() => {
    if (consoleEl.value) consoleEl.value.scrollTop = consoleEl.value.scrollHeight
  })
}

function loadTask(id) {
  activeTaskId.value = id
  const task = tasks.find(t => t.id === id)
  // Kategorie des Tasks aufklappen
  const s = new Set(openCategories.value)
  s.add(task.catId)
  openCategories.value = s

  showNext.value = false
  editorCode.value = state.value.codes[id] || task.code
  logToConsole(`> Task loaded: ${task.title}. Ready to compile.`, 'sys')
}

function onEditorInput() {
  if (activeTaskId.value) {
    state.value.codes[activeTaskId.value] = editorCode.value
    saveState()
  }
}

function syncScroll() {
  if (linesEl.value && textareaEl.value) linesEl.value.scrollTop = textareaEl.value.scrollTop
}

function onTab(e) {
  const el = e.target
  const start = el.selectionStart
  const end = el.selectionEnd
  editorCode.value = editorCode.value.substring(0, start) + '    ' + editorCode.value.substring(end)
  nextTick(() => { el.selectionStart = el.selectionEnd = start + 4 })
  onEditorInput()
}

function resetCode() {
  if (activeTaskId.value && confirm('Code zurücksetzen?')) {
    const task = tasks.find(t => t.id === activeTaskId.value)
    editorCode.value = task.code
    state.value.codes[activeTaskId.value] = task.code
    saveState()
    logToConsole('> Code reset to original state.', 'sys')
  }
}

function deepEqual(a, b) {
  if (a === b) return true
  if (a == null || typeof a != 'object' || b == null || typeof b != 'object') return false
  let keysA = Object.keys(a), keysB = Object.keys(b)
  if (keysA.length != keysB.length) return false
  for (let key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false
  }
  return true
}

function runCode() {
  if (!activeTaskId.value) return
  const task = activeTask.value
  const code = editorCode.value
  consoleLines.value = []
  logToConsole(`> Compiling and running tests for ${task.fnName}...`, 'sys')

  setTimeout(() => {
    try {
      const executor = new Function(`
        ${code}
        if(typeof ${task.fnName} !== 'function') throw new Error("Function ${task.fnName} not found.");
        return ${task.fnName};
      `)
      const fn = executor()
      let passedAll = true

      task.tests.forEach((tst, i) => {
        try {
          const argsCopy = JSON.parse(JSON.stringify(tst.inputs))
          const res = fn(...argsCopy)
          const passed = deepEqual(res, tst.expected)
          if (passed) {
            logToConsole(`<div class="log-test pass">✓ Test ${i + 1} passed</div>`, 'success')
          } else {
            passedAll = false
            logToConsole(`<div class="log-test fail">✗ Test ${i + 1} failed<br><span style="opacity:0.6;font-size:0.85em">Input: ${JSON.stringify(tst.inputs)}<br>Expected: ${JSON.stringify(tst.expected)}<br>Got: ${JSON.stringify(res)}</span></div>`, 'error')
          }
        } catch (err) {
          passedAll = false
          logToConsole(`<div class="log-test fail">✗ Test ${i + 1} Runtime Error: ${err.message}</div>`, 'error')
        }
      })

      if (passedAll) {
        logToConsole('<br>> ALL TESTS PASSED! 🎉', 'success')
        if (!state.value.completed.includes(task.id)) {
          state.value.completed.push(task.id)
          state.value.xp += task.xp
          saveState()
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })

          if (allTasksSolved.value) {
            logToConsole('<br>> 🏆 ALLE HERAUSFORDERUNGEN GELÖST! Du bist ein Bug Hunter Champion!', 'success')
            showCompletionBanner.value = true
            setTimeout(() => { showCompletionBanner.value = false }, 6000)
            const duration = 2000
            const end = Date.now() + duration
            ;(function burst() {
              confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#A7C957', '#E8C547', '#7FB069'] })
              confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#A7C957', '#E8C547', '#7FB069'] })
              if (Date.now() < end) requestAnimationFrame(burst)
            })()
          }
        }
        const currentIndex = tasks.findIndex(t => t.id === task.id)
        if (currentIndex < tasks.length - 1) showNext.value = true
      } else {
        logToConsole('<br>> Execution finished with errors.', 'error')
      }
    } catch (e) {
      logToConsole(`> Syntax/Compilation Error:<br><span style="color:#ff6b6b">${e.message}</span>`, 'error')
    }
  }, 300)
}

function nextChallenge() {
  const currentIndex = tasks.findIndex(t => t.id === activeTaskId.value)
  if (currentIndex < tasks.length - 1) loadTask(tasks[currentIndex + 1].id)
}

onMounted(() => {
  // Standardmäßig keine Aufgabe geladen — Placeholder wie im Original
})
</script>

<template>
  <div class="ide-layout">

    <aside class="sidebar-left">
      <div class="nav-header">Explorer</div>

      <div class="explorer">
        <div v-for="cat in categoriesWithTasks" :key="cat.id" class="category-item" :class="{ open: openCategories.has(cat.id) }">
          <button class="category-btn" @click="toggleCategory(cat.id)">
            <span class="category-icon">{{ cat.icon }}</span> {{ cat.name }} <span class="category-chevron">▶</span>
          </button>
          <ul class="task-list">
            <li v-for="(t, i) in cat.tasks" :key="t.id">
              <button
                class="task-btn"
                :class="{ solved: state.completed.includes(t.id), active: activeTaskId === t.id }"
                @click="loadTask(t.id)"
              >
                <span class="status">{{ state.completed.includes(t.id) ? '✓' : String(i + 1).padStart(2, '0') }}</span> {{ t.title }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="user-stats">
        <span>{{ state.xp }} XP</span>
        <span>{{ state.completed.length }} / {{ tasks.length }} gelöst</span>
        <span v-if="allTasksSolved" class="champion-badge">🏆 Champion</span>
      </div>
    </aside>

    <div v-if="showCompletionBanner" class="arena-completion-banner">
      🏆 Alle Herausforderungen gelöst! Du bist ein Bug Hunter Champion!
    </div>

    <main class="workspace-main">

      <div class="placeholder-screen" v-if="!activeTask">
        <div class="icon">⚡</div>
        <div>Wähle eine Aufgabe im Explorer aus</div>
      </div>

      <div class="workspace-inner" v-else style="display: flex;">

        <div class="task-header-area">
          <div class="task-meta">
            <h1 class="task-title">{{ activeTask.title }}</h1>
            <span class="badge" :class="activeTask.difficulty.toLowerCase()">{{ activeTask.difficulty }}</span>
            <span class="badge xp">+{{ activeTask.xp }} XP</span>
          </div>
          <div class="task-desc">{{ activeTask.desc }}</div>
          <pre class="task-example">{{ activeTask.example }}</pre>
        </div>

        <div class="editor-wrapper">
          <div class="editor-tabs">
            <div class="editor-tab">
              <span>📝</span> <span>{{ activeTask.fnName }}.js</span>
            </div>
          </div>

          <div class="editor-core">
            <div class="editor-lines" ref="linesEl" v-html="lineNumbers"></div>
            <textarea
              class="editor-textarea"
              ref="textareaEl"
              spellcheck="false"
              autocomplete="off"
              v-model="editorCode"
              @input="onEditorInput"
              @scroll="syncScroll"
              @keydown.tab.prevent="onTab"
            ></textarea>
          </div>

          <div class="editor-actions">
            <button class="action-btn btn-ghost" @click="resetCode">↺ Reset</button>
            <button class="action-btn" :class="activeTask.type === 'bug' ? 'btn-bug' : 'btn-run'" @click="runCode">
              {{ activeTask.type === 'bug' ? '🐞 Find Bug' : '▶ Run Code' }}
            </button>
            <button class="action-btn btn-next" v-show="showNext" style="display: flex;" @click="nextChallenge">Next Challenge ➔</button>
          </div>
        </div>

      </div>
    </main>

    <aside class="sidebar-right">
      <div class="console-header">
        &gt;_ Terminal Output
      </div>
      <div class="console-body" ref="consoleEl">
        <div v-for="(line, i) in consoleLines" :key="i" class="log-line" :class="line.cls" v-html="line.html"></div>
      </div>
    </aside>

  </div>
</template>
