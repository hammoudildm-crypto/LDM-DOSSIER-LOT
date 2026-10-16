// =====================================================================
//  Moteur de contrôle des PARAMÈTRES CRITIQUES — étape Pesée (eBMR)
//  Évalue les valeurs saisies (d.pesee) contre les spécifications et
//  renvoie, par volet, le verdict de chaque point + les statistiques
//  de complétude + la liste des déviations (points non conformes).
//  Verdicts : 'conforme' | 'nc' (non conforme) | 'vide' (non saisi) | 'na'
// =====================================================================

// Spécifications par défaut (bornes réglementaires de l'étape pesée).
// tolPeseePct / tolBilanPct : tolérances à ajuster selon la SOP.
export const SPECS_PESEE = {
  temp: { min: 15, max: 25, unit: '°C', libelle: 'Température' },
  hr: { max: 60, unit: '%', libelle: 'Humidité relative' },
  dp: { min: 1, unit: 'mmH₂O', libelle: 'Différentiel de pression' },
  tolPeseePct: 1.0,
  tolBilanPct: 0.5
}

export function parseNum (v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim().replace(',', '.').replace(/[^\d.\-]/g, '')
  if (s === '' || s === '-' || s === '.') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function verdictNum (v, { min, max }) {
  const n = parseNum(v)
  if (n === null) return 'vide'
  if (min != null && n < min) return 'nc'
  if (max != null && n > max) return 'nc'
  return 'conforme'
}
export function verdictToken (raw, ok, naOk = false) {
  const s = String(raw == null ? '' : raw).trim().toUpperCase()
  if (!s) return 'vide'
  if (naOk && (s === 'NA' || s === 'N/A')) return 'na'
  return ok.map(x => x.toUpperCase()).includes(s) ? 'conforme' : 'nc'
}
// Pesée : net vs théorique ± tolérance (%). Renvoie {statut, ecart, txt}.
export function verdictPeseeNet (qTheoRaw, netRaw, tolPct) {
  const T = parseNum(qTheoRaw), N = parseNum(netRaw)
  if (N === null) return { statut: 'vide', ecart: null, txt: '' }
  if (T === null || T === 0) return { statut: 'conforme', ecart: null, txt: `${netRaw} kg` }
  const ecart = (N - T) / T * 100
  return { statut: Math.abs(ecart) <= tolPct ? 'conforme' : 'nc', ecart, txt: `écart ${ecart >= 0 ? '+' : ''}${ecart.toFixed(2)} %` }
}
export const fmtSpec = (s) => {
  if (s.min != null && s.max != null) return `${s.min} à ${s.max} ${s.unit}`
  if (s.max != null) return `≤ ${s.max} ${s.unit}`
  if (s.min != null) return `≥ ${s.min} ${s.unit}`
  return ''
}

// Évalue tout l'étape pesée. Renvoie { groupes, stats, deviations }.
export function evaluerPesee (d, opts = {}) {
  const S = { ...SPECS_PESEE, ...opts }
  const p = d.pesee || {}
  const mats = d.mats || []
  const exc = d.exc || []
  const equip = d.equip || []
  const PA = (d.formule || []).filter(f => /^MPPA/i.test(f.c || ''))
  const G = []
  const pt = (id, libelle, spec, valeur, statut) => ({ id, libelle, spec, valeur, statut })

  // ---- 1. Conditions environnementales ----
  const env = []
  const pousserEnv = (prefixe, lignes) => {
    ;(lignes || []).forEach((r, i) => {
      const rempli = r.temp || r.hr || r.dp
      if (!rempli && prefixe !== 'start') return
      const quand = prefixe === 'start'
        ? `Démarrage ${r.etape ? '(' + r.etape + ')' : i + 1}`
        : `Relevé ${r.moment || i + 1}${r.heure ? ' · ' + r.heure : ''}`
      env.push(pt(`${prefixe}-t-${i}`, `${quand} — Température`, fmtSpec(S.temp), (r.temp || '') + (r.temp ? ' °C' : ''), verdictNum(r.temp, S.temp)))
      env.push(pt(`${prefixe}-h-${i}`, `${quand} — Humidité`, fmtSpec(S.hr), (r.hr || '') + (r.hr ? ' %' : ''), verdictNum(r.hr, S.hr)))
      env.push(pt(`${prefixe}-d-${i}`, `${quand} — ΔP`, fmtSpec(S.dp), (r.dp || '') + (r.dp ? ' mmH₂O' : ''), verdictNum(r.dp, S.dp)))
    })
  }
  pousserEnv('start', p.condDem)
  pousserEnv('proc', p.condProc)
  if (env.length) G.push({ id: 'env', titre: 'Conditions environnementales', points: env })

  // ---- 2. Préparation : équipements & étalonnage balances ----
  const prep = []
  ;(equip).forEach((e, i) => {
    const r = (p.equip || [])[i] || {}
    prep.push(pt(`eq-v-${i}`, `${e[0]} — Fonctionnement à vide`, 'Conforme (C)', r.fonctVide, verdictToken(r.fonctVide, ['C', 'CONFORME', 'OK'])))
    prep.push(pt(`eq-q-${i}`, `${e[0]} — Statut qualification`, 'Conforme (C)', r.statutQual, verdictToken(r.statutQual, ['C', 'CONFORME', 'OK'])))
  })
  ;(equip).forEach((e, i) => {
    const r = (p.etal || [])[i] || {}
    prep.push(pt(`etal-${i}`, `${e[0]} — Étalonnage effectué`, 'Oui', r.effectue, verdictToken(r.effectue, ['OUI', 'O', 'YES'])))
  })
  if (prep.length) G.push({ id: 'prep', titre: 'Équipements & étalonnage des balances', points: prep })

  // ---- 3. Réception des matières ----
  const rec = []
  mats.forEach((m, i) => {
    const r = (p.recExterne || [])[i] || {}
    rec.push(pt(`rec-c-${i}`, `${m[0]} — Contenant intègre/scellé`, 'Oui (O)', r.contenant, verdictToken(r.contenant, ['O', 'OUI'])))
    rec.push(pt(`rec-e-${i}`, `${m[0]} — Étiquette « accepté »`, 'Oui (O)', r.etiq, verdictToken(r.etiq, ['O', 'OUI'])))
  })
  if (rec.length) G.push({ id: 'rec', titre: 'Réception des matières premières', points: rec })

  // ---- 4. Pesée (quantité pesée vs théorique ± tolérance) ----
  const pes = []
  const evalPesee = (idp, nom, qTheoRaw, netRaw) => {
    const v = verdictPeseeNet(qTheoRaw, netRaw, S.tolPeseePct)
    const val = v.statut === 'vide' ? '' : (netRaw + ' kg' + (v.ecart !== null ? ` (${v.txt})` : ''))
    return pt(idp, nom, `Théo. ${qTheoRaw || '?'} kg · tol. ± ${S.tolPeseePct} %`, val, v.statut)
  }
  PA.forEach((f, i) => {
    const r = (p.peseePA && p.peseePA.lignes[i]) || {}
    pes.push(evalPesee(`pa-${i}`, `PA — ${f.de}`, f.qt, r.n))
  })
  exc.forEach((e, i) => {
    const r = (p.peseeExc && p.peseeExc.lignes[i]) || {}
    pes.push(evalPesee(`exc-${i}`, `Excipient — ${e[0]}`, e[2], r.n))
  })
  if (pes.length) G.push({ id: 'pesee', titre: 'Pesée — quantités (net vs théorique)', points: pes })

  // ---- 5. Bilan massique (livré = pesé + retours + avarie) ----
  const bil = []
  mats.forEach((m, i) => {
    const r = (p.bilan && p.bilan.lignes[i]) || {}
    const qLiv = parseNum(r.qLiv)
    const somme = ['qPes', 'qRetInt', 'qRetFin', 'qAvar'].reduce((a, k) => a + (parseNum(r[k]) || 0), 0)
    let statut = 'vide', val = ''
    if (qLiv !== null) {
      const diff = qLiv - somme
      const tol = Math.max(0.05, Math.abs(qLiv) * S.tolBilanPct / 100)
      statut = Math.abs(diff) <= tol ? 'conforme' : 'nc'
      val = `écart ${diff >= 0 ? '+' : ''}${diff.toFixed(3)} kg`
    }
    bil.push(pt(`bil-${i}`, `${m[0]} — Bilan massique`, `Livré = Pesé + Retours + Avarie (± ${S.tolBilanPct} %)`, val, statut))
  })
  if (bil.length) G.push({ id: 'bilan', titre: 'Bilan de pesée (bilan massique)', points: bil })

  // ---- Statistiques & déviations ----
  let total = 0, saisis = 0, conformes = 0, nc = 0
  const deviations = []
  for (const g of G) for (const q of g.points) {
    total++
    if (q.statut !== 'vide') saisis++
    if (q.statut === 'conforme' || q.statut === 'na') conformes++
    if (q.statut === 'nc') { nc++; deviations.push({ ...q, groupe: g.titre }) }
  }
  const pct = total ? Math.round(saisis / total * 100) : 0
  return { groupes: G, stats: { total, saisis, conformes, nc, pct, manquants: total - saisis }, deviations }
}
