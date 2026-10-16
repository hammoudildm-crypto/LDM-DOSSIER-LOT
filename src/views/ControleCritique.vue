<script setup>
import { inject, computed, watch } from 'vue'
import { evaluerPesee, verdictNum, verdictToken, verdictPeseeNet, fmtSpec, SPECS_PESEE } from '../controles.js'

const d = inject('doc')
const S = SPECS_PESEE
const sig = (gid) => d.execution.signatures[gid]

// Tolérances (persistées dans le dossier) — réglables selon la SOP.
const tolPesee = computed({ get: () => d.execution.tolPeseePct ?? S.tolPeseePct, set: v => { d.execution.tolPeseePct = Number(v) } })
const tolBilan = computed({ get: () => d.execution.tolBilanPct ?? S.tolBilanPct, set: v => { d.execution.tolBilanPct = Number(v) } })

const PA = computed(() => (d.formule || []).filter(f => /^MPPA/i.test(f.c || '')))

const res = computed(() => evaluerPesee(d, { tolPeseePct: tolPesee.value, tolBilanPct: tolBilan.value }))
const stats = computed(() => res.value.stats)
const deviations = computed(() => res.value.deviations)

// S'assure qu'une fiche de justification existe pour chaque déviation détectée.
watch(() => deviations.value.map(x => x.id), (ids) => {
  for (const id of ids) if (!d.execution.deviations[id]) d.execution.deviations[id] = { motif: '', action: '', visa: '', date: '' }
}, { immediate: true })

const bInfo = {
  conforme: { t: 'Conforme', c: 'ok' }, nc: { t: 'Non conforme', c: 'nc' },
  vide: { t: 'À saisir', c: 'vide' }, na: { t: 'N/A', c: 'na' }
}
const vEnv = (val, spec) => verdictNum(val, spec)
const vTok = (val, ok, naOk = false) => verdictToken(val, ok, naOk)
const vPes = (theo, net) => verdictPeseeNet(theo, net, tolPesee.value).statut
const ecartPes = (theo, net) => { const r = verdictPeseeNet(theo, net, tolPesee.value); return r.ecart === null ? '' : r.txt }

// Bilan massique d'une ligne
function bilanLigne (r) {
  const qLiv = toNum(r.qLiv)
  const somme = ['qPes', 'qRetInt', 'qRetFin', 'qAvar'].reduce((a, k) => a + (toNum(r[k]) || 0), 0)
  if (qLiv === null) return { statut: 'vide', txt: '' }
  const diff = qLiv - somme
  const tol = Math.max(0.05, Math.abs(qLiv) * tolBilan.value / 100)
  return { statut: Math.abs(diff) <= tol ? 'conforme' : 'nc', txt: `${diff >= 0 ? '+' : ''}${diff.toFixed(3)} kg` }
}
function toNum (v) { if (v == null) return null; const s = String(v).trim().replace(',', '.').replace(/[^\d.\-]/g, ''); if (!s || s === '-' || s === '.') return null; const n = Number(s); return Number.isFinite(n) ? n : null }

const statut = computed(() => {
  const s = stats.value
  if (s.saisis === 0) return { t: 'Non démarré', c: 'g' }
  if (s.nc > 0) return { t: `${s.nc} non-conformité(s)`, c: 'r' }
  if (s.pct < 100) return { t: `En cours — ${s.pct} %`, c: 'o' }
  return { t: 'Complet · conforme', c: 'v' }
})

/* ---- Signatures & audit ---- */
function logAudit (quoi) {
  if (!Array.isArray(d.execution.audit)) d.execution.audit = []
  d.execution.audit.unshift({ ts: new Date().toISOString(), qui: d.execution.operateur.nom || '—', quoi })
  if (d.execution.audit.length > 300) d.execution.audit.length = 300
}
function signer (groupeId, titre) {
  if (!d.execution.operateur.nom) { alert('Renseigne d\'abord le nom de l\'opérateur/signataire en haut.'); return }
  d.execution.signatures[groupeId] = { nom: d.execution.operateur.nom, matricule: d.execution.operateur.matricule || '', date: new Date().toLocaleString('fr-FR') }
  logAudit('Signature — ' + titre)
}
const dateFR = (iso) => { try { return new Date(iso).toLocaleString('fr-FR') } catch (e) { return iso } }

