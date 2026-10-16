<script setup>
import { ref, reactive, computed, onMounted, inject, provide } from 'vue'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader.vue'
import IfHeader from '../components/IfHeader.vue'
import EtapePesee from './EtapePesee.vue'

const peutEditer = inject('peutEditer', ref(true))

// Fabrique les collections remplissables de l'étape pesée (toutes vides).
function peseeVide () {
  const mk = (keys) => { const o = {}; keys.forEach(k => { o[k] = '' }); return o }
  const mkN = (n, keys) => Array.from({ length: n }, () => mk(keys))
  return {
    A: '', B: '', certPA: '',
    ajustPA: [mk(['nLot', 'titre', 'teneurEau', 'qTheo', 'qPeser', 'faitDV', 'verifDV'])],
    ajustExc: [mk(['nLot', 'qTheo', 'qPeser', 'faitDV', 'verifDV'])],
    vSalle: '', vFlux: '', vBalances: '', vMateriels: '', vTicketsPA: '', vTicketsExc: '', vFichesUtil: '',
    condDem: mkN(2, ['etape', 'nSalle', 'heure', 'temp', 'hr', 'dp', 'dvOp', 'dvVerif']),
    autor: mk(['instrGen', 'secu', 'condEnv', 'nettoyage']),
    demSup: mk(['date', 'heure', 'visa']),
    demAq: mk(['date', 'heure', 'visa']),
    verifPrelim: mkN(3, ['oui', 'non', 'dv']),
    operateurs: mkN(5, ['shift', 'poste', 'nom', 'date', 'visa', 'verifDV']),
    equip: mkN(2, ['fonctVide', 'statutQual', 'etatVitr', 'faitDV', 'verifDV', 'obs']),
    etal: mkN(2, ['effectue', 'date', 'dvOp', 'dvVerif', 'obs']),
    condProc: mkN(6, ['date', 'moment', 'heure', 'temp', 'hr', 'dp', 'nSalle', 'fait', 'verif']),
    retInterne: mkN(7, ['nLot', 'qte', 'etiq', 'ddr', 'ddp', 'faitDV', 'verifDV']),
    recExterne: mkN(7, ['nLot', 'contenant', 'etiq', 'qCom', 'qLiv', 'ddr', 'ddp', 'faitDV', 'verifDV']),
    peseePA: { debH: '', debD: '', finH: '', finD: '', lignes: [mk(['nLot', 'codeBal', 'g', 't', 'n', 'faitDV', 'b', 'verifDV'])] },
    peseeExc: { debD: '', debH: '', finH: '', finD: '', lignes: mkN(6, ['nLot', 'codeBal', 'g', 't', 'n', 'faitDV', 'b', 'verifDV']) },
    bilan: { bonCom: '', bonRetInt: '', bonRetFin: '', bonAvarie: '', justif: '', dvResp: '', lignes: mkN(7, ['qLiv', 'qPes', 'qRetInt', 'qRetFin', 'qAvar', 'dvSup']) },
    incidents: mkN(3, ['date', 'heureArret', 'nSac', 'motif', 'action', 'dateDem', 'heureDem', 'visa'])
  }
}

/* ============================================================
   Réplique de l'Instruction de Fabrication (IF) — LDM
   Référence AQ-SOP-108-011 · IF PFLDM103 · ROSUSTINE 10 mg
   Construction page par page. Pages reproduites : 1 et 2.
   ============================================================ */
