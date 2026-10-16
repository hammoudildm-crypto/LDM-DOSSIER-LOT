<script setup>
import { ref, reactive, computed, onMounted, inject, provide } from 'vue'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader.vue'
import IfHeader from '../components/IfHeader.vue'
import EtapePesee from './EtapePesee.vue'
import ControleCritique from './ControleCritique.vue'
import GestionProduits from '../components/GestionProduits.vue'
import { PRODUITS_REF } from '../produitsRef.js'

const peutEditer = inject('peutEditer', ref(true))

// Fabrique les collections remplissables de l'étape pesée (toutes vides),
// dimensionnées selon le produit : nMats matières, nExc excipients,
// nEquip équipements/balances, nPA principes actifs.
function peseeVide (dims = {}) {
  const nMats = dims.nMats || 7
  const nExc = dims.nExc || 6
  const nEquip = dims.nEquip || 2
  const nPA = dims.nPA || 1
  const mk = (keys) => { const o = {}; keys.forEach(k => { o[k] = '' }); return o }
  const mkN = (n, keys) => Array.from({ length: Math.max(1, n) }, () => mk(keys))
  return {
    A: '', B: '', certPA: '',
    ajustPA: mkN(nPA, ['nLot', 'titre', 'teneurEau', 'qTheo', 'qPeser', 'faitDV', 'verifDV']),
    ajustExc: [mk(['nLot', 'qTheo', 'qPeser', 'faitDV', 'verifDV'])],
    vSalle: '', vFlux: '', vBalances: '', vMateriels: '', vTicketsPA: '', vTicketsExc: '', vFichesUtil: '',
    condDem: mkN(2, ['etape', 'nSalle', 'heure', 'temp', 'hr', 'dp', 'dvOp', 'dvVerif']),
    autor: mk(['instrGen', 'secu', 'condEnv', 'nettoyage']),
    demSup: mk(['date', 'heure', 'visa']),
    demAq: mk(['date', 'heure', 'visa']),
    verifPrelim: mkN(3, ['oui', 'non', 'dv']),
    operateurs: mkN(5, ['shift', 'poste', 'nom', 'date', 'visa', 'verifDV']),
    equip: mkN(nEquip, ['fonctVide', 'statutQual', 'etatVitr', 'faitDV', 'verifDV', 'obs']),
    etal: mkN(nEquip, ['effectue', 'date', 'dvOp', 'dvVerif', 'obs']),
    condProc: mkN(6, ['date', 'moment', 'heure', 'temp', 'hr', 'dp', 'nSalle', 'fait', 'verif']),
    retInterne: mkN(nMats, ['nLot', 'qte', 'etiq', 'ddr', 'ddp', 'faitDV', 'verifDV']),
    recExterne: mkN(nMats, ['nLot', 'contenant', 'etiq', 'qCom', 'qLiv', 'ddr', 'ddp', 'faitDV', 'verifDV']),
    peseePA: { debH: '', debD: '', finH: '', finD: '', lignes: mkN(nPA, ['nLot', 'codeBal', 'g', 't', 'n', 'faitDV', 'b', 'verifDV']) },
    peseeExc: { debD: '', debH: '', finH: '', finD: '', lignes: mkN(nExc, ['nLot', 'codeBal', 'g', 't', 'n', 'faitDV', 'b', 'verifDV']) },
    bilan: { bonCom: '', bonRetInt: '', bonRetFin: '', bonAvarie: '', justif: '', dvResp: '', lignes: mkN(nMats, ['qLiv', 'qPes', 'qRetInt', 'qRetFin', 'qAvar', 'dvSup']) },
    incidents: mkN(3, ['date', 'heureArret', 'nSac', 'motif', 'action', 'dateDem', 'heureDem', 'visa'])
  }
}
// Déduit les dimensions de l'étape pesée à partir des données du produit.
function dimsFor (p) {
  const mats = p.mats || [], exc = p.exc || [], equip = p.equip || [], formule = p.formule || []
  const nPA = formule.filter(f => /^MPPA/i.test(f.c || '')).length
  return { nMats: mats.length, nExc: exc.length, nEquip: equip.length, nPA }
}

/* ============================================================
   Réplique de l'Instruction de Fabrication (IF) — LDM
   Référence AQ-SOP-108-011 · IF PFLDM103 · ROSUSTINE 10 mg
   Construction page par page. Pages reproduites : 1 et 2.
   ============================================================ */
