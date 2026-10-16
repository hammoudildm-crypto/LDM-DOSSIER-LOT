<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})
</script>

<template>
  <header class="page-header">
    <div class="ph-left">
      <h1 class="ph-title">
        <svg class="ph-logo" viewBox="0 0 512 512" aria-hidden="true">
          <defs>
            <linearGradient id="phDlBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#06b6d4"/>
              <stop offset="1" stop-color="#0e7490"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="512" height="512" rx="116" fill="url(#phDlBg)"/>
          <rect x="130" y="138" width="252" height="300" rx="30" fill="#fff"/>
          <rect x="204" y="104" width="104" height="58" rx="18" fill="#fff"/>
          <rect x="230" y="120" width="52" height="16" rx="8" fill="#0e7490"/>
          <g fill="#67e8f9">
            <rect x="170" y="210" width="172" height="20" rx="10"/>
            <rect x="170" y="252" width="120" height="20" rx="10"/>
          </g>
          <path d="M174 344 L214 386 L306 290" fill="none" stroke="#0891b2" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="ph-ttl">{{ title }}</span>
      </h1>
      <p v-if="subtitle" class="ph-sub">{{ subtitle }}</p>
    </div>
    <div class="ph-actions"><slot /></div>
  </header>
</template>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin: 4px 0 20px; }
.ph-title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; display: flex; align-items: center; line-height: 1.1; }
.ph-logo { width: 42px; height: 42px; margin-right: 13px; flex-shrink: 0; border-radius: 11px; box-shadow: 0 2px 6px rgba(14,116,144,.28); }
.ph-ttl { min-width: 0; }
.ph-sub { margin: 6px 0 0; color: #64748b; font-size: 14px; max-width: 980px; }
.ph-actions { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
@media (max-width: 640px) { .ph-title { font-size: 21px; } .ph-logo { width: 36px; height: 36px; border-radius: 9px; } }
</style>