function docVide () {
  return {
    // --- Contenu FIXE de l'IF (produit) — modifiable dans « Paramètres de l'IF » ---
    entete: {
      refSop: 'AQ-SOP-108-011', refIf: 'PFLDM103', version: '05', totalPages: 92,
      produit: 'ROSUSTINE ® 10 mg', dci2: 'Rosuvastatine calcium', forme: 'Comprimé pelliculé',
      taillePoids: '108.00', uniteDosee: '720 000', uniteVente: '24000'
    },
    amm: {
      dci: 'Rosuvastatine sous forme de Rosuvastatine calcique',
      numAmm: '24/19.06 M 269/309',
      titulaire: 'Laboratoires de Diagnostic Maghrebins-LDM',
      dureeValidite: '36 mois',
      refDossierTechnique: 'Juillet-2018'
    },
    redacteurs: [
      { nom: 'KHAMADJA Seloua', fonction: 'Superviseur Fabrication', visa: '' }
    ],
    verificateurs: [
      { nom: 'DJELOUAT Sandra', fonction: 'Superviseur MS&T Transfert technologique', visa: '' },
      { nom: 'BOUDIAF Raid Abderraouf', fonction: 'Spécialiste AQ Validation', visa: '' },
      { nom: 'ASSABA Dikra', fonction: 'Pharmacienne assistante DT de production, cheffe de projet CMC', visa: '' }
    ],
    approbateurs: [
      { nom: 'BAILI Soumeya', fonction: 'Directrice des affaires réglementaires, market access et pharmacovigilance et DT de production', visa: '' },
      { nom: 'KORICHE Saber', fonction: 'Manager AQ', visa: '' }
    ],
    // --- Contenu PROPRE AU LOT (rempli à chaque fabrication) ---
    lot: {
      numeroLotInterne: '', ddf: '', ddp: '', ofN: '',
      debutProcess: '', finProcess: '', numDeviation: '',
      visaSupFab: '', visaRespFab: '', visaAq: ''
    },
    pied: { redacteur: '', verificateur: '', approbateur: '' },
    pesee: peseeVide(),
    statut: 'Brouillon'
  }
}
const d = reactive(docVide())
provide('doc', d)
const dossierId = ref(null)

/* ---------------- Supabase ---------------- */
const liste = ref([])
const erreur = ref('')
const message = ref('')
const tableAbsente = ref(false)
const paramsOuverts = ref(false)

async function charger () { try { await chargerListe() } catch (e) { /* hors-ligne */ } }
async function chargerListe () {
  const r = await supabase.from('dossiers_lot')
    .select('id, numero_lot, code_pf, forme, statut, updated_at')
    .order('updated_at', { ascending: false }).limit(100)
  if (r.error) { tableAbsente.value = /dossiers_lot|schema cache/i.test(r.error.message || '') || r.error.code === '42P01' || r.error.code === 'PGRST205'; liste.value = []; return }
  tableAbsente.value = false
  liste.value = r.data || []
}

function reset () { Object.assign(d, docVide()); dossierId.value = null; message.value = '' }
function nouveau () {
  if (!confirm('Nouveau dossier de lot ? Les saisies non enregistrées seront perdues (le contenu fixe de l\'IF est conservé).')) return
  // on garde le contenu fixe (entete, amm, signataires), on vide le lot
  d.lot = docVide().lot
  d.pied = docVide().pied
  for (const s of [...d.redacteurs, ...d.verificateurs, ...d.approbateurs]) s.visa = ''
  d.statut = 'Brouillon'
  dossierId.value = null
  message.value = 'Nouveau dossier — saisis le N° de lot et les visas.'
}

async function enregistrer () {
  erreur.value = ''; message.value = ''
  if (!d.lot.numeroLotInterne) { erreur.value = 'Renseigne le N° de lot interne avant d\'enregistrer.'; return }
  const payload = {
    numero_lot: d.lot.numeroLotInterne,
    code_pf: d.entete.produit || null,
    numero_of: d.lot.ofN || null,
    forme: d.entete.forme || 'Comprimé pelliculé',
    type: 'dossier',
    statut: d.statut,
    contenu: JSON.parse(JSON.stringify(d))
  }
  let r
  if (dossierId.value) r = await supabase.from('dossiers_lot').update(payload).eq('id', dossierId.value).select('id').single()
  else r = await supabase.from('dossiers_lot').insert(payload).select('id').single()
  if (r.error) {
    if (/dossiers_lot|schema cache|column .* does not exist/i.test(r.error.message || '') || r.error.code === '42P01' || r.error.code === 'PGRST205') { tableAbsente.value = true; erreur.value = 'La table « dossiers_lot » n\'existe pas encore — exécute le script SQL fourni, puis réessaie.' }
    else erreur.value = 'Erreur d\'enregistrement : ' + r.error.message
    return
  }
  dossierId.value = r.data.id
  message.value = 'Dossier enregistré ✓'
  await chargerListe()
}

