<script setup>
import { inject, ref, reactive } from 'vue'
import { TYPES_CHAMP, TYPES_COLONNE, JEUX_OUI_NON, champVide, sectionVide, colonneVide, compteChamps, uid } from '../formulaire.js'

const props = defineProps({
  sauver: { type: Function, required: true },   // async () => {ok, local, err}
  produitNom: { type: String, default: '' }
})
const emit = defineEmits(['close'])

const d = inject('doc')
if (!d.formulaire || !Array.isArray(d.formulaire.sections)) d.formulaire = { sections: [] }
const form = d.formulaire

const nouveauType = reactive({})       // type choisi par section pour « + champ »
const colsOuvert = ref(null)           // id du champ tableau dont on édite les colonnes
const msg = ref(''); const busy = ref(false)

/* ---- sections ---- */
const addSec = () => { form.sections.push(sectionVide()) }
const delSec = (i) => { if (confirm('Supprimer cette section et ses champs ?')) form.sections.splice(i, 1) }
const moveSec = (i, d2) => { const j = i + d2; if (j < 0 || j >= form.sections.length) return;[form.sections[i], form.sections[j]] = [form.sections[j], form.sections[i]] }

/* ---- champs ---- */
function addChamp (sec) { sec.champs.push(champVide(nouveauType[sec.id] || 'num')) }
const delChamp = (sec, i) => sec.champs.splice(i, 1)
const moveChamp = (sec, i, d2) => { const j = i + d2; if (j < 0 || j >= sec.champs.length) return;[sec.champs[i], sec.champs[j]] = [sec.champs[j], sec.champs[i]] }

/* ---- oui/non : jeux de choix ---- */
function jeuDe (ch) { const j = JEUX_OUI_NON.find(j => j.options[0] === (ch.options || [])[0] && j.options[1] === (ch.options || [])[1]); return j ? j.k : 'conf' }
function setJeu (ch, k) { const j = JEUX_OUI_NON.find(j => j.k === k); if (j) { ch.options = [...j.options]; ch.attendu = j.attendu } }

/* ---- colonnes de tableau ---- */
const toggleCols = (ch) => { colsOuvert.value = colsOuvert.value === ch.id ? null : ch.id }
const addCol = (ch) => ch.colonnes.push(colonneVide('texte'))
const delCol = (ch, i) => ch.colonnes.splice(i, 1)

/* ---- check-list : points ---- */
const addItem = (ch) => { if (!Array.isArray(ch.items)) ch.items = []; ch.items.push({ id: uid('it'), label: '' }) }
const delItem = (ch, i) => ch.items.splice(i, 1)

async function sauver () {
  // nettoie : retire sections sans titre ET sans champ
  busy.value = true; msg.value = ''
  const r = await props.sauver()
  busy.value = false
  msg.value = (r && r.ok === false) ? ('Échec : ' + (r.err || '')) : (r && r.local ? 'Enregistré sur cet appareil ✓' : 'Formulaire enregistré ✓')
}
</script>

