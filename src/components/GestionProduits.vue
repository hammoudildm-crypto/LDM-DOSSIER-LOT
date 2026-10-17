<script setup>
import { ref, reactive, computed } from 'vue'
import { ETAPES_FAB } from '../produitsRef.js'

const props = defineProps({
  catalogue: { type: Object, default: () => ({}) },
  perso: { type: Object, default: () => new Set() },     // Set des noms modifiables
  sauver: { type: Function, required: true },            // async (prod) => {ok, local, err, warn}
  supprimer: { type: Function, required: true },         // async (nom)
  tableAbsente: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'selectionner'])

const mode = ref('list')        // 'list' | 'edit'
const editingNom = ref(null)    // nom d'origine (édition) pour message
const msg = ref('')
const erreur = ref('')
const busy = ref(false)

const noms = computed(() => Object.keys(props.catalogue).sort((a, b) => a.localeCompare(b)))
const estPerso = (nom) => props.perso && props.perso.has && props.perso.has(nom)
// Recherche : filtre la liste par nom, forme ou référence IF.
const recherche = ref('')
const nomsFiltres = computed(() => {
  const q = recherche.value.trim().toLowerCase()
  if (!q) return noms.value
  return noms.value.filter(nom => {
    const e = (props.catalogue[nom] && props.catalogue[nom].entete) || {}
    return nom.toLowerCase().includes(q) ||
      String(e.forme || '').toLowerCase().includes(q) ||
      String(e.refIf || '').toLowerCase().includes(q)
  })
})

/* ---------- Modèle de formulaire ---------- */
function produitVide () {
  return {
    entete: { produit: '', dci2: '', forme: 'Comprimé pelliculé', refSop: '', refIf: '', version: '', totalPages: 92, taillePoids: '', uniteDosee: '', uniteVente: '' },
    amm: { dci: '', numAmm: '', titulaire: 'Laboratoires de Diagnostic Maghrebins-LDM', dureeValidite: '36 mois', refDossierTechnique: '' },
    redacteurs: [{ nom: '', fonction: 'Superviseur Fabrication', visa: '' }],
    verificateurs: [{ nom: '', fonction: '', visa: '' }],
    approbateurs: [{ nom: '', fonction: '', visa: '' }],
    formule: [{ c: '', de: '', qn: '', qt: '', qc: '' }],
    formuleP: [],
    mats: [['', '']],
    exc: [['', '', '']],
    equip: [['', '']],
    diagramme: { flux: [], ipc: [], equipements: [] },
    formulaire: { sections: [] },
    gamme: ['pesee', 'tamisage_melange', 'compression', 'pelliculage']   // étapes de fabrication du produit
  }
}
function toggleEtape (k) {
  if (!Array.isArray(f.gamme)) f.gamme = []
  const i = f.gamme.indexOf(k)
  if (i >= 0) f.gamme.splice(i, 1); else f.gamme.push(k)
}
const f = reactive(produitVide())
function chargerForm (src) {
  const c = JSON.parse(JSON.stringify(src))
  Object.assign(f, produitVide(), c)
  // garantir les tableaux
  for (const k of ['redacteurs', 'verificateurs', 'approbateurs', 'formule', 'formuleP', 'mats', 'exc', 'equip']) if (!Array.isArray(f[k])) f[k] = []
  if (!Array.isArray(f.gamme) || !f.gamme.length) f.gamme = produitVide().gamme
  if (!f.diagramme || typeof f.diagramme !== 'object') f.diagramme = { flux: [], ipc: [], equipements: [] }
  for (const k of ['flux', 'ipc', 'equipements']) if (!Array.isArray(f.diagramme[k])) f.diagramme[k] = []
}

/* ---------- Navigation ---------- */
function ouvrirNouveau () { Object.assign(f, produitVide()); editingNom.value = null; mode.value = 'edit'; msg.value = ''; erreur.value = '' }
function ouvrirEdition (nom) { chargerForm(props.catalogue[nom]); editingNom.value = nom; mode.value = 'edit'; msg.value = ''; erreur.value = '' }
function dupliquer (nom) { chargerForm(props.catalogue[nom]); f.entete.produit = (f.entete.produit || '') + ' (copie)'; editingNom.value = null; mode.value = 'edit'; msg.value = ''; erreur.value = '' }

