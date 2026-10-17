<script setup>
// Dossier imprimable GÉNÉRÉ à partir de la saisie du formulaire dynamique.
// Rend toutes les phases (y compris les fractions) et toutes les sections avec
// les valeurs réellement saisies, les calculs, les check-lists, les tableaux et
// les signatures. Remplace l'ancienne vue Pesée statique (déconnectée de la saisie).
import { inject, computed } from 'vue'
import IfHeader from '../components/IfHeader.vue'
import { evalFormule, mapCalculs, verdictChamp, verdictCellule, verdictOuiNon, verdictNum, specTexte } from '../formulaire.js'

const d = inject('doc')
const calcMap = computed(() => mapCalculs(d.formulaire || { sections: [] }))

const phases = computed(() => {
  const seen = []
  for (const s of ((d.formulaire && d.formulaire.sections) || [])) { const p = s.phase || 'Dossier'; if (!seen.includes(p)) seen.push(p) }
  return seen
})
function sectionsOf (ph) { return ((d.formulaire && d.formulaire.sections) || []).filter(s => (s.phase || 'Dossier') === ph) }

const _m = (t) => /^\s*(\d+(?:\.\d+)?)\s*[·.\-)]\s*(.*)$/.exec(t || '')
const secNo = (t) => { const m = _m(t); return m ? m[1] : '' }
const secLabel = (t) => { const m = _m(t); return m ? m[2] : (t || 'Section') }

function val (ch) { const v = d.saisie ? d.saisie[ch.id] : ''; return (v === null || v === undefined) ? '' : v }
function valUnite (ch) { const v = val(ch); if (v === '') return ''; return ch.unite ? (v + ' ' + ch.unite) : String(v) }
function vChamp (ch) { return verdictChamp(ch, val(ch)) }

function calcVal (ch) { return evalFormule(ch.formule, d.saisie, calcMap.value) }
function calcAff (ch) { const n = calcVal(ch); if (n === null) return ''; const r = Math.round(n * 1000) / 1000; return ch.unite ? (r + ' ' + ch.unite) : String(r) }
function vCalc (ch) { const n = calcVal(ch); return n === null ? 'vide' : verdictNum(n, ch.min, ch.max) }

function chkVal (ch, it) { const m = d.saisie ? d.saisie[ch.id] : null; return (m && typeof m === 'object' && !Array.isArray(m)) ? (m[it.id] || '') : '' }

function rows (ch) { const r = d.saisie ? d.saisie[ch.id] : null; return Array.isArray(r) ? r : [] }
function cell (row, col) { return row ? (row[col.id] ?? '') : '' }

