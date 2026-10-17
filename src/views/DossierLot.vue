<script setup>
import { ref, reactive, computed, onMounted, inject, provide } from 'vue'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader.vue'
import IfHeader from '../components/IfHeader.vue'
import DossierImprimable from './DossierImprimable.vue'
import FormulaireDynamique from './FormulaireDynamique.vue'
import GestionProduits from '../components/GestionProduits.vue'
import ConstructeurFormulaire from '../components/ConstructeurFormulaire.vue'
import { PRODUITS_REF, FORMULAIRE_DEFAUT, assembleGamme, ETAPES_FAB } from '../produitsRef.js'
import '../dossier.css'   // styles du document (non scopés), intégration ProdTrack

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
   Dossier de lot configurable : les étapes s'assemblent selon la gamme du produit.
   ============================================================ */
function docVide () {
  return {
    produit: '',                 // produit sélectionné (clé du catalogue)
    // --- Données de RÉFÉRENCE du produit (chargées par sélection du produit) ---
    entete: { refSop: '', refIf: '', version: '', totalPages: 92, produit: '', dci2: '', forme: '', taillePoids: '', uniteDosee: '', uniteVente: '' },
    amm: { dci: '', numAmm: '', titulaire: '', dureeValidite: '', refDossierTechnique: '' },
    redacteurs: [], verificateurs: [], approbateurs: [],
    formule: [], formuleP: [], mats: [], exc: [], equip: [],
    diagramme: { flux: [], ipc: [], equipements: [] },
    formulaire: { sections: [] },    // formulaire configurable du produit (constructeur)
    gammeCourante: null,             // gamme (clés d'étapes) du produit sélectionné
    fractions: {},                   // nombre de fractions par étape (ex. { granulation_sechage: 2 })
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
    saisie: {},                      // valeurs saisies du formulaire configurable (par lot)
    statut: 'Brouillon'
  }
}
const d = reactive(docVide())
provide('doc', d)
const dossierId = ref(null)

// Utilisateur courant (pré-remplit les signatures du formulaire).
const utilisateur = ref('')
provide('utilisateur', utilisateur)
async function chargerUtilisateur () {
  try {
    const s = await supabase.auth.getSession()
    const u = s.data && s.data.session ? s.data.session.user : null
    if (u) utilisateur.value = u.email || ''
  } catch (e) { /* ignore */ }
}

/* ---------------- Catalogue des produits ----------------
   SOURCE PRINCIPALE = la table « produits » de l'application (les produits
   enregistrés dans les Référentiels, actifs) : la liste « Produit à fabriquer »
   est donc la MÊME que celle de l'application. Les données IF riches (AMM,
   signataires, formule, matières…) sont superposées depuis le référentiel
   dossier (intégré + enregistré) par correspondance de nom. Repli hors-ligne
   sur le référentiel dossier si la table « produits » est indisponible. */
const LS_KEY = 'ldm_produits_ref'
const produitsApp = ref([])     // table « produits » de l'app (source de la liste)
const produitsDB = ref({})      // référentiel dossier (Supabase) — données IF riches
const produitsLocal = ref({})   // référentiel dossier (localStorage) — données IF riches
const produitsTableAbsente = ref(false)

function lireLocal () {
  try { const s = localStorage.getItem(LS_KEY); if (s) produitsLocal.value = JSON.parse(s) || {} } catch (e) { /* ignore */ }
}
function ecrireLocal () {
  try { localStorage.setItem(LS_KEY, JSON.stringify(produitsLocal.value)) } catch (e) { /* ignore */ }
}

// Charge les produits enregistrés de l'application (table « produits »).
async function chargerProduitsApp () {
  try {
    const r = await supabase.from('produits')
      .select('id, code_pf, designation, forme, taille_lot, poids_lot_kg, unites_par_boite, poids_unitaire_mg, pcsu, gamme')
      .eq('actif', true).order('code_pf')
    if (!r.error && Array.isArray(r.data)) produitsApp.value = r.data
  } catch (e) { /* hors-ligne : repli sur le référentiel dossier */ }
}