function docVide () {
  return {
    produit: '',                 // produit sélectionné (clé du catalogue)
    // --- Données de RÉFÉRENCE du produit (chargées par sélection du produit) ---
    entete: { refSop: '', refIf: '', version: '', totalPages: 92, produit: '', dci2: '', forme: '', taillePoids: '', uniteDosee: '', uniteVente: '' },
    amm: { dci: '', numAmm: '', titulaire: '', dureeValidite: '', refDossierTechnique: '' },
    redacteurs: [], verificateurs: [], approbateurs: [],
    formule: [], formuleP: [], mats: [], exc: [], equip: [],
    // --- Contenu PROPRE AU LOT (rempli à chaque fabrication) ---
    lot: {
      numeroLotInterne: '', ddf: '', ddp: '', ofN: '',
      debutProcess: '', finProcess: '', numDeviation: '',
      visaSupFab: '', visaRespFab: '', visaAq: ''
    },
    pied: { redacteur: '', verificateur: '', approbateur: '' },
    pesee: peseeVide(),
    // --- Exécution eBMR (contrôle des paramètres critiques) ---
    execution: { operateur: { nom: '', matricule: '' }, tolPeseePct: null, tolBilanPct: null, deviations: {}, signatures: {}, audit: [] },
    statut: 'Brouillon'
  }
}
const d = reactive(docVide())
provide('doc', d)
const dossierId = ref(null)

/* ---------------- Catalogue des produits ----------------
   Fusion : produits intégrés (ROSUSTINE) + produits créés par l'utilisateur
   (enregistrés dans Supabase, avec cache localStorage pour le hors-ligne). */
const LS_KEY = 'ldm_produits_ref'
const produitsDB = ref({})      // depuis Supabase (prioritaire)
const produitsLocal = ref({})   // cache navigateur (localStorage)
const produitsTableAbsente = ref(false)

function lireLocal () {
  try { const s = localStorage.getItem(LS_KEY); if (s) produitsLocal.value = JSON.parse(s) || {} } catch (e) { /* ignore */ }
}
function ecrireLocal () {
  try { localStorage.setItem(LS_KEY, JSON.stringify(produitsLocal.value)) } catch (e) { /* ignore */ }
}

// Catalogue effectif : intégré < localStorage < base.
const catalogue = computed(() => ({ ...PRODUITS_REF, ...produitsLocal.value, ...produitsDB.value }))
const produitsKeys = computed(() => Object.keys(catalogue.value))
// Noms modifiables/supprimables par l'utilisateur (créés par lui, hors intégrés non surchargés).
const produitsPerso = computed(() => new Set([...Object.keys(produitsLocal.value), ...Object.keys(produitsDB.value)]))

async function chargerProduits () {
  try {
    const r = await supabase.from('produits_ref').select('nom, contenu').order('nom')
    if (r.error) { produitsTableAbsente.value = /produits_ref|schema cache/i.test(r.error.message || '') || r.error.code === '42P01' || r.error.code === 'PGRST205'; return }
    produitsTableAbsente.value = false
    const map = {}
    for (const row of r.data || []) if (row && row.nom && row.contenu) map[row.nom] = row.contenu
    produitsDB.value = map
  } catch (e) { /* hors-ligne : on garde intégré + localStorage */ }
}

// Charge les données de référence d'un produit dans le dossier (en mutant en place,
// pour que l'en-tête et les pages réagissent au changement).
function appliquerProduit (key) {
  const r = catalogue.value[key]
  if (!r) return
  const c = JSON.parse(JSON.stringify(r))
  d.produit = key
  Object.assign(d.entete, c.entete || {})
  Object.assign(d.amm, c.amm || {})
  d.redacteurs = c.redacteurs || []
  d.verificateurs = c.verificateurs || []
  d.approbateurs = c.approbateurs || []
  d.formule = c.formule || []
  d.formuleP = c.formuleP || []
  d.mats = c.mats || []
  d.exc = c.exc || []
  d.equip = c.equip || []
  d.pesee = peseeVide(dimsFor(c))   // redimensionne la pesée au produit
}