async function chargerDossier (id) {
  if (!id) return
  const r = await supabase.from('dossiers_lot').select('*').eq('id', id).single()
  if (r.error) { erreur.value = 'Impossible de charger : ' + r.error.message; return }
  Object.assign(d, docVide(), r.data.contenu || {})
  dossierId.value = r.data.id
  message.value = 'Dossier « ' + (d.lot.numeroLotInterne || id) + ' » chargé.'
}

async function supprimer () {
  if (!dossierId.value) return
  if (!confirm('Supprimer définitivement ce dossier enregistré ?')) return
  const r = await supabase.from('dossiers_lot').delete().eq('id', dossierId.value)
  if (r.error) { erreur.value = 'Suppression impossible : ' + r.error.message; return }
  reset(); await chargerListe(); message.value = 'Dossier supprimé.'
}

function imprimer () { window.print() }

const statutCouleur = computed(() => ({
  'Brouillon': '#64748b', 'En cours': '#b45309', 'Terminé': '#0e7490', 'Libéré': '#047857', 'Refusé': '#be123c'
}[d.statut] || '#64748b'))

onMounted(charger)
</script>

<template>
  <div class="dl-page">
    <!-- Barre d'application (écran uniquement) -->
    <div class="noprint">
      <PageHeader title="Instruction de Fabrication"
        subtitle="Réplique de l'IF LDM (AQ-SOP-108-011 · PFLDM103). Construction page par page — pages 1 et 2.">
        <span class="statut" :style="{ background: statutCouleur }">{{ d.statut }}</span>
        <button class="btn ghost sm" @click="nouveau">Nouveau</button>
        <button class="btn sm" :disabled="!peutEditer" @click="enregistrer">Enregistrer</button>
        <button class="btn ghost sm" @click="imprimer">Imprimer</button>
      </PageHeader>

      <p v-if="erreur" class="alert">{{ erreur }}</p>
      <p v-if="message" class="ok-msg">{{ message }}</p>
      <p v-if="tableAbsente" class="warn">⚠️ La table <code>dossiers_lot</code> n'existe pas encore dans Supabase. Le formulaire fonctionne et s'imprime ; l'enregistrement nécessite d'exécuter le script SQL fourni (une fois).</p>

      <section class="card slim">
        <label v-if="liste.length" class="fld inline">Recharger un dossier
          <select @change="chargerDossier($event.target.value); $event.target.value = ''">
            <option value="">— choisir —</option>
            <option v-for="x in liste" :key="x.id" :value="x.id">{{ x.numero_lot }} · {{ x.code_pf || '—' }} · {{ x.statut }}</option>
          </select>
        </label>
        <select v-model="d.statut" class="statut-sel"><option>Brouillon</option><option>En cours</option><option>Terminé</option><option>Libéré</option><option>Refusé</option></select>
        <button class="btn ghost sm" @click="paramsOuverts = !paramsOuverts">{{ paramsOuverts ? 'Masquer' : 'Paramètres de l\'IF (produit, AMM, signataires)' }}</button>
        <button v-if="dossierId" class="btn ghost sm danger" @click="supprimer">Supprimer</button>
      </section>

      <!-- Paramètres FIXES de l'IF (modifiable une fois) -->
      <section v-if="paramsOuverts" class="card params">
        <h3>En-tête IF</h3>
        <div class="grid3">
          <label class="fld">Produit<input v-model="d.entete.produit" /></label>
          <label class="fld">DCI (bandeau)<input v-model="d.entete.dci2" /></label>
          <label class="fld">Forme<input v-model="d.entete.forme" /></label>
          <label class="fld">Référence SOP<input v-model="d.entete.refSop" /></label>
          <label class="fld">Référence IF<input v-model="d.entete.refIf" /></label>
          <label class="fld">Version<input v-model="d.entete.version" /></label>
          <label class="fld">Poids lot (kg)<input v-model="d.entete.taillePoids" /></label>
          <label class="fld">Unité dosée (comprimé)<input v-model="d.entete.uniteDosee" /></label>
          <label class="fld">Unité vente (boîte)<input v-model="d.entete.uniteVente" /></label>
          <label class="fld">Nombre total de pages<input v-model.number="d.entete.totalPages" type="number" /></label>
        </div>
        <h3>AMM</h3>
        <div class="grid2">
          <label class="fld">DCI<input v-model="d.amm.dci" /></label>
          <label class="fld">N° d'AMM<input v-model="d.amm.numAmm" /></label>
          <label class="fld">Titulaire de l'AMM<input v-model="d.amm.titulaire" /></label>
          <label class="fld">Durée de validité<input v-model="d.amm.dureeValidite" /></label>
          <label class="fld">Référence Dossier Technique<input v-model="d.amm.refDossierTechnique" /></label>
        </div>
        <h3>Signataires (noms &amp; fonctions)</h3>
        <p class="muted">Rédacteur(s), Vérificateur(s), Approbateur(s) : ces noms/fonctions font partie de l'IF approuvée ; seules les Date &amp; Visa se remplissent par lot.</p>
        <div v-for="(grp, gi) in [{ t:'Rédacteur', a: d.redacteurs }, { t:'Vérificateur', a: d.verificateurs }, { t:'Approbateur', a: d.approbateurs }]" :key="gi" class="sig-edit">
          <div class="sig-t">{{ grp.t }}</div>
          <div v-for="(s, si) in grp.a" :key="si" class="sig-row">
            <input v-model="s.nom" placeholder="Nom" />
            <input v-model="s.fonction" placeholder="Fonction" />
          </div>
        </div>
      </section>
    </div>

    <!-- ================= DOCUMENT IF ================= -->
    <!-- PAGE 1 — Visas d'approbation (FRM1) -->
    <div class="if-sheet">
      <IfHeader frm="FRM1" :page="1" />

      <table class="ap">
        <thead><tr><th class="c1">Rédacteur</th><th class="c2">Fonction</th><th class="c3">Date &amp; Visa</th></tr></thead>
        <tbody>
          <tr v-for="(s, i) in d.redacteurs" :key="i">
            <td>{{ s.nom }}</td><td>{{ s.fonction }}</td><td><input class="cell" v-model="s.visa" /></td>
          </tr>
        </tbody>
      </table>

      <table class="ap">
        <thead><tr><th class="c1">Vérificateur</th><th class="c2">Fonction</th><th class="c3">Date &amp; Visa</th></tr></thead>
        <tbody>
          <tr v-for="(s, i) in d.verificateurs" :key="i">
            <td>{{ s.nom }}</td><td>{{ s.fonction }}</td><td><input class="cell" v-model="s.visa" /></td>
          </tr>
        </tbody>
      </table>

      <table class="ap">
        <thead><tr><th class="c1">Approbateur</th><th class="c2">Fonction</th><th class="c3">Date &amp; Visa</th></tr></thead>
        <tbody>
          <tr v-for="(s, i) in d.approbateurs" :key="i">
            <td>{{ s.nom }}</td><td>{{ s.fonction }}</td><td><input class="cell" v-model="s.visa" /></td>
          </tr>
        </tbody>
      </table>

      <table class="pied">
        <thead><tr><th>Rédacteur / Date &amp; Visa</th><th>Vérificateur / Date &amp; Visa</th><th>Approbateur / Date &amp; Visa</th></tr></thead>
        <tbody><tr><td><input class="cell" v-model="d.pied.redacteur" /></td><td><input class="cell" v-model="d.pied.verificateur" /></td><td><input class="cell" v-model="d.pied.approbateur" /></td></tr></tbody>
      </table>
    </div>

    <!-- PAGE 2 — Identification (FRM2) -->
    <div class="if-sheet">
      <IfHeader frm="FRM2" :page="2" />

      <table class="kv">
        <tbody>
          <tr><td class="k">DCI</td><td>{{ d.amm.dci }}</td></tr>
          <tr><td class="k">N° d'AMM</td><td>{{ d.amm.numAmm }}</td></tr>
          <tr><td class="k">Titulaire de l'AMM</td><td>{{ d.amm.titulaire }}</td></tr>
          <tr><td class="k">Durée de validité</td><td>{{ d.amm.dureeValidite }}</td></tr>
          <tr><td class="k">Référence Dossier Technique</td><td>{{ d.amm.refDossierTechnique }}</td></tr>
        </tbody>
      </table>

      <table class="lot4">
        <thead><tr><th>N° de lot interne</th><th>DDF</th><th>DDP</th><th>OF N°</th></tr></thead>
        <tbody><tr>
          <td><input class="cell" v-model="d.lot.numeroLotInterne" /></td>
          <td><input class="cell" v-model="d.lot.ddf" /></td>
          <td><input class="cell" v-model="d.lot.ddp" /></td>
          <td><input class="cell" v-model="d.lot.ofN" /></td>
        </tr></tbody>
      </table>

      <table class="proc">
        <tbody><tr>
          <td class="k">Début du process :</td><td><input class="cell" v-model="d.lot.debutProcess" /></td>
          <td class="k">Fin du process :</td><td><input class="cell" v-model="d.lot.finProcess" /></td>
        </tr></tbody>
      </table>

      <table class="dev">
        <tbody><tr>
          <td class="k dvk">N° Déviation</td><td><input class="cell" v-model="d.lot.numDeviation" /></td>
        </tr></tbody>
      </table>

      <table class="visas3">
        <thead><tr><th>Date et Visa Superviseur Fabrication</th><th>Date et Visa Responsable Fabrication</th><th>Date et Visa AQ</th></tr></thead>
        <tbody><tr>
          <td><input class="cell" v-model="d.lot.visaSupFab" /></td>
          <td><input class="cell" v-model="d.lot.visaRespFab" /></td>
          <td><input class="cell" v-model="d.lot.visaAq" /></td>
        </tr></tbody>
      </table>

      <table class="pied">
        <thead><tr><th>Rédacteur / Date &amp; Visa</th><th>Vérificateur / Date &amp; Visa</th><th>Approbateur / Date &amp; Visa</th></tr></thead>
        <tbody><tr><td><input class="cell" v-model="d.pied.redacteur" /></td><td><input class="cell" v-model="d.pied.verificateur" /></td><td><input class="cell" v-model="d.pied.approbateur" /></td></tr></tbody>
      </table>
    </div>

    <!-- ========== ÉTAPE PESÉE (pages 3 à 24) ========== -->
    <EtapePesee />
  </div>