// Correspondance gamme APP (libellés) → étapes du dossier (clés).
const GAMME_APP_DOSSIER = {
  'Pesée': 'pesee',
  'Granulation et Séchage': 'granulation_sechage',
  'Mélange': 'tamisage_melange',
  'Compression': 'compression',
  'Remplissage Gélules': 'remplissage_gelules',
  'Pelliculage': 'pelliculage'
}
function mapGammeApp (g, forme) {
  // Produit semi-solide (crème / pommade / gel) : l'étape « Mélange » correspond
  // au mélange & homogénéisation semi-solide, pas au tamisage/mélange solide.
  const semi = /cr[eè]me|pommade|gel\b/i.test(String(forme || ''))
  const arr = Array.isArray(g) ? g : (g ? [g] : [])
  const out = []
  for (const ph of arr) {
    let k = GAMME_APP_DOSSIER[String(ph).trim()]
    if (k === 'tamisage_melange' && semi) k = 'melange_creme_pommade'
    if (k && !out.includes(k)) out.push(k)
  }
  return out
}
// Normalise un nom de produit pour la correspondance (majuscules, sans ®, espaces réduits).
function normNom (s) { return String(s || '').toUpperCase().replace(/[®™©]/g, '').replace(/\s+/g, ' ').trim() }
// Index du référentiel dossier (données IF riches) par nom normalisé.
const refDossierIndex = computed(() => {
  const idx = {}
  const add = (src) => { for (const k of Object.keys(src || {})) idx[normNom(k)] = { ...(idx[normNom(k)] || {}), ...src[k] } }
  add(PRODUITS_REF); add(produitsLocal.value); add(produitsDB.value)
  return idx
})

// Catalogue effectif : clé = nom du produit (désignation de l'app).
const catalogue = computed(() => {
  const out = {}
  const apps = produitsApp.value || []
  if (apps.length) {
    for (const p of apps) {
      const nom = String(p.designation || p.code_pf || '').trim()
      if (!nom) continue
      const rich = refDossierIndex.value[normNom(nom)] || {}
      const re = rich.entete || {}
      const boites = Number(p.taille_lot) || 0
      const uPar = Number(p.unites_par_boite) || 0
      const entete = {
        refSop: re.refSop || '', refIf: re.refIf || '', version: re.version || '', totalPages: re.totalPages || 92,
        produit: nom, dci2: re.dci2 || '', forme: p.forme || re.forme || '',
        taillePoids: (p.poids_lot_kg != null && p.poids_lot_kg !== '') ? String(p.poids_lot_kg) : (re.taillePoids || ''),
        uniteDosee: (boites && uPar) ? String(boites * uPar) : (re.uniteDosee || ''),
        uniteVente: boites ? String(boites) : (re.uniteVente || '')
      }
      const gamme = mapGammeApp(p.gamme, p.forme)
      out[nom] = {
        ...rich,                                   // amm, signataires, formule, mats, exc, equip, diagramme (si connus)
        entete,
        gamme: gamme.length ? gamme : (rich.gamme || undefined),
        codePf: p.code_pf || ''
      }
    }
    return out
  }
  // ---- Repli hors-ligne : référentiel dossier (intégré + enregistré) ----
  const keys = new Set([...Object.keys(PRODUITS_REF), ...Object.keys(produitsLocal.value), ...Object.keys(produitsDB.value)])
  for (const k of keys) {
    const merged = { ...(PRODUITS_REF[k] || {}), ...(produitsLocal.value[k] || {}), ...(produitsDB.value[k] || {}) }
    const integre = (PRODUITS_REF[k] && PRODUITS_REF[k].formulaire) || FORMULAIRE_DEFAUT
    const okForm = merged.formulaire && Array.isArray(merged.formulaire.sections) && merged.formulaire.sections.length
    if (!okForm && integre) merged.formulaire = integre
    out[k] = merged
  }
  return out
})
const produitsKeys = computed(() => Object.keys(catalogue.value))
// Recherche de produit : filtre la liste « Produit à fabriquer » par nom ou code PF.
const rechercheProduit = ref('')
const produitsFiltres = computed(() => {
  const q = rechercheProduit.value.trim().toLowerCase()
  if (!q) return produitsKeys.value
  return produitsKeys.value.filter(k => {
    const c = catalogue.value[k] || {}
    const code = c.codePf ? String(c.codePf).toLowerCase() : ''
    return k.toLowerCase().includes(q) || code.includes(q)
  })
})
// Tous les produits du référentiel (localStorage + base) sont modifiables/supprimables.
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
  d.entete.produit = key   // « Produit à fabriquer » = clé du référentiel (source unique)
  Object.assign(d.amm, c.amm || {})
  d.redacteurs = c.redacteurs || []
  d.verificateurs = c.verificateurs || []
  d.approbateurs = c.approbateurs || []
  d.formule = c.formule || []
  d.formuleP = c.formuleP || []
  d.mats = c.mats || []
  d.exc = c.exc || []
  d.equip = c.equip || []
  d.diagramme = c.diagramme || { flux: [], ipc: [], equipements: [] }
  // Mode saisie = formulaire ASSEMBLÉ selon la GAMME du produit (ses étapes
  // de fabrication) et le nombre de fractions par étape.
  d.fractions = {}                   // nouveau produit → 1 fraction par étape
  d.gammeCourante = Array.isArray(c.gamme) ? c.gamme.slice() : null
  d.formulaire = assembleGamme(c.gamme, d.fractions)
  d.saisie = {}                      // nouveau produit → saisie vierge
  d.execution.signatures = {}; d.execution.audit = []   // signatures/audit réinitialisés
  d.pesee = peseeVide(dimsFor(c))   // redimensionne la pesée au produit
}