// Enregistre / modifie un produit du catalogue perso → Supabase + localStorage.
async function sauverProduit (prod) {
  const nom = ((prod.entete && prod.entete.produit) || '').trim()
  if (!nom) return { ok: false, err: 'Le nom du produit (en-tête) est obligatoire.' }
  const contenu = JSON.parse(JSON.stringify(prod))
  produitsLocal.value = { ...produitsLocal.value, [nom]: contenu }   // cache local d'abord
  ecrireLocal()
  try {
    const payload = { nom, forme: contenu.entete.forme || null, ref_if: contenu.entete.refIf || null, contenu }
    const r = await supabase.from('produits_ref').upsert(payload, { onConflict: 'nom' }).select('nom').single()
    if (r.error) {
      if (/produits_ref|schema cache|column .* does not exist/i.test(r.error.message || '') || r.error.code === '42P01' || r.error.code === 'PGRST205') { produitsTableAbsente.value = true; return { ok: true, local: true } }
      return { ok: true, local: true, warn: r.error.message }
    }
    await chargerProduits()
    return { ok: true, local: false }
  } catch (e) { return { ok: true, local: true } }
}

async function supprimerProduit (nom) {
  const loc = { ...produitsLocal.value }; delete loc[nom]; produitsLocal.value = loc; ecrireLocal()
  try { await supabase.from('produits_ref').delete().eq('nom', nom); await chargerProduits() } catch (e) { /* ignore */ }
  if (d.produit === nom) reset()
}

// Gestionnaire de produits (panneau)
const gestionOuvert = ref(false)
// Vue active : 'ebmr' (saisie guidée contrôlée) | 'doc' (dossier imprimable)
const vue = ref('ebmr')

// Au démarrage : AUCUN produit sélectionné → l'utilisateur choisit dans la liste.

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