/* ---------- Édition de collections ---------- */
const addSig = (grp) => f[grp].push({ nom: '', fonction: '', visa: '' })
const addFormule = (k) => f[k].push({ c: '', de: '', qn: '', qt: '', qc: '' })
const addMat = () => f.mats.push(['', ''])
const addExc = () => f.exc.push(['', '', ''])
const addEquip = () => f.equip.push(['', ''])
const del = (arr, i) => arr.splice(i, 1)
// Diagramme de fabrication
const addFluxStep = () => f.diagramme.flux.push({ nom: '', items: [] })
const addIpc = () => f.diagramme.ipc.push('')
const addEquipLigne = () => f.diagramme.equipements.push('')
const setItems = (step, val) => { step.items = String(val).split('\n') }

// Pré-remplissage matières / excipients depuis la formule (à ajuster ensuite).
function genererMatieres () {
  const fromF = (f.formule || []).filter(x => x.c || x.de).map(x => [x.de, x.c])
  const fromP = (f.formuleP || []).filter(x => (x.c && x.c !== '/') && x.de).map(x => [x.de, x.c])
  f.mats = [...fromF, ...fromP]
  if (!f.mats.length) f.mats = [['', '']]
}
function genererExcipients () {
  const exF = (f.formule || []).filter(x => /^MPEX/i.test(x.c || '')).map(x => [x.de, x.c, x.qt])
  const exP = (f.formuleP || []).filter(x => (x.c && x.c !== '/') && x.de).map(x => [x.de, x.c, x.qt])
  f.exc = [...exF, ...exP]
  if (!f.exc.length) f.exc = [['', '', '']]
}

/* ---------- Enregistrement ---------- */
async function enregistrer () {
  erreur.value = ''; msg.value = ''
  const nom = (f.entete.produit || '').trim()
  if (!nom) { erreur.value = 'Le nom du produit (champ « Produit » de l\'en-tête) est obligatoire.' ; return }
  busy.value = true
  const r = await props.sauver(f)
  busy.value = false
  if (!r || r.ok === false) { erreur.value = (r && r.err) || 'Échec de l\'enregistrement.'; return }
  msg.value = r.local ? `« ${nom} » enregistré sur cet appareil (hors-ligne / table Supabase absente).` : `« ${nom} » enregistré ✓`
  mode.value = 'list'
}
async function confirmerSuppr (nom) {
  if (!confirm(`Supprimer le produit « ${nom} » du catalogue ?`)) return
  busy.value = true; await props.supprimer(nom); busy.value = false
  msg.value = `« ${nom} » supprimé.`
}
function choisir (nom) { emit('selectionner', nom); emit('close') }
</script>

