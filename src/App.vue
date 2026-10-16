<script setup>
import { ref, provide } from 'vue'
import DossierLot from './views/DossierLot.vue'

// App autonome : édition toujours autorisée.
provide('peutEditer', ref(true))
</script>

<template>
  <div class="dl-shell">
    <main class="dl-main">
      <DossierLot />
    </main>
  </div>
</template>

<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: #f1f5f9;
  color: #1b2733;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#app { min-height: 100vh; }
.dl-shell { min-height: 100vh; background: #f1f5f9; }
.dl-main { max-width: 1180px; margin: 0 auto; padding: 22px 20px 64px; }
@media (max-width: 640px) { .dl-main { padding: 16px 13px 44px; } }
</style>