// Enregistre le formulaire configuré dans la fiche produit du catalogue.
async function sauverFormulaireProduit () {
  if (!d.produit) return { ok: false, err: 'Aucun produit sélectionné.' }
  const base = catalogue.value[d.produit] ? JSON.parse(JSON.stringify(catalogue.value[d.produit])) : {}
  if (!base.entete) base.entete = { produit: d.produit }
  base.entete.produit = d.produit
  base.formulaire = JSON.parse(JSON.stringify(d.formulaire))
  return await sauverProduit(base)
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
const constructeurOuvert = ref(false)
// Vue active : 'form' (formulaire configurable) | 'ebmr' (pesée guidée) | 'doc' (dossier imprimable)
const vue = ref('form')

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
  d.saisie = {}                              // formulaire configurable : saisie vierge
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
  // Source unique : le « Produit à fabriquer » reste aligné sur le produit
  // sélectionné (clé du référentiel), même pour un dossier enregistré.
  if (d.produit) d.entete.produit = d.produit
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

// Gamme effective du produit sélectionné (mémorisée dans le dossier, sinon
// reprise du catalogue de l'application).
const gammeActuelle = computed(() => {
  if (Array.isArray(d.gammeCourante) && d.gammeCourante.length) return d.gammeCourante
  const r = catalogue.value[d.produit]
  return (r && r.gamme) || null
})
// Étapes du produit (clé + nom), pour régler les fractions par étape.
const etapesProduit = computed(() => {
  const g = gammeActuelle.value || []
  return ETAPES_FAB.filter(e => g.includes(e.k))
})
// Réassemble le formulaire en tenant compte des fractions choisies. La saisie
// de la Fraction 1 est préservée (ids inchangés) ; les fractions ajoutées sont
// vierges, les fractions retirées laissent des données orphelines sans effet.
function majFractions (k, val) {
  const n = Math.max(1, Math.min(20, parseInt(val, 10) || 1))
  d.fractions = { ...d.fractions, [k]: n }
  d.formulaire = assembleGamme(gammeActuelle.value, d.fractions)
}

// Modèle intégré (formulaire par défaut livré avec le produit). Permet de le
// recharger si une fiche enregistrée l'a remplacé par un autre formulaire.
const modeleIntegre = computed(() => {
  if (!d.produit) return null
  return assembleGamme(gammeActuelle.value, d.fractions)
})
function chargerModeleIntegre () {
  if (!modeleIntegre.value) return
  if (!confirm('Charger le formulaire modèle intégré de ce produit ? Le formulaire actuellement affiché sera remplacé (vous pourrez l\'enregistrer ensuite via le Constructeur).')) return
  d.formulaire = JSON.parse(JSON.stringify(modeleIntegre.value))
  d.saisie = {}
  vue.value = 'form'
  message.value = 'Modèle intégré chargé (' + modeleIntegre.value.sections.length + ' sections). Pour le conserver : Constructeur → « Enregistrer dans la fiche produit ».'
}

onMounted(() => { lireLocal(); chargerProduitsApp(); chargerProduits(); charger(); chargerUtilisateur() })
</script>

<template>
  <div class="dl-page">
    <!-- Barre d'application (écran uniquement) -->
    <div class="noprint">
      <PageHeader title="Instruction de Fabrication"
        subtitle="Dossier de lot électronique (eBMR) — les étapes s'adaptent à la gamme du produit : Pesée, Granulation & Séchage, Tamisage & Mélange, Compression, Pelliculage, Mélange crème & pommade. Contrôles, rendements automatiques et dossier imprimable.">
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
            <div class="pb-search">
              <span class="pb-search-ic">🔎</span>
              <input class="pb-search-in" v-model="rechercheProduit" type="search" placeholder="Rechercher (nom ou code PF)…" />
              <button v-if="rechercheProduit" class="pb-search-x" type="button" title="Effacer" @click="rechercheProduit = ''">✕</button>
            </div>
            <select id="prodsel" class="pb-select" v-model="d.produit" @change="appliquerProduit(d.produit)">
              <option value="" disabled>— Sélectionner un produit —</option>
              <option v-for="k in produitsFiltres" :key="k" :value="k">{{ k }}</option>
              <option v-if="!produitsFiltres.length" value="" disabled>— Aucun produit ne correspond —</option>
            </select>
            <button class="btn ghost sm" @click="gestionOuvert = true" title="Ajouter / modifier des produits">⚙ Gérer les produits</button>
          </div>
          <div v-if="rechercheProduit" class="pb-search-n">{{ produitsFiltres.length }} produit(s) sur {{ produitsKeys.length }}</div>
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

      <!-- Fractions par étape : répète une étape (ex. granulation) autant de fois que de fractions -->
      <section v-if="d.produit && etapesProduit.length" class="card frbar">
        <div class="fr-head">
          <span class="fr-title">Fractions par étape</span>
          <span class="fr-hint">Un lot traité en plusieurs fractions (ex. granulation) : l'étape est répétée pour couvrir chaque fraction.</span>
        </div>
        <div class="fr-steps">
          <label v-for="e in etapesProduit" :key="e.k" class="fr-step">
            <span class="fr-step-nom">{{ e.nom }}</span>
            <span class="fr-step-ctrl">
              <button type="button" class="fr-btn" :disabled="(d.fractions[e.k] || 1) <= 1" @click="majFractions(e.k, (d.fractions[e.k] || 1) - 1)">−</button>
              <input class="fr-num" type="number" min="1" max="20" :value="d.fractions[e.k] || 1" @change="majFractions(e.k, $event.target.value)" />
              <button type="button" class="fr-btn" @click="majFractions(e.k, (d.fractions[e.k] || 1) + 1)">+</button>
              <span class="fr-unit">fraction{{ (d.fractions[e.k] || 1) > 1 ? 's' : '' }}</span>
            </span>
          </label>
        </div>
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
          <label class="fld">Produit à fabriquer<input :value="d.produit" readonly class="ro" title="Produit sélectionné dans la liste (référentiel produits de l'application)" /><small class="ro-hint">Source : produits enregistrés de l'application</small></label>
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
      <p class="es-sub">La liste reprend les produits enregistrés dans l'application (Référentiels). Les étapes de fabrication se chargent selon la gamme du produit ; vous n'avez plus qu'à saisir les valeurs réelles du lot, puis imprimer. Un produit manquant s'ajoute dans les Référentiels de l'application.</p>
      <button class="btn ghost sm" style="margin-top:14px" @click="gestionOuvert = true">⚙ Compléter les données IF (AMM, signataires, formule)</button>
    </div>

    <!-- Bascule de vue (écran uniquement) -->
    <div v-if="d.produit" class="noprint vtoggle">
      <button class="vt" :class="{ on: vue === 'form' }" @click="vue = 'form'">✎ Saisie du dossier</button>
      <button class="vt" :class="{ on: vue === 'doc' }" @click="vue = 'doc'">🖨 Dossier imprimable</button>
      <button class="vt build" @click="constructeurOuvert = true" title="Composer le formulaire de ce produit">✦ Constructeur</button>
      <button v-if="modeleIntegre" class="vt" @click="chargerModeleIntegre" title="Recharger le formulaire modèle livré avec ce produit (ex. Pesée ROSUSTINE)">↺ Modèle intégré</button>
      <span class="vt-note">« Imprimer » génère la vue active.</span>
    </div>

    <!-- Vue 1 : formulaire configurable du produit -->
    <FormulaireDynamique v-if="d.produit && vue === 'form'" />

    <!-- Constructeur de formulaire (modale) -->
    <ConstructeurFormulaire
      v-if="constructeurOuvert"
      :sauver="sauverFormulaireProduit"
      :produit-nom="d.produit"
      @close="constructeurOuvert = false" />

    <!-- ================= DOCUMENT IF (vue 3 + impression) ================= -->
    <div v-if="d.produit" class="doc-wrap" :class="{ 'screen-hide': vue !== 'doc', 'print-hide': vue === 'form' }">
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

    <!-- ===== Phases du dossier, générées à partir de la saisie (toutes étapes/fractions) ===== -->
    <DossierImprimable />
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
/* Recherche de produit */
.pb-search { position: relative; display: inline-flex; align-items: center; }
.pb-search-ic { position: absolute; left: 11px; font-size: 13px; opacity: .6; pointer-events: none; }
.pb-search-in { font: inherit; font-size: 14px; color: #0f172a; padding: 11px 30px 11px 32px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; min-width: 240px; }
.pb-search-in:focus { outline: none; border-color: #0891b2; box-shadow: 0 0 0 3px #cffafe; }
.pb-search-x { position: absolute; right: 8px; border: 0; background: #e2e8f0; color: #475569; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.pb-search-x:hover { background: #cbd5e1; }
.pb-search-n { font-size: 11.5px; color: #0e7490; font-weight: 600; margin-top: 5px; }
.pb-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.pb-tag { font-size: 12px; font-weight: 600; color: #155e75; background: #ecfeff; border: 1px solid #a5f3fc; padding: 4px 9px; border-radius: 999px; }
.pb-reload { margin-left: auto; display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: #475569; }
.pb-reload select { font: inherit; font-size: 13px; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; }
/* Fractions par étape */
.frbar { padding: 14px 18px; }
.fr-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
.fr-title { font-size: 13px; font-weight: 800; color: #0e7490; text-transform: uppercase; letter-spacing: .4px; }
.fr-hint { font-size: 12px; color: #64748b; }
.fr-steps { display: flex; flex-wrap: wrap; gap: 10px; }
.fr-step { display: flex; flex-direction: column; gap: 6px; border: 1px solid #e6edf3; border-radius: 10px; padding: 9px 12px; background: #f8fafc; min-width: 180px; }
.fr-step-nom { font-size: 12.5px; font-weight: 700; color: #263445; }
.fr-step-ctrl { display: flex; align-items: center; gap: 6px; }
.fr-btn { font: inherit; font-size: 15px; font-weight: 800; line-height: 1; width: 28px; height: 28px; border: 1px solid #cbd5e1; background: #fff; color: #0e7490; border-radius: 7px; cursor: pointer; }
.fr-btn:hover:not(:disabled) { background: #ecfeff; border-color: #a5f3fc; }
.fr-btn:disabled { opacity: .4; cursor: default; }
.fr-num { font: inherit; font-size: 14px; font-weight: 700; text-align: center; width: 48px; padding: 5px 4px; border: 1px solid #cbd5e1; border-radius: 7px; color: #0f2a37; }
.fr-unit { font-size: 11.5px; color: #64748b; font-weight: 600; }
/* Bascule de vue */
.vtoggle { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.vt { font: inherit; font-size: 13px; font-weight: 600; color: #475569; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
.vt.on { background: #0891b2; color: #fff; border-color: #0891b2; }
.vt.build { color: #0e7490; background: #ecfeff; border-color: #a5f3fc; margin-left: auto; }
.vt-note { font-size: 11.5px; color: #94a3b8; }
.screen-hide { display: none; }
@media print { .screen-hide { display: block !important; } .print-hide { display: none !important; } }
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
.fld input.ro { background: #f1f5f9; color: #0f2a37; font-weight: 700; border-style: dashed; cursor: default; }
.ro-hint { font-size: 10.5px; font-weight: 600; color: #0e7490; }
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
