<script setup>
import { inject, computed } from 'vue'
import PageSheet from '../components/PageSheet.vue'

const d = inject('doc')

// Données FIXES issues du PRODUIT sélectionné (catalogue) — réactives.
const MATS = computed(() => d.mats || [])
const EXC = computed(() => d.exc || [])
const FORMULE = computed(() => d.formule || [])
const FORMULE_P = computed(() => d.formuleP || [])
const EQUIP = computed(() => d.equip || [])
// Principes actifs = lignes de formule dont le code commence par MPPA.
const PA = computed(() => (d.formule || []).filter(f => /^MPPA/i.test(f.c || '')))
const PA_NOMS = computed(() => PA.value.map(f => f.de).join(', '))

// Extrait le premier nombre d'une valeur (gère « 4,21 (2) », « Q.S » → null).
const toN = (v) => { const m = String(v == null ? '' : v).replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null }
// Somme d'une colonne, uniquement pour les lignes dont la quantité/unité (qn) est numérique
// (exclut l'eau purifiée « Q.S » du poids et de la taille de lot).
const sumCol = (rows, col) => (rows || []).reduce((a, r) => toN(r.qn) !== null ? a + (toN(r[col]) || 0) : a, 0)
// Totaux CALCULÉS d'après la formule du produit (varient d'un produit à l'autre).
const totaux = computed(() => {
  const nuMg = sumCol(d.formule, 'qn')
  const nuKg = sumCol(d.formule, 'qt')
  return {
    nuMg: nuMg.toFixed(2), nuKg: nuKg.toFixed(2),
    pellMg: (nuMg + sumCol(d.formuleP, 'qn')).toFixed(2),
    pellKg: (nuKg + sumCol(d.formuleP, 'qt')).toFixed(2)
  }
})
// Excipient d'ajustement = ligne de formule marquée « B = ».
const excipientAjustement = computed(() => { const r = (d.formule || []).find(f => String(f.qc).trim() === 'B ='); return r ? r.de : '' })
// Mot d'unité selon la forme (comprimés / gélules).
const uniteMot = computed(() => /g[ée]lule/i.test(d.entete.forme || '') ? 'gélules' : 'comprimés')
const VERIF_PRELIM = [
  "Présence de tous les documents de l'instruction de fabrication",
  "L'habillage spécifique / réglementaire du personnel",
  "L'absence de plaies ouvertes ou maladies contagieuses chez le personnel"
]

function del (arr, i) { arr.splice(i, 1) }
function addOp () { d.pesee.operateurs.push({ shift: '', poste: '', nom: '', date: '', visa: '', verifDV: '' }) }
function addCond () { d.pesee.condProc.push({ date: '', moment: '', heure: '', temp: '', hr: '', dp: '', nSalle: '', fait: '', verif: '' }) }
function addInc () { d.pesee.incidents.push({ date: '', heureArret: '', nSac: '', motif: '', action: '', dateDem: '', heureDem: '', visa: '' }) }
</script>

