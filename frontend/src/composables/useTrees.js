import { ref } from 'vue'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Globaler, geteilter Zustand (Composable-Singleton):
// TreeCounter animiert auf targetCount, SubmitForm kann ihn nach Erfolg anheben.
const targetCount = ref(-1) // -1 = noch nie geladen
const apiError = ref(false) // true = letzter Fetch fehlgeschlagen (Backend down / Netzwerkfehler)

async function fetchLiveTreeCount() {
  try {
    const response = await fetch(`${API_BASE}/trees`, { cache: 'no-store' })
    if (!response.ok) throw new Error('API down')
    const data = await response.json()
    if (typeof data.trees === 'number' && data.trees > targetCount.value) {
      targetCount.value = data.trees
    }
    apiError.value = false
  } catch (error) {
    console.error('API error', error)
    apiError.value = true
  }
}

function setCount(n) {
  if (typeof n === 'number' && n > targetCount.value) {
    targetCount.value = n
  }
}

export function useTrees() {
  return { API_BASE, targetCount, apiError, fetchLiveTreeCount, setCount }
}
