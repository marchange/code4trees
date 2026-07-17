<script setup>
defineProps({
  name: { type: String, required: true },
  project: { type: String, required: true },
  treeId: { type: String, required: true },
  date: { type: String, required: true }
})
</script>

<template>
  <div class="certificate-card">
    <div class="certificate-border">
      <div class="certificate-header">
        <span class="certificate-logo">&#123;&#125; code4trees</span>
        <span class="certificate-eyebrow">Impact-Zertifikat</span>
      </div>

      <svg class="certificate-tree" width="56" height="64" viewBox="0 0 24 28" fill="none" aria-hidden="true">
        <rect x="10.5" y="18" width="3" height="10" fill="#8A6F4D" />
        <polygon points="12,0 24,18 0,18" fill="#A7C957" />
      </svg>

      <h1 class="certificate-title">Zertifikat</h1>
      <p class="certificate-body">
        Hiermit bestätigen wir, dass <strong>{{ name }}</strong> mit dem Projekt
        „<strong>{{ project }}</strong>“ erfolgreich validiert wurde und dafür
        einen echten Baum gepflanzt hat.
      </p>

      <div class="certificate-meta">
        <div>
          <span class="certificate-meta-label">Baum-ID</span>
          <span class="certificate-meta-value">{{ treeId }}</span>
        </div>
        <div>
          <span class="certificate-meta-label">Datum</span>
          <span class="certificate-meta-value">{{ date }}</span>
        </div>
      </div>

      <p class="certificate-footer">code4trees.org — Coding meets Green Tech</p>
    </div>
  </div>
</template>