</template>

<style scoped>
.dl-page { color: #1b2733; }
.statut { color: #fff; font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 999px; }
.statut-sel { font: inherit; font-size: 13px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
.alert { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; border-radius: 8px; margin: 0 0 12px; font-size: 13px; }
.ok-msg { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 10px 14px; border-radius: 8px; margin: 0 0 12px; font-size: 13px; }
.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 8px; margin: 0 0 14px; font-size: 13px; }
.warn code { background: #fef3c7; padding: 1px 5px; border-radius: 4px; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
.card.slim { padding: 12px 16px; display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.card.params { padding: 16px 18px; }
.card.params h3 { margin: 14px 0 8px; font-size: 13px; color: #0e7490; }
.card.params h3:first-child { margin-top: 0; }
.grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 14px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 14px; }
.fld { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; color: #475569; gap: 4px; }
.fld.inline { flex-direction: row; align-items: center; gap: 10px; }
.fld input, .fld select { font: inherit; font-size: 13px; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #1b2733; width: 100%; }
.sig-edit { margin-bottom: 10px; }
.sig-t { font-size: 12px; font-weight: 700; color: #155e75; margin-bottom: 4px; }
.sig-row { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-bottom: 5px; }
.sig-row input { font: inherit; font-size: 13px; padding: 6px 9px; border: 1px solid #cbd5e1; border-radius: 7px; }
.muted { color: #64748b; font-size: 12px; margin: 0 0 8px; }
.btn { background: #0891b2; color: #fff; border: 0; padding: 9px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn.ghost { background: #fff; color: #0e7490; border: 1px solid #a5f3fc; }
.btn.sm { padding: 6px 12px; font-size: 13px; }
.btn.danger { color: #be123c; border-color: #fecaca; }
/* Les styles du document IF (.if-sheet, tables, .cell, pied…) sont globaux dans App.vue. */
@media (max-width: 640px) { .grid2, .grid3 { grid-template-columns: 1fr; } }
</style>