<template>
  <!-- ======================= PAGE 3 ======================= -->
  <PageSheet :page="3">
    <div class="sec">1. INSTRUCTIONS GÉNÉRALES :</div>
    <div class="stxt">
      <p class="lead">Le Superviseur doit procéder aux vérifications suivantes avant le démarrage de chaque opération de fabrication :</p>
      <ul>
        <li><b>Vide de ligne :</b> Vérifier que les machines et les locaux sont libérés des matériaux et des documents du produit précédent.</li>
        <li><b>Nettoyage :</b> Vérifier que le nettoyage des salles et des équipements est effectué selon la procédure de nettoyage en vigueur et que les étiquettes de nettoyage sont jointes à l'instruction de fabrication.</li>
        <li><b>Identification :</b> Vérifier que les locaux et les machines sont identifiés : le nom du produit et le N° de lot sont mentionnés sur la fiche d'identification correspondante.</li>
        <li><b>Calibrage des balances (si applicable) :</b> Vérifier que le calibrage des balances est effectué et renseigné sur la fiche correspondante selon la procédure en vigueur.</li>
        <li><b>Paramètre du milieu :</b> Vérifier que la température (°C), l'humidité (%) et la pression différentielle (mm H₂O) des locaux sont documentés sur la page correspondante.</li>
        <li><b>Personnel :</b> Le nom et prénom des intervenants durant la fabrication de ce produit sont notés sur la fiche de suivi du personnel.</li>
        <li><b>Matières :</b> Vérifier la propreté et l'intégrité des matières premières réceptionnées, vérifier que la page de réception est renseignée.</li>
        <li><b>Machines :</b> Vérifier que les paramètres machine sont dans l'intervalle correspondant.</li>
        <li><b>Ordre de fabrication :</b> Vérifier la validité de l'ordre de fabrication.</li>
        <li><b>Attendre l'approbation AQ</b> avant de procéder à l'opération de fabrication concernée.</li>
        <li><b>En cas d'anomalies,</b> stopper l'opération et alerter le responsable hiérarchique, mentionner l'incident sur la page correspondante.</li>
      </ul>
    </div>
  </PageSheet>

  <!-- ======================= PAGE 4 ======================= -->
  <PageSheet :page="4">
    <div class="sec">2. CONSIGNES DE SÉCURITÉ OBLIGATOIRES :</div>
    <div class="stxt">
      <ul>
        <li>Le port de la tenue pharmaceutique adaptée à la zone est obligatoire conformément à la procédure d'habillage en vigueur.</li>
        <li>Le port du casque antibruit est obligatoire lors des opérations de compression.</li>
        <li>Il est formellement interdit d'intervenir sur les machines lorsqu'elles sont en marche, attendre l'arrêt complet de l'équipement.</li>
        <li>Il est formellement interdit de bipasser les consignes de sécurité de l'équipement.</li>
        <li>Il est formellement interdit de désactiver les carters de sécurité de l'équipement.</li>
        <li>Le personnel de production est tenu de déclarer la présence de plaies ou de maladies contagieuses à sa hiérarchie avant d'accéder à la zone de production.</li>
        <li>Éviter tout contact des produits manipulés avec la peau.</li>
      </ul>
    </div>
    <div class="sec">3. PRÉCAUTIONS DE PRODUCTION :</div>
    <div class="stxt">
      <ul>
        <li>La fermeture des portes des ateliers de fabrication est obligatoire tout au long du processus.</li>
        <li>En cours de fabrication, éviter un contact prolongé du produit avec l'air (ex : durant les heures de pause, produit hygroscopique…).</li>
        <li>Retirer le produit de l'équipement lorsqu'un arrêt prolongé est prévu.</li>
      </ul>
    </div>
  </PageSheet>

  <!-- ======================= PAGE 5 — FORMULE ======================= -->
  <PageSheet :page="5">
    <div class="sec">4. FORMULE DE FABRICATION :</div>
    <div class="stxt">La composition de <b>{{ d.entete.produit }}</b> {{ (d.entete.forme || '').toLowerCase() }} est décrite dans le tableau ci-dessous :<br>Taille du lot (P<sub>th</sub>) {{ totaux.nuKg }} Kg soit {{ d.entete.uniteDosee }} {{ uniteMot }}.</div>
    <table>
      <thead><tr><th>Code interne</th><th>Désignation</th><th>Quantité nécessaire / unité dosée (mg)</th><th>Qté Théorique / Lot [kg]</th><th>Quantité Corrigée / Lot [kg]</th></tr></thead>
      <tbody>
        <tr v-for="(f, i) in FORMULE" :key="i">
          <td class="ta-c">{{ f.c }}</td><td>{{ f.de }}</td><td class="ta-c">{{ f.qn }}</td><td class="ta-c">{{ f.qt }}</td>
          <td><span v-if="f.qc==='A ='">A =&nbsp;<input class="cell cinl" v-model="d.pesee.A" /></span><span v-else-if="f.qc==='B ='">B =&nbsp;<input class="cell cinl" v-model="d.pesee.B" /></span><span v-else>{{ f.qc }}</span></td>
        </tr>
        <tr class="k"><td colspan="2">Poids du comprimé nu (mg)</td><td class="ta-c">{{ totaux.nuMg }}</td><td>taille de lot (kg)</td><td class="ta-c">{{ totaux.nuKg }}</td></tr>
        <tr v-for="(f, i) in FORMULE_P" :key="'p'+i">
          <td class="ta-c">{{ f.c }}</td><td>{{ f.de }}</td><td class="ta-c">{{ f.qn }}</td><td class="ta-c">{{ f.qt }}</td><td class="ta-c">{{ f.qc }}</td>
        </tr>
        <tr class="k"><td colspan="2">Poids du comprimé pelliculé (mg)</td><td class="ta-c">{{ totaux.pellMg }}</td><td>Taille de lot (kg)</td><td class="ta-c">{{ totaux.pellKg }}</td></tr>
      </tbody>
    </table>
    <div class="note">(1) La quantité du principe actif à incorporer est théorique, elle est basée sur un titre sur substance desséchée de 100% ; elle doit être ajustée si le titre du principe actif est ≤ 100 %.</div>
    <div class="note">(2) Un excès de 30% doit être pris en prévu pour compenser les pertes durant le pelliculage. &nbsp; Q.S : quantité suffisante.</div>
    <div v-if="excipientAjustement" class="note">L'ajustement est fait avec l'excipient <b>{{ excipientAjustement }}</b>.</div>
  </PageSheet>

  <!-- ======================= PAGE 6 — AJUSTAGE ======================= -->
  <PageSheet :page="6">
    <div class="sec">5. AJUSTAGE DE LA QUANTITÉ DES PRINCIPES ACTIFS :</div>
    <div class="stxt">▸ Quantité des principes actifs à peser :</div>
    <div class="formula">A = ( Quantité théorique PA1 × 100 ) / ( dosage − teneur en eau du PA1 % ) = <input class="cell cinl" v-model="d.pesee.A" /></div>
  </PageSheet>

  <!-- ======================= PAGE 7 — AJUSTAGE (tableaux) ======================= -->
  <PageSheet :page="7">
    <table>
      <thead><tr><th>Désignation Principe Actif</th><th>N° de lot interne</th><th>Titre %</th><th>Teneur en eau (%)</th><th>Quantité Théorique (g)</th><th>Quantité à peser (g)</th><th>Fait par</th><th>Date/Visa</th><th>Vérifier par</th><th>Date/Visa</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.ajustPA" :key="i">
          <td>{{ PA[i] ? PA[i].de : '' }}</td>
          <td><input class="cell" v-model="r.nLot" /></td><td><input class="cell" v-model="r.titre" /></td><td><input class="cell" v-model="r.teneurEau" /></td>
          <td><input class="cell" v-model="r.qTheo" /></td><td><input class="cell" v-model="r.qPeser" /></td>
          <td colspan="2"><input class="cell" v-model="r.faitDV" /></td><td colspan="2"><input class="cell" v-model="r.verifDV" /></td>
        </tr>
      </tbody>
    </table>
    <div class="stxt" style="margin-top:8px">▸ La différence entre la quantité théorique et la quantité à peser sera compensée avec l'excipient d'ajustage <b>{{ excipientAjustement }}</b>.</div>
    <div class="formula">B = ( Quantité théorique de {{ excipientAjustement }} + Quantité théorique (PA1) − Quantité réelle (PA1) ) = <input class="cell cinl" v-model="d.pesee.B" /></div>
    <table>
      <thead><tr><th>Désignation Excipient d'ajustage</th><th>N° de lot</th><th>Quantité théorique (g)</th><th>Quantité à peser (g)</th><th>Fait par</th><th>Date/Visa</th><th>Vérifier par</th><th>Date/Visa</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.ajustExc" :key="i">
          <td>{{ excipientAjustement }}</td>
          <td><input class="cell" v-model="r.nLot" /></td><td><input class="cell" v-model="r.qTheo" /></td><td><input class="cell" v-model="r.qPeser" /></td>
          <td colspan="2"><input class="cell" v-model="r.faitDV" /></td><td colspan="2"><input class="cell" v-model="r.verifDV" /></td>
        </tr>
      </tbody>
    </table>
    <div class="stxt" style="margin-top:8px">▸ Le certificat d'analyse du principe actif (PA) : <label class="cnc"><input type="radio" value="Oui" v-model="d.pesee.certPA" /> Oui</label> <label class="cnc"><input type="radio" value="Non" v-model="d.pesee.certPA" /> Non</label></div>
  </PageSheet>

  <!-- ======================= PAGE 8 — DIAGRAMME ======================= -->
  <PageSheet :page="8">
    <div class="sec">6. DIAGRAMME DE FABRICATION :</div>
    <div class="flux">
      <div class="col">
        <h4>FLUX D'OPÉRATIONS</h4>
        <div class="node">Pesée</div>
        <div v-if="(d.diagramme.flux || []).length" class="arrow">↓</div>
        <template v-for="(step, i) in (d.diagramme.flux || [])" :key="i">
          <div class="node">{{ step.nom }}<div v-if="(step.items || []).filter(Boolean).length" class="sub"><span v-for="(it, j) in step.items.filter(Boolean)" :key="j">- {{ it }}<br></span></div></div>
          <div v-if="i < d.diagramme.flux.length - 1" class="arrow">↓</div>
        </template>
      </div>
      <div class="col">
        <h4>IPC</h4>
        <div v-for="(x, i) in (d.diagramme.ipc || [])" :key="i" class="node">{{ x }}</div>
      </div>
      <div class="col">
        <h4>ÉQUIPEMENTS</h4>
        <div v-for="(x, i) in (d.diagramme.equipements || [])" :key="i" class="node">{{ x }}</div>
      </div>
    </div>
  </PageSheet>

  <!-- ======================= PAGE 9 — OPÉRATIONS PRÉLIMINAIRES ======================= -->
  <PageSheet :page="9" etape="PESÉE">
    <div class="sec" style="text-align:center">1. OPÉRATIONS PRÉLIMINAIRES :</div>
    <div class="stxt boxed">
      <p class="lead">Réaliser les vérifications et les actions suivantes :</p>
      <ul>
        <li><b>Vide de Ligne :</b> Vérifier que les machines et les locaux sont libérés des matériaux et des documents du produit précédent. « Selon Check List vide de ligne ».</li>
        <li><b>Nettoyage des équipements et locaux :</b> Vérifier le nettoyage du local et des équipements et matériels, renseigner leurs étiquettes de nettoyage, renseigner les logs book de suivi des opérations.</li>
        <li>Identifier le local et la machine en renseignant les fiches « utilisation salle » et « utilisation machine ».</li>
        <li>Coller les étiquettes « Nettoyé » et « Utilisation salle ».</li>
        <li>Renseigner les logs book de suivi des opérations.</li>
        <li>Vérifier le nettoyage des pièces mobiles et coller les étiquettes « Nettoyé » dans l'instruction de fabrication.</li>
        <li>Joindre les étiquettes « Nettoyé » à l'instruction de fabrication.</li>
        <li>Procéder à la vérification journalière des balances.</li>
        <li>En cas d'anomalies, stopper l'opération et alerter le responsable, reporter l'évènement sur la fiche incidents.</li>
        <li>Vérifier la propreté et l'intégrité des contenants MP réceptionnés.</li>
        <li>Vérifier les conditions d'ambiance du local : Température (°C), HR (%) et pression différentielle.</li>
        <li><b>Attendre l'autorisation AQ avant de procéder à la pesée.</b></li>
      </ul>
    </div>
  </PageSheet>

  <!-- ======================= PAGE 10 ======================= -->
  <PageSheet :page="10" etape="PESÉE">
    <div class="sec">2. VÉRIFICATION DU NETTOYAGE DES ÉQUIPEMENTS ET LOCAUX :</div>
    <div class="stxt">• Remplacer les étiquettes « Nettoyé » salle et machine par les fiches « utilisation salle » / « utilisation machine », coller les étiquettes « Nettoyé » dans l'instruction de fabrication.</div>
    <div class="pbox"><div class="pbox-t">Coller ici étiquette nettoyée de la salle de pesée</div><div class="pbox-a"></div></div>
    <div class="pbox"><div class="pbox-t">Coller ici étiquette nettoyée du flux laminaire</div><div class="pbox-a"></div></div>
  </PageSheet>

  <!-- ======================= PAGE 11 ======================= -->
  <PageSheet :page="11" etape="PESÉE">
    <div class="pbox"><div class="pbox-t">Coller ici étiquettes nettoyée des balances</div><div class="pbox-a"></div></div>
    <div class="pbox"><div class="pbox-t">Coller ici étiquettes nettoyée de matériels de pesée</div><div class="pbox-a"></div></div>
    <div class="pverif">Vérifié par Date &amp; Visa : <input class="cell cinl" v-model="d.pesee.vBalances" /> &amp; <input class="cell cinl" v-model="d.pesee.vMateriels" /></div>
  </PageSheet>

  <!-- ======================= PAGE 12 ======================= -->
  <PageSheet :page="12" etape="PESÉE">
    <div class="sec">3. VÉRIFICATION PRÉLIMINAIRE DES CONDITIONS ENVIRONNEMENTALES AVANT DÉMARRAGE :</div>
    <div class="stxt">Contrôle de la température, de l'humidité relative et de la différence de pression. ▸ Relever la ΔP systématiquement. ▸ Relever les données avant démarrage de la pesée.</div>
    <table>
      <thead><tr><th>Étape</th><th>N° salle</th><th>Heure</th><th>T°C [15-25]</th><th>HR% ≤60</th><th>ΔP ≥1 mmH₂O</th><th>Date/Visa Opérateur</th><th>Date/Visa Vérificateur</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.condDem" :key="i">
          <td><input class="cell" v-model="r.etape" /></td><td><input class="cell" v-model="r.nSalle" /></td><td><input class="cell" v-model="r.heure" /></td>
          <td><input class="cell" v-model="r.temp" /></td><td><input class="cell" v-model="r.hr" /></td><td><input class="cell" v-model="r.dp" /></td>
          <td><input class="cell" v-model="r.dvOp" /></td><td><input class="cell" v-model="r.dvVerif" /></td>
        </tr>
      </tbody>
    </table>

    <div class="sec">4. AUTORISATION DE DÉMARRAGE DE LA PESÉE :</div>
    <table>
      <thead><tr><th style="width:62%">Vide de ligne (Joindre la checklist vide de ligne à l'instruction de fabrication)</th><th>Conformité</th></tr></thead>
      <tbody>
        <tr><td>Instructions générales</td><td><input class="cell ta-c" v-model="d.pesee.autor.instrGen" placeholder="C / NC" /></td></tr>
        <tr><td>Consignes de sécurité</td><td><input class="cell ta-c" v-model="d.pesee.autor.secu" placeholder="C / NC" /></td></tr>
        <tr><td>Conditions environnementales</td><td><input class="cell ta-c" v-model="d.pesee.autor.condEnv" placeholder="C / NC" /></td></tr>
        <tr><td>Nettoyage local et équipements</td><td><input class="cell ta-c" v-model="d.pesee.autor.nettoyage" placeholder="C / NC" /></td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th colspan="3">DÉMARRAGE DE LA PESÉE AUTORISÉ</th></tr></thead>
      <tbody>
        <tr><td class="k" style="width:22%">Superviseur Fabrication</td><td>Date : <input class="cell cinl" v-model="d.pesee.demSup.date" /> Heure : <input class="cell cinl" v-model="d.pesee.demSup.heure" /></td><td>Visa : <input class="cell cinl" v-model="d.pesee.demSup.visa" /></td></tr>
        <tr><td class="k">AQ Process</td><td>Date : <input class="cell cinl" v-model="d.pesee.demAq.date" /> Heure : <input class="cell cinl" v-model="d.pesee.demAq.heure" /></td><td>Visa : <input class="cell cinl" v-model="d.pesee.demAq.visa" /></td></tr>
      </tbody>
    </table>

    <div class="sec">5. VÉRIFICATION PRÉLIMINAIRE :</div>
    <table>
      <thead><tr><th>Vérifications à effectuer</th><th>Oui</th><th>Non</th><th>Date/Visa</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.verifPrelim" :key="i">
          <td>{{ VERIF_PRELIM[i] }}</td>
          <td class="ta-c"><input type="checkbox" v-model="r.oui" /></td><td class="ta-c"><input type="checkbox" v-model="r.non" /></td>
          <td><input class="cell" v-model="r.dv" /></td>
        </tr>
      </tbody>
    </table>
  </PageSheet>

  <!-- ======================= PAGE 13 ======================= -->
  <PageSheet :page="13" etape="PESÉE">
    <div class="sec">6. LISTE DES OPÉRATEURS DE PESÉE :</div>
    <table>
      <thead><tr><th>N° Shift *</th><th>Poste</th><th>Nom &amp; prénom</th><th>Date</th><th>Visa</th><th>Vérifier par, Date &amp; Visa</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.operateurs" :key="i">
          <td><input class="cell" v-model="r.shift" /></td><td><input class="cell" v-model="r.poste" /></td><td><input class="cell" v-model="r.nom" /></td>
          <td><input class="cell" v-model="r.date" /></td><td><input class="cell" v-model="r.visa" /></td><td><input class="cell" v-model="r.verifDV" /></td>
        </tr>
      </tbody>
    </table>
    <div class="note">* Shift 01 : de 06h00 à 14h00, Shift 02 : de 14h00 à 22h00, Shift 03 : de 22h00 à 06h00. <button class="addrow noprint" @click="addOp">+ ligne</button></div>

    <div class="sec">7. VÉRIFICATION DES ÉQUIPEMENTS UTILISÉS :</div>
    <table>
      <thead><tr><th>Équipement</th><th>Code</th><th>Fonctionnement à vide</th><th>Statut de qualification / Calibration</th><th>État des parties vitrées</th><th>Fait par / Date et Visa</th><th>Vérifié par / Date et Visa</th><th>Observation</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.equip" :key="i">
          <td>{{ EQUIP[i][0] }}</td><td class="ta-c">{{ EQUIP[i][1] }}</td>
          <td><input class="cell ta-c" v-model="r.fonctVide" placeholder="C / NC" /></td>
          <td><input class="cell ta-c" v-model="r.statutQual" placeholder="C / NC" /></td>
          <td><input class="cell ta-c" v-model="r.etatVitr" placeholder="C / NC / NA" /></td>
          <td><input class="cell" v-model="r.faitDV" /></td><td><input class="cell" v-model="r.verifDV" /></td><td><input class="cell" v-model="r.obs" /></td>
        </tr>
      </tbody>
    </table>

    <div class="sec">8. VÉRIFICATION DE L'ÉTALONNAGE DES BALANCES :</div>
    <table>
      <thead><tr><th>Balance</th><th>Code</th><th>Calibrage effectué</th><th>Date</th><th>Date/Visa Opérateur</th><th>Date/Visa Vérificateur</th><th>Observation</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.etal" :key="i">
          <td>{{ EQUIP[i][0] }}</td><td class="ta-c">{{ EQUIP[i][1] }}</td>
          <td><input class="cell ta-c" v-model="r.effectue" placeholder="Oui / Non" /></td><td><input class="cell" v-model="r.date" /></td>
          <td><input class="cell" v-model="r.dvOp" /></td><td><input class="cell" v-model="r.dvVerif" /></td><td><input class="cell" v-model="r.obs" /></td>
        </tr>
      </tbody>
    </table>
  </PageSheet>

  <!-- ======================= PAGE 14 ======================= -->
  <PageSheet :page="14" etape="PESÉE">
    <div class="sec">9. VÉRIFICATION DES CONDITIONS : T°C, ΔP, HR% AU COURS DU PROCESS :</div>
    <div class="stxt">▸ Relever la ΔP systématiquement avant le début de la pesée. ▸ Relever les données en début / milieu / fin de chaque shift durant la pesée.<br><i>Note : La vérification doit être effectuée avant le début / pendant et à la fin de l'opération de pesée.</i></div>
    <table>
      <thead><tr><th>Date</th><th>Moment</th><th>Heure</th><th>Température (°C) 15≤T≤25</th><th>Humidité (%) ≤60</th><th>Dif. Pression (mmH₂O) ≥1</th><th>N° de salle</th><th>Fait par Visa</th><th>Vérifié par Date &amp; Visa</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.condProc" :key="i">
          <td><input class="cell" v-model="r.date" /></td><td><input class="cell" v-model="r.moment" placeholder="Début/Milieu/Fin" /></td><td><input class="cell" v-model="r.heure" /></td>
          <td><input class="cell" v-model="r.temp" /></td><td><input class="cell" v-model="r.hr" /></td><td><input class="cell" v-model="r.dp" /></td>
          <td><input class="cell" v-model="r.nSalle" /></td><td><input class="cell" v-model="r.fait" /></td><td><input class="cell" v-model="r.verif" /></td>
        </tr>
      </tbody>
    </table>
    <button class="addrow noprint" @click="addCond">+ ligne</button>
  </PageSheet>

  <!-- ======================= PAGE 15 — RÉCEPTION RETOUR INTERNE ======================= -->
  <PageSheet :page="15" etape="PESÉE">
    <div class="sec">10. RÉCEPTION DES MATIÈRES PREMIÈRES :</div>
    <div class="subsec">a. RETOUR INTERNE :</div>
    <table>
      <thead><tr><th>Article</th><th>Code interne</th><th>N° lot interne</th><th>Quantité de retour interne (kg/unité)</th><th>Présence étiquette retour interne (Oui/Non)</th><th>DDR</th><th>DDP</th><th>Fait par Date &amp; Visa</th><th>Vérifié par Date &amp; Visa</th></tr></thead>
      <tbody>
        <tr v-for="(m, i) in MATS" :key="i">
          <td>{{ m[0] }}</td><td class="ta-c">{{ m[1] }}</td>
          <td><input class="cell" v-model="d.pesee.retInterne[i].nLot" /></td>
          <td><input class="cell" v-model="d.pesee.retInterne[i].qte" /></td>
          <td><input class="cell ta-c" v-model="d.pesee.retInterne[i].etiq" placeholder="O/N" /></td>
          <td><input class="cell" v-model="d.pesee.retInterne[i].ddr" /></td><td><input class="cell" v-model="d.pesee.retInterne[i].ddp" /></td>
          <td><input class="cell" v-model="d.pesee.retInterne[i].faitDV" /></td><td><input class="cell" v-model="d.pesee.retInterne[i].verifDV" /></td>
        </tr>
      </tbody>
    </table>
  </PageSheet>

  <!-- ======================= PAGE 16 — RÉCEPTION EXTERNE ======================= -->
  <PageSheet :page="16" etape="PESÉE">
    <div class="subsec">b. RÉCEPTION EXTERNE :</div>
    <table>
      <thead><tr><th>Article</th><th>Code interne</th><th>N° lot interne</th><th>Contenant intègre, scellé et identifié (O/N)</th><th>Présence étiquette accepté (O/N)</th><th>Qté Commandée (Kg)</th><th>Qté livrée (Kg)</th><th>DDR</th><th>DDP</th><th>Fait par Date &amp; Visa</th><th>Vérifié par Date &amp; Visa</th></tr></thead>
      <tbody>
        <tr v-for="(m, i) in MATS" :key="i">
          <td>{{ m[0] }}</td><td class="ta-c">{{ m[1] }}</td>
          <td><input class="cell" v-model="d.pesee.recExterne[i].nLot" /></td>
          <td><input class="cell ta-c" v-model="d.pesee.recExterne[i].contenant" placeholder="O/N" /></td>
          <td><input class="cell ta-c" v-model="d.pesee.recExterne[i].etiq" placeholder="O/N" /></td>
          <td><input class="cell" v-model="d.pesee.recExterne[i].qCom" /></td><td><input class="cell" v-model="d.pesee.recExterne[i].qLiv" /></td>
          <td><input class="cell" v-model="d.pesee.recExterne[i].ddr" /></td><td><input class="cell" v-model="d.pesee.recExterne[i].ddp" /></td>
          <td><input class="cell" v-model="d.pesee.recExterne[i].faitDV" /></td><td><input class="cell" v-model="d.pesee.recExterne[i].verifDV" /></td>
        </tr>
      </tbody>
    </table>
  </PageSheet>

  <!-- ======================= PAGE 17 — PESÉE PA ======================= -->
  <PageSheet :page="17" etape="PESÉE">
    <div class="sec">11. PESÉE DES PRINCIPES ACTIFS :</div>
    <table><tbody><tr><td class="k" style="width:50%">Début de pesée</td><td>Heure : <input class="cell cinl" v-model="d.pesee.peseePA.debH" /></td><td>Date : <input class="cell cinl" v-model="d.pesee.peseePA.debD" /></td></tr></tbody></table>
    <div class="stxt" style="margin-top:6px">Enregistrer sur tous les tickets de pesée : la désignation et le N° de lot du produit fini ; le numéro du contenant ; le code interne ; le N° de lot interne ; visa opérateur ; coller le ticket de pesée sur la page suivante ; éditer l'étiquette de pesée et la coller sur le contenant en reportant toutes les informations requises.</div>
    <div class="note">* Pour les imprimantes thermiques : le ticket de pesée doit être photocopié et collé sur l'instruction de fabrication à côté du ticket de pesé imprimé.</div>
    <table>
      <thead><tr><th>Désignation</th><th>Code interne</th><th>N° de lot interne</th><th>Code balance</th><th>Quantité théorique /lot (kg)</th><th>Quantité pesée /lot (kg)</th><th>Fait par Date &amp; Visa</th><th>Double pesée (kg)</th><th>Vérifié par Date &amp; Visa</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.peseePA.lignes" :key="i">
          <td>{{ PA[i] ? PA[i].de : '' }}</td><td class="ta-c">{{ PA[i] ? PA[i].c : '' }}</td>
          <td><input class="cell" v-model="r.nLot" /></td><td><input class="cell" v-model="r.codeBal" /></td><td class="ta-c">{{ PA[i] ? PA[i].qt : '' }}</td>
          <td><div class="gtn">G=<input class="cell cinl" v-model="r.g" /></div><div class="gtn">T=<input class="cell cinl" v-model="r.t" /></div><div class="gtn">N=<input class="cell cinl" v-model="r.n" /></div></td>
          <td><input class="cell" v-model="r.faitDV" /></td><td>B=<input class="cell cinl" v-model="r.b" /></td><td><input class="cell" v-model="r.verifDV" /></td>
        </tr>
      </tbody>
    </table>
    <table><tbody><tr><td class="k" style="width:50%">Fin de pesée</td><td>Heure : <input class="cell cinl" v-model="d.pesee.peseePA.finH" /></td><td>Date : <input class="cell cinl" v-model="d.pesee.peseePA.finD" /></td></tr></tbody></table>
    <div class="note">G : Globale &nbsp; B : Brute &nbsp; T : Tare &nbsp; N : Net</div>
    <div class="note hl">NB : Après la pesée de l'API<span v-if="PA_NOMS"> {{ PA_NOMS }}</span>, stocker la matière dans un double sac en polyéthylène (PE) avec gel de silice et fermer à l'aide de serre-sacs, puis la placer dans un fût en inox bien fermé.</div>
  </PageSheet>

  <!-- ======================= PAGE 18 — TICKETS PA ======================= -->
  <PageSheet :page="18" etape="PESÉE">
    <div class="pbox"><div class="pbox-t">Coller ici les tickets de pesée des principes actifs</div><div class="pbox-a"></div></div>
    <div class="pverif">Vérifié par Date &amp; Visa : <input class="cell cinl" v-model="d.pesee.vTicketsPA" /></div>
  </PageSheet>

  <!-- ======================= PAGE 19 — PESÉE EXCIPIENTS ======================= -->
  <PageSheet :page="19" etape="PESÉE">
    <div class="sec">12. PESÉE DES EXCIPIENTS :</div>
    <table><tbody><tr><td class="k" style="width:50%">Début de pesée</td><td>Date : <input class="cell cinl" v-model="d.pesee.peseeExc.debD" /></td><td>Heure : <input class="cell cinl" v-model="d.pesee.peseeExc.debH" /></td></tr></tbody></table>
    <table>
      <thead><tr><th>Désignation</th><th>Code interne</th><th>N° de lot interne</th><th>Code balance</th><th>Qté théorique /lot (kg)</th><th>Quantité pesée /lot (kg)</th><th>Fait par Date &amp; Visa</th><th>Double pesée (kg)</th><th>Vérifié par Date &amp; Visa</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.peseeExc.lignes.slice(0,5)" :key="i">
          <td>{{ EXC[i][0] }}</td><td class="ta-c">{{ EXC[i][1] }}</td>
          <td><input class="cell" v-model="r.nLot" /></td><td><input class="cell" v-model="r.codeBal" /></td><td class="ta-c">{{ EXC[i][2] }}</td>
          <td><div class="gtn">G=<input class="cell cinl" v-model="r.g" /></div><div class="gtn">T=<input class="cell cinl" v-model="r.t" /></div><div class="gtn">N=<input class="cell cinl" v-model="r.n" /></div></td>
          <td><input class="cell" v-model="r.faitDV" /></td><td>B=<input class="cell cinl" v-model="r.b" /></td><td><input class="cell" v-model="r.verifDV" /></td>
        </tr>
      </tbody>
    </table>
  </PageSheet>

  <!-- ======================= PAGE 20 — PESÉE EXCIPIENTS (suite) ======================= -->
  <PageSheet :page="20" etape="PESÉE">
    <table>
      <thead><tr><th>Désignation</th><th>Code interne</th><th>N° de lot interne</th><th>Code balance</th><th>Qté théorique /lot (kg)</th><th>Quantité pesée /lot (kg)</th><th>Fait par Date &amp; Visa</th><th>Double pesée (kg)</th><th>Vérifié par Date &amp; Visa</th></tr></thead>
      <tbody>
        <tr v-for="(r, j) in d.pesee.peseeExc.lignes.slice(5)" :key="j">
          <td>{{ EXC[j + 5] ? EXC[j + 5][0] : '' }}</td><td class="ta-c">{{ EXC[j + 5] ? EXC[j + 5][1] : '' }}</td>
          <td><input class="cell" v-model="r.nLot" /></td><td><input class="cell" v-model="r.codeBal" /></td><td class="ta-c">{{ EXC[j + 5] ? EXC[j + 5][2] : '' }}</td>
          <td><div class="gtn">G=<input class="cell cinl" v-model="r.g" /></div><div class="gtn">T=<input class="cell cinl" v-model="r.t" /></div><div class="gtn">N=<input class="cell cinl" v-model="r.n" /></div></td>
          <td><input class="cell" v-model="r.faitDV" /></td><td>B=<input class="cell cinl" v-model="r.b" /></td><td><input class="cell" v-model="r.verifDV" /></td>
        </tr>
      </tbody>
    </table>
    <table><tbody><tr><td class="k" style="width:50%">Fin de pesée</td><td>Heure : <input class="cell cinl" v-model="d.pesee.peseeExc.finH" /></td><td>Date : <input class="cell cinl" v-model="d.pesee.peseeExc.finD" /></td></tr></tbody></table>
    <div class="note">G : Globale &nbsp; B : Brute &nbsp; T : Tare &nbsp; N : Net</div>
  </PageSheet>

  <!-- ======================= PAGE 21 — TICKETS EXCIPIENTS ======================= -->
  <PageSheet :page="21" etape="PESÉE">
    <div class="pbox"><div class="pbox-t">Coller ici les tickets de pesée des excipients</div><div class="pbox-a"></div></div>
    <div class="pverif">Vérifié par Date &amp; Visa : <input class="cell cinl" v-model="d.pesee.vTicketsExc" /></div>
  </PageSheet>

  <!-- ======================= PAGE 22 — FICHES UTILISATION ======================= -->
  <PageSheet :page="22" etape="PESÉE">
    <div class="stxt">• À la fin de la pesée, coller les fiches « utilisation salle » et « utilisation machine » sur l'instruction de fabrication.</div>
    <table><thead><tr><th>Fiche utilisation salle</th><th>Fiche utilisation machine</th></tr></thead>
      <tbody><tr><td><div class="pbox-a" style="border:0"></div></td><td><div class="pbox-a" style="border:0"></div></td></tr></tbody></table>
    <div class="pverif">Vérifié par Date &amp; Visa : <input class="cell cinl" v-model="d.pesee.vFichesUtil" /></div>
  </PageSheet>

  <!-- ======================= PAGE 23 — BILAN DE PESÉE ======================= -->
  <PageSheet :page="23" etape="PESÉE">
    <div class="sec">13. BILAN DE PESÉE :</div>
    <div class="stxt">Joindre les documents ci-dessous à l'instruction de fabrication :</div>
    <table><tbody>
      <tr><td>Bon de commande</td><td class="ta-c"><label class="cnc"><input type="radio" value="Oui" v-model="d.pesee.bilan.bonCom" /> Oui</label> <label class="cnc"><input type="radio" value="Non" v-model="d.pesee.bilan.bonCom" /> Non</label></td>
          <td>Bon de retour interne</td><td class="ta-c"><label class="cnc"><input type="radio" value="Oui" v-model="d.pesee.bilan.bonRetInt" /> Oui</label> <label class="cnc"><input type="radio" value="Non" v-model="d.pesee.bilan.bonRetInt" /> Non</label></td></tr>
      <tr><td>Bon de retour final</td><td class="ta-c"><label class="cnc"><input type="radio" value="Oui" v-model="d.pesee.bilan.bonRetFin" /> Oui</label> <label class="cnc"><input type="radio" value="Non" v-model="d.pesee.bilan.bonRetFin" /> Non</label></td>
          <td>Bon d'avarie</td><td class="ta-c"><label class="cnc"><input type="radio" value="Oui" v-model="d.pesee.bilan.bonAvarie" /> Oui</label> <label class="cnc"><input type="radio" value="Non" v-model="d.pesee.bilan.bonAvarie" /> Non</label></td></tr>
    </tbody></table>
    <table>
      <thead><tr><th>Matières</th><th>Code interne</th><th>N° de lot interne</th><th>Quantité totale livrée (kg)</th><th>Quantité Pesée (kg)</th><th>Qté Retournée Interne (kg)</th><th>Qté Retournée Final (kg)</th><th>Quantité Avariée (kg)</th><th>Date &amp; Visa Superviseur</th></tr></thead>
      <tbody>
        <tr v-for="(m, i) in MATS" :key="i">
          <td>{{ m[0] }}</td><td class="ta-c">{{ m[1] }}</td><td><input class="cell" v-model="d.pesee.retInterne[i].nLot" /></td>
          <td><input class="cell" v-model="d.pesee.bilan.lignes[i].qLiv" /></td><td><input class="cell" v-model="d.pesee.bilan.lignes[i].qPes" /></td>
          <td><input class="cell" v-model="d.pesee.bilan.lignes[i].qRetInt" /></td><td><input class="cell" v-model="d.pesee.bilan.lignes[i].qRetFin" /></td>
          <td><input class="cell" v-model="d.pesee.bilan.lignes[i].qAvar" /></td><td><input class="cell" v-model="d.pesee.bilan.lignes[i].dvSup" /></td>
        </tr>
      </tbody>
    </table>
    <div class="stxt" style="margin-top:6px">▸ Justifier toute avarie hors normes : <input class="cell cinl" style="min-width:300px" v-model="d.pesee.bilan.justif" /></div>
    <div class="pverif">Date / Visa Responsable Fabrication : <input class="cell cinl" v-model="d.pesee.bilan.dvResp" /></div>
  </PageSheet>

  <!-- ======================= PAGE 24 — INCIDENTS ======================= -->
  <PageSheet :page="24" etape="PESÉE">
    <div class="sec">14. SUIVI DES INCIDENTS ET ARRÊTS :</div>
    <table>
      <thead><tr><th>Date</th><th>Heure d'arrêt</th><th>N° de Sac</th><th>Motif</th><th>Action Corrective</th><th>Date de Démarrage</th><th>Heure de Démarrage</th><th>Fait par Visa</th></tr></thead>
      <tbody>
        <tr v-for="(r, i) in d.pesee.incidents" :key="i">
          <td><input class="cell" v-model="r.date" /></td><td><input class="cell" v-model="r.heureArret" /></td><td><input class="cell" v-model="r.nSac" /></td>
          <td><input class="cell" v-model="r.motif" /></td><td><input class="cell" v-model="r.action" /></td><td><input class="cell" v-model="r.dateDem" /></td>
          <td><input class="cell" v-model="r.heureDem" /></td><td><input class="cell" v-model="r.visa" /></td>
        </tr>
      </tbody>
    </table>
    <button class="addrow noprint" @click="addInc">+ ligne</button>
    <div class="pverif">Vérifié par, Date &amp; Visa : <input class="cell cinl" v-model="d.pesee.bilan.dvResp" /></div>
  </PageSheet>
</template>

<style scoped>
.cinl { display: inline-block; width: auto; min-width: 70px; border-bottom: 1px dotted #94a3b8 !important; }
.gtn { display: flex; align-items: center; gap: 2px; font-size: 10px; }
.gtn .cinl { min-width: 50px; }
.addrow { font: inherit; font-size: 11px; font-weight: 600; color: #0e7490; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 6px; padding: 3px 10px; cursor: pointer; margin-top: 6px; }
</style>
