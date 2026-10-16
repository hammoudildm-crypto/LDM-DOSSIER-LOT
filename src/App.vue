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

/* ============ Styles du document IF (partagés par toutes les pages) ============ */
.if-sheet { background: #fff; border: 1px solid #94a3b8; max-width: 860px; margin: 0 auto 22px; padding: 16px 18px; box-shadow: 0 2px 10px rgba(16,24,40,.08); }
.if-sheet table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; color: #111; }
.if-sheet th, .if-sheet td { border: 1px solid #111; padding: 4px 6px; text-align: left; vertical-align: top; }
.if-sheet th { background: #f1f5f9; font-weight: 700; font-size: 9.5px; text-align: center; }
.if-sheet .cell { width: 100%; border: 0; background: transparent; font: inherit; font-size: 11px; padding: 3px 2px; min-height: 24px; color: #1d4ed8; }
.if-sheet .cell:focus { outline: 1px solid #67e8f9; background: #ecfeff; }
.if-sheet .ta-c { text-align: center; } .if-sheet .ta-c .cell { text-align: center; }
.if-sheet .k { font-weight: 700; background: #f8fafc; }
/* pages 1-2 */
.ap .c1 { width: 26%; } .ap .c2 { width: 48%; } .ap .c3 { width: 26%; } .ap td { height: 34px; }
.kv .k { width: 34%; }
.lot4 th { width: 25%; }
.proc .k { width: 20%; white-space: nowrap; } .dev .dvk { width: 20%; }
.visas3 th { width: 33.33%; }
.pied { margin-top: 14px; } .pied th { font-size: 9.5px; } .pied td { height: 34px; }
/* étape pesée */
.sec { font-weight: 700; font-size: 12px; margin: 14px 0 4px; text-decoration: underline; }
.subsec { font-weight: 700; font-size: 11.5px; margin: 10px 0 4px; }
.stxt { font-size: 11px; line-height: 1.5; }
.stxt.boxed { border: 1px solid #111; padding: 8px 10px; }
.stxt ul { margin: 4px 0; padding-left: 20px; } .stxt li { margin-bottom: 4px; }
.stxt .lead { font-weight: 700; }
.note { font-size: 10px; color: #444; margin-top: 6px; }
.note.hl { background: #fff7c2; padding: 6px 8px; border: 1px solid #f0e08a; }
.formula { font-size: 11px; margin: 8px 0; padding: 6px; background: #f8fafc; border: 1px dashed #94a3b8; }
.pbox { border: 1px solid #111; margin-top: 8px; }
.pbox-t { text-align: center; font-weight: 700; font-size: 10px; padding: 4px; border-bottom: 1px solid #111; background: #f8fafc; text-transform: uppercase; }
.pbox-a { height: 150px; } .pbox-a.sm { height: 90px; }
.pverif { font-size: 10px; font-weight: 700; margin-top: 6px; }
.cnc { display: inline-flex; gap: 10px; } .cnc label { display: inline-flex; gap: 3px; align-items: center; font-size: 10px; }
.flux { display: flex; gap: 8px; align-items: flex-start; }
.flux .col { flex: 1; } .flux .col h4 { font-size: 10px; text-align: center; margin: 0 0 6px; text-decoration: underline; }
.flux .node { border: 1px solid #111; padding: 4px 6px; font-size: 10px; margin-bottom: 6px; text-align: center; }
.flux .node .sub { font-weight: 400; font-size: 9px; text-align: left; color: #333; }
.flux .arrow { text-align: center; font-size: 12px; margin: -2px 0 4px; }

@media print {
  .noprint { display: none !important; }
  .if-sheet { border: 0; box-shadow: none; max-width: none; margin: 0; padding: 0; page-break-after: always; }
  .if-sheet .cell { color: #000; }
}
</style>