<template>
  <div class="cf-overlay noprint" @click.self="emit('close')">
    <div class="cf-panel">
      <header class="cf-head">
        <div><h2>Constructeur de formulaire</h2><span class="cf-sub">{{ produitNom || 'Produit' }} · {{ form.sections.length }} section(s) · {{ compteChamps(form) }} champ(s)</span></div>
        <button class="cf-x" @click="emit('close')">✕</button>
      </header>
      <p v-if="msg" class="cf-ok">{{ msg }}</p>

      <div class="cf-body">
        <p class="cf-hint">Composez le dossier de ce produit : ajoutez des <b>sections</b> et des <b>champs</b>. Les champs <b>Numérique</b> (min/max) et <b>Conforme/Oui-Non</b> déclenchent les alertes à la saisie ; cochez <b>Oblig.</b> pour rendre un champ obligatoire.</p>

        <div v-for="(sec, si) in form.sections" :key="sec.id" class="cf-section">
          <div class="cf-sec-head">
            <input class="cf-sec-titre" v-model="sec.titre" placeholder="Titre de la section (ex. Conditions environnementales)" />
            <input class="cf-in cf-phase-in" v-model="sec.phase" placeholder="Phase" title="Phase / étape du dossier (ex. Pesée, Tamisage & Mélange)" />
            <select class="cf-in cf-cols-sel" :value="sec.cols || 1" @change="sec.cols = Number($event.target.value)" title="Nombre de colonnes d'affichage">
              <option :value="1">1 colonne</option>
              <option :value="2">2 colonnes</option>
            </select>
            <div class="cf-sec-act">
              <button class="cf-ib" :disabled="si === 0" @click="moveSec(si, -1)" title="Monter">↑</button>
              <button class="cf-ib" :disabled="si === form.sections.length - 1" @click="moveSec(si, 1)" title="Descendre">↓</button>
              <button class="cf-ib danger" @click="delSec(si)" title="Supprimer la section">🗑</button>
            </div>
          </div>

          <table class="cf-champs" v-if="sec.champs.length">
            <thead><tr><th style="width:26%">Libellé</th><th style="width:16%">Type</th><th>Paramètres / limites</th><th style="width:8%" class="ta-c">Oblig.</th><th style="width:12%"></th></tr></thead>
            <tbody>
              <tr v-for="(ch, ci) in sec.champs" :key="ch.id">
                <td><input class="cf-in" v-model="ch.label" placeholder="Libellé du champ" /></td>
                <td>
                  <select class="cf-in" v-model="ch.type">
                    <option v-for="t in TYPES_CHAMP" :key="t.k" :value="t.k">{{ t.label }}</option>
                  </select>
                </td>
                <td>
                  <template v-if="ch.type === 'num'">
                    <div class="cf-row">
                      <input class="cf-in w-u" v-model="ch.unite" placeholder="unité" />
                      <input class="cf-in w-n" v-model="ch.min" placeholder="min" />
                      <input class="cf-in w-n" v-model="ch.cible" placeholder="cible" />
                      <input class="cf-in w-n" v-model="ch.max" placeholder="max" />
                    </div>
                  </template>
                  <template v-else-if="ch.type === 'oui_non'">
                    <div class="cf-row">
                      <select class="cf-in" :value="jeuDe(ch)" @change="setJeu(ch, $event.target.value)">
                        <option v-for="j in JEUX_OUI_NON" :key="j.k" :value="j.k">{{ j.options.join(' / ') }}</option>
                      </select>
                      <span class="cf-lbl">conforme =</span>
                      <select class="cf-in" v-model="ch.attendu"><option v-for="o in ch.options" :key="o" :value="o">{{ o }}</option></select>
                    </div>
                  </template>
                  <template v-else-if="ch.type === 'tableau'">
                    <button class="cf-mini" @click="toggleCols(ch)">{{ colsOuvert === ch.id ? 'Fermer' : 'Colonnes' }} ({{ ch.colonnes.length }})</button>
                    <div v-if="colsOuvert === ch.id" class="cf-cols">
                      <div v-for="(col, ki) in ch.colonnes" :key="col.id" class="cf-col-row">
                        <input class="cf-in" v-model="col.label" placeholder="Colonne" />
                        <select class="cf-in w-t" v-model="col.type"><option v-for="t in TYPES_COLONNE" :key="t.k" :value="t.k">{{ t.label }}</option></select>
                        <template v-if="col.type === 'num'">
                          <input class="cf-in w-u" v-model="col.unite" placeholder="unité" />
                          <input class="cf-in w-n" v-model="col.min" placeholder="min" />
                          <input class="cf-in w-n" v-model="col.max" placeholder="max" />
                        </template>
                        <template v-else-if="col.type === 'oui_non'">
                          <input class="cf-in w-u" v-model="col.attendu" placeholder="conforme =" />
                        </template>
                        <button class="cf-ib danger" @click="delCol(ch, ki)">✕</button>
                      </div>
                      <button class="cf-mini" @click="addCol(ch)">+ colonne</button>
                    </div>
                  </template>
                  <template v-else-if="ch.type === 'note'">
                    <textarea class="cf-in cf-ta" v-model="ch.contenu" rows="3" placeholder="Texte / consignes affiché sur le formulaire (une ligne par point)"></textarea>
                  </template>
                  <template v-else-if="ch.type === 'fichier'">
                    <span class="cf-muted">Zone de dépôt de fichier (scan, étiquette, certificat) à la saisie</span>
                  </template>
                  <template v-else-if="ch.type === 'checklist'">
                    <div class="cf-row">
                      <select class="cf-in" :value="jeuDe(ch)" @change="setJeu(ch, $event.target.value)">
                        <option v-for="j in JEUX_OUI_NON" :key="j.k" :value="j.k">{{ j.options.join(' / ') }}</option>
                      </select>
                      <button class="cf-mini" @click="toggleCols(ch)">{{ colsOuvert === ch.id ? 'Fermer' : 'Points' }} ({{ (ch.items || []).length }})</button>
                    </div>
                    <div v-if="colsOuvert === ch.id" class="cf-cols">
                      <div v-for="(it, ii) in ch.items" :key="it.id" class="cf-col-row">
                        <input class="cf-in" v-model="it.label" placeholder="Point à vérifier" />
                        <button class="cf-ib danger" @click="delItem(ch, ii)">✕</button>
                      </div>
                      <button class="cf-mini" @click="addItem(ch)">+ point</button>
                    </div>
                  </template>
                  <template v-else-if="ch.type === 'calcul'">
                    <input class="cf-in" v-model="ch.formule" placeholder="Formule, ex. {id1} - ({id2} + {id3})" />
                    <div class="cf-row" style="margin-top:4px">
                      <input class="cf-in w-u" v-model="ch.unite" placeholder="unité" />
                      <input class="cf-in w-n" v-model="ch.min" placeholder="min" />
                      <input class="cf-in w-n" v-model="ch.max" placeholder="max" />
                    </div>
                  </template>
                  <span v-else class="cf-muted">—</span>
                </td>
                <td class="ta-c"><input type="checkbox" v-model="ch.obligatoire" /></td>
                <td class="ta-r cf-nowrap">
                  <button class="cf-ib" :disabled="ci === 0" @click="moveChamp(sec, ci, -1)">↑</button>
                  <button class="cf-ib" :disabled="ci === sec.champs.length - 1" @click="moveChamp(sec, ci, 1)">↓</button>
                  <button class="cf-ib danger" @click="delChamp(sec, ci)">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="cf-empty">Section vide — ajoutez un champ ci-dessous.</p>

          <div class="cf-addchamp">
            <select class="cf-in w-type" v-model="nouveauType[sec.id]">
              <option v-for="t in TYPES_CHAMP" :key="t.k" :value="t.k">{{ t.label }}</option>
            </select>
            <button class="cf-btn ghost" @click="addChamp(sec)">+ champ</button>
          </div>
        </div>

        <button class="cf-addsec" @click="addSec">+ Ajouter une section</button>
      </div>

      <footer class="cf-foot">
        <button class="cf-btn ghost" @click="emit('close')">Fermer</button>
        <button class="cf-btn primary" :disabled="busy" @click="sauver">{{ busy ? 'Enregistrement…' : 'Enregistrer le formulaire du produit' }}</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.cf-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: flex; align-items: flex-start; justify-content: center; padding: 24px 14px; z-index: 1000; overflow: auto; }
