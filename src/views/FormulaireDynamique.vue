<script setup>
import { inject, ref, computed, watch } from 'vue'
import { evaluerFormulaire, verdictChamp, verdictCellule, verdictOuiNon, verdictNum, evalFormule, specTexte, mapCalculs } from '../formulaire.js'

const d = inject('doc')
if (!d.saisie || typeof d.saisie !== 'object') d.saisie = {}
if (!d.formulaire || !Array.isArray(d.formulaire.sections)) d.formulaire = { sections: [] }
if (!d.execution || typeof d.execution !== 'object') d.execution = {}
if (!d.execution.signatures || typeof d.execution.signatures !== 'object') d.execution.signatures = {}
if (!Array.isArray(d.execution.audit)) d.execution.audit = []
const utilisateur = inject('utilisateur', ref(''))

// Garantit un tableau pour chaque champ « tableau ».
function ensureTables () {
  for (const s of (d.formulaire.sections || [])) for (const ch of (s.champs || [])) {
    if (ch.type === 'tableau' && !Array.isArray(d.saisie[ch.id])) d.saisie[ch.id] = []
    if (ch.type === 'checklist' && (d.saisie[ch.id] === null || typeof d.saisie[ch.id] !== 'object' || Array.isArray(d.saisie[ch.id]))) d.saisie[ch.id] = {}
  }
}
watch(() => d.formulaire, ensureTables, { deep: true, immediate: true })

// Phases : regroupe les sections par phase, n'affiche que la phase active.
const phases = computed(() => {
  const seen = []
  for (const s of (d.formulaire.sections || [])) { const p = s.phase || 'Dossier'; if (!seen.includes(p)) seen.push(p) }
  return seen
})
const phaseActive = ref(0)
watch(phases, (ps) => { if (phaseActive.value >= ps.length) phaseActive.value = 0 }, { immediate: true })
const phaseNom = computed(() => phases.value[phaseActive.value] || '')
const sectionsPhase = computed(() => (d.formulaire.sections || []).filter(s => (s.phase || 'Dossier') === phaseNom.value))

const res = computed(() => evaluerFormulaire({ sections: sectionsPhase.value }, d.saisie))
const stats = computed(() => res.value.stats)
const deviations = computed(() => res.value.deviations)
const vide = computed(() => !(d.formulaire.sections || []).some(s => (s.champs || []).length))

const bInfo = { conforme: { t: 'Conforme', c: 'ok' }, nc: { t: 'Non conforme', c: 'nc' }, vide: { t: 'À saisir', c: 'vide' } }
const vChamp = (ch) => verdictChamp(ch, d.saisie[ch.id])
const vCell = (col, row) => verdictCellule(col, row ? row[col.id] : '')

// Décompose « 1 · Titre » en numéro + libellé pour un en-tête soigné.
const _m = (t) => /^\s*(\d+)\s*[·.\-)]\s*(.*)$/.exec(t || '')
const secNo = (t) => { const m = _m(t); return m ? m[1] : '' }
const secLabel = (t) => { const m = _m(t); return m ? m[2] : (t || 'Section') }

// Compte des champs réellement contrôlés dans une section (pour le compteur d'en-tête).
function secCtrl (sec) {
  let n = 0
  for (const ch of (sec.champs || [])) {
    if (ch.type === 'num' || ch.type === 'oui_non' || ch.obligatoire) n++
    if (ch.type === 'tableau') n += (ch.colonnes || []).filter(c => c.type === 'num' || c.type === 'oui_non').length
    if (ch.type === 'checklist') n += (ch.items || []).length
    if (ch.type === 'calcul') n++
  }
  return n
}

const statut = computed(() => {
  const s = stats.value
  if (!s.total) return { t: 'Formulaire vide', c: 'g' }
  if (s.saisis === 0) return { t: 'Non démarré', c: 'g' }
  if (s.nc > 0) return { t: `${s.nc} non-conformité(s)`, c: 'r' }
  if (s.pct < 100) return { t: `En cours — ${s.pct} %`, c: 'o' }
  return { t: 'Complet · conforme', c: 'v' }
})

function ligneVide (ch) { const o = {}; for (const col of (ch.colonnes || [])) o[col.id] = ''; return o }
function addLigne (ch) { if (!Array.isArray(d.saisie[ch.id])) d.saisie[ch.id] = []; d.saisie[ch.id].push(ligneVide(ch)) }
function delLigne (ch, i) { d.saisie[ch.id].splice(i, 1) }
function setOui (ch, val) { d.saisie[ch.id] = val }
function setOuiCell (row, col, val) { row[col.id] = val }