const addReleve = () => d.pesee.condProc.push({ date: '', moment: '', heure: '', temp: '', hr: '', dp: '', nSalle: '', fait: '', verif: '' })
const auditVisible = computed(() => (d.execution.audit || []).slice(0, 12))
</script>

<template>
  <div class="ctl">
    <!-- Bandeau d'état eBMR -->
    <div class="hud" :class="'s-' + statut.c">
      <div class="hud-main">
        <span class="hud-badge">{{ statut.t }}</span>
        <span class="hud-sub">Paramètres critiques — étape Pesée</span>
      </div>
      <div class="hud-stats">
        <div class="ks"><b>{{ stats.pct }}%</b><span>complétude</span></div>
        <div class="ks ok"><b>{{ stats.conformes }}</b><span>conformes</span></div>
        <div class="ks nc"><b>{{ stats.nc }}</b><span>non conf.</span></div>
        <div class="ks"><b>{{ stats.manquants }}</b><span>à saisir</span></div>
      </div>
      <div class="hud-prog"><div class="hud-bar" :style="{ width: stats.pct + '%' }"></div></div>
    </div>

    <!-- Opérateur + tolérances -->
    <section class="blk">
      <div class="blk-row">
        <label class="f">Opérateur / signataire<input v-model="d.execution.operateur.nom" placeholder="Nom & prénom" /></label>
        <label class="f">Matricule<input v-model="d.execution.operateur.matricule" placeholder="Matricule" /></label>
        <label class="f sm">Tolérance pesée (%)<input v-model.number="tolPesee" type="number" step="0.1" /></label>
        <label class="f sm">Tolérance bilan (%)<input v-model.number="tolBilan" type="number" step="0.1" /></label>
      </div>
    </section>

    <!-- ===== Conditions environnementales ===== -->
    <section class="blk">
      <div class="blk-h"><h3>Conditions environnementales</h3><button class="sigbtn" @click="signer('env','Conditions environnementales')">✍ Signer le volet</button></div>
      <p class="specs">Spécifications : T° {{ fmtSpec(S.temp) }} · HR {{ fmtSpec(S.hr) }} · ΔP {{ fmtSpec(S.dp) }}</p>
      <table class="t">
        <thead><tr><th>Moment</th><th>Heure</th><th>T° (°C)</th><th></th><th>HR (%)</th><th></th><th>ΔP (mmH₂O)</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(r, i) in d.pesee.condProc" :key="i">
            <td><input v-model="r.moment" placeholder="Début/Milieu/Fin" /></td>
            <td><input v-model="r.heure" class="w-s" /></td>
            <td><input v-model="r.temp" class="w-s" /></td><td><span class="vb" :class="bInfo[vEnv(r.temp, S.temp)].c">{{ bInfo[vEnv(r.temp, S.temp)].t }}</span></td>
            <td><input v-model="r.hr" class="w-s" /></td><td><span class="vb" :class="bInfo[vEnv(r.hr, S.hr)].c">{{ bInfo[vEnv(r.hr, S.hr)].t }}</span></td>
            <td><input v-model="r.dp" class="w-s" /></td><td><span class="vb" :class="bInfo[vEnv(r.dp, S.dp)].c">{{ bInfo[vEnv(r.dp, S.dp)].t }}</span></td>
          </tr>
        </tbody>
      </table>
      <button class="mini" @click="addReleve">+ relevé</button>
      <p v-if="sig('env')" class="sigline">Signé : <b>{{ sig('env').nom }}</b><span v-if="sig('env').matricule"> ({{ sig('env').matricule }})</span> — {{ sig('env').date }}</p>
      <p v-else class="sigline none">Volet non signé</p>
    </section>

    <!-- ===== Équipements & étalonnage ===== -->
    <section class="blk">
      <div class="blk-h"><h3>Équipements & étalonnage des balances</h3><button class="sigbtn" @click="signer('prep','Équipements & étalonnage')">✍ Signer le volet</button></div>
      <table class="t">
        <thead><tr><th>Équipement</th><th>Fonct. à vide (C/NC)</th><th></th><th>Statut qualif. (C/NC)</th><th></th><th>Étalonnage (Oui/Non)</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(e, i) in d.equip" :key="i">
            <td class="lbl">{{ e[0] }}</td>
            <td><input v-model="d.pesee.equip[i].fonctVide" class="w-s" placeholder="C / NC" /></td>
            <td><span class="vb" :class="bInfo[vTok(d.pesee.equip[i].fonctVide, ['C','CONFORME','OK'])].c">{{ bInfo[vTok(d.pesee.equip[i].fonctVide, ['C','CONFORME','OK'])].t }}</span></td>
            <td><input v-model="d.pesee.equip[i].statutQual" class="w-s" placeholder="C / NC" /></td>
            <td><span class="vb" :class="bInfo[vTok(d.pesee.equip[i].statutQual, ['C','CONFORME','OK'])].c">{{ bInfo[vTok(d.pesee.equip[i].statutQual, ['C','CONFORME','OK'])].t }}</span></td>
            <td><input v-model="d.pesee.etal[i].effectue" class="w-s" placeholder="Oui / Non" /></td>
            <td><span class="vb" :class="bInfo[vTok(d.pesee.etal[i].effectue, ['OUI','O'])].c">{{ bInfo[vTok(d.pesee.etal[i].effectue, ['OUI','O'])].t }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-if="sig('prep')" class="sigline">Signé : <b>{{ sig('prep').nom }}</b><span v-if="sig('prep').matricule"> ({{ sig('prep').matricule }})</span> — {{ sig('prep').date }}</p>
      <p v-else class="sigline none">Volet non signé</p>
    </section>

    <!-- ===== Réception matières ===== -->
    <section class="blk">
      <div class="blk-h"><h3>Réception des matières premières</h3><button class="sigbtn" @click="signer('rec','Réception des matières')">✍ Signer le volet</button></div>
      <table class="t">
        <thead><tr><th>Matière</th><th>N° lot</th><th>Contenant (O/N)</th><th></th><th>Étiquette (O/N)</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(m, i) in d.mats" :key="i">
            <td class="lbl">{{ m[0] }}</td>
            <td><input v-model="d.pesee.recExterne[i].nLot" /></td>
            <td><input v-model="d.pesee.recExterne[i].contenant" class="w-s" placeholder="O / N" /></td>
            <td><span class="vb" :class="bInfo[vTok(d.pesee.recExterne[i].contenant, ['O','OUI'])].c">{{ bInfo[vTok(d.pesee.recExterne[i].contenant, ['O','OUI'])].t }}</span></td>
            <td><input v-model="d.pesee.recExterne[i].etiq" class="w-s" placeholder="O / N" /></td>
            <td><span class="vb" :class="bInfo[vTok(d.pesee.recExterne[i].etiq, ['O','OUI'])].c">{{ bInfo[vTok(d.pesee.recExterne[i].etiq, ['O','OUI'])].t }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-if="sig('rec')" class="sigline">Signé : <b>{{ sig('rec').nom }}</b><span v-if="sig('rec').matricule"> ({{ sig('rec').matricule }})</span> — {{ sig('rec').date }}</p>
      <p v-else class="sigline none">Volet non signé</p>
    </section>

    <!-- ===== Pesée ===== -->
    <section class="blk">
      <div class="blk-h"><h3>Pesée — quantités (net vs théorique)</h3><button class="sigbtn" @click="signer('pesee','Pesée des quantités')">✍ Signer le volet</button></div>
      <table class="t">
        <thead><tr><th>Composant</th><th>Théo. (kg)</th><th>Net pesé (kg)</th><th>Écart</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(f, i) in PA" :key="'pa'+i">
            <td class="lbl"><span class="tagpa">PA</span> {{ f.de }}</td>
            <td class="ta-c">{{ f.qt }}</td>
            <td><input v-model="d.pesee.peseePA.lignes[i].n" class="w-m" /></td>
            <td class="ta-c sm2">{{ ecartPes(f.qt, d.pesee.peseePA.lignes[i].n) }}</td>
            <td><span class="vb" :class="bInfo[vPes(f.qt, d.pesee.peseePA.lignes[i].n)].c">{{ bInfo[vPes(f.qt, d.pesee.peseePA.lignes[i].n)].t }}</span></td>
          </tr>
          <tr v-for="(e, i) in d.exc" :key="'ex'+i">
            <td class="lbl">{{ e[0] }}</td>
            <td class="ta-c">{{ e[2] }}</td>
            <td><input v-model="d.pesee.peseeExc.lignes[i].n" class="w-m" /></td>
            <td class="ta-c sm2">{{ ecartPes(e[2], d.pesee.peseeExc.lignes[i].n) }}</td>
            <td><span class="vb" :class="bInfo[vPes(e[2], d.pesee.peseeExc.lignes[i].n)].c">{{ bInfo[vPes(e[2], d.pesee.peseeExc.lignes[i].n)].t }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-if="sig('pesee')" class="sigline">Signé : <b>{{ sig('pesee').nom }}</b><span v-if="sig('pesee').matricule"> ({{ sig('pesee').matricule }})</span> — {{ sig('pesee').date }}</p>
      <p v-else class="sigline none">Volet non signé</p>
    </section>

    <!-- ===== Bilan massique ===== -->
    <section class="blk">
      <div class="blk-h"><h3>Bilan de pesée (bilan massique)</h3><button class="sigbtn" @click="signer('bilan','Bilan de pesée')">✍ Signer le volet</button></div>
      <table class="t">
        <thead><tr><th>Matière</th><th>Livré</th><th>Pesé</th><th>Ret. int.</th><th>Ret. fin.</th><th>Avarie</th><th>Écart</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(m, i) in d.mats" :key="i">
            <td class="lbl">{{ m[0] }}</td>
            <td><input v-model="d.pesee.bilan.lignes[i].qLiv" class="w-s" /></td>
            <td><input v-model="d.pesee.bilan.lignes[i].qPes" class="w-s" /></td>
            <td><input v-model="d.pesee.bilan.lignes[i].qRetInt" class="w-s" /></td>
            <td><input v-model="d.pesee.bilan.lignes[i].qRetFin" class="w-s" /></td>
            <td><input v-model="d.pesee.bilan.lignes[i].qAvar" class="w-s" /></td>
            <td class="ta-c sm2">{{ bilanLigne(d.pesee.bilan.lignes[i]).txt }}</td>
            <td><span class="vb" :class="bInfo[bilanLigne(d.pesee.bilan.lignes[i]).statut].c">{{ bInfo[bilanLigne(d.pesee.bilan.lignes[i]).statut].t }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-if="sig('bilan')" class="sigline">Signé : <b>{{ sig('bilan').nom }}</b><span v-if="sig('bilan').matricule"> ({{ sig('bilan').matricule }})</span> — {{ sig('bilan').date }}</p>
      <p v-else class="sigline none">Volet non signé</p>
    </section>

    <!-- ===== Déviations (revue par exception) ===== -->
    <section class="blk dev" :class="{ empty: !deviations.length }">
      <h3>Déviations — paramètres hors spécification <span class="dev-n">{{ deviations.length }}</span></h3>
      <p v-if="!deviations.length" class="ok-note">✓ Aucune déviation : tous les paramètres critiques saisis sont conformes.</p>
      <div v-for="dv in deviations" :key="dv.id" class="devcard">
        <div class="devcard-h">
          <span class="vb nc">Non conforme</span>
          <b>{{ dv.libelle }}</b>
          <span class="devval">Mesuré : {{ dv.valeur || '—' }} · Spéc. : {{ dv.spec }}</span>
        </div>
        <div class="devcard-b">
          <label class="f">Motif / cause<input v-model="d.execution.deviations[dv.id].motif" placeholder="Cause de l'écart" /></label>
          <label class="f">Action corrective<input v-model="d.execution.deviations[dv.id].action" placeholder="Action engagée" /></label>
          <label class="f sm">Date<input v-model="d.execution.deviations[dv.id].date" placeholder="jj/mm/aaaa" /></label>
          <label class="f sm">Visa<input v-model="d.execution.deviations[dv.id].visa" placeholder="Visa" /></label>
        </div>
      </div>
    </section>

    <!-- ===== Piste d'audit ===== -->
    <section class="blk" v-if="auditVisible.length">
      <h3>Piste d'audit (dernières actions)</h3>
      <ul class="audit">
        <li v-for="(a, i) in auditVisible" :key="i"><span class="at">{{ dateFR(a.ts) }}</span> — {{ a.quoi }} <i>({{ a.qui }})</i></li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.ctl { color: #1b2733; }
.hud { border-radius: 14px; padding: 16px 18px 10px; margin-bottom: 16px; color: #fff; position: relative; overflow: hidden; }
.hud.s-g { background: linear-gradient(120deg,#475569,#334155); }
.hud.s-o { background: linear-gradient(120deg,#d97706,#b45309); }
.hud.s-r { background: linear-gradient(120deg,#e11d48,#9f1239); }
.hud.s-v { background: linear-gradient(120deg,#059669,#047857); }
.hud-main { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.hud-badge { font-size: 18px; font-weight: 800; }
.hud-sub { font-size: 12.5px; opacity: .9; }
.hud-stats { display: flex; gap: 22px; margin: 10px 0 12px; flex-wrap: wrap; }
.ks { display: flex; flex-direction: column; font-size: 11px; opacity: .92; }
.ks b { font-size: 20px; font-weight: 800; }
.hud-prog { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: rgba(255,255,255,.25); }
.hud-bar { height: 100%; background: #fff; transition: width .3s; }
.blk { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; }
.blk-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.blk h3 { margin: 0 0 4px; font-size: 14px; color: #0e7490; }
.specs { font-size: 12px; color: #64748b; margin: 2px 0 8px; }
.blk-row { display: flex; gap: 12px; flex-wrap: wrap; }
.f { display: flex; flex-direction: column; font-size: 11.5px; font-weight: 600; color: #475569; gap: 3px; flex: 1; min-width: 150px; }
.f.sm { max-width: 150px; }
.f input { font: inherit; font-size: 13px; font-weight: 400; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; }
.t { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.t th { font-size: 10.5px; text-transform: uppercase; letter-spacing: .2px; color: #64748b; text-align: left; padding: 5px 6px; border-bottom: 1px solid #e2e8f0; }
.t td { padding: 3px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.t td.lbl { font-weight: 600; color: #334155; max-width: 260px; }
.t input { width: 100%; border: 1px solid #dde5ee; border-radius: 6px; font: inherit; font-size: 12.5px; padding: 6px 7px; }
.t input.w-s { width: 72px; } .t input.w-m { width: 110px; }
.ta-c { text-align: center; } .sm2 { font-size: 11px; color: #475569; white-space: nowrap; }
.vb { display: inline-block; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
.vb.ok { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.vb.nc { background: #fef2f2; color: #be123c; border: 1px solid #fecaca; }
.vb.vide { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
.vb.na { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.tagpa { background: #eef2ff; color: #4338ca; font-size: 9.5px; font-weight: 800; padding: 1px 5px; border-radius: 4px; }
.mini { font: inherit; font-size: 11px; font-weight: 600; color: #0e7490; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 6px; padding: 3px 10px; cursor: pointer; margin-top: 6px; }
.sigbtn { font: inherit; font-size: 12px; font-weight: 600; color: #fff; background: #0891b2; border: 0; border-radius: 7px; padding: 6px 12px; cursor: pointer; }
.sigline { font-size: 12px; color: #047857; margin: 8px 0 0; }
.sigline.none { color: #94a3b8; font-style: italic; }
.dev { border-color: #fecaca; }
.dev.empty { border-color: #a7f3d0; }
.dev h3 { color: #be123c; display: flex; align-items: center; gap: 8px; }
.dev-n { background: #be123c; color: #fff; font-size: 11px; font-weight: 800; min-width: 20px; text-align: center; padding: 1px 7px; border-radius: 999px; }
.ok-note { color: #047857; font-size: 13px; margin: 4px 0 0; }
.devcard { border: 1px solid #fecaca; border-radius: 9px; padding: 10px 12px; margin-top: 10px; background: #fff7f7; }
.devcard-h { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; }
.devval { font-size: 11.5px; color: #991b1b; }
.devcard-b { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.audit { list-style: none; padding: 0; margin: 4px 0 0; font-size: 12px; color: #475569; }
.audit li { padding: 3px 0; border-bottom: 1px dashed #eef2f6; }
.audit .at { color: #0e7490; font-variant-numeric: tabular-nums; }
@media (max-width: 680px) { .f.sm { max-width: none; } }
</style>
