<script setup>
import { inject, ref } from 'vue'
// En-tête « INSTRUCTION DE FABRICATION » répété en haut de chaque page.
defineProps({
  frm: { type: String, default: 'FRM1' },
  page: { type: Number, default: 1 },
  showLot: { type: Boolean, default: false },   // ligne N° de lot / N° OF (pages 3+)
  etape: { type: String, default: '' }           // bandeau d'étape (ex. « PESÉE »)
})
const d = inject('doc')
</script>

<template>
  <div class="ifh">
    <table class="ifh-top">
      <tbody>
        <tr>
          <td class="logo" rowspan="2"><div class="ldm">LDM</div><div class="grp">GROUPE</div></td>
          <td class="titre" rowspan="2">INSTRUCTION DE<br>FABRICATION</td>
          <td class="ref">Référence :&nbsp;<b>{{ d.entete.refSop }}/{{ frm }}</b></td>
        </tr>
        <tr>
          <td class="ref">
            <div class="rr"><span>Référence IF :&nbsp;<b>{{ d.entete.refIf }}</b></span><span>Version :&nbsp;<b>{{ d.entete.version }}</b></span></div>
            <div class="rr"><span>Page {{ page }} sur {{ d.entete.totalPages }}</span><span>Sous Page :&nbsp;……/………</span></div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="prod">
      <div class="p1">{{ d.produit || d.entete.produit }} / {{ d.entete.dci2 }}</div>
      <div class="p2">{{ d.entete.forme }}</div>
    </div>

    <table class="ifh-taille">
      <tbody>
        <tr>
          <td class="lbl">Taille de lot</td>
          <td>Poids (kg) :&nbsp;<b>{{ d.entete.taillePoids }}</b></td>
          <td>Unité dosée (comprimé) :&nbsp;<b>{{ d.entete.uniteDosee }}</b></td>
          <td>Unité vente (boîte) :&nbsp;<b>{{ d.entete.uniteVente }}</b></td>
        </tr>
        <tr v-if="showLot" class="lotrow">
          <td class="lbl">N° de lot</td>
          <td><input class="hcell" v-model="d.lot.numeroLotInterne" /></td>
          <td class="lbl">N° OF</td>
          <td><input class="hcell" v-model="d.lot.ofN" /></td>
        </tr>
      </tbody>
    </table>

    <div v-if="etape" class="etape-band">{{ etape }}</div>
  </div>
</template>

<style scoped>
.ifh { font-size: 11px; color: #111; }
.ifh table { width: 100%; border-collapse: collapse; }
.ifh td { border: 1px solid #111; padding: 3px 6px; vertical-align: middle; }
.ifh-top .logo { width: 86px; text-align: center; }
.ifh-top .logo .ldm { color: #c0392b; font-weight: 800; font-size: 20px; letter-spacing: 1px; line-height: 1; }
.ifh-top .logo .grp { color: #444; font-weight: 700; font-size: 9px; letter-spacing: 3px; }
.ifh-top .titre { text-align: center; font-weight: 700; font-size: 13px; width: 40%; }
.ifh-top .ref { font-size: 10px; }
.ifh-top .ref .rr { display: flex; justify-content: space-between; gap: 12px; }
.prod { border: 1px solid #111; border-top: 0; text-align: center; padding: 3px; }
.prod .p1 { font-weight: 700; font-size: 12px; }
.prod .p2 { font-weight: 700; font-size: 11px; }
.ifh-taille { border-top: 0; }
.ifh-taille td { font-size: 10px; }
.ifh-taille .lbl { font-weight: 700; width: 20%; }
.lotrow .hcell { width: 100%; border: 0; background: transparent; font: inherit; font-size: 10px; color: #1d4ed8; padding: 2px; }
.lotrow .hcell:focus { outline: 1px solid #67e8f9; background: #ecfeff; }
.etape-band { border: 1px solid #111; border-top: 0; text-align: center; font-weight: 700; font-size: 11px; padding: 3px; letter-spacing: 1px; background: #f1f5f9; }
</style>