// Pièces jointes (fichier) — stockées en data-URL dans la saisie.
function saisieFile (ch) { const v = d.saisie[ch.id]; return v && typeof v === 'object' && v.data ? v : null }
function isImg (ch) { const f = saisieFile(ch); return !!(f && /^image\//.test(f.type || '')) }
function fmtSize (n) { n = Number(n) || 0; return n < 1024 ? n + ' o' : n < 1048576 ? (n / 1024).toFixed(0) + ' Ko' : (n / 1048576).toFixed(1) + ' Mo' }
function removeFile (ch) { d.saisie[ch.id] = null }
function onFile (ch, ev) {
  const f = ev.target.files && ev.target.files[0]; if (!f) return
  if (f.size > 4 * 1048576) { alert('Fichier trop volumineux (max 4 Mo). Réduisez la taille ou scannez en plus basse résolution.'); ev.target.value = ''; return }
  const r = new FileReader()
  r.onload = () => { d.saisie[ch.id] = { name: f.name, type: f.type, size: f.size, data: r.result } }
  r.readAsDataURL(f)
}

// Check-list : valeurs par point dans une map saisie[ch.id][item.id].
function chkVal (ch, it) { const m = d.saisie[ch.id]; return (m && typeof m === 'object' && !Array.isArray(m)) ? (m[it.id] || '') : '' }
function setChk (ch, it, val) { let m = d.saisie[ch.id]; if (!m || typeof m !== 'object' || Array.isArray(m)) { m = {}; d.saisie[ch.id] = m }; m[it.id] = val }
function vChk (ch, it) { return verdictOuiNon(chkVal(ch, it), ch.attendu) }

// Calcul automatique (champ dérivé d'une formule). La map des formules permet
// aux calculs de se référencer entre eux (ex. rendement ← N_théo, N_CP).
const calcMap = computed(() => mapCalculs(d.formulaire))
function calcVal (ch) { return evalFormule(ch.formule, d.saisie, calcMap.value) }
function calcAffiche (ch) { const n = calcVal(ch); if (n === null) return '—'; const r = Math.round(n * 1000) / 1000; return ch.unite ? (r + ' ' + ch.unite) : String(r) }
function vCalc (ch) { const n = calcVal(ch); return n === null ? 'vide' : verdictNum(n, ch.min, ch.max) }

// Signatures par section (opérateur / vérificateur) + journal d'audit.
const ROLES = { op: 'Opérateur', verif: 'Vérificateur' }
function sig (sec, role) { const s = d.execution.signatures[sec.id]; return (s && s[role]) ? s[role] : null }
function fmtTs (iso) { try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch (e) { return iso } }
function signer (sec, role) {
  const nom = (window.prompt('Signature — ' + ROLES[role] + '\nNom du signataire :', utilisateur.value || '') || '').trim()
  if (!nom) return
  if (!d.execution.signatures[sec.id]) d.execution.signatures[sec.id] = {}
  const ts = new Date().toISOString()
  d.execution.signatures[sec.id][role] = { nom, ts }
  d.execution.audit.unshift({ ts, user: nom, action: 'Signature ' + ROLES[role] + ' — ' + secLabel(sec.titre) })
}
function designer (sec, role) {
  const s = sig(sec, role); if (!s) return
  if (!window.confirm('Annuler la signature ' + ROLES[role] + ' de cette section ?')) return
  delete d.execution.signatures[sec.id][role]
  d.execution.audit.unshift({ ts: new Date().toISOString(), user: utilisateur.value || s.nom, action: 'Annulation signature ' + ROLES[role] + ' — ' + secLabel(sec.titre) })
}
</script>

<template>
  <div class="fd">
    <div v-if="vide" class="fd-empty noprint">
      <div class="fd-empty-ic">📋</div>
      <p class="fd-empty-t">Aucun formulaire pour ce produit</p>
      <p class="fd-empty-s">Ouvrez le <b>Constructeur</b> (bouton ✦) pour composer le dossier de ce produit — sections, champs, limites — ou chargez le <b>Modèle intégré</b> (bouton ↺) s'il en existe un.</p>
    </div>

    <template v-else>
      <!-- En-tête compact du dossier (produit · réf · lot) -->
      <div v-if="d.entete && d.entete.produit" class="fd-head">
        <div class="fd-head-l">
          <div class="fd-head-prod">{{ d.produit || d.entete.produit }}<span v-if="d.entete.forme" class="fd-head-forme"> · {{ d.entete.forme }}</span></div>
          <div class="fd-head-ref">
            <span v-if="d.entete.refIf">Réf IF <b>{{ d.entete.refIf }}</b></span>
            <span v-if="d.entete.version">Version <b>{{ d.entete.version }}</b></span>
            <span v-if="d.entete.refSop">{{ d.entete.refSop }}</span>
            <span v-if="d.entete.taillePoids">Lot <b>{{ d.entete.taillePoids }} kg</b></span>
            <span v-if="d.entete.uniteDosee"><b>{{ d.entete.uniteDosee }}</b> cp</span>
          </div>
        </div>
        <div class="fd-head-r">
          <span class="fd-head-step">{{ (phaseNom || 'Dossier').toUpperCase() }}</span>
          <label class="fd-head-f">N° lot<input v-model="d.lot.numeroLotInterne" placeholder="—" /></label>
          <label class="fd-head-f">N° OF<input v-model="d.lot.ofN" placeholder="—" /></label>
        </div>
      </div>

      <!-- Sélecteur de phases -->
      <div v-if="phases.length > 1" class="fd-phases noprint">
        <button v-for="(p, i) in phases" :key="p" type="button" class="fd-phase" :class="{ on: i === phaseActive }" @click="phaseActive = i">{{ p }}</button>
      </div>

      <!-- Bandeau d'état -->
      <div class="hud" :class="'s-' + statut.c">
        <div class="hud-top">
          <span class="hud-badge">{{ statut.t }}</span>
          <span class="hud-sub">Contrôle des paramètres · data integrity</span>
        </div>
        <div class="hud-stats">
          <div class="ks"><b>{{ stats.pct }}%</b><span>complétude</span></div>
          <div class="ks sep"><b>{{ stats.conformes }}</b><span>conformes</span></div>
          <div class="ks"><b>{{ stats.nc }}</b><span>non conf.</span></div>
          <div class="ks"><b>{{ stats.manquants }}</b><span>à saisir</span></div>
        </div>
        <div class="hud-prog"><div class="hud-bar" :style="{ width: stats.pct + '%' }"></div></div>
      </div>

      <!-- Sections de la phase active -->
      <section v-for="sec in sectionsPhase" :key="sec.id" class="fd-sec">
        <div class="fd-sec-head">
          <span v-if="secNo(sec.titre)" class="fd-sec-no">{{ secNo(sec.titre) }}</span>
          <h3 class="fd-sec-t">{{ secLabel(sec.titre) }}</h3>
          <span v-if="secCtrl(sec)" class="fd-sec-ct">{{ secCtrl(sec) }} contrôle{{ secCtrl(sec) > 1 ? 's' : '' }}</span>
        </div>

        <div class="fd-fields" :class="{ two: sec.cols === 2 }">
        <div v-for="ch in sec.champs" :key="ch.id" class="fd-champ" :class="{ tab: ch.type === 'tableau' || ch.type === 'note' || ch.type === 'fichier' || ch.type === 'checklist' }">
          <!-- Note / consignes (lecture seule) -->
          <template v-if="ch.type === 'note'">
            <details class="fd-note" open>
              <summary class="fd-note-h">📄 {{ ch.label || 'Note' }}</summary>
              <div class="fd-note-body">{{ ch.contenu }}</div>
            </details>
          </template>

          <!-- Pièce jointe (fichier) -->
          <template v-else-if="ch.type === 'fichier'">
            <div class="fd-file">
              <div class="fd-lbl"><span class="fd-lbl-t">📎 {{ ch.label || 'Pièce jointe' }}<span v-if="ch.obligatoire" class="fd-req">*</span></span></div>
              <div v-if="saisieFile(ch)" class="fd-file-has">
                <img v-if="isImg(ch)" :src="saisieFile(ch).data" class="fd-file-th" alt="aperçu" />
                <span v-else class="fd-file-ic">📄</span>
                <a :href="saisieFile(ch).data" :download="saisieFile(ch).name" class="fd-file-link">{{ saisieFile(ch).name }}</a>
                <span class="fd-file-sz">{{ fmtSize(saisieFile(ch).size) }}</span>
                <button class="fd-del noprint" @click="removeFile(ch)" title="Retirer le fichier">✕</button>
              </div>
              <label v-else class="fd-file-drop noprint">
                <input type="file" accept="image/*,application/pdf" @change="onFile(ch, $event)" hidden />
                <span>＋ Joindre un fichier (image ou PDF, max 4 Mo)</span>
              </label>
            </div>
          </template>

          <!-- Check-list (liste de points avec C/NC ou Oui/Non) -->
          <template v-else-if="ch.type === 'checklist'">
            <div class="fd-lbl fd-chk-h"><span class="fd-lbl-t">☑ {{ ch.label || 'Check-list' }}</span><span class="fd-spec">Attendu : {{ ch.attendu }}</span></div>
            <ul class="fd-chk">
              <li v-for="it in ch.items" :key="it.id" class="fd-chk-it">
                <span class="fd-chk-lbl">{{ it.label || '—' }}</span>
                <div class="fd-chk-ctrl">
                  <div class="fd-onoff sm">
                    <button v-for="o in ch.options" :key="o" type="button" :class="{ on: chkVal(ch, it) === o, bad: chkVal(ch, it) === o && o !== ch.attendu }" @click="setChk(ch, it, o)">{{ o }}</button>
                  </div>
                  <span v-if="vChk(ch, it) !== 'vide'" class="vb" :class="bInfo[vChk(ch, it)].c">{{ bInfo[vChk(ch, it)].t }}</span>
                </div>
              </li>
            </ul>
          </template>

          <!-- Calcul automatique (lecture seule) -->
          <template v-else-if="ch.type === 'calcul'">
            <div class="fd-lbl">
              <span class="fd-lbl-t">∑ {{ ch.label || '—' }}</span>
              <span v-if="specTexte(ch)" class="fd-spec">{{ specTexte(ch) }}</span>
            </div>
            <div class="fd-ctrl">
              <span class="fd-calc" :class="{ nc: vCalc(ch) === 'nc', ok: vCalc(ch) === 'conforme' }">{{ calcAffiche(ch) }}</span>
              <span v-if="vCalc(ch) !== 'vide'" class="vb" :class="bInfo[vCalc(ch)].c">{{ bInfo[vCalc(ch)].t }}</span>
            </div>
          </template>

          <!-- Champs simples -->
          <template v-else-if="ch.type !== 'tableau'">
            <div class="fd-lbl">
              <span class="fd-lbl-t">{{ ch.label || '—' }}<span v-if="ch.obligatoire" class="fd-req">*</span></span>
              <span v-if="specTexte(ch)" class="fd-spec">{{ specTexte(ch) }}</span>
            </div>
            <div class="fd-ctrl">
              <template v-if="ch.type === 'num'">
                <input class="fd-in" :class="{ nc: vChamp(ch) === 'nc', ok: vChamp(ch) === 'conforme' }" v-model="d.saisie[ch.id]" placeholder="valeur" inputmode="decimal" />
              </template>
              <template v-else-if="ch.type === 'oui_non'">
                <div class="fd-onoff">
                  <button v-for="o in ch.options" :key="o" type="button" :class="{ on: d.saisie[ch.id] === o, bad: d.saisie[ch.id] === o && o !== ch.attendu }" @click="setOui(ch, o)">{{ o }}</button>
                </div>
              </template>
              <template v-else-if="ch.type === 'date'">
                <input class="fd-in" v-model="d.saisie[ch.id]" placeholder="jj/mm/aaaa ou heure" />
              </template>
              <template v-else>
                <input class="fd-in" v-model="d.saisie[ch.id]" placeholder="…" />
              </template>
              <span v-if="vChamp(ch) !== 'vide'" class="vb" :class="bInfo[vChamp(ch)].c">{{ bInfo[vChamp(ch)].t }}</span>
            </div>
          </template>

          <!-- Tableau -->
          <template v-else>
            <div class="fd-tabhead">
              <div class="fd-lbl"><span class="fd-lbl-t">{{ ch.label || 'Tableau' }}<span v-if="ch.obligatoire" class="fd-req">*</span></span></div>
              <button class="fd-addrow noprint" @click="addLigne(ch)">+ ligne</button>
            </div>
            <div class="fd-tblwrap">
              <table class="fd-tbl">
                <thead><tr><th class="fd-th-n">#</th><th v-for="col in ch.colonnes" :key="col.id">{{ col.label }}<span v-if="specTexte(col)" class="th-spec">{{ specTexte(col) }}</span></th><th class="noprint"></th></tr></thead>
                <tbody>
                  <tr v-for="(row, ri) in (d.saisie[ch.id] || [])" :key="ri">
                    <td class="fd-td-n">{{ ri + 1 }}</td>
                    <td v-for="col in ch.colonnes" :key="col.id">
                      <div v-if="col.type === 'oui_non'" class="fd-onoff sm">
                        <button v-for="o in (col.options || ['Conforme','Non conforme'])" :key="o" type="button" :class="{ on: row[col.id] === o, bad: row[col.id] === o && o !== col.attendu }" @click="setOuiCell(row, col, o)">{{ o }}</button>
                      </div>
                      <input v-else class="fd-in sm" :class="{ nc: vCell(col, row) === 'nc', ok: vCell(col, row) === 'conforme' }" v-model="row[col.id]" />
                    </td>
                    <td class="ta-c noprint"><button class="fd-del" @click="delLigne(ch, ri)" title="Supprimer la ligne">✕</button></td>
                  </tr>
                  <tr v-if="!(d.saisie[ch.id] || []).length"><td :colspan="ch.colonnes.length + 2" class="fd-tbl-empty">Aucune ligne — utilisez « + ligne ».</td></tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
        </div>
        <div class="fd-sign">
          <div v-for="role in ['op', 'verif']" :key="role" class="fd-sign-slot" :class="{ done: sig(sec, role) }">
            <span class="fd-sign-role">{{ role === 'op' ? '✍ Opérateur' : '✔ Vérificateur' }}</span>
            <template v-if="sig(sec, role)">
              <span class="fd-sign-nom">{{ sig(sec, role).nom }}</span>
              <span class="fd-sign-ts">{{ fmtTs(sig(sec, role).ts) }}</span>
              <button class="fd-sign-x noprint" @click="designer(sec, role)" title="Annuler la signature">annuler</button>
            </template>
            <button v-else class="fd-sign-btn noprint" @click="signer(sec, role)">Signer</button>
          </div>
        </div>
      </section>

      <!-- Déviations -->
      <section class="fd-sec dev" :class="{ empty: !deviations.length }">
        <div class="fd-sec-head">
          <span class="fd-sec-no dev-no">!</span>
          <h3 class="fd-sec-t dev-t">Déviations — paramètres hors spécification</h3>
          <span class="dev-n">{{ deviations.length }}</span>
        </div>
        <p v-if="!deviations.length" class="dev-ok">✓ Aucune déviation : tous les paramètres contrôlés saisis sont conformes.</p>
        <ul v-else class="dev-list">
          <li v-for="(dv, i) in deviations" :key="i"><span class="vb nc">NC</span> <b>{{ dv.libelle }}</b> — mesuré : {{ dv.valeur || '—' }}<span v-if="dv.spec"> · spéc. : {{ dv.spec }}</span></li>
        </ul>
      </section>

      <!-- Journal d'audit -->
      <section v-if="d.execution.audit && d.execution.audit.length" class="fd-sec">
        <div class="fd-sec-head">
          <span class="fd-sec-no fd-audit-no">⎙</span>
          <h3 class="fd-sec-t">Journal d'audit</h3>
          <span class="fd-sec-ct">{{ d.execution.audit.length }} événement(s)</span>
        </div>
        <ul class="fd-audit">
          <li v-for="(a, i) in d.execution.audit" :key="i">
            <span class="fd-audit-ts">{{ fmtTs(a.ts) }}</span>
            <span class="fd-audit-u">{{ a.user }}</span>
            <span class="fd-audit-a">{{ a.action }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.fd { color: #1b2733; }

/* En-tête compact du dossier */
.fd-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; background: #fff; border: 1px solid #e6edf3; border-left: 4px solid #0e7490; border-radius: 12px; padding: 9px 14px; margin-bottom: 10px; }
.fd-head-prod { font-size: 15px; font-weight: 800; color: #0f2a37; line-height: 1.2; }
.fd-head-forme { font-weight: 600; color: #64748b; font-size: 13px; }
.fd-head-ref { display: flex; flex-wrap: wrap; gap: 2px 14px; font-size: 11.5px; color: #64748b; margin-top: 3px; }
.fd-head-ref b { color: #334155; }
.fd-head-r { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.fd-head-step { align-self: center; font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #fff; background: #0e7490; border-radius: 6px; padding: 5px 11px; }
.fd-head-f { display: flex; flex-direction: column; font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: .3px; gap: 2px; }
.fd-head-f input { font: inherit; font-size: 13px; font-weight: 600; text-transform: none; letter-spacing: 0; color: #0f2a37; border: 1px solid #cbd5e1; border-radius: 7px; padding: 5px 8px; width: 118px; }
.fd-head-f input:focus { outline: 0; border-color: #0891b2; box-shadow: 0 0 0 3px rgba(8,145,178,.15); }

/* Sélecteur de phases */
.fd-phases { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 11px; }
.fd-phase { font: inherit; font-size: 12.5px; font-weight: 700; color: #475569; background: #fff; border: 1px solid #cbd5e1; border-radius: 999px; padding: 7px 16px; cursor: pointer; transition: background .12s, color .12s, border-color .12s; }
.fd-phase:hover { background: #f1f5f9; }
.fd-phase.on { background: #0e7490; color: #fff; border-color: #0e7490; box-shadow: 0 4px 12px -5px rgba(14,116,144,.6); }

/* État vide */
.fd-empty { text-align: center; padding: 46px 22px; background: #fff; border: 1px dashed #cbd5e1; border-radius: 16px; }
.fd-empty-ic { font-size: 34px; margin-bottom: 8px; }
.fd-empty-t { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
.fd-empty-s { font-size: 13px; color: #64748b; max-width: 560px; margin: 0 auto; line-height: 1.6; }

/* Bandeau d'état */
.hud { border-radius: 13px; padding: 10px 16px 9px; margin-bottom: 11px; color: #fff; position: relative; overflow: hidden; box-shadow: 0 8px 20px -14px rgba(2,8,23,.5); }
.hud.s-g { background: linear-gradient(120deg,#475569,#334155); }
.hud.s-o { background: linear-gradient(120deg,#ea8a0d,#b45309); }
.hud.s-r { background: linear-gradient(120deg,#ef4444,#9f1239); }
.hud.s-v { background: linear-gradient(120deg,#10b981,#047857); }
.hud-top { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.hud-badge { font-size: 16px; font-weight: 800; letter-spacing: .2px; }
.hud-sub { font-size: 12px; opacity: .85; text-transform: uppercase; letter-spacing: .6px; }
.hud-stats { display: flex; gap: 0; margin: 7px 0 9px; flex-wrap: wrap; }
.ks { display: flex; flex-direction: column; font-size: 10.5px; opacity: .95; padding: 0 15px; }
.ks:first-child { padding-left: 0; }
.ks.sep, .ks + .ks { border-left: 1px solid rgba(255,255,255,.25); }
.ks b { font-size: 18px; font-weight: 800; line-height: 1.1; }
.ks span { opacity: .82; margin-top: 2px; }
.hud-prog { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: rgba(255,255,255,.22); }
.hud-bar { height: 100%; background: #fff; transition: width .35s ease; }

/* Section */
.fd-sec { background: #fff; border: 1px solid #e6edf3; border-radius: 12px; padding: 2px 14px 10px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
.fd-sec-head { display: flex; align-items: center; gap: 10px; padding: 9px 0 8px; margin-bottom: 4px; border-bottom: 2px solid #ecf1f6; }
.fd-sec-no { flex: none; width: 26px; height: 26px; border-radius: 8px; background: #0e7490; color: #fff; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
.fd-sec-t { margin: 0; font-size: 13.5px; font-weight: 800; color: #0f2a37; flex: 1; }
.fd-sec-ct { flex: none; font-size: 10.5px; font-weight: 700; color: #0e7490; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 999px; padding: 2px 9px; white-space: nowrap; }

/* Ligne champ : libellé à gauche, contrôle à droite */
.fd-champ { display: grid; grid-template-columns: 1fr; gap: 5px; padding: 6px 0; border-bottom: 1px solid #f3f6f9; }
.fd-champ:last-child { border-bottom: 0; }
.fd-lbl { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fd-lbl-t { font-size: 13px; font-weight: 600; color: #263445; line-height: 1.35; }
.fd-req { color: #e11d48; font-weight: 800; margin-left: 3px; }
.fd-spec { font-size: 11.5px; color: #64748b; font-weight: 600; }
.fd-ctrl { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.fd-in { font: inherit; font-size: 13px; padding: 6px 9px; border: 1px solid #cbd5e1; border-radius: 8px; min-width: 140px; background: #fff; transition: border-color .15s, background .15s, box-shadow .15s; }
.fd-in:focus { outline: 0; border-color: #0891b2; box-shadow: 0 0 0 3px rgba(8,145,178,.15); }
.fd-in.sm { min-width: 0; width: 100%; padding: 6px 8px; }
.fd-in.ok { border-color: #86efac; background: #f0fdf4; }
.fd-in.nc { border-color: #fca5a5; background: #fef2f2; }
.fd-calc { font-size: 15px; font-weight: 800; color: #0f2a37; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 14px; min-width: 110px; text-align: right; font-variant-numeric: tabular-nums; }
.fd-calc.ok { background: #f0fdf4; border-color: #86efac; color: #047857; }
.fd-calc.nc { background: #fef2f2; border-color: #fca5a5; color: #be123c; }

/* Segmenté Oui/Non · C/NC · Conforme */
.fd-onoff { display: inline-flex; gap: 0; border: 1px solid #cbd5e1; border-radius: 9px; overflow: hidden; background: #fff; }
.fd-onoff button { font: inherit; font-size: 12.5px; font-weight: 700; padding: 7px 14px; border: 0; border-left: 1px solid #e2e8f0; background: #fff; color: #475569; cursor: pointer; transition: background .12s, color .12s; }
.fd-onoff button:first-child { border-left: 0; }
.fd-onoff.sm button { padding: 5px 10px; font-size: 11.5px; }
.fd-onoff button:hover { background: #f1f5f9; }
.fd-onoff button.on { background: #0891b2; color: #fff; }
.fd-onoff button.on.bad { background: #e11d48; }

/* Badge de verdict */
.vb { display: inline-flex; align-items: center; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap; letter-spacing: .2px; }
.vb.ok { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.vb.ok::before { content: '✓ '; }
.vb.nc { background: #fef2f2; color: #be123c; border: 1px solid #fecaca; }
.vb.vide { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

/* Tableau */
.fd-champ.tab { display: block; }
.fd-tabhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.fd-tblwrap { overflow-x: auto; border: 1px solid #e6edf3; border-radius: 10px; }
.fd-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 520px; }
.fd-tbl thead th { text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; color: #5b6b7d; padding: 8px 8px; background: #f7fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.fd-tbl .th-spec { display: block; font-weight: 600; color: #94a3b8; font-size: 9.5px; text-transform: none; letter-spacing: 0; }
.fd-tbl .fd-th-n, .fd-tbl .fd-td-n { width: 30px; text-align: center; color: #94a3b8; font-weight: 700; }
.fd-tbl tbody td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.fd-tbl tbody tr:nth-child(even) td { background: #fbfcfe; }
.fd-tbl-empty { text-align: center; color: #94a3b8; font-style: italic; padding: 12px; }
.fd-del { border: 0; background: #fef2f2; color: #be123c; border-radius: 7px; padding: 4px 8px; cursor: pointer; font-size: 11px; line-height: 1; }
.fd-del:hover { background: #fee2e2; }
.fd-addrow { font: inherit; font-size: 11.5px; font-weight: 700; color: #0e7490; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; padding: 5px 12px; cursor: pointer; white-space: nowrap; }
.fd-addrow:hover { background: #cffafe; }
.ta-c { text-align: center; }

/* Déviations */
.dev { border-color: #fecaca; }
.dev.empty { border-color: #bbf7d0; }
.dev-no { background: #e11d48; }
.dev.empty .dev-no { background: #16a34a; }
.dev-t { color: #0f2a37; }
.dev-n { flex: none; background: #e11d48; color: #fff; font-size: 11px; font-weight: 800; min-width: 22px; text-align: center; padding: 2px 8px; border-radius: 999px; }
.dev.empty .dev-n { background: #16a34a; }
.dev-ok { color: #047857; font-size: 13px; font-weight: 600; margin: 8px 0 2px; }
.dev-list { list-style: none; padding: 0; margin: 6px 0 0; font-size: 12.5px; color: #334155; }
.dev-list li { padding: 7px 0; border-bottom: 1px dashed #f1f5f9; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.dev-list li:last-child { border-bottom: 0; }

/* Note / consignes (bloc pliable) */
.fd-note { border: 1px solid #fde68a; background: #fffbeb; border-radius: 10px; margin: 2px 0; }
.fd-note-h { cursor: pointer; font-size: 13px; font-weight: 700; color: #92400e; padding: 7px 12px; list-style: none; display: flex; align-items: center; gap: 8px; }
.fd-note-h::-webkit-details-marker { display: none; }
.fd-note[open] .fd-note-h { border-bottom: 1px solid #fde68a; }
.fd-note-body { padding: 8px 12px; font-size: 12px; color: #4a3514; line-height: 1.5; white-space: pre-line; }

/* Pièce jointe (fichier) */
.fd-file-has { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
.fd-file-th { width: 48px; height: 48px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; }
.fd-file-ic { font-size: 24px; }
.fd-file-link { font-size: 13px; font-weight: 600; color: #0e7490; text-decoration: none; word-break: break-all; }
.fd-file-link:hover { text-decoration: underline; }
.fd-file-sz { font-size: 11px; color: #94a3b8; }
.fd-file-drop { display: inline-flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 12.5px; font-weight: 600; color: #0e7490; background: #ecfeff; border: 1px dashed #67e8f9; border-radius: 9px; padding: 10px 15px; cursor: pointer; }
.fd-file-drop:hover { background: #cffafe; }

/* Check-list */
.fd-chk-h { margin-bottom: 8px; }
.fd-chk { list-style: none; margin: 0; padding: 0; border: 1px solid #e6edf3; border-radius: 10px; overflow: hidden; }
.fd-chk-it { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 6px 12px; border-bottom: 1px solid #f1f5f9; }
.fd-chk-it:nth-child(even) { background: #fbfcfe; }
.fd-chk-it:last-child { border-bottom: 0; }
.fd-chk-lbl { font-size: 13px; color: #334155; font-weight: 500; line-height: 1.35; }
.fd-chk-ctrl { display: flex; align-items: center; gap: 10px; flex: none; }

/* Signatures par section */
.fd-sign { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
.fd-sign-slot { flex: 1 1 220px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; border: 1px solid #e6edf3; border-radius: 9px; padding: 7px 11px; background: #f8fafc; }
.fd-sign-slot.done { border-color: #a7f3d0; background: #f0fdf4; }
.fd-sign-role { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: .3px; }
.fd-sign-slot.done .fd-sign-role { color: #047857; }
.fd-sign-nom { font-size: 13px; font-weight: 700; color: #0f2a37; }
.fd-sign-ts { font-size: 11px; color: #64748b; }
.fd-sign-btn { margin-left: auto; font: inherit; font-size: 12px; font-weight: 700; color: #0e7490; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 7px; padding: 5px 13px; cursor: pointer; }
.fd-sign-btn:hover { background: #cffafe; }
.fd-sign-x { margin-left: auto; font: inherit; font-size: 11px; color: #be123c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 3px 9px; cursor: pointer; }

/* Journal d'audit */
.fd-audit-no { background: #334155; }
.fd-audit { list-style: none; margin: 0; padding: 0; font-size: 12px; }
.fd-audit li { display: grid; grid-template-columns: 130px 150px 1fr; gap: 10px; padding: 6px 2px; border-bottom: 1px dashed #f1f5f9; align-items: baseline; }
.fd-audit li:last-child { border-bottom: 0; }
.fd-audit-ts { color: #64748b; font-variant-numeric: tabular-nums; }
.fd-audit-u { font-weight: 700; color: #0f2a37; }
.fd-audit-a { color: #334155; }
@media (max-width: 560px) { .fd-audit li { grid-template-columns: 1fr; gap: 2px; } }

/* Large : libellé à gauche, contrôle aligné à droite */
@media (min-width: 680px) {
  .fd-champ:not(.tab) { grid-template-columns: minmax(0, 1fr) minmax(240px, auto); align-items: center; gap: 10px 20px; }
  .fd-champ:not(.tab) .fd-ctrl { justify-content: flex-end; }
}

/* Mise en page 2 colonnes (option par section) : les champs simples se
   répartissent sur 2 colonnes (libellé au-dessus) ; notes, tableaux et pièces
   jointes restent sur toute la largeur. */
@media (min-width: 680px) {
  .fd-fields.two { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; align-items: start; }
  .fd-fields.two .fd-champ.tab { grid-column: 1 / -1; }
  .fd-fields.two .fd-champ:not(.tab) { grid-template-columns: 1fr; align-items: stretch; gap: 6px; }
  .fd-fields.two .fd-champ:not(.tab) .fd-ctrl { justify-content: flex-start; }
}

@media print {
  .noprint { display: none !important; }
  .hud { color: #000; background: none !important; box-shadow: none; border: 1px solid #000; }
  .ks.sep, .ks + .ks { border-color: #999; }
  .hud-bar { background: #000; }
  .fd-sec { box-shadow: none; border-color: #000; break-inside: avoid; }
  .fd-in, .fd-onoff { border-color: #000; }
}
</style>