<template>
  <div class="gp-overlay noprint" @click.self="emit('close')">
    <div class="gp-panel">
      <header class="gp-head">
        <h2>{{ mode === 'edit' ? (editingNom ? 'Modifier un produit' : 'Nouveau produit') : 'Gérer les produits' }}</h2>
        <button class="gp-x" @click="emit('close')" aria-label="Fermer">✕</button>
      </header>

      <p v-if="tableAbsente" class="gp-warn">⚠️ Table <code>produits_ref</code> absente dans Supabase : les produits sont enregistrés localement sur cet appareil. Exécute le script SQL fourni pour les partager entre postes.</p>
      <p v-if="msg" class="gp-ok">{{ msg }}</p>
      <p v-if="erreur" class="gp-err">{{ erreur }}</p>

      <!-- ========================= LISTE ========================= -->
      <div v-if="mode === 'list'" class="gp-body">
        <div class="gp-toolbar">
          <button class="gp-btn primary" @click="ouvrirNouveau">+ Nouveau produit</button>
          <div class="gp-search">
            <span class="gp-search-ic">🔎</span>
            <input class="gp-search-in" v-model="recherche" type="search" placeholder="Rechercher (nom, forme, réf. IF)…" />
            <button v-if="recherche" class="gp-search-x" type="button" title="Effacer" @click="recherche = ''">✕</button>
          </div>
          <span class="gp-count">{{ recherche ? nomsFiltres.length + ' / ' + noms.length : noms.length }} produit(s)</span>
        </div>
        <table class="gp-list">
          <thead><tr><th>Produit</th><th>Forme</th><th>Réf. IF</th><th>Origine</th><th class="ta-r">Actions</th></tr></thead>
          <tbody>
            <tr v-if="!nomsFiltres.length"><td colspan="5" class="gp-empty">Aucun produit ne correspond à « {{ recherche }} ».</td></tr>
            <tr v-for="nom in nomsFiltres" :key="nom">
              <td><b>{{ nom }}</b></td>
              <td>{{ catalogue[nom]?.entete?.forme || '—' }}</td>
              <td>{{ catalogue[nom]?.entete?.refIf || '—' }}</td>
              <td><span class="tag" :class="estPerso(nom) ? 'tp' : 'ti'">{{ estPerso(nom) ? 'Créé' : 'Intégré' }}</span></td>
              <td class="ta-r gp-actions">
                <button class="gp-btn xs" @click="choisir(nom)">Utiliser</button>
                <button class="gp-btn xs ghost" @click="ouvrirEdition(nom)">Modifier</button>
                <button class="gp-btn xs ghost" @click="dupliquer(nom)">Dupliquer</button>
                <button v-if="estPerso(nom)" class="gp-btn xs danger" :disabled="busy" @click="confirmerSuppr(nom)">Supprimer</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ========================= ÉDITION ========================= -->
      <div v-else class="gp-body">
        <p class="gp-hint">Astuce : les codes des <b>principes actifs</b> commencent par <code>MPPA</code>, ceux des <b>excipients</b> par <code>MPEX</code> — l'application s'en sert pour remplir la page « Pesée des principes actifs » et dimensionner les tableaux.</p>

        <h3>Gamme de fabrication (étapes du dossier)</h3>
        <p class="gp-hint2">Cochez les étapes par lesquelles ce produit passe. Le formulaire du dossier n'affichera que ces étapes (onglets de phases).</p>
        <div class="gp-gamme">
          <label v-for="e in ETAPES_FAB" :key="e.k" class="gp-etape" :class="{ on: (f.gamme || []).includes(e.k) }">
            <input type="checkbox" :checked="(f.gamme || []).includes(e.k)" @change="toggleEtape(e.k)" />
            <span>{{ e.nom }}</span>
          </label>
        </div>

        <h3>En-tête de l'IF</h3>
        <div class="gp-grid3">
          <label class="fld">Produit (nom affiché) *<input v-model="f.entete.produit" placeholder="ex. PRODUIT ® 10 mg" /></label>
          <label class="fld">DCI (bandeau)<input v-model="f.entete.dci2" /></label>
          <label class="fld">Forme<input v-model="f.entete.forme" /></label>
          <label class="fld">Référence SOP<input v-model="f.entete.refSop" placeholder="AQ-SOP-108-011" /></label>
          <label class="fld">Référence IF<input v-model="f.entete.refIf" /></label>
          <label class="fld">Version<input v-model="f.entete.version" /></label>
          <label class="fld">Taille de lot — Poids (kg)<input v-model="f.entete.taillePoids" /></label>
          <label class="fld">Unité dosée<input v-model="f.entete.uniteDosee" /></label>
          <label class="fld">Unité vente (boîte)<input v-model="f.entete.uniteVente" /></label>
          <label class="fld">Nombre total de pages<input v-model.number="f.entete.totalPages" type="number" /></label>
        </div>

        <h3>AMM</h3>
        <div class="gp-grid2">
          <label class="fld">DCI<input v-model="f.amm.dci" /></label>
          <label class="fld">N° d'AMM<input v-model="f.amm.numAmm" /></label>
          <label class="fld">Titulaire de l'AMM<input v-model="f.amm.titulaire" /></label>
          <label class="fld">Durée de validité<input v-model="f.amm.dureeValidite" /></label>
          <label class="fld">Référence Dossier Technique<input v-model="f.amm.refDossierTechnique" /></label>
        </div>

        <h3>Signataires</h3>
        <div v-for="grp in [{ k:'redacteurs', t:'Rédacteur(s)' }, { k:'verificateurs', t:'Vérificateur(s)' }, { k:'approbateurs', t:'Approbateur(s)' }]" :key="grp.k" class="gp-sig">
          <div class="gp-sig-h"><span>{{ grp.t }}</span><button class="gp-btn xs ghost" @click="addSig(grp.k)">+ ligne</button></div>
          <div v-for="(s, i) in f[grp.k]" :key="i" class="gp-sig-row">
            <input v-model="s.nom" placeholder="Nom & prénom" />
            <input v-model="s.fonction" placeholder="Fonction" />
            <button class="gp-del" @click="del(f[grp.k], i)" title="Supprimer">✕</button>
          </div>
        </div>

        <h3>Formule de fabrication <button class="gp-btn xs ghost" @click="addFormule('formule')">+ ligne</button></h3>
        <table class="gp-edit">
          <thead><tr><th>Code</th><th>Désignation</th><th>Qté/unité dosée (mg)</th><th>Qté théo./lot (kg)</th><th>Qté corrigée/lot</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in f.formule" :key="i">
              <td><input v-model="r.c" placeholder="MPPA… / MPEX…" /></td><td><input v-model="r.de" /></td>
              <td><input v-model="r.qn" /></td><td><input v-model="r.qt" /></td><td><input v-model="r.qc" /></td>
              <td><button class="gp-del" @click="del(f.formule, i)">✕</button></td>
            </tr>
          </tbody>
        </table>

        <h3>Formule de pelliculage <button class="gp-btn xs ghost" @click="addFormule('formuleP')">+ ligne</button></h3>
        <table class="gp-edit">
          <thead><tr><th>Code</th><th>Désignation</th><th>Qté/unité dosée</th><th>Qté théo./lot</th><th>Qté corrigée/lot</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in f.formuleP" :key="i">
              <td><input v-model="r.c" placeholder="MPEX… ou /" /></td><td><input v-model="r.de" /></td>
              <td><input v-model="r.qn" /></td><td><input v-model="r.qt" /></td><td><input v-model="r.qc" /></td>
              <td><button class="gp-del" @click="del(f.formuleP, i)">✕</button></td>
            </tr>
            <tr v-if="!f.formuleP.length"><td colspan="6" class="gp-empty">Aucune (produit non pelliculé) — ajouter si besoin.</td></tr>
          </tbody>
        </table>

        <h3>
          Matières premières (réception / bilan)
          <button class="gp-btn xs ghost" @click="addMat">+ ligne</button>
          <button class="gp-btn xs" @click="genererMatieres" title="Pré-remplir depuis la formule">↡ depuis la formule</button>
        </h3>
        <table class="gp-edit">
          <thead><tr><th>Désignation</th><th>Code interne</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(m, i) in f.mats" :key="i">
              <td><input v-model="f.mats[i][0]" /></td><td><input v-model="f.mats[i][1]" /></td>
              <td><button class="gp-del" @click="del(f.mats, i)">✕</button></td>
            </tr>
          </tbody>
        </table>

        <h3>
          Excipients à peser
          <button class="gp-btn xs ghost" @click="addExc">+ ligne</button>
          <button class="gp-btn xs" @click="genererExcipients" title="Pré-remplir depuis la formule">↡ depuis la formule</button>
        </h3>
        <table class="gp-edit">
          <thead><tr><th>Désignation</th><th>Code interne</th><th>Qté théorique /lot</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(m, i) in f.exc" :key="i">
              <td><input v-model="f.exc[i][0]" /></td><td><input v-model="f.exc[i][1]" /></td><td><input v-model="f.exc[i][2]" /></td>
              <td><button class="gp-del" @click="del(f.exc, i)">✕</button></td>
            </tr>
          </tbody>
        </table>

        <h3>Équipements / balances de pesée <button class="gp-btn xs ghost" @click="addEquip">+ ligne</button></h3>
        <table class="gp-edit">
          <thead><tr><th>Désignation</th><th>Code</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(m, i) in f.equip" :key="i">
              <td><input v-model="f.equip[i][0]" /></td><td><input v-model="f.equip[i][1]" /></td>
              <td><button class="gp-del" @click="del(f.equip, i)">✕</button></td>
            </tr>
          </tbody>
        </table>

        <h3>Diagramme de fabrication (page 8)</h3>
        <p class="gp-hint">Propre à chaque produit : le flux des opérations (mélange, compression, pelliculage…), les contrôles en cours (IPC) et les équipements de la ligne.</p>

        <div class="gp-subh">Flux d'opérations <button class="gp-btn xs ghost" @click="addFluxStep">+ étape</button></div>
        <p v-if="!f.diagramme.flux.length" class="gp-empty2">Aucune étape — « Pesée » est ajoutée automatiquement en tête du diagramme.</p>
        <div v-for="(step, i) in f.diagramme.flux" :key="i" class="gp-flux-row">
          <input class="gp-flux-nom" v-model="step.nom" placeholder="Nom de l'étape (ex. Mélange 01)" />
          <textarea class="gp-flux-items" :value="(step.items || []).join('\n')" @input="setItems(step, $event.target.value)" placeholder="Composants, un par ligne"></textarea>
          <button class="gp-del" @click="del(f.diagramme.flux, i)">✕</button>
        </div>

        <div class="gp-subh">Contrôles en cours (IPC) <button class="gp-btn xs ghost" @click="addIpc">+ ligne</button></div>
        <div v-for="(x, i) in f.diagramme.ipc" :key="'ipc'+i" class="gp-line-row">
          <input v-model="f.diagramme.ipc[i]" placeholder="Ex. Aspect — Masse — Dureté — Friabilité…" />
          <button class="gp-del" @click="del(f.diagramme.ipc, i)">✕</button>
        </div>

        <div class="gp-subh">Équipements de la ligne <button class="gp-btn xs ghost" @click="addEquipLigne">+ ligne</button></div>
        <div v-for="(x, i) in f.diagramme.equipements" :key="'eq'+i" class="gp-line-row">
          <input v-model="f.diagramme.equipements[i]" placeholder="Ex. Comprimeuse Fette 1200i, code PR012" />
          <button class="gp-del" @click="del(f.diagramme.equipements, i)">✕</button>
        </div>
      </div>

      <!-- ========================= PIED ========================= -->
      <footer class="gp-foot">
        <template v-if="mode === 'edit'">
          <button class="gp-btn ghost" @click="mode = 'list'">← Retour à la liste</button>
          <button class="gp-btn primary" :disabled="busy" @click="enregistrer">{{ busy ? 'Enregistrement…' : 'Enregistrer le produit' }}</button>
        </template>
        <template v-else>
          <button class="gp-btn ghost" @click="emit('close')">Fermer</button>
        </template>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.gp-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: flex; align-items: flex-start; justify-content: center; padding: 28px 16px; z-index: 1000; overflow: auto; }