function reset () {
  Object.assign(d, docVide())   // tout vide → retour à la sélection du produit
  dossierId.value = null; message.value = ''
}
function nouveau () {
  if (!confirm('Nouveau dossier de lot ? Les saisies non enregistrées seront perdues (les données du produit sont conservées).')) return
  // on garde les données du produit (réf), on vide ce qui est propre au lot
  d.lot = docVide().lot
  d.pied = docVide().pied
  d.pesee = peseeVide(dimsFor(d))
  const op = d.execution.operateur           // on conserve l'opérateur courant
  d.execution = docVide().execution
  d.execution.operateur = op
  for (const s of [...d.redacteurs, ...d.verificateurs, ...d.approbateurs]) s.visa = ''
  d.statut = 'Brouillon'
  dossierId.value = null
  message.value = 'Nouveau dossier — saisis le N° de lot et les valeurs réelles.'
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

onMounted(() => { lireLocal(); chargerProduits(); charger() })
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

      <!-- Sélection du produit — liste déroulante -->
      <section class="card prodbar">
        <div class="pb-pick">
          <label class="pb-label" for="prodsel">Produit à fabriquer</label>
          <div class="pb-pickrow">
            <select id="prodsel" class="pb-select" v-model="d.produit" @change="appliquerProduit(d.produit)">
              <option value="" disabled>— Sélectionner un produit —</option>
              <option v-for="k in produitsKeys" :key="k" :value="k">{{ k }}</option>
            </select>
            <button class="btn ghost sm" @click="gestionOuvert = true" title="Ajouter / modifier des produits">⚙ Gérer les produits</button>
          </div>
        </div>
        <div v-if="d.produit" class="pb-meta">
          <span class="pb-tag">{{ d.entete.refSop }}</span>
          <span class="pb-tag">{{ d.entete.refIf }} · v{{ d.entete.version }}</span>
          <span class="pb-tag">{{ d.entete.forme }}</span>
          <span class="pb-tag">Lot : {{ d.entete.taillePoids }} kg · {{ d.entete.uniteDosee }} unités</span>
        </div>
        <label v-if="liste.length" class="pb-reload">Recharger un dossier
          <select @change="chargerDossier($event.target.value); $event.target.value = ''">
            <option value="">— choisir —</option>
            <option v-for="x in liste" :key="x.id" :value="x.id">{{ x.numero_lot }} · {{ x.code_pf || '—' }} · {{ x.statut }}</option>
          </select>
        </label>
      </section>

      <section v-if="d.produit" class="card slim">
        <label class="fld inline">Statut
          <select v-model="d.statut" class="statut-sel"><option>Brouillon</option><option>En cours</option><option>Terminé</option><option>Libéré</option><option>Refusé</option></select>
        </label>
        <button class="btn ghost sm" @click="paramsOuverts = !paramsOuverts">{{ paramsOuverts ? 'Masquer' : 'Paramètres de l\'IF (AMM, signataires)' }}</button>
        <button v-if="dossierId" class="btn ghost sm danger" @click="supprimer">Supprimer</button>
      </section>

      <!-- Paramètres FIXES de l'IF (modifiable une fois) -->
      <section v-if="paramsOuverts && d.produit" class="card params">
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

    <!-- Gestionnaire de produits (modale) -->
    <GestionProduits
      v-if="gestionOuvert"
      :catalogue="catalogue"
      :perso="produitsPerso"
      :sauver="sauverProduit"
      :supprimer="supprimerProduit"
      :table-absente="produitsTableAbsente"
      @close="gestionOuvert = false"
      @selectionner="appliquerProduit" />

    <!-- État vide : aucun produit sélectionné -->
    <div v-if="!d.produit" class="empty-state noprint">
      <div class="es-ico">⌄</div>
      <p class="es-title">Sélectionnez un produit dans la liste déroulante ci-dessus</p>
      <p class="es-sub">Les données de référence de l'IF (formule, matières, paramètres, signataires) se chargent automatiquement. Vous n'avez plus qu'à saisir les valeurs réelles du lot, puis imprimer.</p>
      <button class="btn ghost sm" style="margin-top:14px" @click="gestionOuvert = true">⚙ Votre produit n'est pas dans la liste ? Gérer les produits</button>
    </div>

    <!-- Bascule de vue (écran uniquement) -->
    <div v-if="d.produit" class="noprint vtoggle">
      <button class="vt" :class="{ on: vue === 'ebmr' }" @click="vue = 'ebmr'">① Saisie guidée · contrôle eBMR</button>
      <button class="vt" :class="{ on: vue === 'doc' }" @click="vue = 'doc'">② Dossier imprimable</button>
      <span class="vt-note">Mêmes données partagées — « Imprimer » génère le dossier fidèle.</span>
    </div>

    <!-- Vue 1 : saisie guidée contrôlée (paramètres critiques) -->
    <ControleCritique v-if="d.produit && vue === 'ebmr'" class="noprint" />

    <!-- ================= DOCUMENT IF (vue 2 + impression) ================= -->
    <div v-if="d.produit" class="doc-wrap" :class="{ 'screen-hide': vue === 'ebmr' }">
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
/* Barre de sélection du produit (liste déroulante) */
.card.prodbar { padding: 16px 18px; display: flex; align-items: center; gap: 16px 20px; flex-wrap: wrap; border-color: #a5f3fc; background: linear-gradient(0deg,#f8feff,#fff); }
.pb-pick { display: flex; flex-direction: column; gap: 6px; }
.pb-pickrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pb-label { font-size: 12px; font-weight: 700; color: #0e7490; text-transform: uppercase; letter-spacing: .4px; }
.pb-select { font: inherit; font-size: 16px; font-weight: 600; color: #0f172a; padding: 11px 40px 11px 14px; border: 2px solid #06b6d4; border-radius: 10px; background: #fff; cursor: pointer; min-width: 320px;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%230891b2' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center; }
.pb-select:focus { outline: none; border-color: #0891b2; box-shadow: 0 0 0 3px #cffafe; }
.pb-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.pb-tag { font-size: 12px; font-weight: 600; color: #155e75; background: #ecfeff; border: 1px solid #a5f3fc; padding: 4px 9px; border-radius: 999px; }
.pb-reload { margin-left: auto; display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: #475569; }
.pb-reload select { font: inherit; font-size: 13px; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; }
/* Bascule de vue */
.vtoggle { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.vt { font: inherit; font-size: 13px; font-weight: 600; color: #475569; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
.vt.on { background: #0891b2; color: #fff; border-color: #0891b2; }
.vt-note { font-size: 11.5px; color: #94a3b8; }
.screen-hide { display: none; }
@media print { .screen-hide { display: block !important; } }
/* État vide */
.empty-state { text-align: center; padding: 48px 24px; background: #fff; border: 1px dashed #cbd5e1; border-radius: 14px; }
.empty-state .es-ico { font-size: 34px; line-height: 1; color: #06b6d4; font-weight: 800; animation: bob 1.6s ease-in-out infinite; }
.empty-state .es-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 10px 0 6px; }
.empty-state .es-sub { font-size: 13px; color: #64748b; max-width: 560px; margin: 0 auto; line-height: 1.5; }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
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