function fileOf (ch) { const v = d.saisie ? d.saisie[ch.id] : null; return (v && typeof v === 'object' && v.data) ? v : null }
function isImg (ch) { const f = fileOf(ch); return !!(f && /^image\//.test(f.type || '')) }

function sig (sec, role) { const s = d.execution && d.execution.signatures ? d.execution.signatures[sec.id] : null; return (s && s[role]) ? s[role] : null }
function fmtTs (iso) { try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch (e) { return iso } }

const mark = (v) => v === 'conforme' ? 'C' : (v === 'nc' ? 'NC' : '')
</script>

<template>
  <div class="dim">
    <div v-for="(ph, i) in phases" :key="ph" class="if-sheet">
      <IfHeader frm="FRM3" :page="3 + i" showLot :etape="(ph || 'Dossier').toUpperCase()" />

      <section v-for="sec in sectionsOf(ph)" :key="sec.id" class="dim-sec">
        <div class="dim-sec-h"><span v-if="secNo(sec.titre)" class="dim-no">{{ secNo(sec.titre) }}</span>{{ secLabel(sec.titre) }}</div>

        <template v-for="ch in sec.champs" :key="ch.id">
          <!-- Note / consignes -->
          <div v-if="ch.type === 'note'" class="dim-note"><div class="dim-note-t">{{ ch.label }}</div><div class="dim-note-b">{{ ch.contenu }}</div></div>

          <!-- Pièce jointe -->
          <div v-else-if="ch.type === 'fichier'" class="dim-row">
            <span class="dim-l">{{ ch.label }}</span>
            <span class="dim-v"><template v-if="fileOf(ch)"><img v-if="isImg(ch)" :src="fileOf(ch).data" class="dim-th" alt="" /> {{ fileOf(ch).name }}</template><template v-else>……………………</template></span>
          </div>

          <!-- Check-list -->
          <template v-else-if="ch.type === 'checklist'">
            <div class="dim-blk-h">{{ ch.label }} <i>(attendu : {{ ch.attendu }})</i></div>
            <table class="dim-tbl"><tbody>
              <tr v-for="it in ch.items" :key="it.id"><td>{{ it.label }}</td><td class="dim-c">{{ chkVal(ch, it) || '…' }}</td></tr>
            </tbody></table>
          </template>

          <!-- Tableau -->
          <template v-else-if="ch.type === 'tableau'">
            <div class="dim-blk-h">{{ ch.label }}</div>
            <table class="dim-tbl">
              <thead><tr><th class="dim-n">#</th><th v-for="col in ch.colonnes" :key="col.id">{{ col.label }}</th></tr></thead>
              <tbody>
                <tr v-for="(row, ri) in rows(ch)" :key="ri"><td class="dim-n">{{ ri + 1 }}</td><td v-for="col in ch.colonnes" :key="col.id">{{ cell(row, col) }}</td></tr>
                <tr v-if="!rows(ch).length"><td :colspan="ch.colonnes.length + 1" class="dim-empty">— aucune ligne saisie —</td></tr>
              </tbody>
            </table>
          </template>

          <!-- Calcul automatique -->
          <div v-else-if="ch.type === 'calcul'" class="dim-row">
            <span class="dim-l">∑ {{ ch.label }}<i v-if="specTexte(ch)"> — {{ specTexte(ch) }}</i></span>
            <span class="dim-v"><b class="dim-val">{{ calcAff(ch) || '…' }}</b> <b v-if="mark(vCalc(ch))" :class="'mk mk-' + vCalc(ch)">{{ mark(vCalc(ch)) }}</b></span>
          </div>

          <!-- Champ simple -->
          <div v-else class="dim-row">
            <span class="dim-l">{{ ch.label }}<i v-if="specTexte(ch)"> — {{ specTexte(ch) }}</i></span>
            <span class="dim-v"><b class="dim-val">{{ valUnite(ch) || '……………………' }}</b> <b v-if="(ch.type === 'num' || ch.type === 'oui_non') && mark(vChamp(ch))" :class="'mk mk-' + vChamp(ch)">{{ mark(vChamp(ch)) }}</b></span>
          </div>
        </template>

        <div class="dim-sign">
          <span>Opérateur&nbsp;: <b>{{ sig(sec, 'op') ? sig(sec, 'op').nom : '………………………' }}</b><i v-if="sig(sec, 'op')"> — {{ fmtTs(sig(sec, 'op').ts) }}</i></span>
          <span>Vérificateur&nbsp;: <b>{{ sig(sec, 'verif') ? sig(sec, 'verif').nom : '………………………' }}</b><i v-if="sig(sec, 'verif')"> — {{ fmtTs(sig(sec, 'verif').ts) }}</i></span>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.dim-sec { border: 1px solid #111; border-top: 0; padding: 0; margin: 0; break-inside: avoid; }
.if-sheet .dim-sec:first-of-type { border-top: 1px solid #111; margin-top: 6px; }
.dim-sec-h { background: #e8eef4; border-bottom: 1px solid #111; font-weight: 700; font-size: 11px; padding: 4px 8px; display: flex; align-items: center; gap: 7px; }
.dim-no { background: #111; color: #fff; font-size: 10px; min-width: 18px; height: 18px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; }
.dim-row { display: flex; justify-content: space-between; gap: 10px; padding: 3px 8px; border-bottom: 1px dotted #9aa7b4; font-size: 11px; }
.dim-row:last-of-type { border-bottom: 0; }
.dim-l { color: #222; }
.dim-l i { color: #64748b; font-style: normal; font-size: 10px; }
.dim-v { white-space: nowrap; text-align: right; }
.dim-val { color: #0b3d5c; font-weight: 700; }
.mk { font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 3px; margin-left: 5px; }
.mk-conforme { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.mk-nc { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.dim-blk-h { font-size: 10.5px; font-weight: 700; padding: 4px 8px 2px; }
.dim-blk-h i { color: #64748b; font-weight: 500; }
.dim-tbl { width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 0 0 2px; }
.dim-tbl th, .dim-tbl td { border: 1px solid #111; padding: 3px 6px; text-align: left; vertical-align: top; }
.dim-tbl th { background: #f1f5f9; font-size: 9px; font-weight: 700; text-align: center; }
.dim-tbl .dim-n { width: 26px; text-align: center; color: #64748b; }
.dim-tbl .dim-c { text-align: center; font-weight: 700; color: #0b3d5c; width: 90px; }
.dim-empty { text-align: center; color: #94a3b8; font-style: italic; }
.dim-note { border: 1px solid #c9b458; background: #fffbeb; margin: 3px 6px; padding: 4px 8px; font-size: 10px; }
.dim-note-t { font-weight: 700; color: #7a5b00; margin-bottom: 2px; }
.dim-note-b { color: #4a3514; white-space: pre-line; line-height: 1.35; }
.dim-sign { display: flex; justify-content: space-between; gap: 12px; border-top: 1px solid #111; background: #f8fafc; font-size: 10px; padding: 4px 8px; }
.dim-sign b { color: #0b3d5c; }
.dim-sign i { color: #64748b; font-style: normal; }
.dim-th { height: 34px; vertical-align: middle; border: 1px solid #cbd5e1; border-radius: 3px; margin-right: 4px; }

@media print {
  .dim-sec, .dim-tbl th, .dim-tbl td, .dim-sign { border-color: #000; }
  .dim-note { border-color: #000; background: none; }
  .dim-val, .dim-sign b { color: #000; }
  .mk-conforme, .mk-nc { background: none; }
}
</style>