.gp-panel { background: #fff; width: 100%; max-width: 980px; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.3); display: flex; flex-direction: column; max-height: calc(100vh - 56px); }
.gp-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
.gp-head h2 { margin: 0; font-size: 18px; color: #0f172a; }
.gp-x { border: 0; background: #f1f5f9; width: 32px; height: 32px; border-radius: 8px; font-size: 15px; cursor: pointer; color: #475569; }
.gp-x:hover { background: #e2e8f0; }
.gp-body { padding: 16px 20px; overflow: auto; }
.gp-warn { margin: 12px 20px 0; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 9px 13px; border-radius: 8px; font-size: 12.5px; }
.gp-warn code, .gp-hint code { background: #eef2ff; padding: 1px 5px; border-radius: 4px; }
.gp-ok { margin: 12px 20px 0; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 9px 13px; border-radius: 8px; font-size: 13px; }
.gp-err { margin: 12px 20px 0; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 9px 13px; border-radius: 8px; font-size: 13px; }
.gp-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.gp-count { font-size: 12px; color: #64748b; white-space: nowrap; }
.gp-search { position: relative; display: inline-flex; align-items: center; flex: 1 1 220px; max-width: 360px; }
.gp-search-ic { position: absolute; left: 10px; font-size: 13px; opacity: .6; pointer-events: none; }
.gp-search-in { font: inherit; font-size: 13px; color: #0f172a; width: 100%; padding: 8px 28px 8px 30px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; }
.gp-search-in:focus { outline: none; border-color: #0891b2; box-shadow: 0 0 0 3px #cffafe; }
.gp-search-x { position: absolute; right: 7px; border: 0; background: #e2e8f0; color: #475569; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.gp-search-x:hover { background: #cbd5e1; }
.gp-empty { text-align: center; color: #94a3b8; font-style: italic; padding: 16px; }
.gp-hint { font-size: 12.5px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; margin: 0 0 14px; }
.gp-hint2 { font-size: 12px; color: #64748b; margin: 0 0 8px; }
.gp-gamme { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.gp-etape { display: inline-flex; align-items: center; gap: 7px; border: 1px solid #cbd5e1; border-radius: 9px; padding: 7px 12px; font-size: 13px; cursor: pointer; background: #fff; color: #334155; }
.gp-etape.on { border-color: #0e7490; background: #ecfeff; color: #0e7490; font-weight: 600; }
.gp-etape input { margin: 0; cursor: pointer; }
.gp-list, .gp-edit { width: 100%; border-collapse: collapse; font-size: 13px; }
.gp-list th, .gp-list td { border-bottom: 1px solid #eef2f6; padding: 8px 8px; text-align: left; vertical-align: middle; }
.gp-list th { font-size: 11px; text-transform: uppercase; letter-spacing: .3px; color: #64748b; }
.ta-r { text-align: right; }
.gp-actions { white-space: nowrap; }
.tag { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.tag.tp { background: #ecfeff; color: #155e75; border: 1px solid #a5f3fc; }
.tag.ti { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
h3 { font-size: 13px; color: #0e7490; margin: 20px 0 8px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
h3:first-of-type { margin-top: 4px; }
.gp-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px 12px; }
.gp-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px 12px; }
.fld { display: flex; flex-direction: column; font-size: 11.5px; font-weight: 600; color: #475569; gap: 3px; }
.fld input { font: inherit; font-size: 13px; font-weight: 400; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; color: #0f172a; }
.gp-edit th, .gp-edit td { border: 1px solid #e2e8f0; padding: 3px; }
.gp-edit th { font-size: 11px; color: #475569; background: #f8fafc; padding: 6px 5px; }
.gp-edit input { width: 100%; border: 0; font: inherit; font-size: 12.5px; padding: 6px 6px; background: transparent; }
.gp-edit input:focus { outline: 2px solid #67e8f9; border-radius: 4px; }
.gp-empty { text-align: center; color: #94a3b8; font-style: italic; padding: 8px; }
.gp-empty2 { color: #94a3b8; font-style: italic; font-size: 12px; margin: 2px 0 6px; }
.gp-subh { font-size: 12px; font-weight: 700; color: #334155; margin: 12px 0 6px; display: flex; align-items: center; gap: 10px; }
.gp-flux-row { display: grid; grid-template-columns: 1fr 1.4fr auto; gap: 7px; margin-bottom: 6px; align-items: start; }
.gp-flux-nom { font: inherit; font-size: 13px; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; }
.gp-flux-items { font: inherit; font-size: 12.5px; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; min-height: 48px; resize: vertical; }
.gp-line-row { display: grid; grid-template-columns: 1fr auto; gap: 7px; margin-bottom: 5px; }
.gp-line-row input { font: inherit; font-size: 13px; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; }
.gp-sig { margin-bottom: 10px; }
.gp-sig-h { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 700; color: #155e75; margin-bottom: 5px; }
.gp-sig-row { display: grid; grid-template-columns: 1fr 1.6fr auto; gap: 7px; margin-bottom: 5px; }
.gp-sig-row input { font: inherit; font-size: 13px; padding: 6px 9px; border: 1px solid #cbd5e1; border-radius: 7px; }
.gp-del { border: 0; background: #fef2f2; color: #be123c; width: 28px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.gp-del:hover { background: #fee2e2; }
.gp-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 20px; border-top: 1px solid #e2e8f0; }
.gp-btn { background: #0891b2; color: #fff; border: 0; padding: 9px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.gp-btn.primary { background: #0891b2; }
.gp-btn.ghost { background: #fff; color: #0e7490; border: 1px solid #a5f3fc; }
.gp-btn.danger { background: #fff; color: #be123c; border: 1px solid #fecaca; }
.gp-btn.xs { padding: 5px 10px; font-size: 12px; }
.gp-btn:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 680px) { .gp-grid2, .gp-grid3 { grid-template-columns: 1fr; } .gp-actions { white-space: normal; } }
</style>
