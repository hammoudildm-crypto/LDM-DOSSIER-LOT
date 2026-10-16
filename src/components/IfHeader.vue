<script setup>
// En-tête « INSTRUCTION DE FABRICATION » répété en haut de chaque page de l'IF.
defineProps({
  e: { type: Object, required: true },   // en-tête IF (produit, références, taille de lot…)
  frm: { type: String, default: 'FRM1' },
  page: { type: Number, default: 1 }
})
</script>

<template>
  <div class="ifh">
    <table class="ifh-top">
      <tbody>
        <tr>
          <td class="logo" rowspan="2">
            <div class="ldm">LDM</div><div class="grp">GROUPE</div>
          </td>
          <td class="titre" rowspan="2">INSTRUCTION DE<br>FABRICATION</td>
          <td class="ref">Référence :&nbsp;<b>{{ e.refSop }}/{{ frm }}</b></td>
        </tr>
        <tr>
          <td class="ref">
            <div class="rr"><span>Référence IF :&nbsp;<b>{{ e.refIf }}</b></span><span>Version :&nbsp;<b>{{ e.version }}</b></span></div>
            <div class="rr"><span>Page {{ page }} sur {{ e.totalPages }}</span><span>Sous Page :&nbsp;……/………</span></div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="prod">
      <div class="p1">{{ e.produit }} / {{ e.dci2 }}</div>
      <div class="p2">{{ e.forme }}</div>
    </div>

    <table class="ifh-taille">
      <tbody>
        <tr>
          <td class="lbl">Taille de lot</td>
          <td>Poids (kg) :&nbsp;<b>{{ e.taillePoids }}</b></td>
          <td>Unité dosée (comprimé) :&nbsp;<b>{{ e.uniteDosee }}</b></td>
          <td>Unité vente (boîte) :&nbsp;<b>{{ e.uniteVente }}</b></td>
        </tr>
      </tbody>
    </table>
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
</style>
