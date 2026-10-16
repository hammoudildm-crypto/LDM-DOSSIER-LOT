<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { supabase } from '../supabase'
import PageHeader from '../components/PageHeader.vue'

const peutEditer = inject('peutEditer', ref(true))

/* ---------------- État du dossier ---------------- */
function dossierVide () {
  return {
    entete: {
      codePf: '', designation: '', dosage: '', numeroLot: '', numeroOf: '',
      tailleLot: '', uniteTaille: 'comprimés', dateDebut: '', dateFin: '',
      peremption: '', version: '01', fabricant: 'LDM Groupe — Site El Khroub'
    },
    matieres: [],
    equipements: [],
    conditions: [],
    etapes: {
      pesee:        { debut: '', fin: '', salle: '', balances: '', op: '', verif: '', obs: '' },
      melange:      { equipement: '', vitesse: '', duree: '', debut: '', fin: '', op: '', verif: '', obs: '' },
      granulation:  { liant: '', solvant: '', qteSolvant: '', equipement: '', duree: '', aspect: '', debut: '', fin: '', op: '', verif: '', obs: '' },
      sechage:      { equipement: '', temperature: '', duree: '', lodCible: '', lodResultat: '', debut: '', fin: '', op: '', verif: '', obs: '' },
      calibrage:    { equipement: '', tamis: '', vitesse: '', debut: '', fin: '', op: '', verif: '', obs: '' },
      lubrification:{ lubrifiant: '', qteLubrifiant: '', equipement: '', vitesse: '', duree: '', debut: '', fin: '', op: '', verif: '', obs: '' },
      compression:  { machine: '', poincon: '', masseCible: '', vitesse: '', force: '', debut: '', fin: '', op: '', verif: '', obs: '' },
      pelliculage:  { suspension: '', priseMasseCible: '', priseMasseReel: '', tEntree: '', tProduit: '', debit: '', duree: '', debut: '', fin: '', op: '', verif: '', obs: '' }
    },
    pelliculageActif: false,
    ipc: [],
    rendements: { granuleTheo: '', granuleReel: '', comprimesTheo: '', comprimesReel: '', pellicTheo: '', pellicReel: '', limiteBasse: '98', limiteHaute: '102', justif: '' },
    reconciliation: { theorique: '', produits: '', echantillons: '', rebuts: '', detruits: '' },
    deviations: [],
    revue: { conformeProcede: false, conformeIpc: false, conformeRendement: false, resultatsCq: '', decision: '', commentaire: '' },
    visas: { fabrication: { nom: '', date: '' }, verification: { nom: '', date: '' }, aq: { nom: '', date: '' }, liberation: { nom: '', date: '' } },
    statut: 'Brouillon'
  }
}
const d = reactive(dossierVide())
const dossierId = ref(null)            // id en base si dossier déjà enregistré

/* ---------------- Données Supabase ---------------- */
const produits = ref([])
const liste = ref([])                  // dossiers enregistrés (pour recharger)
const erreur = ref('')
const message = ref('')
const tableAbsente = ref(false)

// Le formulaire s'affiche immédiatement ; les données (produits, dossiers)
// se chargent en arrière-plan et ne bloquent jamais la saisie.
async function charger () {
  try {
    const rp = await supabase.from('produits').select('id, code_pf, designation').order('code_pf')
    if (!rp.error) produits.value = rp.data || []
  } catch (e) { /* hors-ligne : la liste produits reste vide, saisie manuelle possible */ }
  try { await chargerListe() } catch (e) { /* idem */ }
}
async function chargerListe () {
  const r = await supabase.from('dossiers_lot')
    .select('id, numero_lot, code_pf, forme, statut, date_fab, updated_at')
    .order('updated_at', { ascending: false }).limit(50)
  if (r.error) { tableAbsente.value = /dossiers_lot/.test(r.error.message || '') || r.error.code === '42P01'; liste.value = []; return }
  tableAbsente.value = false
  liste.value = r.data || []
}

/* ---------------- Produit ---------------- */
const rechercheProduit = ref('')
const produitSel = ref('')
const produitsFiltres = computed(() => {
  const q = rechercheProduit.value.trim().toLowerCase()
  if (!q) return produits.value
  return produits.value.filter(p => (p.code_pf + ' ' + (p.designation || '')).toLowerCase().includes(q))
})
function appliquerProduit () {
  const p = produits.value.find(x => String(x.id) === String(produitSel.value))
  if (!p) return
  d.entete.codePf = p.code_pf || ''
  d.entete.designation = p.designation || ''
}

/* ---------------- Lignes dynamiques ---------------- */
function addMatiere () { d.matieres.push({ designation: '', code: '', lotMp: '', fournisseur: '', qteTheo: '', qteReel: '', visa: '' }) }
function addEquipement () { d.equipements.push({ etape: '', equipement: '', code: '', nettoyage: false, visa: '' }) }
function addCondition () { d.conditions.push({ zone: '', heure: '', temp: '', hr: '', deltaP: '', visa: '' }) }
function addIpc () { d.ipc.push({ heure: '', poidsMoyen: '', poidsMin: '', poidsMax: '', durete: '', epaisseur: '', friabilite: '', desagregation: '', aspect: '', visa: '' }) }
function addDeviation () { d.deviations.push({ num: String(d.deviations.length + 1), description: '', action: '', classe: '', visa: '', date: '' }) }
function retirer (arr, i) { arr.splice(i, 1) }

/* ---------------- Calculs ---------------- */
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n }
const totalTheoMat = computed(() => d.matieres.reduce((s, m) => s + num(m.qteTheo), 0))
const totalReelMat = computed(() => d.matieres.reduce((s, m) => s + num(m.qteReel), 0))

