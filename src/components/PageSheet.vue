<script setup>
import { inject } from 'vue'
import IfHeader from './IfHeader.vue'
defineProps({
  page: { type: Number, required: true },
  frm: { type: String, default: 'FRM3' },
  showLot: { type: Boolean, default: true },
  etape: { type: String, default: '' }
})
const d = inject('doc')
</script>

<template>
  <div class="if-sheet">
    <IfHeader :frm="frm" :page="page" :show-lot="showLot" :etape="etape" />
    <slot />
    <table class="pied">
      <thead><tr><th>Rédacteur / Date &amp; Visa</th><th>Vérificateur / Date &amp; Visa</th><th>Approbateur / Date &amp; Visa</th></tr></thead>
      <tbody><tr>
        <td><input class="cell" v-model="d.pied.redacteur" /></td>
        <td><input class="cell" v-model="d.pied.verificateur" /></td>
        <td><input class="cell" v-model="d.pied.approbateur" /></td>
      </tr></tbody>
    </table>
  </div>
</template>