.cf-panel { background: #fff; width: 100%; max-width: 1040px; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.3); display: flex; flex-direction: column; max-height: calc(100vh - 48px); }
.cf-head { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; }
.cf-head h2 { margin: 0; font-size: 18px; color: #0f172a; }
.cf-sub { font-size: 12px; color: #64748b; }
.cf-x { border: 0; background: #f1f5f9; width: 32px; height: 32px; border-radius: 8px; font-size: 14px; cursor: pointer; color: #475569; }
.cf-ok { margin: 12px 20px 0; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 8px 13px; border-radius: 8px; font-size: 13px; }
.cf-body { padding: 14px 20px; overflow: auto; }
.cf-hint { font-size: 12.5px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; margin: 0 0 14px; }
.cf-section { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; background: #fcfdff; }
.cf-sec-head { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.cf-sec-titre { flex: 1; font: inherit; font-size: 14px; font-weight: 700; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px; color: #0f172a; }
.cf-sec-act { display: flex; gap: 4px; }
.cf-champs { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.cf-champs th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: .3px; color: #64748b; padding: 4px 6px; border-bottom: 1px solid #e2e8f0; }
.cf-champs td { padding: 4px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
.cf-in { font: inherit; font-size: 12.5px; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #0f172a; width: 100%; }
.cf-ta { resize: vertical; min-height: 54px; line-height: 1.4; }
.cf-cols-sel { width: auto; flex: none; max-width: 120px; font-size: 12px; }
.cf-phase-in { width: auto; flex: none; max-width: 150px; font-size: 12px; }
.cf-row { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
.cf-row .w-u { width: 64px; } .cf-row .w-n { width: 60px; } .w-t { width: 110px; } .w-type { max-width: 220px; }
.cf-lbl { font-size: 11px; color: #64748b; }
.cf-muted { color: #94a3b8; }
.cf-nowrap { white-space: nowrap; }
.cf-ib { border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; padding: 3px 7px; cursor: pointer; font-size: 12px; margin-left: 2px; color: #475569; }
.cf-ib:hover:not(:disabled) { background: #f1f5f9; }
.cf-ib:disabled { opacity: .35; cursor: default; }
.cf-ib.danger { color: #be123c; border-color: #fecaca; }
.cf-cols { margin-top: 6px; padding: 8px; border: 1px dashed #cbd5e1; border-radius: 8px; background: #fff; }
.cf-col-row { display: flex; gap: 5px; align-items: center; margin-bottom: 5px; flex-wrap: wrap; }
.cf-col-row .cf-in { width: auto; flex: 1; min-width: 100px; }
.cf-col-row .w-u { flex: none; width: 64px; } .cf-col-row .w-n { flex: none; width: 60px; } .cf-col-row .w-t { flex: none; }
.cf-mini { font: inherit; font-size: 11px; font-weight: 600; color: #0e7490; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
.cf-empty { font-size: 12px; color: #94a3b8; font-style: italic; margin: 4px 0 8px; }
.cf-addchamp { display: flex; gap: 8px; margin-top: 8px; align-items: center; }
.cf-addsec { font: inherit; font-size: 13px; font-weight: 700; color: #0e7490; background: #ecfeff; border: 1px dashed #67e8f9; border-radius: 10px; padding: 10px 16px; cursor: pointer; width: 100%; }
.cf-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px 20px; border-top: 1px solid #e2e8f0; }
.cf-btn { border: 0; padding: 9px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.cf-btn.primary { background: #0891b2; color: #fff; }
.cf-btn.ghost { background: #fff; color: #0e7490; border: 1px solid #a5f3fc; }
.cf-btn:disabled { opacity: .55; cursor: not-allowed; }
.ta-c { text-align: center; } .ta-r { text-align: right; }
</style>