function rdt (theo, reel) { const t = num(theo); return t > 0 ? Math.round((num(reel) / t) * 1000) / 10 : null }
const rdtGranule = computed(() => rdt(d.rendements.granuleTheo, d.rendements.granuleReel))
const rdtComprimes = computed(() => rdt(d.rendements.comprimesTheo, d.rendements.comprimesReel))
const rdtPellic = computed(() => rdt(d.rendements.pellicTheo, d.rendements.pellicReel))
const rdtGlobal = computed(() => {
  // rendement global = dernière étape réelle / 1re étape théorique si dispo
  const theo = num(d.rendements.granuleTheo) || num(d.rendements.comprimesTheo)
  const reel = num(d.rendements.pellicReel) || num(d.rendements.comprimesReel) || num(d.rendements.granuleReel)
  return theo > 0 && reel > 0 ? Math.round((reel / theo) * 1000) / 10 : null
})
function rdtClasse (v) {
  if (v == null) return ''
  return (v >= num(d.rendements.limiteBasse) && v <= num(d.rendements.limiteHaute)) ? 'ok' : 'ko'
}
const recTotal = computed(() => num(d.reconciliation.produits) + num(d.reconciliation.echantillons) + num(d.reconciliation.rebuts) + num(d.reconciliation.detruits))
const recEcart = computed(() => { const t = num(d.reconciliation.theorique); return t > 0 ? Math.round((recTotal.value / t) * 1000) / 10 : null })

const statutCouleur = computed(() => ({
  'Brouillon': '#64748b', 'En cours': '#b45309', 'Terminé': '#0e7490', 'Libéré': '#047857', 'Refusé': '#be123c'
}[d.statut] || '#64748b'))

/* ---------------- Enregistrement ---------------- */
function reset () {
  Object.assign(d, dossierVide())
  dossierId.value = null
  produitSel.value = ''
  rechercheProduit.value = ''
  message.value = ''
}
function nouveau () {
  if (!confirm('Créer un nouveau dossier ? Les saisies non enregistrées seront perdues.')) return
  reset()
}

