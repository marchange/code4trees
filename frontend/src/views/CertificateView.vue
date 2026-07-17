<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CertificateCard from '../components/CertificateCard.vue'
import { useTrees } from '../composables/useTrees'
import { downloadCertificatePdf } from '../composables/useCertificatePdf'

const { API_BASE } = useTrees()
const route = useRoute()

const state = ref('loading') // 'loading' | 'found' | 'not-found' | 'error'
const record = ref(null)
const certificateEl = ref(null)
const downloading = ref(false)

async function loadCertificate() {
  state.value = 'loading'
  try {
    const response = await fetch(`${API_BASE}/certificate/${encodeURIComponent(route.params.id)}`)
    const data = await response.json()
    if (response.ok && data.status === 'success') {
      record.value = data
      state.value = 'found'
    } else {
      state.value = 'not-found'
    }
  } catch (err) {
    console.error('Certificate fetch failed', err)
    state.value = 'error'
  }
}

async function downloadCertificate() {
  if (!certificateEl.value || downloading.value) return
  downloading.value = true
  try {
    await downloadCertificatePdf(certificateEl.value, `code4trees-zertifikat-${record.value.tree_id}.pdf`)
  } finally {
    downloading.value = false
  }
}

onMounted(loadCertificate)
</script>

<template>
  <main>
    <section id="certificate-lookup">
      <template v-if="state === 'loading'">
        <h2>Zertifikat wird geladen...</h2>
      </template>

      <template v-else-if="state === 'found'">
        <h2>Dein Zertifikat</h2>
        <p class="section-intro">Baum-ID: <code>{{ record.tree_id }}</code></p>

        <div ref="certificateEl" style="margin: 0 auto 32px; display: flex; justify-content: center;">
          <CertificateCard :name="record.name" :project="record.project" :tree-id="record.tree_id" :date="record.date" />
        </div>

        <div style="text-align: center;">
          <button type="button" class="btn-certificate" style="max-width: 360px;" :disabled="downloading" @click="downloadCertificate">
            <span v-if="downloading">⏳ Erstelle PDF...</span>
            <span v-else>📄 Zertifikat als PDF herunterladen</span>
          </button>
        </div>
      </template>

      <template v-else-if="state === 'not-found'">
        <h2>Kein Zertifikat gefunden</h2>
        <p class="section-intro">Für die Baum-ID „{{ route.params.id }}“ existiert kein Zertifikat. Bitte überprüfe den Link.</p>
      </template>

      <template v-else>
        <h2>Verbindung fehlgeschlagen</h2>
        <p class="section-intro">Das Zertifikat konnte nicht geladen werden. Bitte versuche es später erneut.</p>
      </template>
    </section>
  </main>
</template>