async function enregistrer () {
  erreur.value = ''; message.value = ''
  if (!d.entete.numeroLot) { erreur.value = 'Renseigne au moins le N° de lot avant d\'enregistrer.'; return }
  const payload = {
    numero_lot: d.entete.numeroLot,
    code_pf: d.entete.codePf || null,
    numero_of: d.entete.numeroOf || null,
    forme: 'Comprimés',
    statut: d.statut,
    date_fab: d.entete.dateDebut || null,
    contenu: JSON.parse(JSON.stringify(d))
  }
  let r
  if (dossierId.value) r = await supabase.from('dossiers_lot').update(payload).eq('id', dossierId.value).select('id').single()
  else r = await supabase.from('dossiers_lot').insert(payload).select('id').single()
  if (r.error) {
    if (/dossiers_lot/.test(r.error.message || '') || r.error.code === '42P01') { tableAbsente.value = true; erreur.value = 'La table « dossiers_lot » n\'existe pas encore — exécute le script SQL fourni, puis réessaie.' }
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
  reset()
  const c = r.data.contenu || {}
  Object.assign(d, dossierVide(), c)
  dossierId.value = r.data.id
  message.value = 'Dossier « ' + (d.entete.numeroLot || id) + ' » chargé.'
}

async function supprimer () {
  if (!dossierId.value) return
  if (!confirm('Supprimer définitivement ce dossier enregistré ?')) return
  const r = await supabase.from('dossiers_lot').delete().eq('id', dossierId.value)
  if (r.error) { erreur.value = 'Suppression impossible : ' + r.error.message; return }
  reset(); await chargerListe(); message.value = 'Dossier supprimé.'
}

/* ---------------- Impression (dossier BPF) ---------------- */
function L (v) { return (v == null || v === '') ? '—' : String(v) }
function ficheHTML () {
  const e = d.entete
  const row = (cells) => '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>'
  const th = (cells) => '<tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr>'

  const matLignes = d.matieres.map(m => row([L(m.designation), L(m.code), L(m.lotMp), L(m.fournisseur), L(m.qteTheo), L(m.qteReel), L(m.visa)])).join('')
  const eqLignes = d.equipements.map(q => row([L(q.etape), L(q.equipement), L(q.code), q.nettoyage ? 'Oui' : 'Non', L(q.visa)])).join('')
  const condLignes = d.conditions.map(c => row([L(c.zone), L(c.heure), L(c.temp), L(c.hr), L(c.deltaP), L(c.visa)])).join('')
  const ipcLignes = d.ipc.map(c => row([L(c.heure), L(c.poidsMoyen), L(c.poidsMin), L(c.poidsMax), L(c.durete), L(c.epaisseur), L(c.friabilite), L(c.desagregation), L(c.aspect), L(c.visa)])).join('')
  const devLignes = d.deviations.map(v => row([L(v.num), L(v.description), L(v.classe), L(v.action), L(v.date), L(v.visa)])).join('')

  const etape = (titre, lignes) => `<h3>${titre}</h3><table class="kv"><tbody>${lignes}</tbody></table>`
  const kv = (k, v) => `<tr><td class="k">${k}</td><td>${L(v)}</td></tr>`
  const et = d.etapes
  const bloc = []
  bloc.push(etape('1. Pesée / Dispensing', kv('Salle', et.pesee.salle) + kv('Balances', et.pesee.balances) + kv('Début', et.pesee.debut) + kv('Fin', et.pesee.fin) + kv('Opérateur', et.pesee.op) + kv('Vérificateur', et.pesee.verif) + kv('Observations', et.pesee.obs)))
  bloc.push(etape('2. Mélange', kv('Équipement', et.melange.equipement) + kv('Vitesse', et.melange.vitesse) + kv('Durée', et.melange.duree) + kv('Début', et.melange.debut) + kv('Fin', et.melange.fin) + kv('Opérateur', et.melange.op) + kv('Vérificateur', et.melange.verif) + kv('Observations', et.melange.obs)))
  bloc.push(etape('3. Granulation humide', kv('Liant', et.granulation.liant) + kv('Solvant', et.granulation.solvant) + kv('Qté solvant', et.granulation.qteSolvant) + kv('Équipement', et.granulation.equipement) + kv('Durée', et.granulation.duree) + kv('Aspect granulé', et.granulation.aspect) + kv('Opérateur', et.granulation.op) + kv('Vérificateur', et.granulation.verif)))
  bloc.push(etape('4. Séchage', kv('Équipement', et.sechage.equipement) + kv('Température', et.sechage.temperature) + kv('Durée', et.sechage.duree) + kv('LOD cible (%)', et.sechage.lodCible) + kv('LOD résultat (%)', et.sechage.lodResultat) + kv('Opérateur', et.sechage.op) + kv('Vérificateur', et.sechage.verif)))
  bloc.push(etape('5. Calibrage', kv('Équipement', et.calibrage.equipement) + kv('Tamis/grille', et.calibrage.tamis) + kv('Vitesse', et.calibrage.vitesse) + kv('Opérateur', et.calibrage.op) + kv('Vérificateur', et.calibrage.verif)))
  bloc.push(etape('6. Lubrification / Mélange final', kv('Lubrifiant', et.lubrification.lubrifiant) + kv('Qté', et.lubrification.qteLubrifiant) + kv('Équipement', et.lubrification.equipement) + kv('Vitesse', et.lubrification.vitesse) + kv('Durée', et.lubrification.duree) + kv('Opérateur', et.lubrification.op) + kv('Vérificateur', et.lubrification.verif)))
  bloc.push(etape('7. Compression', kv('Machine', et.compression.machine) + kv('Poinçon/format', et.compression.poincon) + kv('Masse cible/comprimé', et.compression.masseCible) + kv('Vitesse', et.compression.vitesse) + kv('Force', et.compression.force) + kv('Début', et.compression.debut) + kv('Fin', et.compression.fin) + kv('Opérateur', et.compression.op) + kv('Vérificateur', et.compression.verif)))
  if (d.pelliculageActif) bloc.push(etape('8. Pelliculage', kv('Suspension', et.pelliculage.suspension) + kv('Prise de masse cible (%)', et.pelliculage.priseMasseCible) + kv('Prise de masse réelle (%)', et.pelliculage.priseMasseReel) + kv('T° entrée', et.pelliculage.tEntree) + kv('T° produit', et.pelliculage.tProduit) + kv('Débit', et.pelliculage.debit) + kv('Durée', et.pelliculage.duree) + kv('Opérateur', et.pelliculage.op) + kv('Vérificateur', et.pelliculage.verif)))

  const rdtRow = (lbl, theo, reel, pct) => row([lbl, L(theo), L(reel), pct == null ? '—' : pct + ' %'])

  const now = new Date().toLocaleString('fr-FR')
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Dossier de lot ${L(e.numeroLot)}</title>
<style>
*{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1b2733;margin:16mm;font-size:11px}
h1{font-size:18px;margin:0 0 2px;color:#0e7490} h2{font-size:13px;margin:18px 0 6px;color:#0e7490;border-bottom:2px solid #0891b2;padding-bottom:3px}
h3{font-size:12px;margin:12px 0 4px;color:#155e75}
.sub{color:#64748b;margin:0 0 10px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:3px 24px;border-top:2px solid #0891b2;border-bottom:1px solid #e2e8f0;padding:8px 0;margin-bottom:6px}
.meta b{color:#0f172a}
table{width:100%;border-collapse:collapse;margin-bottom:6px}
th{background:#ecfeff;color:#155e75;padding:4px 6px;border:1px solid #cffafe;font-size:9px;text-transform:uppercase;text-align:left}
td{padding:4px 6px;border:1px solid #eef2f6;vertical-align:top}
table.kv td.k{width:42%;color:#475569;font-weight:600}
.tot td{font-weight:800;background:#fafafa}
.ok{color:#047857;font-weight:700} .ko{color:#be123c;font-weight:700}
.sig{display:flex;gap:16px;margin-top:10px;flex-wrap:wrap}
.sig .b{flex:1;min-width:150px;border:1px solid #cbd5e1;border-radius:6px;padding:8px}
.sig .b .t{font-size:9px;text-transform:uppercase;color:#64748b;margin-bottom:14px}
.foot{margin-top:18px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:6px}
@media print{body{margin:12mm} h2{page-break-after:avoid} table{page-break-inside:auto} tr{page-break-inside:avoid}}
</style></head><body>
<h1>Dossier de lot — Comprimés</h1>
<p class="sub">${L(e.fabricant)} · Version dossier ${L(e.version)}</p>
<div class="meta">
  <span>Produit : <b>${L(e.codePf)} — ${L(e.designation)}</b></span><span>Dosage : <b>${L(e.dosage)}</b></span>
  <span>N° de lot : <b>${L(e.numeroLot)}</b></span><span>N° OF : <b>${L(e.numeroOf)}</b></span>
  <span>Taille du lot : <b>${L(e.tailleLot)} ${L(e.uniteTaille)}</b></span><span>Statut : <b>${L(d.statut)}</b></span>
  <span>Début fabrication : <b>${L(e.dateDebut)}</b></span><span>Fin fabrication : <b>${L(e.dateFin)}</b></span>
  <span>Péremption : <b>${L(e.peremption)}</b></span><span>Édité le : <b>${now}</b></span>
</div>

<h2>1. Composition / Formule du lot</h2>
<table><thead>${th(['Matière', 'Code', 'N° lot MP', 'Fournisseur', 'Qté théo.', 'Qté réelle', 'Visa'])}</thead>
<tbody>${matLignes || row(['—', '', '', '', '', '', ''])}<tr class="tot"><td colspan="4">Total</td><td>${totalTheoMat.value || '—'}</td><td>${totalReelMat.value || '—'}</td><td></td></tr></tbody></table>

<h2>2. Équipements utilisés</h2>
<table><thead>${th(['Étape', 'Équipement', 'Code', 'Nettoyage OK', 'Visa'])}</thead><tbody>${eqLignes || row(['—', '', '', '', ''])}</tbody></table>

<h2>3. Conditions de fabrication</h2>
<table><thead>${th(['Zone/Salle', 'Heure', 'T° (°C)', 'HR (%)', 'ΔP (Pa)', 'Visa'])}</thead><tbody>${condLignes || row(['—', '', '', '', '', ''])}</tbody></table>

<h2>4. Étapes de fabrication</h2>
${bloc.join('')}

<h2>5. Contrôles en cours de fabrication (compression)</h2>
<table><thead>${th(['Heure', 'Poids moy.', 'Min', 'Max', 'Dureté (N)', 'Épaiss. (mm)', 'Friab. (%)', 'Désagr. (min)', 'Aspect', 'Visa'])}</thead>
<tbody>${ipcLignes || row(['—', '', '', '', '', '', '', '', '', ''])}</tbody></table>

<h2>6. Rendements & Réconciliation</h2>
<table><thead>${th(['Étape', 'Théorique', 'Réel', 'Rendement'])}</thead><tbody>
${rdtRow('Granulé', d.rendements.granuleTheo, d.rendements.granuleReel, rdtGranule.value)}
${rdtRow('Comprimés (compression)', d.rendements.comprimesTheo, d.rendements.comprimesReel, rdtComprimes.value)}
${d.pelliculageActif ? rdtRow('Après pelliculage', d.rendements.pellicTheo, d.rendements.pellicReel, rdtPellic.value) : ''}
<tr class="tot"><td colspan="3">Rendement global</td><td>${rdtGlobal.value == null ? '—' : rdtGlobal.value + ' %'}</td></tr>
</tbody></table>
<p style="font-size:10px;color:#475569">Limites d'acceptation : ${L(d.rendements.limiteBasse)} – ${L(d.rendements.limiteHaute)} %. ${d.rendements.justif ? 'Justification écart : ' + L(d.rendements.justif) : ''}</p>
<table><thead>${th(['Théorique', 'Produits', 'Échantillons', 'Rebuts', 'Détruits', 'Total', 'Bilan'])}</thead>
<tbody>${row([L(d.reconciliation.theorique), L(d.reconciliation.produits), L(d.reconciliation.echantillons), L(d.reconciliation.rebuts), L(d.reconciliation.detruits), recTotal.value || '—', recEcart.value == null ? '—' : recEcart.value + ' %'])}</tbody></table>

<h2>7. Déviations / Événements</h2>
<table><thead>${th(['N°', 'Description', 'Classe', 'Action corrective', 'Date', 'Visa'])}</thead><tbody>${devLignes || row(['—', 'Aucune déviation', '', '', '', ''])}</tbody></table>

<h2>8. Revue & Libération</h2>
<table class="kv"><tbody>
<tr><td class="k">Procédé conforme</td><td>${d.revue.conformeProcede ? 'Oui' : 'Non'}</td></tr>
<tr><td class="k">Contrôles en cours conformes</td><td>${d.revue.conformeIpc ? 'Oui' : 'Non'}</td></tr>
<tr><td class="k">Rendement conforme</td><td>${d.revue.conformeRendement ? 'Oui' : 'Non'}</td></tr>
<tr><td class="k">Résultats CQ</td><td>${L(d.revue.resultatsCq)}</td></tr>
<tr><td class="k">Décision</td><td><b>${L(d.revue.decision)}</b></td></tr>
<tr><td class="k">Commentaire</td><td>${L(d.revue.commentaire)}</td></tr>
</tbody></table>

<div class="sig">
  <div class="b"><div class="t">Fabrication — ${L(d.visas.fabrication.nom)} ${d.visas.fabrication.date ? '(' + L(d.visas.fabrication.date) + ')' : ''}</div></div>
  <div class="b"><div class="t">Vérification — ${L(d.visas.verification.nom)} ${d.visas.verification.date ? '(' + L(d.visas.verification.date) + ')' : ''}</div></div>
  <div class="b"><div class="t">Assurance Qualité — ${L(d.visas.aq.nom)} ${d.visas.aq.date ? '(' + L(d.visas.aq.date) + ')' : ''}</div></div>
  <div class="b"><div class="t">Libération — ${L(d.visas.liberation.nom)} ${d.visas.liberation.date ? '(' + L(d.visas.liberation.date) + ')' : ''}</div></div>
</div>
<div class="foot">Dossier de lot électronique généré par l'application Dossier de lot — LDM Groupe. Document à vérifier et viser selon les procédures en vigueur.</div>
</body></html>`
}
function imprimer () {
  const w = window.open('', '_blank')
  if (!w) { erreur.value = 'Autorise les pop-ups pour imprimer le dossier.'; return }
  w.document.write(ficheHTML()); w.document.close(); w.focus()
  setTimeout(() => { try { w.print() } catch (e) { /* ignore */ } }, 400)
}

/* ---------------- Sections pliables ---------------- */
const sec = reactive({ id: true, compo: true, equip: true, cond: false, etapes: true, ipc: false, rdt: true, dev: false, revue: true })
function toggle (k) { sec[k] = !sec[k] }

onMounted(charger)
</script>

<template>
  <div class="dl-page">
    <PageHeader title="Dossier de lot — Comprimés"
      subtitle="Dossier de lot électronique (eBMR) — forme sèche comprimés. Saisie, enregistrement et impression.">
      <span class="statut" :style="{ background: statutCouleur }">{{ d.statut }}</span>
      <button class="btn ghost sm" @click="nouveau">Nouveau</button>
      <button class="btn sm" :disabled="!peutEditer" @click="enregistrer">Enregistrer</button>
      <button class="btn ghost sm" @click="imprimer">Imprimer</button>
    </PageHeader>

    <p v-if="erreur" class="alert">{{ erreur }}</p>
    <p v-if="message" class="ok-msg">{{ message }}</p>
    <p v-if="tableAbsente" class="warn">⚠️ La table <code>dossiers_lot</code> n'existe pas encore dans Supabase. Le formulaire fonctionne et s'imprime, mais l'enregistrement en base nécessite d'exécuter le script SQL fourni (une fois).</p>

    <!-- Barre : recharger un dossier -->
    <section class="card slim" v-if="liste.length">
      <label class="fld inline">Recharger un dossier enregistré
        <select @change="chargerDossier($event.target.value)">
          <option value="">— choisir —</option>
          <option v-for="x in liste" :key="x.id" :value="x.id">{{ x.numero_lot }} · {{ x.code_pf || '—' }} · {{ x.statut }}</option>
        </select>
      </label>
      <button v-if="dossierId" class="btn ghost sm danger" @click="supprimer">Supprimer ce dossier</button>
    </section>

      <!-- 1. Identification -->
      <section class="card">
        <div class="card-h" @click="toggle('id')"><h2>1 · Identification du lot</h2><span class="chev">{{ sec.id ? '▾' : '▸' }}</span></div>
        <div v-show="sec.id" class="card-b">
          <div class="grid3">
            <label class="fld">Produit
              <input v-model="rechercheProduit" type="text" class="mini" placeholder="Rechercher…" />
              <select v-model="produitSel" @change="appliquerProduit">
                <option value="">— choisir —</option>
                <option v-for="p in produitsFiltres" :key="p.id" :value="String(p.id)">{{ p.code_pf }} — {{ p.designation }}</option>
              </select>
            </label>
            <label class="fld">Code PF<input v-model="d.entete.codePf" type="text" /></label>
            <label class="fld">Désignation<input v-model="d.entete.designation" type="text" /></label>
            <label class="fld">Dosage<input v-model="d.entete.dosage" type="text" placeholder="ex. 500 mg" /></label>
            <label class="fld">N° de lot<input v-model="d.entete.numeroLot" type="text" /></label>
            <label class="fld">N° OF<input v-model="d.entete.numeroOf" type="text" /></label>
            <label class="fld">Taille du lot
              <div class="row">
                <input v-model="d.entete.tailleLot" type="text" />
                <select v-model="d.entete.uniteTaille" class="u"><option>comprimés</option><option>boîtes</option><option>kg</option></select>
              </div>
            </label>
            <label class="fld">Début fabrication<input v-model="d.entete.dateDebut" type="date" /></label>
            <label class="fld">Fin fabrication<input v-model="d.entete.dateFin" type="date" /></label>
            <label class="fld">Péremption<input v-model="d.entete.peremption" type="date" /></label>
            <label class="fld">Version dossier<input v-model="d.entete.version" type="text" /></label>
            <label class="fld">Statut
              <select v-model="d.statut"><option>Brouillon</option><option>En cours</option><option>Terminé</option><option>Libéré</option><option>Refusé</option></select>
            </label>
          </div>
        </div>
      </section>

      <!-- 2. Composition -->
      <section class="card">
        <div class="card-h" @click="toggle('compo')"><h2>2 · Composition / Formule du lot</h2><span class="chev">{{ sec.compo ? '▾' : '▸' }}</span></div>
        <div v-show="sec.compo" class="card-b">
          <div class="tbl-scroll">
            <table class="tbl">
              <thead><tr><th>Matière (API/Excipient)</th><th>Code</th><th>N° lot MP</th><th>Fournisseur</th><th>Qté théo.</th><th>Qté réelle</th><th>Visa</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(m, i) in d.matieres" :key="i">
                  <td><input v-model="m.designation" /></td><td><input v-model="m.code" class="w-sm" /></td>
                  <td><input v-model="m.lotMp" class="w-sm" /></td><td><input v-model="m.fournisseur" /></td>
                  <td><input v-model="m.qteTheo" class="w-xs ta-r" /></td><td><input v-model="m.qteReel" class="w-xs ta-r" /></td>
                  <td><input v-model="m.visa" class="w-xs" /></td>
                  <td><button class="x" @click="retirer(d.matieres, i)">✕</button></td>
                </tr>
                <tr v-if="!d.matieres.length"><td colspan="8" class="empty">Aucune matière — clique « + Ajouter une matière ».</td></tr>
              </tbody>
              <tfoot v-if="d.matieres.length"><tr class="tot"><td colspan="4">Total</td><td class="ta-r">{{ totalTheoMat || '—' }}</td><td class="ta-r">{{ totalReelMat || '—' }}</td><td colspan="2"></td></tr></tfoot>
            </table>
          </div>
          <button class="btn ghost sm" @click="addMatiere">+ Ajouter une matière</button>
        </div>
      </section>

      <!-- 3. Équipements -->
      <section class="card">
        <div class="card-h" @click="toggle('equip')"><h2>3 · Équipements utilisés</h2><span class="chev">{{ sec.equip ? '▾' : '▸' }}</span></div>
        <div v-show="sec.equip" class="card-b">
          <div class="tbl-scroll">
            <table class="tbl">
              <thead><tr><th>Étape</th><th>Équipement</th><th>Code</th><th>Nettoyage OK</th><th>Visa</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(q, i) in d.equipements" :key="i">
                  <td><input v-model="q.etape" /></td><td><input v-model="q.equipement" /></td><td><input v-model="q.code" class="w-sm" /></td>
                  <td class="ta-c"><input type="checkbox" v-model="q.nettoyage" /></td><td><input v-model="q.visa" class="w-xs" /></td>
                  <td><button class="x" @click="retirer(d.equipements, i)">✕</button></td>
                </tr>
                <tr v-if="!d.equipements.length"><td colspan="6" class="empty">Aucun équipement listé.</td></tr>
              </tbody>
            </table>
          </div>
          <button class="btn ghost sm" @click="addEquipement">+ Ajouter un équipement</button>
        </div>
      </section>

      <!-- 4. Conditions -->
      <section class="card">
        <div class="card-h" @click="toggle('cond')"><h2>4 · Conditions de fabrication</h2><span class="chev">{{ sec.cond ? '▾' : '▸' }}</span></div>
        <div v-show="sec.cond" class="card-b">
          <div class="tbl-scroll">
            <table class="tbl">
              <thead><tr><th>Zone/Salle</th><th>Heure</th><th>T° (°C)</th><th>HR (%)</th><th>ΔP (Pa)</th><th>Visa</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(c, i) in d.conditions" :key="i">
                  <td><input v-model="c.zone" /></td><td><input v-model="c.heure" class="w-xs" /></td><td><input v-model="c.temp" class="w-xs ta-r" /></td>
                  <td><input v-model="c.hr" class="w-xs ta-r" /></td><td><input v-model="c.deltaP" class="w-xs ta-r" /></td><td><input v-model="c.visa" class="w-xs" /></td>
                  <td><button class="x" @click="retirer(d.conditions, i)">✕</button></td>
                </tr>
                <tr v-if="!d.conditions.length"><td colspan="7" class="empty">Aucun relevé.</td></tr>
              </tbody>
            </table>
          </div>
          <button class="btn ghost sm" @click="addCondition">+ Ajouter un relevé</button>
        </div>
      </section>

      <!-- 5. Étapes de fabrication -->
      <section class="card">
        <div class="card-h" @click="toggle('etapes')"><h2>5 · Étapes de fabrication</h2><span class="chev">{{ sec.etapes ? '▾' : '▸' }}</span></div>
        <div v-show="sec.etapes" class="card-b steps">
          <div class="step">
            <h3>1 · Pesée / Dispensing</h3>
            <div class="grid3">
              <label class="fld">Salle<input v-model="d.etapes.pesee.salle" /></label>
              <label class="fld">Balance(s)<input v-model="d.etapes.pesee.balances" /></label>
              <label class="fld">Début<input v-model="d.etapes.pesee.debut" type="datetime-local" /></label>
              <label class="fld">Fin<input v-model="d.etapes.pesee.fin" type="datetime-local" /></label>
              <label class="fld">Opérateur (visa)<input v-model="d.etapes.pesee.op" /></label>
              <label class="fld">Vérificateur (visa)<input v-model="d.etapes.pesee.verif" /></label>
            </div>
            <label class="fld">Observations<input v-model="d.etapes.pesee.obs" /></label>
          </div>

          <div class="step">
            <h3>2 · Mélange</h3>
            <div class="grid3">
              <label class="fld">Équipement<input v-model="d.etapes.melange.equipement" /></label>
              <label class="fld">Vitesse (rpm)<input v-model="d.etapes.melange.vitesse" /></label>
              <label class="fld">Durée (min)<input v-model="d.etapes.melange.duree" /></label>
              <label class="fld">Début<input v-model="d.etapes.melange.debut" type="datetime-local" /></label>
              <label class="fld">Fin<input v-model="d.etapes.melange.fin" type="datetime-local" /></label>
              <label class="fld">Opérateur<input v-model="d.etapes.melange.op" /></label>
              <label class="fld">Vérificateur<input v-model="d.etapes.melange.verif" /></label>
            </div>
          </div>

          <div class="step">
            <h3>3 · Granulation humide</h3>
            <div class="grid3">
              <label class="fld">Liant<input v-model="d.etapes.granulation.liant" /></label>
              <label class="fld">Solvant<input v-model="d.etapes.granulation.solvant" /></label>
              <label class="fld">Qté solvant<input v-model="d.etapes.granulation.qteSolvant" /></label>
              <label class="fld">Équipement<input v-model="d.etapes.granulation.equipement" /></label>
              <label class="fld">Durée malaxage<input v-model="d.etapes.granulation.duree" /></label>
              <label class="fld">Aspect granulé<input v-model="d.etapes.granulation.aspect" /></label>
              <label class="fld">Opérateur<input v-model="d.etapes.granulation.op" /></label>
              <label class="fld">Vérificateur<input v-model="d.etapes.granulation.verif" /></label>
            </div>
          </div>

          <div class="step">
            <h3>4 · Séchage</h3>
            <div class="grid3">
              <label class="fld">Équipement<input v-model="d.etapes.sechage.equipement" /></label>
              <label class="fld">Température (°C)<input v-model="d.etapes.sechage.temperature" /></label>
              <label class="fld">Durée<input v-model="d.etapes.sechage.duree" /></label>
              <label class="fld">LOD cible (%)<input v-model="d.etapes.sechage.lodCible" /></label>
              <label class="fld">LOD résultat (%)<input v-model="d.etapes.sechage.lodResultat" /></label>
              <label class="fld">Opérateur<input v-model="d.etapes.sechage.op" /></label>
              <label class="fld">Vérificateur<input v-model="d.etapes.sechage.verif" /></label>
            </div>
          </div>

          <div class="step">
            <h3>5 · Calibrage</h3>
            <div class="grid3">
              <label class="fld">Équipement<input v-model="d.etapes.calibrage.equipement" /></label>
              <label class="fld">Tamis/grille (mm)<input v-model="d.etapes.calibrage.tamis" /></label>
              <label class="fld">Vitesse<input v-model="d.etapes.calibrage.vitesse" /></label>
              <label class="fld">Opérateur<input v-model="d.etapes.calibrage.op" /></label>
              <label class="fld">Vérificateur<input v-model="d.etapes.calibrage.verif" /></label>
            </div>
          </div>

          <div class="step">
            <h3>6 · Lubrification / Mélange final</h3>
            <div class="grid3">
              <label class="fld">Lubrifiant<input v-model="d.etapes.lubrification.lubrifiant" /></label>
              <label class="fld">Qté<input v-model="d.etapes.lubrification.qteLubrifiant" /></label>
              <label class="fld">Équipement<input v-model="d.etapes.lubrification.equipement" /></label>
              <label class="fld">Vitesse<input v-model="d.etapes.lubrification.vitesse" /></label>
              <label class="fld">Durée (min)<input v-model="d.etapes.lubrification.duree" /></label>
              <label class="fld">Opérateur<input v-model="d.etapes.lubrification.op" /></label>
              <label class="fld">Vérificateur<input v-model="d.etapes.lubrification.verif" /></label>
            </div>
          </div>

          <div class="step">
            <h3>7 · Compression</h3>
            <div class="grid3">
              <label class="fld">Machine<input v-model="d.etapes.compression.machine" /></label>
              <label class="fld">Poinçon / format<input v-model="d.etapes.compression.poincon" /></label>
              <label class="fld">Masse cible/comprimé<input v-model="d.etapes.compression.masseCible" /></label>
              <label class="fld">Vitesse<input v-model="d.etapes.compression.vitesse" /></label>
              <label class="fld">Force (kN)<input v-model="d.etapes.compression.force" /></label>
              <label class="fld">Début<input v-model="d.etapes.compression.debut" type="datetime-local" /></label>
              <label class="fld">Fin<input v-model="d.etapes.compression.fin" type="datetime-local" /></label>
              <label class="fld">Opérateur<input v-model="d.etapes.compression.op" /></label>
              <label class="fld">Vérificateur<input v-model="d.etapes.compression.verif" /></label>
            </div>
          </div>

          <div class="step">
            <h3 class="with-tog">8 · Pelliculage <label class="tog"><input type="checkbox" v-model="d.pelliculageActif" /> applicable</label></h3>
            <div v-if="d.pelliculageActif" class="grid3">
              <label class="fld">Suspension pelliculante<input v-model="d.etapes.pelliculage.suspension" /></label>
              <label class="fld">Prise de masse cible (%)<input v-model="d.etapes.pelliculage.priseMasseCible" /></label>
              <label class="fld">Prise de masse réelle (%)<input v-model="d.etapes.pelliculage.priseMasseReel" /></label>
              <label class="fld">T° entrée<input v-model="d.etapes.pelliculage.tEntree" /></label>
              <label class="fld">T° produit<input v-model="d.etapes.pelliculage.tProduit" /></label>
              <label class="fld">Débit<input v-model="d.etapes.pelliculage.debit" /></label>
              <label class="fld">Durée<input v-model="d.etapes.pelliculage.duree" /></label>
              <label class="fld">Opérateur<input v-model="d.etapes.pelliculage.op" /></label>
              <label class="fld">Vérificateur<input v-model="d.etapes.pelliculage.verif" /></label>
            </div>
            <p v-else class="muted">Étape non applicable à ce lot.</p>
          </div>
        </div>
      </section>

      <!-- 6. IPC -->
      <section class="card">
        <div class="card-h" @click="toggle('ipc')"><h2>6 · Contrôles en cours (compression)</h2><span class="chev">{{ sec.ipc ? '▾' : '▸' }}</span></div>
        <div v-show="sec.ipc" class="card-b">
          <div class="tbl-scroll">
            <table class="tbl">
              <thead><tr><th>Heure</th><th>Poids moy.</th><th>Min</th><th>Max</th><th>Dureté (N)</th><th>Épaiss. (mm)</th><th>Friab. (%)</th><th>Désagr. (min)</th><th>Aspect</th><th>Visa</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(c, i) in d.ipc" :key="i">
                  <td><input v-model="c.heure" class="w-xs" /></td><td><input v-model="c.poidsMoyen" class="w-xs ta-r" /></td>
                  <td><input v-model="c.poidsMin" class="w-xs ta-r" /></td><td><input v-model="c.poidsMax" class="w-xs ta-r" /></td>
                  <td><input v-model="c.durete" class="w-xs ta-r" /></td><td><input v-model="c.epaisseur" class="w-xs ta-r" /></td>
                  <td><input v-model="c.friabilite" class="w-xs ta-r" /></td><td><input v-model="c.desagregation" class="w-xs ta-r" /></td>
                  <td><input v-model="c.aspect" class="w-sm" /></td><td><input v-model="c.visa" class="w-xs" /></td>
                  <td><button class="x" @click="retirer(d.ipc, i)">✕</button></td>
                </tr>
                <tr v-if="!d.ipc.length"><td colspan="11" class="empty">Aucun relevé — ajoute une ligne par prélèvement.</td></tr>
              </tbody>
            </table>
          </div>
          <button class="btn ghost sm" @click="addIpc">+ Ajouter un relevé</button>
        </div>
      </section>

      <!-- 7. Rendements -->
      <section class="card">
        <div class="card-h" @click="toggle('rdt')"><h2>7 · Rendements & Réconciliation</h2><span class="chev">{{ sec.rdt ? '▾' : '▸' }}</span></div>
        <div v-show="sec.rdt" class="card-b">
          <div class="tbl-scroll">
            <table class="tbl">
              <thead><tr><th>Étape</th><th>Théorique</th><th>Réel</th><th>Rendement</th></tr></thead>
              <tbody>
                <tr><td>Granulé</td><td><input v-model="d.rendements.granuleTheo" class="w-sm ta-r" /></td><td><input v-model="d.rendements.granuleReel" class="w-sm ta-r" /></td><td :class="rdtClasse(rdtGranule)">{{ rdtGranule == null ? '—' : rdtGranule + ' %' }}</td></tr>
                <tr><td>Comprimés (compression)</td><td><input v-model="d.rendements.comprimesTheo" class="w-sm ta-r" /></td><td><input v-model="d.rendements.comprimesReel" class="w-sm ta-r" /></td><td :class="rdtClasse(rdtComprimes)">{{ rdtComprimes == null ? '—' : rdtComprimes + ' %' }}</td></tr>
                <tr v-if="d.pelliculageActif"><td>Après pelliculage</td><td><input v-model="d.rendements.pellicTheo" class="w-sm ta-r" /></td><td><input v-model="d.rendements.pellicReel" class="w-sm ta-r" /></td><td :class="rdtClasse(rdtPellic)">{{ rdtPellic == null ? '—' : rdtPellic + ' %' }}</td></tr>
                <tr class="tot"><td colspan="3">Rendement global</td><td :class="rdtClasse(rdtGlobal)">{{ rdtGlobal == null ? '—' : rdtGlobal + ' %' }}</td></tr>
              </tbody>
            </table>
          </div>
          <div class="grid3">
            <label class="fld">Limite basse (%)<input v-model="d.rendements.limiteBasse" class="ta-r" /></label>
            <label class="fld">Limite haute (%)<input v-model="d.rendements.limiteHaute" class="ta-r" /></label>
            <label class="fld wide">Justification écart (si hors limites)<input v-model="d.rendements.justif" /></label>
          </div>
          <h3 class="sub-h">Réconciliation</h3>
          <div class="tbl-scroll">
            <table class="tbl">
              <thead><tr><th>Théorique</th><th>Produits</th><th>Échantillons</th><th>Rebuts</th><th>Détruits</th><th>Total</th><th>Bilan</th></tr></thead>
              <tbody><tr>
                <td><input v-model="d.reconciliation.theorique" class="w-sm ta-r" /></td>
                <td><input v-model="d.reconciliation.produits" class="w-sm ta-r" /></td>
                <td><input v-model="d.reconciliation.echantillons" class="w-sm ta-r" /></td>
                <td><input v-model="d.reconciliation.rebuts" class="w-sm ta-r" /></td>
                <td><input v-model="d.reconciliation.detruits" class="w-sm ta-r" /></td>
                <td class="ta-r b">{{ recTotal || '—' }}</td>
                <td class="ta-r" :class="recEcart != null && (recEcart < num(d.rendements.limiteBasse) || recEcart > num(d.rendements.limiteHaute)) ? 'ko' : 'ok'">{{ recEcart == null ? '—' : recEcart + ' %' }}</td>
              </tr></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 8. Déviations -->
      <section class="card">
        <div class="card-h" @click="toggle('dev')"><h2>8 · Déviations / Événements</h2><span class="chev">{{ sec.dev ? '▾' : '▸' }}</span></div>
        <div v-show="sec.dev" class="card-b">
          <div class="tbl-scroll">
            <table class="tbl">
              <thead><tr><th>N°</th><th>Description</th><th>Classe</th><th>Action corrective</th><th>Date</th><th>Visa</th><th></th></tr></thead>
              <tbody>
                <tr v-for="(v, i) in d.deviations" :key="i">
                  <td><input v-model="v.num" class="w-xs" /></td><td><input v-model="v.description" /></td>
                  <td><select v-model="v.classe" class="w-sm"><option value=""></option><option>Mineure</option><option>Majeure</option><option>Critique</option></select></td>
                  <td><input v-model="v.action" /></td><td><input v-model="v.date" type="date" class="w-sm" /></td><td><input v-model="v.visa" class="w-xs" /></td>
                  <td><button class="x" @click="retirer(d.deviations, i)">✕</button></td>
                </tr>
                <tr v-if="!d.deviations.length"><td colspan="7" class="empty">Aucune déviation enregistrée.</td></tr>
              </tbody>
            </table>
          </div>
          <button class="btn ghost sm" @click="addDeviation">+ Ajouter une déviation</button>
        </div>
      </section>

      <!-- 9. Revue & Libération -->
      <section class="card">
        <div class="card-h" @click="toggle('revue')"><h2>9 · Revue & Libération</h2><span class="chev">{{ sec.revue ? '▾' : '▸' }}</span></div>
        <div v-show="sec.revue" class="card-b">
          <div class="checks">
            <label><input type="checkbox" v-model="d.revue.conformeProcede" /> Procédé conforme</label>
            <label><input type="checkbox" v-model="d.revue.conformeIpc" /> Contrôles en cours conformes</label>
            <label><input type="checkbox" v-model="d.revue.conformeRendement" /> Rendement conforme</label>
          </div>
          <label class="fld">Résultats CQ (synthèse)<input v-model="d.revue.resultatsCq" /></label>
          <div class="grid3">
            <label class="fld">Décision
              <select v-model="d.revue.decision"><option value=""></option><option>Libéré</option><option>Quarantaine</option><option>Refusé</option></select>
            </label>
            <label class="fld wide">Commentaire<input v-model="d.revue.commentaire" /></label>
          </div>
          <h3 class="sub-h">Visas</h3>
          <div class="grid2">
            <div class="visa"><div class="vl">Fabrication</div><input v-model="d.visas.fabrication.nom" placeholder="Nom / visa" /><input v-model="d.visas.fabrication.date" type="date" /></div>
            <div class="visa"><div class="vl">Vérification</div><input v-model="d.visas.verification.nom" placeholder="Nom / visa" /><input v-model="d.visas.verification.date" type="date" /></div>
            <div class="visa"><div class="vl">Assurance Qualité</div><input v-model="d.visas.aq.nom" placeholder="Nom / visa" /><input v-model="d.visas.aq.date" type="date" /></div>
            <div class="visa"><div class="vl">Libération</div><input v-model="d.visas.liberation.nom" placeholder="Nom / visa" /><input v-model="d.visas.liberation.date" type="date" /></div>
          </div>
        </div>
      </section>

      <div class="actions-bottom">
        <button class="btn" :disabled="!peutEditer" @click="enregistrer">Enregistrer le dossier</button>
        <button class="btn ghost" @click="imprimer">Imprimer / PDF</button>
      </div>
  </div>
</template>

<style scoped>
.dl-page { color: #1b2733; }
.statut { color: #fff; font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 999px; }
.alert { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 14px; border-radius: 8px; margin: 0 0 12px; font-size: 13px; }
.ok-msg { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 10px 14px; border-radius: 8px; margin: 0 0 12px; font-size: 13px; }
.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 8px; margin: 0 0 14px; font-size: 13px; }
.warn code { background: #fef3c7; padding: 1px 5px; border-radius: 4px; }

.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(16,24,40,.04); overflow: hidden; }
.card.slim { padding: 12px 16px; display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.card-h { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px; cursor: pointer; user-select: none; background: #f8fafc; border-bottom: 1px solid #eef2f6; }
.card-h h2 { margin: 0; font-size: 15px; color: #0e7490; }
.card-h .chev { color: #0891b2; font-size: 14px; }
.card-b { padding: 16px 18px; }

.grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 16px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; }
.fld { display: flex; flex-direction: column; font-size: 12px; font-weight: 600; color: #475569; gap: 5px; }
.fld.inline { flex-direction: row; align-items: center; gap: 10px; }
.fld.wide { grid-column: span 2; }
.fld input, .fld select { font: inherit; font-size: 14px; font-weight: 500; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #1b2733; width: 100%; }
.fld input.mini { font-size: 12px; padding: 5px 8px; }
.fld .row { display: flex; gap: 6px; } .fld .row .u { width: 110px; flex: 0 0 auto; }
.fld input:focus, .fld select:focus { outline: 2px solid #67e8f9; border-color: #0891b2; }

.steps .step { border: 1px solid #eef2f6; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; background: #fcfdfe; }
.steps .step h3 { margin: 0 0 10px; font-size: 13px; color: #155e75; }
.steps .step h3.with-tog { display: flex; align-items: center; justify-content: space-between; }
.tog { font-size: 12px; font-weight: 600; color: #475569; display: inline-flex; align-items: center; gap: 6px; }
.sub-h { font-size: 13px; color: #155e75; margin: 16px 0 8px; }

.tbl-scroll { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 10px; }
.tbl th { background: #ecfeff; color: #155e75; text-align: left; padding: 7px 8px; border: 1px solid #cffafe; font-size: 10px; text-transform: uppercase; white-space: nowrap; }
.tbl td { padding: 4px 6px; border: 1px solid #eef2f6; }
.tbl input, .tbl select { font: inherit; font-size: 13px; padding: 6px 7px; border: 1px solid #e2e8f0; border-radius: 6px; width: 100%; min-width: 70px; }
.tbl input.w-sm { min-width: 90px; } .tbl input.w-xs { min-width: 56px; }
.tbl .ta-r, .tbl input.ta-r { text-align: right; } .tbl .ta-c { text-align: center; }
.tbl .tot td { font-weight: 800; background: #f8fafc; }
.tbl .empty { color: #94a3b8; text-align: center; padding: 14px; font-style: italic; }
.tbl .b { font-weight: 800; }
.ok { color: #047857; font-weight: 700; } .ko { color: #be123c; font-weight: 700; }
.x { border: 0; background: transparent; color: #cbd5e1; cursor: pointer; font-size: 14px; padding: 2px 4px; }
.x:hover { color: #be123c; }

.checks { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 12px; }
.checks label { font-size: 13px; font-weight: 600; color: #334155; display: inline-flex; align-items: center; gap: 7px; }
.visa { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 7px; }
.visa .vl { font-size: 11px; text-transform: uppercase; color: #0e7490; font-weight: 700; }
.visa input { font: inherit; font-size: 13px; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; }

.btn { background: #0891b2; color: #fff; border: 0; padding: 9px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn.ghost { background: #fff; color: #0e7490; border: 1px solid #a5f3fc; }
.btn.ghost:hover { background: #ecfeff; }
.btn.sm { padding: 6px 12px; font-size: 13px; }
.btn.danger { color: #be123c; border-color: #fecaca; }
.actions-bottom { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; flex-wrap: wrap; }
.muted { color: #64748b; font-size: 13px; }
@media (max-width: 760px) { .grid2, .grid3 { grid-template-columns: 1fr; } .fld.wide { grid-column: auto; } }
</style>
