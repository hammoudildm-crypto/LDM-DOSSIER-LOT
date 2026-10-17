// =====================================================================
//  Catalogue des produits (données de référence de l'IF par produit).
//  Sélectionner un produit charge ces données fixes dans le dossier ;
//  l'opérateur ne saisit ensuite que les valeurs réelles du lot.
//  Pour ajouter un produit : copier ce bloc et adapter les valeurs.
// =====================================================================

// --- Fabriques pour composer un formulaire par défaut (ids STABLES, pour
//     que le rechargement d'un dossier enregistré retrouve bien ses saisies).
//     Champs : num(limites) · oc(Conforme/Non conforme) · cnc(C/NC) ·
//     oo(Oui/Non) · txt/date. Colonnes de tableau : cn(num) · ct(texte) ·
//     coc(Conforme/NC) · ccnc(C/NC) · coo(Oui/Non). tab(tableau) · sec(section). ---
const _num = (id, label, unite = '', min = null, max = null, obligatoire = false) =>
  ({ id, label, type: 'num', unite, min, cible: null, max, obligatoire, attendu: 'Conforme', options: ['Conforme', 'Non conforme'], colonnes: [] })
const _oc = (id, label, obligatoire = false) =>
  ({ id, label, type: 'oui_non', unite: '', min: null, cible: null, max: null, obligatoire, attendu: 'Conforme', options: ['Conforme', 'Non conforme'], colonnes: [] })
const _cnc = (id, label, obligatoire = false) =>
  ({ id, label, type: 'oui_non', unite: '', min: null, cible: null, max: null, obligatoire, attendu: 'C', options: ['C', 'NC'], colonnes: [] })
const _oo = (id, label, obligatoire = false) =>
  ({ id, label, type: 'oui_non', unite: '', min: null, cible: null, max: null, obligatoire, attendu: 'Oui', options: ['Oui', 'Non'], colonnes: [] })
const _txt = (id, label, type = 'texte', obligatoire = false) =>
  ({ id, label, type, unite: '', min: null, cible: null, max: null, obligatoire, attendu: 'Conforme', options: ['Conforme', 'Non conforme'], colonnes: [] })
const _cn = (id, label, unite = '', min = null, max = null) =>
  ({ id, label, type: 'num', unite, min, max, attendu: 'Conforme', options: ['Conforme', 'Non conforme'] })
const _ct = (id, label) =>
  ({ id, label, type: 'texte', unite: '', min: null, max: null, attendu: 'Conforme', options: ['Conforme', 'Non conforme'] })
const _coc = (id, label) =>
  ({ id, label, type: 'oui_non', unite: '', min: null, max: null, attendu: 'Conforme', options: ['Conforme', 'Non conforme'] })
const _ccnc = (id, label) =>
  ({ id, label, type: 'oui_non', unite: '', min: null, max: null, attendu: 'C', options: ['C', 'NC'] })
const _coo = (id, label) =>
  ({ id, label, type: 'oui_non', unite: '', min: null, max: null, attendu: 'Oui', options: ['Oui', 'Non'] })
const _tab = (id, label, colonnes) =>
  ({ id, label, type: 'tableau', unite: '', min: null, cible: null, max: null, obligatoire: false, attendu: 'Conforme', options: ['Conforme', 'Non conforme'], colonnes })
const _note = (id, label, contenu) => ({ id, label, type: 'note', unite: '', min: null, cible: null, max: null, obligatoire: false, attendu: 'Conforme', options: ['Conforme', 'Non conforme'], colonnes: [], contenu })
const _chk = (id, label, jeu, items) => {
  const J = { cnc: { options: ['C', 'NC'], attendu: 'C' }, oui: { options: ['Oui', 'Non'], attendu: 'Oui' }, conf: { options: ['Conforme', 'Non conforme'], attendu: 'Conforme' } }[jeu] || { options: ['C', 'NC'], attendu: 'C' }
  return { id, label, type: 'checklist', unite: '', min: null, cible: null, max: null, obligatoire: false, attendu: J.attendu, options: J.options, colonnes: [], contenu: '', items: items.map((l, i) => ({ id: id + '_' + (i + 1), label: l })) }
}
const _ooi = (id, label) => ({ id, label, type: 'oui_non', unite: '', min: null, cible: null, max: null, obligatoire: false, attendu: '', options: ['Oui', 'Non'], colonnes: [], contenu: '' })
const _pj = (id, label) => ({ id, label, type: 'fichier', unite: '', min: null, cible: null, max: null, obligatoire: false, attendu: 'Conforme', options: ['Conforme', 'Non conforme'], colonnes: [], contenu: '' })
const _calc = (id, label, formule, unite = '', min = null, max = null) => ({ id, label, type: 'calcul', unite, min, cible: null, max, obligatoire: false, attendu: 'Conforme', options: ['Conforme', 'Non conforme'], colonnes: [], contenu: '', formule })
const _sec = (id, titre, champs, cols = 1) => ({ id, titre, cols, champs })

// Texte « Instructions générales » (dossier, pages 3-4) — affiché en pièce jointe.
const TXT_INSTRUCTIONS_GEN = `Le Superviseur doit procéder aux vérifications suivantes avant le démarrage de chaque opération de fabrication :
• Vide de ligne : machines et locaux libérés des matériaux et documents du produit précédent.
• Nettoyage : nettoyage des salles et équipements selon la procédure en vigueur ; étiquettes de nettoyage jointes à l'IF.
• Identification : locaux et machines identifiés (nom du produit et N° de lot sur la fiche d'identification).
• Calibrage des balances (si applicable) : calibrage effectué et renseigné selon la procédure en vigueur.
• Paramètre du milieu : température (°C), humidité (%) et pression différentielle (mmH₂O) documentées sur la page correspondante.
• Personnel : nom et prénom des intervenants notés sur la fiche de suivi du personnel.
• Matières : propreté et intégrité des MP réceptionnées vérifiées ; page de réception renseignée.
• Machines : paramètres machine dans l'intervalle correspondant.
• Ordre de fabrication : validité de l'OF vérifiée.
• Attendre l'approbation AQ avant de procéder à l'opération de fabrication concernée.
• En cas d'anomalies : stopper l'opération, alerter le responsable hiérarchique, mentionner l'incident sur la page correspondante.`

// Texte « Consignes de sécurité obligatoires » (dossier, page 4).
const TXT_SECURITE = `• Le port de la tenue pharmaceutique adaptée à la zone est obligatoire (procédure d'habillage en vigueur).
• Le port du casque antibruit est obligatoire lors des opérations de compression.
• Interdiction formelle d'intervenir sur les machines en marche : attendre l'arrêt complet de l'équipement.
• Interdiction formelle de bipasser les consignes de sécurité de l'équipement.
• Interdiction formelle de désactiver les carters de sécurité de l'équipement.
• Le personnel est tenu de déclarer à sa hiérarchie toute plaie ou maladie contagieuse avant d'accéder à la zone de production.
• Éviter tout contact des produits manipulés avec la peau.`

// Texte « Précautions de production » (dossier, page 4).
const TXT_PRECAUTIONS = `• La fermeture des portes des ateliers de fabrication est obligatoire tout au long du process.
• En cours de fabrication, éviter un contact prolongé du produit avec l'air (ex. heures de pause, produit hygroscopique).
• Retirer le produit de l'équipement lorsqu'un arrêt prolongé est prévu.`

// =====================================================================
//  Formulaire PESÉE PAR DÉFAUT (modèle intégré) — utilisé par TOUS les produits
//  tant qu'ils n'ont pas leur propre formulaire. Calqué sur le dossier de lot
//  (IF PFLDM103, pages 9-24, sections 1 à 14). Limites = spéc. dossier du site :
//  T° 15-25 °C, HR ≤60 %, ΔP ≥1 mmH₂O. Les quantités pesées sont enregistrées.
//  Les libellés propres à un produit (PA, excipients) se complètent à la saisie.
// =====================================================================
const SECTIONS_PESEE = [
    _sec('p_prelim', '1 · Opérations préliminaires & autorisation de démarrage', [
      _note('pp_instr', 'Instructions générales — vérifications avant démarrage', TXT_INSTRUCTIONS_GEN),
      _note('pp_secu', 'Consignes de sécurité obligatoires', TXT_SECURITE),
      _note('pp_prec', 'Précautions de production', TXT_PRECAUTIONS),
      _txt('pp_date', 'Date de début de pesée', 'date', true),
      _txt('pp_salle', 'N° de salle de pesée'),
      _txt('pp_heure', 'Heure de début'),
      _num('pp_temp', 'Température de la salle', '°C', 15, 25, true),
      _num('pp_hr', 'Humidité relative', '%', null, 60, true),
      _num('pp_dp', 'Différentiel de pression (ΔP)', 'mmH₂O', 1, null, true),
      _chk('pp_vl', 'Vide de ligne — autorisation de démarrage', 'cnc', [
        'Instructions générales',
        'Consignes de sécurité',
        'Conditions environnementales',
        'Nettoyage local & équipements'
      ]),
      _chk('pp_prelim', 'Vérification préliminaire', 'oui', [
        "Présence de tous les documents de l'instruction de fabrication",
        'Habillage spécifique / réglementaire du personnel',
        'Aptitude hygiène du personnel vérifiée (selon procédure)'
      ]),
      _txt('pp_sup_visa', 'Démarrage autorisé — Superviseur Fabrication (date / heure / visa)'),
      _txt('pp_aq_visa', 'Démarrage autorisé — AQ Process (date / heure / visa)')
    ], 2),
    _sec('p_net', '2 · Vérification du nettoyage (étiquettes « nettoyé »)', [
      _chk('net_chk', 'Étiquettes « nettoyé » collées', 'oui', [
        'Salle de pesée',
        'Flux laminaire',
        'Balances',
        'Matériels de pesée'
      ]),
      _txt('net_visa', 'Vérifié par — Date & Visa')
    ], 2),
    _sec('p_ope', '3 · Liste des opérateurs de pesée', [
      _tab('ope_tab', 'Opérateurs — Shift 01 : 06-14h · 02 : 14-22h · 03 : 22-06h', [
        _ct('op_shift', 'N° Shift'),
        _ct('op_poste', 'Poste'),
        _ct('op_nom', 'Nom & prénom'),
        _ct('op_date', 'Date'),
        _ct('op_visa', 'Visa'),
        _ct('op_verif', 'Vérifié par (Date & Visa)')
      ])
    ]),
    _sec('p_equip', '4 · Vérification des équipements de pesée', [
      _chk('eq_chk', 'Balances — contrôles à vide / qualification / parties vitrées', 'cnc', [
        'Balance Mettler Toledo MS 3200LL/01 (PR042) — Fonctionnement à vide',
        'PR042 — Statut qualification / calibration',
        'PR042 — État des parties vitrées',
        'Balance de pesée Mettler Toledo (PR325) — Fonctionnement à vide',
        'PR325 — Statut qualification / calibration',
        'PR325 — État des parties vitrées'
      ]),
      _txt('eq_visa', 'Fait par / Vérifié par — Date & Visa')
    ], 2),
    _sec('p_etal', '5 · Vérification de l\'étalonnage des balances', [
      _chk('etal_chk', 'Calibrage journalier effectué', 'oui', [
        'Balance PR042',
        'Balance PR325'
      ]),
      _txt('etal_visa', 'Vérifié par — Date & Visa')
    ], 2),
    _sec('p_cond', '6 · Conditions T° / HR / ΔP au cours du process', [
      _tab('cond_tab', 'Relevés — début / milieu / fin de chaque shift (ΔP systématique)', [
        _ct('co_date', 'Date'),
        _ct('co_moment', 'Moment (Début/Milieu/Fin)'),
        _ct('co_heure', 'Heure'),
        _cn('co_t', 'Température', '°C', 15, 25),
        _cn('co_hr', 'Humidité', '%', null, 60),
        _cn('co_dp', 'ΔP', 'mmH₂O', 1, null),
        _ct('co_salle', 'N° salle'),
        _ct('co_visa', 'Visa')
      ])
    ]),
    _sec('p_recint', '7 · Réception des matières premières — retour interne', [
      _tab('recint_tab', 'Matières (retour interne) — 7 articles de la formule', [
        _ct('ri_art', 'Article'),
        _ct('ri_code', 'Code interne'),
        _ct('ri_lot', 'N° lot interne'),
        _cn('ri_qte', 'Quantité de retour', 'kg'),
        _coo('ri_etiq', 'Étiquette retour présente'),
        _ct('ri_visa', 'Vérifié par (Date & Visa)')
      ])
    ]),
    _sec('p_recext', '8 · Réception des matières premières — externe', [
      _tab('recext_tab', 'Matières (réception externe)', [
        _ct('re_art', 'Article'),
        _ct('re_code', 'Code interne'),
        _ct('re_lot', 'N° lot interne'),
        _coo('re_int', 'Contenant intègre / scellé / identifié'),
        _coo('re_etiq', 'Étiquette « accepté » présente'),
        _cn('re_cmd', 'Quantité commandée', 'kg'),
        _cn('re_liv', 'Quantité livrée', 'kg'),
        _ct('re_visa', 'Vérifié par (Date & Visa)')
      ])
    ]),
    _sec('p_pa', '9 · Pesée des principes actifs', [
      _txt('pa_hdeb', 'Heure de début de pesée'),
      _txt('pa_des', 'Désignation du principe actif'),
      _txt('pa_lot', 'N° de lot interne du PA'),
      _txt('pa_bal', 'Code balance utilisée'),
      _num('pa_theo', 'Quantité théorique corrigée A (à peser)', 'kg'),
      _num('pa_g', 'Pesée globale G', 'kg'),
      _num('pa_t', 'Tare T', 'kg'),
      _num('pa_n', 'Pesée nette N', 'kg'),
      _num('pa_b', 'Double pesée B (contrôle)', 'kg'),
      _txt('pa_visa', 'Fait par / Vérifié par — Date & Visa'),
      _txt('pa_hfin', 'Heure de fin de pesée'),
      _oo('pa_stock', 'Stockage API conforme (double sac PE + gel de silice, fût inox fermé)')
    ], 2),
    _sec('p_exc', '10 · Pesée des excipients', [
      _tab('exc_tab', 'Excipients — une ligne par excipient ; renseigner la quantité théorique (kg/lot) selon la formule du produit', [
        _ct('ex_des', 'Désignation'),
        _ct('ex_code', 'Code interne'),
        _ct('ex_lot', 'N° lot'),
        _cn('ex_theo', 'Qté théorique / lot', 'kg'),
        _cn('ex_net', 'Qté pesée nette N', 'kg'),
        _cn('ex_double', 'Double pesée B', 'kg'),
        _ct('ex_visa', 'Fait par / Vérifié par')
      ])
    ]),
    _sec('p_bilan', '11 · Bilan de pesée', [
      _chk('bil_docs', 'Documents joints', 'oui', [
        'Bon de commande',
        'Bon de retours interne',
        'Bon de retour final',
        "Bon d'avarie"
      ]),
      _tab('bil_tab', 'Bilan matières', [
        _ct('bl_mat', 'Matière'),
        _ct('bl_code', 'Code interne'),
        _ct('bl_lot', 'N° lot interne'),
        _cn('bl_liv', 'Qté totale livrée', 'kg'),
        _cn('bl_pes', 'Qté pesée', 'kg'),
        _cn('bl_reti', 'Qté retournée interne', 'kg'),
        _cn('bl_retf', 'Qté retournée final', 'kg'),
        _cn('bl_av', 'Qté avariée', 'kg'),
        _ct('bl_visa', 'Date & Visa Superviseur')
      ]),
      _note('bil_rnote', 'Rendement de la pesée (automatique)', 'Saisir le poids théorique total à peser (P_th) et le poids total réellement pesé (P_pesé) : l\'avarie et le rendement se calculent automatiquement. La norme de rendement est indicative (modifiable via le Constructeur).'),
      _num('bil_pth', 'Poids théorique total à peser (P_th)', 'kg'),
      _num('bil_ppes', 'Poids total pesé (P_pesé)', 'kg'),
      _calc('bil_av', 'Avarie engendrée = P_th − P_pesé', '{bil_pth} - {bil_ppes}', 'kg'),
      _calc('bil_rdt', 'Rendement de la pesée = P_pesé × 100 / P_th', '{bil_ppes} * 100 / {bil_pth}', '%', 99, 100),
      _txt('bil_visa', 'Date / Visa Responsable Fabrication')
    ], 2),
    _sec('p_inc', '12 · Suivi des incidents et arrêts', [
      _tab('inc_tab', 'Incidents / arrêts', [
        _ct('in_date', 'Date'),
        _ct('in_harr', "Heure d'arrêt"),
        _ct('in_sac', 'N° de sac'),
        _ct('in_motif', 'Motif'),
        _ct('in_action', 'Action corrective'),
        _ct('in_ddem', 'Date de démarrage'),
        _ct('in_hdem', 'Heure de démarrage'),
        _ct('in_visa', 'Fait par (Visa)')
      ])
    ])
]

// =====================================================================
//  Phase TAMISAGE & MÉLANGE (IF PFLDM103, pages 25-41) — mêmes spéc. site
//  (T° 15-25 °C, HR ≤60 %, ΔP ≥1 mmH₂O ; humidité résiduelle < 3 %).
// =====================================================================
const SECTIONS_TM = [
  _sec('tm_prelim', '1 · Opérations préliminaires & autorisation de démarrage', [
    _note('tm_instr', 'Opérations préliminaires — vérifications avant démarrage', `• Vide de ligne : machines et locaux libérés des matériaux et documents du produit précédent (selon check-list vide de ligne).
• Nettoyage des équipements et locaux vérifié ; étiquettes de nettoyage et logs book renseignés.
• Local et machine identifiés (fiches « utilisation salle » et « utilisation machine »).
• Nettoyage des pièces mobiles vérifié ; étiquettes « Nettoyé » jointes à l'IF.
• Vérification journalière des balances effectuée.
• Propreté et intégrité des contenants MP réceptionnés vérifiées.
• Conditions d'ambiance du local vérifiées : température (°C), HR (%), ΔP.
• Attendre l'autorisation AQ avant de procéder au tamisage et mélange.`),
    _txt('tm_date', 'Date de début', 'date', true),
    _txt('tm_salle', 'N° de salle'),
    _txt('tm_heure', 'Heure de début'),
    _num('tm_temp', 'Température de la salle', '°C', 15, 25, true),
    _num('tm_hr', 'Humidité relative', '%', null, 60, true),
    _num('tm_dp', 'Différentiel de pression (ΔP)', 'mmH₂O', 1, null, true),
    _chk('tm_vl', 'Vide de ligne — autorisation de démarrage', 'cnc', [
      'Instructions générales', 'Consignes de sécurité', 'Conditions environnementales', 'Nettoyage local & équipements'
    ]),
    _chk('tm_prel', 'Vérification préliminaire', 'oui', [
      "Présence de tous les documents de l'instruction de fabrication",
      'Habillage spécifique / réglementaire du personnel',
      'Aptitude hygiène du personnel vérifiée (selon procédure)'
    ]),
    _txt('tm_sup', 'Démarrage autorisé — Superviseur Fabrication (date / heure / visa)'),
    _txt('tm_aq', 'Démarrage autorisé — AQ Process (date / heure / visa)')
  ], 2),
  _sec('tm_net', '2 · Vérification du nettoyage (étiquettes « nettoyé »)', [
    _chk('tmnet_chk', 'Étiquettes « nettoyé » collées', 'oui', ['Salle de mélange', 'Équipements', 'Pièces mobiles']),
    _pj('tmnet_pj', 'Étiquettes « nettoyé » (scan)'),
    _txt('tmnet_visa', 'Vérifié par — Date & Visa')
  ], 2),
  _sec('tm_ope', '3 · Liste des opérateurs de tamisage & mélange', [
    _tab('tmope_tab', 'Opérateurs — Shift 01 : 06-14h · 02 : 14-22h · 03 : 22-06h', [
      _ct('tmop_shift', 'N° Shift'), _ct('tmop_poste', 'Poste'), _ct('tmop_nom', 'Nom & prénom'),
      _ct('tmop_date', 'Date'), _ct('tmop_visa', 'Visa'), _ct('tmop_verif', 'Vérifié par (Date & Visa)')
    ])
  ]),
  _sec('tm_equip', '4 · Vérification des équipements utilisés', [
    _chk('tmeq_chk', 'Équipements — qualification/calibration & parties vitrées', 'cnc', [
      'Mélangeur en V MAKINA 100L (PR210) — Qualification / calibration',
      'PR210 — État des parties vitrées',
      'Mélangeur en V MPY 400 (PR032) — Qualification / calibration',
      'PR032 — État des parties vitrées',
      'Calibreur CPS Line (PR036/PR097) — Qualification / calibration',
      'PR036/PR097 — État des parties vitrées',
      'Kevin super mill (PR310/PR311) — Qualification / calibration',
      'PR310/PR311 — État des parties vitrées'
    ]),
    _txt('tmeq_visa', 'Fait par / Vérifié par — Date & Visa')
  ], 2),
  _sec('tm_etal', "5 · Vérification de l'étalonnage des balances", [
    _tab('tmetal_tab', 'Balances — calibrage', [
      _ct('tmet_bal', 'Balance'), _ct('tmet_code', 'Code'), _coo('tmet_cal', 'Calibrage effectué'),
      _ct('tmet_date', 'Date'), _ct('tmet_visa', 'Date & Visa')
    ])
  ]),
  _sec('tm_cond', '6 · Conditions T° / HR / ΔP au cours du process', [
    _tab('tmcond_tab', 'Relevés — tous les 30 min pendant le mélange', [
      _ct('tmco_date', 'Date'), _ct('tmco_heure', 'Heure'),
      _cn('tmco_t', 'Température', '°C', 15, 25), _cn('tmco_hr', 'Humidité', '%', null, 60), _cn('tmco_dp', 'ΔP', 'mmH₂O', 1, null),
      _ct('tmco_salle', 'N° salle'), _ct('tmco_visa', 'Visa')
    ])
  ]),
  _sec('tm_rec', '7 · Réception des matières', [
    _note('tmrec_note', 'Réception', "Vérifier l'intégrité des contenants réceptionnés. La vérification doit être effectuée avant le début du processus de mélange."),
    _tab('tmrec_tab', 'Matières (articles de la formule)', [
      _ct('tmre_art', 'Matière'), _ct('tmre_code', 'Code interne'), _ct('tmre_lot', 'N° lot interne'),
      _coo('tmre_int', 'Contenant intègre / scellé / identifié'), _coo('tmre_etiq', 'Étiquette pesée présente'),
      _cn('tmre_theo', 'Qté théorique', 'kg'), _cn('tmre_liv', 'Qté livrée', 'kg'), _ct('tmre_visa', 'Vérifié par')
    ]),
    _num('tmrec_tot', 'Quantité totale', 'kg')
  ]),
  _sec('tm_vfonc', "8 · Vérification du fonctionnement de l'équipement avant mélange", [
    _txt('tmvf_date', 'Date de début', 'date'), _txt('tmvf_heure', 'Heure'),
    _chk('tmvf_chk', 'Fonctionnement à vide des équipements', 'cnc', [
      'Mélangeur en V MAKINA 100L (PR210)', 'Mélangeur en V MPY 400 (PR032)',
      'Calibreur CPS Line (PR036/PR097)', 'Kevin super mill (PR310/PR311)'
    ]),
    _txt('tmvf_visa', 'Fait par / Vérifié par — Date & Visa')
  ], 2),
  _sec('tm_m01', '9 · Mélange 01 — Mélangeur en V MAKINA 100L (PR210)', [
    _txt('tmm01_date', 'Date de début', 'date'), _txt('tmm01_heure', 'Heure de début'),
    _chk('tmm01_mat', 'Matières transférées', 'oui', ['Rosuvastatine calcium', 'Crospovidone (POLYPLASDONE XL)']),
    _chk('tmm01_op', 'Avant démarrage & mélange', 'oui', [
      'Fermeture des vannes du mélangeur', 'Fermeture des dispositifs de sécurité', 'Mélangeur actionné 10 min à 10 RPM'
    ]),
    _txt('tmm01_deb', 'Début du mélange (heure)'), _txt('tmm01_fin', 'Fin du mélange (heure)'), _num('tmm01_duree', 'Durée réelle du mélange', 'min')
  ], 2),
  _sec('tm_tam', '10 · Tamisage (tamis 0,8 mm)', [
    _note('tmtam_note', 'Tamisage', 'Vérifier visuellement le tamis avant le lancement. Procéder au tamisage du Mélange 01 avec un tamis de 0,8 mm.'),
    _oo('tmtam_ok', 'Tamisage du Mélange 01 réalisé'),
    _num('tmtam_maille', 'Ouverture de maille du tamis (consigne 0,8)', 'mm'),
    _num('tmtam_vit', 'Vitesse du calibreur (consigne 800)', 'RPM'),
    _txt('tmtam_deb', 'Heure de début'), _txt('tmtam_fin', 'Heure de fin'), _num('tmtam_duree', 'Durée du tamisage', 'min'),
    _txt('tmtam_visa', 'Date & Visa Opérateur / Superviseur')
  ], 2),
  _sec('tm_m02', '11 · Mélange 02 — Mélangeur en V MPY 400 (PR032)', [
    _txt('tmm02_date', 'Date de début', 'date'), _txt('tmm02_heure', 'Heure de début'),
    _chk('tmm02_mat', "Matières transférées (dans l'ordre)", 'oui', [
      'Mélange 01', 'Cellulose microcristalline PH102', 'Lactose monohydrate (Flowlac 100)', 'Calcium phosphate tribasic'
    ]),
    _chk('tmm02_op', 'Avant démarrage & mélange', 'oui', [
      'Fermeture des vannes du mélangeur', 'Fermeture des dispositifs de sécurité', 'Mélangeur actionné 20 min à 10 RPM'
    ]),
    _txt('tmm02_deb', 'Début du mélange (heure)'), _txt('tmm02_fin', 'Fin du mélange (heure)'), _num('tmm02_duree', 'Durée réelle du mélange', 'min')
  ], 2),
  _sec('tm_mf', '12 · Mélange final — Lubrification (MPY 400 PR032)', [
    _txt('tmmf_date', 'Date de début', 'date'), _txt('tmmf_heure', 'Heure de début'),
    _chk('tmmf_mat', 'Matières transférées', 'oui', ['Mélange 02', 'Stéarate de magnésium (LIGAMED MF-2-V)']),
    _chk('tmmf_op', 'Avant démarrage & mélange', 'oui', [
      'Fermeture des vannes du mélangeur', 'Fermeture des dispositifs de sécurité', 'Mélangeur actionné 5 min à 10 RPM'
    ]),
    _txt('tmmf_deb', 'Début du mélange (heure)'), _txt('tmmf_fin', 'Fin du mélange (heure)'), _num('tmmf_duree', 'Durée réelle du mélange', 'min'),
    _pj('tmmf_ticket', 'Ticket de pesée du mélange final (scan)')
  ], 2),
  _sec('tm_ipc', '13 · Contrôle IPC — humidité résiduelle (fin de mélange)', [
    _note('tmipc_note', 'Contrôle IPC humidité résiduelle', "Prélever 5 g du granulé. Transférer à l'AQ IPC : dessiccateur IR à 105 °C, mode auto. Attendre le résultat IPC avant de poursuivre. Joindre la Fiche IPC à l'IF."),
    _num('tmipc_hum', 'Humidité résiduelle du granulé', '%', null, 3),
    _txt('tmipc_visa', 'Visa AQ IPC — Date et Heure'),
    _pj('tmipc_pj', 'Fiche IPC humidité (scan)')
  ], 2),
  _sec('tm_cq', '14 · Contrôle du mélange (CQ) & fin', [
    _ooi('tmcq_req', "Contrôle du mélange (CQ) requis ? (si Oui : demande d'échantillonnage réf. CQ-007)"),
    _ooi('tmcq_bloq', 'Analyse bloquante ? (si Oui : attendre les résultats avant la compression)'),
    _txt('tmcq_obs', 'Observation'),
    _txt('tmcq_fin', 'Fin — Date / Heure / Fait par / Vérifié par')
  ], 2),
  _sec('tm_fiches', '15 · Fiches utilisation (salle / machine)', [
    _pj('tmf_salle', 'Fiche utilisation salle (scan)'),
    _pj('tmf_machine', 'Fiche utilisation machine (scan)'),
    _txt('tmf_visa', 'Vérifié par — Date & Visa')
  ], 2),
  _sec('tm_bilan', '16 · Bilan de la phase tamisage & mélange (rendement)', [
    _note('tmbil_note', 'Calcul du rendement (automatique)', 'Saisir P_th, P_mél et C_mél : l\'avarie A₂ et le rendement R2 se calculent automatiquement.\nA₂ = P_th − (P_mél + C_mél) ; R2 (%) = (P_mél + C_mél) × 100 / P_th. Norme du rendement : 99–100 %.'),
    _num('tmbil_pth', 'Poids théorique du mélange (P_th)', 'kg'),
    _num('tmbil_pmel', 'Poids du mélange obtenu (P_mél)', 'kg'),
    _num('tmbil_cmel', 'Poids échantillon de contrôle (C_mél)', 'kg'),
    _calc('tmbil_av', 'Avarie engendrée (A₂) = P_th − (P_mél + C_mél)', '{tmbil_pth} - ({tmbil_pmel} + {tmbil_cmel})', 'kg'),
    _calc('tmbil_rdt', 'Rendement R2 = (P_mél + C_mél) × 100 / P_th', '({tmbil_pmel} + {tmbil_cmel}) * 100 / {tmbil_pth}', '%', 99, 100),
    _txt('tmbil_just', 'Justification de toute avarie hors normes'),
    _txt('tmbil_visa', 'Date / Visa Responsable Fabrication')
  ], 2),
  _sec('tm_inc', '17 · Suivi des incidents et arrêts', [
    _tab('tminc_tab', 'Incidents / arrêts', [
      _ct('tmin_date', 'Date'), _ct('tmin_harr', "Heure d'arrêt"), _ct('tmin_sac', 'N° de sac'),
      _ct('tmin_motif', 'Motif'), _ct('tmin_action', 'Action corrective'),
      _ct('tmin_ddem', 'Date de démarrage'), _ct('tmin_hdem', 'Heure de démarrage'), _ct('tmin_visa', 'Fait par (Visa)')
    ])
  ])
]

// =====================================================================
//  Phase COMPRESSION (IF PFLDM103, pages 42-71) — modélisée à l'identique.
//  Spéc. site : T° 15-25 °C, HR ≤60 %, ΔP ≥1 mmH₂O. Comprimeuse FETTE 1200i.
//  Comprimé cible 150,00 mg · masse moyenne 145,50-154,50 mg · dureté 4-15 Kp.
//  Section 24 : rendement AUTOMATIQUE (P_mél sec.10, P_CP sec.23, MMS sec.18).
// =====================================================================
const SECTIONS_COMPRESSION = [
  _sec('cp_prelim', '1 · Opérations préliminaires & autorisation de démarrage', [
    _note('cpp_instr', 'Opérations préliminaires — vérifications avant démarrage', `• Vide de ligne : machines et locaux libérés des matériaux et documents du produit précédent (selon check-list vide de ligne).
• Nettoyage des équipements et locaux vérifié ; étiquettes de nettoyage et logs book renseignés.
• Local et machine identifiés (fiches « utilisation salle » et « utilisation machine ») ; étiquettes « Nettoyé » et « Utilisation salle » collées.
• Nettoyage des pièces mobiles vérifié ; étiquettes « Nettoyé » jointes à l'IF.
• Vérification journalière des balances effectuée.
• Propreté et intégrité des contenants MP réceptionnés vérifiées.
• Conditions d'ambiance du local vérifiées : température (°C), HR (%), ΔP.
• En cas d'anomalies : stopper l'opération, alerter le responsable, reporter l'évènement sur la fiche incidents.
• Attendre l'autorisation AQ avant de procéder à la compression.`),
    _note('cpp_secu', 'Consignes de sécurité obligatoires', TXT_SECURITE),
    _note('cpp_prec', 'Précautions de production', TXT_PRECAUTIONS),
    _txt('cpp_date', 'Date de début de compression', 'date', true),
    _txt('cpp_salle', 'N° de salle de compression'),
    _txt('cpp_heure', 'Heure de début'),
    _num('cpp_temp', 'Température de la salle', '°C', 15, 25, true),
    _num('cpp_hr', 'Humidité relative', '%', null, 60, true),
    _num('cpp_dp', 'Différentiel de pression (ΔP)', 'mmH₂O', 1, null, true)
  ], 2),
  _sec('cp_net', '2 · Vérification du nettoyage des équipements et locaux', [
    _note('cnet_note', 'Étiquettes de nettoyage', 'Remplacer les étiquettes « Nettoyé » salle et machine par les fiches « utilisation salle » et « utilisation machine ». Coller les étiquettes « Nettoyée » dans l\'instruction de fabrication.'),
    _chk('cnet_chk', 'Étiquettes « nettoyé » collées', 'oui', ['Salle de compression', 'Équipements', 'Pièces mobiles']),
    _pj('cnet_pjsalle', 'Étiquette nettoyée de la salle de compression (scan)'),
    _pj('cnet_pjequip', 'Étiquettes nettoyée des équipements (scan)'),
    _pj('cnet_pjmob', 'Étiquettes nettoyée des pièces mobiles (scan)'),
    _txt('cnet_visa', 'Vérifié par — Date & Visa')
  ], 2),
  _sec('cp_env', '3 · Conditions environnementales avant démarrage', [
    _note('cenv_note', 'Contrôle T° / HR / ΔP', 'Relever les données avant démarrage de la compression.'),
    _tab('cenv_tab', 'Contrôle de la température, de l\'humidité relative et de la différence de pression', [
      _ct('cen_etape', 'Étape'), _ct('cen_salle', 'N° salle'), _ct('cen_heure', 'Heure'),
      _cn('cen_t', 'T°C [15-25]', '°C', 15, 25), _cn('cen_hr', 'HR% ≤ 60', '%', null, 60), _cn('cen_dp', 'ΔP ≥ 1', 'mmH₂O', 1, null),
      _ct('cen_vop', 'Date/Visa Opérateur'), _ct('cen_vverif', 'Date/Visa Vérificateur')
    ])
  ]),
  _sec('cp_autor', '4 · Autorisation de démarrage de la compression', [
    _chk('caut_chk', 'Vide de ligne — conformité (joindre la checklist vide de ligne à l\'IF)', 'cnc', [
      'Instructions générales', 'Consignes de sécurité', 'Conditions environnementales', 'Nettoyage local et équipements'
    ]),
    _txt('caut_sup', 'Démarrage autorisé — Superviseur Fabrication (date / heure / visa)'),
    _txt('caut_aq', 'Démarrage autorisé — AQ Process (date / heure / visa)')
  ], 2),
  _sec('cp_vprel', '5 · Vérification préliminaire', [
    _chk('cvpr_chk', 'Vérifications à effectuer', 'oui', [
      'Présence de tous les documents de l\'instruction de fabrication',
      'Habillage spécifique / réglementaire du personnel',
      'Absence de plaies ouvertes ou maladies contagieuses chez le personnel'
    ]),
    _txt('cvpr_visa', 'Date / Visa')
  ], 2),
  _sec('cp_ope', '6 · Liste des opérateurs de compression', [
    _tab('cope_tab', 'Opérateurs — Shift 01 : 06-14h · 02 : 14-22h · 03 : 22-06h', [
      _ct('cop_shift', 'N° Shift'), _ct('cop_poste', 'Poste'), _ct('cop_nom', 'Nom & prénom'),
      _ct('cop_date', 'Date'), _ct('cop_visa', 'Visa'), _ct('cop_verif', 'Vérifier par (Date & Visa)')
    ])
  ]),
  _sec('cp_equip', '7 · Vérification des équipements utilisés', [
    _note('cequ_note', 'Équipements de compression', 'Comprimeuse FETTE 1200i (PR057 / PR012 / PR205) · Dépoussiéreur (PR013/01 · PR013/02 · PR301) · Détecteur de métaux (PR301-a · PR057-a · PR205-a) · Chaîne élévatrice (PR010 · PR231 · PR232). Statuts : C / NC / NA.'),
    _tab('cequ_tab', 'Équipements — qualification/calibration & parties vitrées', [
      _ct('ceq_nom', 'Équipement'), _ct('ceq_code', 'Code'),
      _ccnc('ceq_qual', 'Statut qualification / calibration'), _ccnc('ceq_vitr', 'État des parties vitrées'),
      _ct('ceq_fait', 'Fait par / Date & Visa'), _ct('ceq_verif', 'Vérifié par / Date & Visa'), _ct('ceq_obs', 'Observation')
    ])
  ]),
  _sec('cp_etal', '8 · Vérification de l\'étalonnage des balances', [
    _tab('cetal_tab', 'Balances — calibrage', [
      _ct('cet_bal', 'Balance'), _ct('cet_code', 'Code'), _coo('cet_cal', 'Calibrage effectué'),
      _ct('cet_date', 'Date'), _ct('cet_vop', 'Date/Visa Opérateur'), _ct('cet_vverif', 'Date/Visa Vérificateur'), _ct('cet_obs', 'Observation')
    ])
  ]),
  _sec('cp_cond', '9 · Conditions T°C / ΔP / HR% au cours du process', [
    _note('ccond_note', 'Fréquence', 'Relever les données toutes les 30 min pendant la compression.'),
    _tab('ccond_tab', 'Relevés en cours de compression', [
      _ct('cco_date', 'Date'), _ct('cco_heure', 'Heure'),
      _cn('cco_t', 'Température 15≤T≤25', '°C', 15, 25), _cn('cco_hr', 'Humidité ≤60', '%', null, 60), _cn('cco_dp', 'ΔP ≥1', 'mmH₂O', 1, null),
      _ct('cco_salle', 'N° salle'), _ct('cco_fait', 'Fait par / Visa'), _ct('cco_verif', 'Vérifié par / Date & Visa')
    ])
  ]),
  _sec('cp_recmel', '10 · Réception du mélange finale', [
    _note('crec_note', 'Réception', 'Vérifier l\'intégrité des contenants réceptionnés. La vérification doit être effectuée avant le début du processus de compression.'),
    _tab('crec_tab', 'Mélange final réceptionné', [
      _ct('cre_mat', 'Matière'), _ct('cre_lot', 'N° lot Produit Fini'),
      _coo('cre_int', 'Contenant intègre scellé et identifié'), _coo('cre_etiq', 'Présence étiquette pesée'),
      _cn('cre_qte', 'Quantité livrée', 'kg'), _ct('cre_fait', 'Fait par / Date & Visa'), _ct('cre_verif', 'Vérifié par / Date & Visa')
    ]),
    _num('crec_pmel', 'Quantité Totale reçue (P_mél)', 'kg')
  ]),
  _sec('cp_vfonc', '11 · Vérification du fonctionnement de l\'équipement avant compression', [
    _txt('cvf_date', 'Début — Date', 'date'), _txt('cvf_heure', 'Heure'),
    _note('cvf_note', 'Fonctionnement à vide', 'Comprimeuse FETTE 1200i · Dépoussiéreur · Détecteur de métaux · Chaîne élévatrice (codes section 7).'),
    _tab('cvf_tab', 'Fonctionnement à vide des équipements', [
      _ct('cvf_nom', 'Équipement'), _ct('cvf_code', 'Code'), _ccnc('cvf_fonc', 'Fonctionnement à vide'),
      _ct('cvf_fait', 'Fait par / Date'), _ct('cvf_verif', 'Vérifié par / Date'), _ct('cvf_obs', 'Observation')
    ])
  ]),
  _sec('cp_detmet', '12 · Vérification de la sensibilité du détecteur de métaux', [
    _note('cdet_note', 'Mode opératoire', `Fréquence : à chaque démarrage de compression.
Faire passer une par une les 3 billes tests dans le détecteur de métaux :
1- NFE 0,5 mm : métaux non ferreux
2- FE 0,3 mm : métaux ferreux
3- SS 304 0,5 mm : inox (stainless steel)
Norme : rejet des billes par le détecteur. En cas de non-rejet d'une bille, noter NC dans « Résultat » et prévenir l'agent de maîtrise.`),
    _tab('cdet_tab', 'Résultat du test (bille éjectée par le détecteur)', [
      _ct('cde_test', 'Test (NFE / FE / SS 304)'), _coo('cde_res', 'Bille éjectée'), _ct('cde_fait', 'Fait par')
    ]),
    _txt('cdet_sup', 'Superviseur Fabrication — Date / Heure / Visa')
  ]),
  _sec('cp_poincon', '13 · Poinçons avant montage & sensibilité du système d\'éjection', [
    _tab('cpoi_tab', 'Vérification des poinçons avant montage', [
      _ct('cpo_param', 'Paramètre'), _ct('cpo_spec', 'Spécification'), _ccnc('cpo_conf', 'Conformité'),
      _ct('cpo_fait', 'Fait par'), _ct('cpo_verif', 'Vérifié par')
    ]),
    _note('cpoi_note', 'Spécifications poinçons', 'Dimensions : Diamètre 7 mm · Aspect : rond concave sans trait de sécabilité sur les deux faces · Came de sur-remplissage : 8 mm.'),
    _note('cpoi_ej', 'Sensibilité du système d\'éjection de la comprimeuse', `Fréquence : à chaque démarrage de la compression du 1er lot de campagne ; après intervention maintenance ou réglage ayant une répercussion sur la barrette d'éjection.
Critère d'acceptabilité : la machine affiche un surpassement de force de compression durant tout le test sur le poste modifié ; tous les comprimés non conformes du poste modifié doivent être éjectés.
Vérifier à chaque démarrage de campagne que le nombre de postes actifs sur le panel correspond au nombre de poinçons présents sur tourelle.`),
    _num('cpoi_postes', 'Nombre de postes actifs', ''),
    _tab('cpoi_ejtab', 'Test d\'éjection', [
      _ct('cpe_dh', 'Date et heure'), _ct('cpe_motif', 'Motif du test'), _ct('cpe_poste', 'N° du poste utilisé'),
      _ct('cpe_vit', 'Vitesse tourelle au test'), _ccnc('cpe_res', 'Résultats'), _ct('cpe_fait', 'Fait par')
    ]),
    _txt('cpoi_sup', 'Superviseur Fabrication — Date / Heure / Visa')
  ]),
  _sec('cp_demarr', '14 · Démarrage du processus — réglage des paramètres de compression', [
    _num('cdm_fc', 'Force de compression', 'kN', 5.0, 6.0),
    _num('cdm_fpc', 'Force de pré-compression', 'kN', 1.5, 3.0),
    _num('cdm_vit', 'Vitesse fill-o-matic', 'RPM', 30, 50),
    _num('cdm_htc', 'Hauteur tranche compression', 'mm', 1.8, 2.9),
    _num('cdm_htpc', 'Hauteur tranche pré-compression', 'mm', 1.5, 4.0),
    _num('cdm_vol', 'Volume de remplissage', 'mm', 6.0, 8.0),
    _num('cdm_cad', 'Cadence', 'x1000 cps/h', 50, 70),
    _num('cdm_srel', 'S-rel', '%', null, 10),
    _txt('cdm_fait', 'Fait par / Vérifié par — Date & Visa')
  ], 2),
  _sec('cp_physiq', '15 · Paramètres physiques du comprimé & montage des poinçons', [
    _note('cph_spec', 'Spécifications du comprimé', 'Masse cible : 150,00 mg · Forme : comprimé blanc rond biconvexe sans trait de sécabilité sur les deux faces · Épaisseur : 3,5–3,8 mm · Couleur : blanc · Dureté : 4–15 Kp · Diamètre : 7 mm · Friabilité : ≤ 1 % de perte de masse, pas de comprimé cassé · Désagrégation : ≤ 15 min · Configuration des pales : hélice carrée.'),
    _note('cph_lanc', 'Lancement de la compression', 'Vérifier le montage et l\'intégrité des poinçons en prélevant la production de 10 tours successifs de la machine. Contrôler l\'absence de défauts de forme dus à un poinçon défectueux. Faire les contrôles physiques des comprimés au lancement.'),
    _chk('cph_chk', 'Contrôle au montage', 'cnc', ['Montage des poinçons', 'Intégrité des poinçons', 'Absence de défauts de forme']),
    _txt('cph_fait', 'Fait par / Vérifié par — Date & Visa')
  ]),
  _sec('cp_lanc', '16 · Contrôle des comprimés au lancement', [
    _note('cla_note', 'Échantillonnage', 'Prélever 71 comprimés : aspect (21), épaisseur Min–Max (21), masse moyenne (20), masse individuelle/uniformité (20), dureté (21), friabilité (44), désagrégation (06). Reporter les résultats ci-dessous et attendre l\'autorisation de démarrage. Toute non-conformité impose un réglage machine et un nouveau lancement.'),
    _oc('cla_aspect', 'Aspect (blanc, rond, biconvexe ; sans points noirs, marbrures, bavures, collage, clivage)'),
    _num('cla_mm', 'Masse moyenne (20 cp)', 'mg', 145.5, 154.5),
    _num('cla_miMin', 'Masse individuelle — minimale observée', 'mg', 142.5, null),
    _num('cla_miMax', 'Masse individuelle — maximale observée', 'mg', null, 157.5),
    _num('cla_epMin', 'Épaisseur — minimale', 'mm', 3.5, null),
    _num('cla_epMax', 'Épaisseur — maximale', 'mm', null, 3.8),
    _num('cla_dur', 'Dureté', 'Kp', 4, 15),
    _num('cla_fm1', 'Friabilité — masse avant test M1', 'g'),
    _num('cla_fm2', 'Friabilité — masse après test M2', 'g'),
    _calc('cla_fri', 'Friabilité = (M1 − M2) × 100 / M1', '({cla_fm1} - {cla_fm2}) * 100 / {cla_fm1}', '%', null, 1),
    _num('cla_desag', 'Désagrégation', 'min', null, 15),
    _txt('cla_fait', 'Fait par / Vérifié par — Date & Visa')
  ], 2),
  _sec('cp_autor2', '17 · Autorisation de démarrage de la compression', [
    _note('cau2_note', 'Démarrage de la compression autorisé', 'Après contrôles de lancement conformes, le démarrage de la compression est autorisé.'),
    _txt('cau2_sup', 'Superviseur Fabrication — Date / Heure / Visa'),
    _txt('cau2_aq', 'AQ Process — Date / Heure / Visa'),
    _pj('cau2_pj', 'Étiquettes « identification » du produit vrac (scan)')
  ], 2),
  _sec('cp_ipcmm', '18 · Contrôle en cours de process — masse moyenne & aspect', [
    _note('cim_note', 'Masse moyenne — zones & MMS', `Contrôles toutes les 15 min (masse moyenne & aspect).
Zone de travail : 145,50 – 154,50 mg (cible 150,00 mg ± 3 %).
Zone de réglage : 142,50 mg (−5 %) à 157,50 mg (+5 %).
Zone d'arrêt : < 142,50 mg ou > 157,50 mg.
Masse moyenne statistique MMS = (M₁ + M₂ + … + Mᵢ) / n  (n = nombre de contrôles).`),
    _tab('cim_tab', 'Suivi masse moyenne & aspect (chaque 15 min)', [
      _ct('cim_heure', 'Heure'), _cn('cim_mm', 'Masse moyenne', 'mg', 145.5, 154.5), _coc('cim_aspect', 'Aspect'),
      _ct('cim_cont', 'Contenant N°'), _cn('cim_cad', 'Cadence (x1000 cp/h)', '', 50, 70),
      _ct('cim_fait', 'Fait par'), _ct('cim_verif', 'Vérifié par')
    ]),
    _num('cim_mms', 'Masse moyenne statistique MMS (fin de compression)', 'mg', 145.5, 154.5),
    _txt('cim_visa', 'Visa AQ Process')
  ]),
  _sec('cp_ipcep', '19 · Contrôle en cours de process — épaisseur', [
    _note('cie_note', 'Fréquence', 'Contrôles à chaque lancement, toutes les 30 min. Valeur unitaire : 3,5–3,8 mm (21 comprimés).'),
    _tab('cie_tab', 'Suivi épaisseur (chaque 30 min)', [
      _ct('cie_date', 'Date'), _ct('cie_heure', 'Heure'),
      _cn('cie_min', 'Épaisseur Min', 'mm', 3.5, null), _cn('cie_max', 'Épaisseur Max', 'mm', null, 3.8),
      _ct('cie_cont', 'Contenant N°'), _ct('cie_fait', 'Fait par')
    ]),
    _txt('cie_visa', 'Vérifié par — Date & Visa')
  ]),
  _sec('cp_nus', '20 · Réception des comprimés nus (CQ)', [
    _ooi('cnus_req', 'Contrôle des comprimés nus requis CQ ? (si Oui : demande d\'échantillonnage réf. CQ-SOP-007)'),
    _ooi('cnus_bloq', 'Analyse bloquante ? (si Oui : attendre les résultats avant le conditionnement)'),
    _txt('cnus_obs', 'Observation'),
    _txt('cnus_fin', 'Fin — Date / Heure / Fait par / Vérifié par')
  ], 2),
  _sec('cp_chall', '21 · Suivi des challenge test détecteur de métaux', [
    _note('cch_note', 'Fréquence', 'Contrôles en début, milieu et fin de compression. Billes : NFE 0,5 mm · FE 0,3 mm · SS 304 0,5 mm.'),
    _tab('cch_tab', 'Challenge test (début / milieu / fin)', [
      _ct('cch_moment', 'Moment (Début/Milieu/Fin)'), _ct('cch_dh', 'Date / Heure'), _ct('cch_test', 'Test (NFE/FE/SS)'),
      _coo('cch_res', 'Bille éjectée'), _ct('cch_fait', 'Fait par'), _ct('cch_verif', 'Vérifié par')
    ])
  ]),
  _sec('cp_inc', '22 · Suivi des incidents et des arrêts de la comprimeuse', [
    _tab('cinc_tab', 'Incidents / arrêts', [
      _ct('cin_date', 'Date'), _ct('cin_harr', 'Heure d\'arrêt'), _ct('cin_sac', 'N° saccueuse / contenant'),
      _ct('cin_motif', 'Motif'), _ct('cin_action', 'Action corrective'),
      _ct('cin_ddem', 'Date de démarrage'), _ct('cin_hdem', 'Heure de démarrage'), _ct('cin_visa', 'Fait par / Visa')
    ]),
    _txt('cinc_visa', 'Vérifié par / Visa — Date')
  ]),
  _sec('cp_bilan', '23 · Bilan de la compression', [
    _note('cbil_note', 'Bilan', 'Tarer le poids des sacs. Récupérer les comprimés dans des sacs PE propres (identifier chaque sac). Peser le sac + comprimés (poids brut). Poids net = brut − tare. Transférer chaque sac dans un fût propre identifié.'),
    _tab('cbil_tab', 'Bilan par fût', [
      _ct('cbi_fut', 'Fût N°'), _ct('cbi_sac', 'Sac N°'),
      _cn('cbi_tare', 'Tare', 'kg'), _cn('cbi_brute', 'Brute', 'kg'), _cn('cbi_net', 'Net', 'kg'),
      _ct('cbi_fait', 'Fait par'), _ct('cbi_verif', 'Vérifié par')
    ]),
    _num('cbil_pcp', 'P_CP — Total Net des comprimés obtenus', 'kg'),
    _pj('cbil_pj', 'Étiquette « identification in process » des produits intermédiaires (scan)')
  ]),
  _sec('cp_rdt', '24 · Calcul du rendement de la compression', [
    _note('crd_note', 'Rendement (automatique depuis les données enregistrées)', `Les poids sont repris automatiquement : P_mél (section 10 · réception), P_CP (section 23 · bilan) et MMS (section 18 · masse moyenne statistique). Masse moyenne théorique MM = 150,00 mg. Saisir uniquement C_ép (nombre de comprimés prélevés par le CQ). Norme de rendement : 95–100 %.`),
    _calc('crd_pmel', 'P_mél — poids du mélange reçu (rappel section 10)', '{crec_pmel}', 'kg'),
    _calc('crd_pcp', 'P_CP — poids des comprimés obtenus (rappel section 23)', '{cbil_pcp}', 'kg'),
    _calc('crd_mms', 'MMS — masse moyenne statistique (rappel section 18)', '{cim_mms}', 'mg'),
    _num('crd_ceap', 'C_ép — nombre de comprimés prélevés par le CQ', 'cp'),
    _calc('crd_ntheo', 'N_théo = P_mél × 10⁶ / MM (150 mg)', '{crec_pmel} * 1000000 / 150', 'cp'),
    _calc('crd_ncp', 'N_CP = P_CP × 10⁶ / MMS', '{cbil_pcp} * 1000000 / {cim_mms}', 'cp'),
    _calc('crd_a1', 'A₁ (avarie) = P_mél − P_CP − (C_ép × MMS × 10⁻⁶)', '{crec_pmel} - {cbil_pcp} - ({crd_ceap} * {cim_mms} / 1000000)', 'kg'),
    _calc('crd_a2', 'A₂ (avarie) = N_théo − N_CP − C_ép', '{crd_ntheo} - {crd_ncp} - {crd_ceap}', 'cp'),
    _calc('crd_rkg', 'Rendement (kg/kg) = (P_CP + C_ép × MMS × 10⁻⁶) × 100 / P_mél', '({cbil_pcp} + {crd_ceap} * {cim_mms} / 1000000) * 100 / {crec_pmel}', '%', 95, 100),
    _calc('crd_rcp', 'Rendement (CP/CP) = (N_CP + C_ép) × 100 / N_théo', '({crd_ncp} + {crd_ceap}) * 100 / {crd_ntheo}', '%', 95, 100),
    _chk('crd_docs', 'Documents à joindre', 'oui', ['Bon d\'avarie', 'Bon de prélèvement']),
    _txt('crd_visa', 'Date / Visa Responsable Fabrication')
  ], 2)
]

// =====================================================================
//  Phase PELLICULAGE (IF PFLDM103, pages 72-92) — modélisée à l'identique.
//  Pelliculeuse LABORTECNIC (PR024). Prémélange d'enrobage Aquapolish P pink
//  041.47 (MPEX0255) + eau purifiée. Comprimé pelliculé cible 154,50 mg,
//  gain de poids ~4,5 mg. Section 20 : rendement AUTOMATIQUE (P_cp réception,
//  P_cpl bilan, MMCP, C_ép) — norme 98-100 %.
// =====================================================================
const SECTIONS_PELLICULAGE = [
  _sec('pl_prelim', '1 · Opérations préliminaires & autorisation de démarrage', [
    _note('plp_instr', 'Opérations préliminaires — vérifications avant démarrage', `• Vide de ligne : machines et locaux libérés des matériaux et documents du produit précédent (selon check-list vide de ligne).
• Nettoyage des équipements et locaux vérifié ; étiquettes de nettoyage et logs book renseignés.
• Local et machine identifiés (fiches « utilisation salle » et « utilisation machine ») ; étiquettes « Nettoyé » et « Utilisation salle » collées.
• Nettoyage des pièces mobiles vérifié ; étiquettes « Nettoyé » jointes à l'IF.
• Vérification journalière des balances effectuée.
• Propreté et intégrité des contenants MP réceptionnés vérifiées.
• Conditions d'ambiance du local vérifiées : température (°C), HR (%), ΔP.
• En cas d'anomalies : stopper l'opération, alerter le responsable, reporter l'évènement sur la fiche incidents.
• Attendre l'autorisation AQ avant de procéder à l'étape de pelliculage.`),
    _note('plp_secu', 'Consignes de sécurité obligatoires', TXT_SECURITE),
    _note('plp_prec', 'Précautions de production', TXT_PRECAUTIONS),
    _txt('plp_date', 'Date de début de pelliculage', 'date', true),
    _txt('plp_salle', 'N° de salle de pelliculage'),
    _txt('plp_heure', 'Heure de début'),
    _num('plp_temp', 'Température de la salle', '°C', 15, 25, true),
    _num('plp_hr', 'Humidité relative', '%', null, 60, true),
    _num('plp_dp', 'Différentiel de pression (ΔP)', 'mmH₂O', 1, null, true)
  ], 2),
  _sec('pl_net', '2 · Vérification du nettoyage des équipements et locaux', [
    _note('plnet_note', 'Étiquettes de nettoyage', 'Remplacer les étiquettes « Nettoyé » salle et machine par les fiches « utilisation salle » et « utilisation machine ». Coller les étiquettes « Nettoyée » dans l\'instruction de fabrication.'),
    _chk('plnet_chk', 'Étiquettes « nettoyé » collées', 'oui', ['Salle de pelliculage', 'Équipements', 'Pièces mobiles']),
    _pj('plnet_pjsalle', 'Étiquette nettoyée de la salle de pelliculage (scan)'),
    _pj('plnet_pjequip', 'Étiquettes nettoyée des équipements (scan)'),
    _pj('plnet_pjmob', 'Étiquettes nettoyée des pièces mobiles (scan)'),
    _txt('plnet_visa', 'Vérifié par — Date & Visa')
  ], 2),
  _sec('pl_env', '3 · Conditions environnementales avant démarrage', [
    _note('plenv_note', 'Contrôle T° / HR / ΔP', 'Relever les données avant démarrage du pelliculage.'),
    _tab('plenv_tab', 'Contrôle de la température, de l\'humidité relative et de la différence de pression', [
      _ct('plen_etape', 'Étape'), _ct('plen_salle', 'N° salle'), _ct('plen_heure', 'Heure'),
      _cn('plen_t', 'T°C [15-25]', '°C', 15, 25), _cn('plen_hr', 'HR% ≤ 60', '%', null, 60), _cn('plen_dp', 'ΔP ≥ 1', 'mmH₂O', 1, null),
      _ct('plen_vop', 'Date/Visa Opérateur'), _ct('plen_vverif', 'Date/Visa Vérificateur')
    ])
  ]),
  _sec('pl_autor', '4 · Autorisation de démarrage de pelliculage', [
    _chk('plaut_chk', 'Vide de ligne — conformité (joindre la checklist vide de ligne à l\'IF)', 'cnc', [
      'Instructions générales', 'Consignes de sécurité', 'Conditions environnementales', 'Nettoyage local et équipements'
    ]),
    _txt('plaut_sup', 'Démarrage autorisé — Superviseur Fabrication (date / heure / visa)'),
    _txt('plaut_aq', 'Démarrage autorisé — AQ Process (date / heure / visa)')
  ], 2),
  _sec('pl_vprel', '5 · Vérification préliminaire', [
    _chk('plvp_chk', 'Vérifications à effectuer', 'oui', [
      'Présence de tous les documents de l\'instruction de fabrication',
      'Habillage spécifique / réglementaire du personnel',
      'Absence de plaies ouvertes ou maladies contagieuses chez le personnel'
    ]),
    _txt('plvp_visa', 'Date / Visa')
  ], 2),
  _sec('pl_ope', '6 · Liste des opérateurs de pelliculage', [
    _tab('plope_tab', 'Opérateurs — Shift 01 : 06-14h · 02 : 14-22h · 03 : 22-06h', [
      _ct('plop_shift', 'N° Shift'), _ct('plop_poste', 'Poste'), _ct('plop_nom', 'Nom & prénom'),
      _ct('plop_date', 'Date'), _ct('plop_visa', 'Visa'), _ct('plop_verif', 'Vérifier par (Date & Visa)')
    ])
  ]),
  _sec('pl_equip', '7 · Vérification des équipements utilisés', [
    _note('pleq_note', 'Équipement de pelliculage', 'Pelliculeuse LABORTECNIC (PR024). Statuts : C / NC / NA.'),
    _tab('pleq_tab', 'Équipements — qualification/calibration & parties vitrées', [
      _ct('ple_nom', 'Équipement'), _ct('ple_code', 'Code'),
      _ccnc('ple_qual', 'Statut qualification / calibration'), _ccnc('ple_vitr', 'État des parties vitrées'),
      _ct('ple_fait', 'Fait par / Date & Visa'), _ct('ple_verif', 'Vérifié par / Date & Visa'), _ct('ple_obs', 'Observation')
    ])
  ]),
  _sec('pl_etal', '8 · Vérification de l\'étalonnage des balances', [
    _tab('pletal_tab', 'Balances — calibrage', [
      _ct('plet_bal', 'Balance'), _ct('plet_code', 'Code'), _coo('plet_cal', 'Calibrage effectué'),
      _ct('plet_date', 'Date'), _ct('plet_vop', 'Date/Visa Opérateur'), _ct('plet_vverif', 'Date/Visa Vérificateur'), _ct('plet_obs', 'Observation')
    ])
  ]),
  _sec('pl_cond', '9 · Conditions T°C / ΔP / HR% au cours du process', [
    _note('plcond_note', 'Fréquence', 'Relever les données toutes les 30 min pendant le process de pelliculage.'),
    _tab('plcond_tab', 'Relevés en cours de pelliculage', [
      _ct('plco_date', 'Date'), _ct('plco_heure', 'Heure'),
      _cn('plco_t', 'Température 15≤T≤25', '°C', 15, 25), _cn('plco_hr', 'Humidité ≤60', '%', null, 60), _cn('plco_dp', 'ΔP ≥1', 'mmH₂O', 1, null),
      _ct('plco_salle', 'N° salle'), _ct('plco_fait', 'Fait par / Visa'), _ct('plco_verif', 'Vérifié par / Date & Visa')
    ])
  ]),
  _sec('pl_rec', '10 · Réception des matières (comprimés nus & excipient de pelliculage)', [
    _note('plrec_note', 'Réception', 'Vérifier l\'intégrité des contenants réceptionnés, avant le début du processus de pelliculage.'),
    _tab('plrec_tab', 'Matières réceptionnées', [
      _ct('plre_mat', 'Matière / Code interne'), _ct('plre_lot', 'N° lot produit fini'),
      _coo('plre_int', 'Contenant intègre scellé et identifié'), _ct('plre_frac', 'N° de fraction'),
      _coo('plre_etiq', 'Présence étiquette pesée'), _cn('plre_theo', 'Qté théorique', 'kg'),
      _cn('plre_liv', 'Quantité livrée', 'kg'), _ct('plre_fait', 'Fait par / Date & Visa'), _ct('plre_verif', 'Vérifié par / Date & Visa')
    ]),
    _num('pelrec_pcp', 'Comprimés nus reçus (P_cp)', 'kg'),
    _num('pelrec_total', 'Quantité totale reçue', 'kg')
  ]),
  _sec('pl_vfonc', '11 · Vérification du fonctionnement de l\'équipement avant pelliculage', [
    _txt('plvf_date', 'Début — Date', 'date'), _txt('plvf_heure', 'Heure'),
    _tab('plvf_tab', 'Fonctionnement à vide', [
      _ct('plvf_nom', 'Équipement'), _ct('plvf_code', 'Code'), _ccnc('plvf_fonc', 'Fonctionnement à vide'),
      _ct('plvf_fait', 'Fait par / Date'), _ct('plvf_verif', 'Vérifié par / Date'), _ct('plvf_obs', 'Observation')
    ]),
    _note('plvf_note', 'Équipements à contrôler', 'Pelliculeuse LABORTECNIC (PR024) · Buses d\'ouverture 1,2 mm · Réacteur solution de pelliculage.')
  ]),
  _sec('pl_eau', '12 · Pesée de l\'eau purifiée', [
    _txt('pleau_debut', 'Début — Date / Heure'),
    _tab('pleau_tab', 'Pesée (G : Globale · B : Brute · T : Tare · N : Net)', [
      _ct('plea_mat', 'Matière'), _ct('plea_pt', 'Point de prélèvement'),
      _cn('plea_apeser', 'Quantité à peser', 'kg'), _ct('plea_bal', 'Code balance'),
      _cn('plea_pesee', 'Quantité pesée (N)', 'kg'), _ct('plea_fait', 'Fait par'), _ct('plea_verif', 'Vérifié par')
    ]),
    _num('pleau_qte', 'Eau purifiée pesée (consigne 25,90)', 'kg'),
    _txt('pleau_fin', 'Fin — Heure'),
    _pj('pleau_ticket', 'Ticket de pesée de l\'eau purifiée (scan)'),
    _txt('pleau_visa', 'Vérifié par — Date & Visa')
  ], 2),
  _sec('pl_sol', '13 · Préparation de la solution de pelliculage', [
    _note('plsol_note', 'Mode opératoire', 'Vérifier la fermeture de la vanne du réacteur. Introduire l\'eau purifiée dans la cuve, puis ajouter progressivement l\'Aquapolish P pink 041.47 sous agitation constante. Un excès de 30 % est prévu dans la formule pour compenser les pertes du process. Mélanger jusqu\'à dispersion complète.'),
    _txt('plsol_debut', 'Début — Date / Heure'),
    _tab('plsol_tab', 'Matières de la solution', [
      _ct('plso_mat', 'Matière / Code interne'), _cn('plso_theo', 'Qté théorique / turbine', 'kg'),
      _cn('plso_lue', 'Qté lue sur étiquettes de pesée', 'kg'), _cn('plso_duree', 'Durée', 'min'),
      _ct('plso_deb', 'Début'), _ct('plso_fin', 'Fin'), _ct('plso_fait', 'Fait par'), _ct('plso_verif', 'Vérifié par')
    ]),
    _txt('plsol_mdeb', 'Heure début mélange'), _txt('plsol_mfin', 'Heure fin mélange'), _num('plsol_mduree', 'Durée réelle du mélange', 'min'),
    _oc('plsol_disp', 'Dispersion homogène'),
    _oo('plsol_tamis', 'Suspension filtrée à travers un tamis de 250 µm')
  ], 2),
  _sec('pl_prech', '14.1 · Dépoussiérage & préchauffage des comprimés', [
    _note('plprech_note', 'Préchauffage', 'Introduire dans la turbine de pelliculage les comprimés nus et préchauffer selon les consignes ci-dessous.'),
    _num('plprech_vit', 'Vitesse de la turbine', 'tr/min', 2, 3),
    _num('plprech_tent', 'Température d\'entrée (consigne 60 ± 5)', '°C', 55, 65),
    _num('plprech_tsort', 'Température de sortie', '°C', 45, 50),
    _num('plprech_souf', 'Soufflage (consigne 45)', '%'),
    _num('plprech_asp', 'Aspiration (consigne 55)', '%'),
    _num('plprech_debit', 'Débit d\'air d\'entrée', 'm³/h', 2000, 2500),
    _num('plprech_duree', 'Durée préchauffage (consigne 10)', 'min'),
    _txt('plprech_hdeb', 'Heure début préchauffage'), _txt('plprech_hfin', 'Heure fin préchauffage'),
    _num('plprech_b1', 'Masse moyenne après préchauffage B1 (30 cp) — 150 mg ± 3 %', 'mg', 145.5, 154.5),
    _txt('plprech_visa', 'Date & Visa Opérateur / Superviseur')
  ], 2),
  _sec('pl_pulv', '14.2 · Pulvérisation de la suspension de pelliculage', [
    _note('plpulv_note', 'Pulvérisation', 'Poursuivre le pelliculage avec la solution jusqu\'à l\'obtention d\'un gain de poids de 4,5 mg, en s\'assurant de la conformité de l\'aspect des comprimés. Reporter la masse en fin de pulvérisation dans l\'annexe IPC.'),
    _num('plpulv_vit', 'Vitesse de la turbine', 'tr/min', 4, 5),
    _num('plpulv_debit', 'Débit d\'air d\'entrée', 'm³/h', 2000, 2500),
    _num('plpulv_tent', 'Température d\'entrée', '°C', 48, 60),
    _num('plpulv_tsort', 'Température de sortie', '°C', 38, 45),
    _num('plpulv_depr', 'Dépression dans la turbine', 'mbar', -5, -0.1),
    _num('plpulv_souf', 'Soufflage', '%', 40, 45),
    _num('plpulv_asp', 'Aspiration', '%', 50, 55),
    _num('plpulv_pa', 'Pression atomisation A', 'bar', 1.5, 2.5),
    _num('plpulv_pp', 'Pression pattern P', 'bar', 2.0, 3.0),
    _num('plpulv_pc', 'Pression contrôle C', 'bar', 1.5, 3.5),
    _num('plpulv_dist', 'Distance pistolet / lit des comprimés (consigne 20)', 'cm'),
    _num('plpulv_pompe', 'Vitesse pompe de pulvérisation', '%', 40, 50),
    _num('plpulv_masse', 'Masse moyenne (30 cp) — 154,50 mg ± 3 %', 'mg', 149.86, 159.13),
    _num('plpulv_gain', 'Gain de poids obtenu (consigne 4,5)', 'mg'),
    _txt('plpulv_hdeb', 'Heure début pulvérisation'), _txt('plpulv_hfin', 'Heure fin pulvérisation'),
    _num('plpulv_duree', 'Durée de pulvérisation', 'min', 120, 180),
    _txt('plpulv_visa', 'Nom / Date & Visa Superviseur Fabrication')
  ], 2),
  _sec('pl_sechref', '15 · Séchage & refroidissement des comprimés pelliculés', [
    _note('plsr_sech', 'Séchage', 'Paramètres de séchage des comprimés pelliculés (consignes ci-dessous).'),
    _num('plsech_vit', 'Séchage — Vitesse turbine (consigne 3)', 'tr/min'),
    _num('plsech_souf', 'Séchage — Soufflage (consigne 45)', '%'),
    _num('plsech_asp', 'Séchage — Aspiration (consigne 55)', '%'),
    _num('plsech_debit', 'Séchage — Débit d\'air d\'entrée', 'm³/h', 2000, 2500),
    _num('plsech_tent', 'Séchage — Température d\'air à l\'entrée', '°C', 34, 41),
    _num('plsech_tsort', 'Séchage — Température d\'air à la sortie', '°C', 34, 42),
    _num('plsech_depr', 'Séchage — Dépression turbine', 'mbar', -5, -0.1),
    _txt('plsech_hdeb', 'Séchage — Heure début'), _txt('plsech_hfin', 'Séchage — Heure fin'), _num('plsech_duree', 'Séchage — Durée (consigne 15)', 'min'),
    _note('plsr_ref', 'Refroidissement', 'Paramètres de refroidissement des comprimés pelliculés (consignes ci-dessous).'),
    _num('plref_vit', 'Refroidissement — Vitesse turbine (consigne 3)', 'tr/min'),
    _num('plref_souf', 'Refroidissement — Soufflage (consigne 45)', '%'),
    _num('plref_asp', 'Refroidissement — Aspiration (consigne 55)', '%'),
    _num('plref_debit', 'Refroidissement — Débit d\'air d\'entrée', 'm³/h', 2000, 2500),
    _num('plref_depr', 'Refroidissement — Dépression turbine', 'mbar', -5, -0.1),
    _num('plref_tent', 'Refroidissement — Température d\'air entrée', '°C', 15, 25),
    _num('plref_tsort', 'Refroidissement — Température d\'air sortie', '°C', null, 30),
    _txt('plref_hdeb', 'Refroidissement — Heure début'), _txt('plref_hfin', 'Refroidissement — Heure fin'), _num('plref_duree', 'Refroidissement — Durée (consigne 15)', 'min'),
    _num('plref_mmcp', 'Masse moyenne comprimés pelliculés fin refroidissement M.M.C.P (30 cp)', 'mg', 149.86, 159.13),
    _txt('plsr_visa', 'Date & Visa Opérateur / Superviseur')
  ], 2),
  _sec('pl_cq', '16 · Réception des comprimés pelliculés (CQ) & fiches', [
    _ooi('plcq_req', 'Contrôle des comprimés pelliculés requis CQ ? (si Oui : demande d\'échantillonnage réf. CQ-SOP-007)'),
    _ooi('plcq_bloq', 'Analyse bloquante ? (si Oui : attendre les résultats avant le conditionnement)'),
    _txt('plcq_obs', 'Observation'),
    _txt('plcq_fin', 'Fin — Date / Heure / Fait par / Vérifié par'),
    _pj('plcq_pjpesee', 'Étiquette « pesée » des produits intermédiaires (scan)'),
    _pj('plcq_pjid', 'Étiquette « identification in process » (scan)'),
    _pj('plcq_fsalle', 'Fiche utilisation salle (scan)'),
    _pj('plcq_fmachine', 'Fiche utilisation machine (scan)'),
    _txt('plcq_fvisa', 'Fiches utilisation — Vérifié par Date & Visa')
  ], 2),
  _sec('pl_inc', '17 · Suivi des incidents et des arrêts de pelliculage', [
    _tab('plinc_tab', 'Incidents / arrêts', [
      _ct('plin_date', 'Date'), _ct('plin_harr', 'Heure d\'arrêt'), _ct('plin_sac', 'N° de sac'),
      _ct('plin_motif', 'Motif'), _ct('plin_action', 'Action corrective'),
      _ct('plin_ddem', 'Date de démarrage'), _ct('plin_hdem', 'Heure de démarrage'), _ct('plin_visa', 'Fait par / Visa')
    ]),
    _txt('plinc_visa', 'Vérifié par / Visa — Date')
  ]),
  _sec('pl_bil', '18 · Bilan de pelliculage', [
    _note('plbil_note', 'Bilan', 'Tarer le poids des sacs. Récupérer les comprimés dans des sacs PE propres (identifier chaque sac). Peser le sac + comprimés (poids brut). Poids net = brut − tare. Transférer chaque sac dans un fût propre identifié.'),
    _tab('plbil_tab', 'Bilan par fût', [
      _ct('plbi_fut', 'Fût N°'), _ct('plbi_sac', 'Sac N°'),
      _cn('plbi_tare', 'Tare', 'kg'), _cn('plbi_brute', 'Brute', 'kg'), _cn('plbi_net', 'Net', 'kg'),
      _ct('plbi_fait', 'Fait par'), _ct('plbi_verif', 'Vérifié par')
    ]),
    _num('pelbil_pcpl', 'P_cpl — Total Net des comprimés pelliculés obtenus', 'kg')
  ]),
  _sec('pl_rdt', '19 · Calcul du rendement de pelliculage', [
    _note('plr_note', 'Rendement (automatique depuis les données enregistrées)', `Les poids sont repris automatiquement : P_cp (comprimés nus, section 10) et P_cpl (section 18 · bilan). Masse moyenne théorique MMTCP = 154,50 mg ; masse moyenne comprimé nu = 150,00 mg. Saisir MMCP (mesurée) et C_ép (nombre et poids prélevés par le CQ). Norme de rendement : 98–100 %.`),
    _calc('plr_pcp', 'P_cp — comprimés nus reçus (rappel section 10)', '{pelrec_pcp}', 'kg'),
    _calc('plr_pcpl', 'P_cpl — comprimés pelliculés obtenus (rappel section 18)', '{pelbil_pcpl}', 'kg'),
    _num('plr_mmcp', 'MMCP — masse moyenne des comprimés pelliculés (mesurée)', 'mg'),
    _num('plr_cepcp', 'C_ép — nombre de comprimés pelliculés prélevés par le CQ', 'cp'),
    _num('plr_cepkg', 'C_ép — poids des comprimés pelliculés prélevés par le CQ', 'kg'),
    _calc('plr_ncp', 'N_CP = P_cp × 10⁶ / 150 (nombre théorique)', '{pelrec_pcp} * 1000000 / 150', 'cp'),
    _calc('plr_pth', 'Poids théorique pelliculés = N_CP × MMTCP(154,50) × 10⁻⁶', '{plr_ncp} * 154.50 / 1000000', 'kg'),
    _calc('plr_npl', 'N_PL = P_cpl × 10⁶ / MMCP (nombre obtenu)', '{pelbil_pcpl} * 1000000 / {plr_mmcp}', 'cp'),
    _calc('plr_film', 'Masse du film utilisé = P_cpl − P_cp', '{pelbil_pcpl} - {pelrec_pcp}', 'kg'),
    _calc('plr_apl_cp', 'A_PL (avarie) = N_CP − N_PL − C_ép', '{plr_ncp} - {plr_npl} - {plr_cepcp}', 'cp'),
    _calc('plr_apl_kg', 'A_PL (avarie) = A_PL(cp) × MMCP × 10⁻⁶', '{plr_apl_cp} * {plr_mmcp} / 1000000', 'kg'),
    _calc('plr_rcp', 'Rendement (cp/cp) = (N_PL + C_ép) × 100 / N_CP', '({plr_npl} + {plr_cepcp}) * 100 / {plr_ncp}', '%', 98, 100),
    _calc('plr_rkg', 'Rendement (kg/kg) = (P_cpl + C_ép × MMCP × 10⁻⁶) × 100 / Poids théorique', '({pelbil_pcpl} + {plr_cepkg}) * 100 / {plr_pth}', '%', 98, 100),
    _chk('plr_docs', 'Documents à joindre', 'oui', ['Bon d\'avarie', 'Bon de prélèvement']),
    _txt('plr_visa', 'Superviseur Production — Date / Heure / Visa')
  ], 2)
]

// =====================================================================
//  Phase GRANULATION & SÉCHAGE — « Tamisage, Granulation, Séchage et
//  Calibrage » (IF FLUDEX LP PFSER01, pages 26-48) — modélisée à l'identique.
//  Granulation humide : mélangeur-granulateur COMASA P200 (PR034), lit d'air
//  fluidisé COMASA ESSICA 215 (PR035), calibreur CPS line / Kevin super mill.
//  Fractions matière (lactose F1/F2/F3) gérées en lignes de tableau.
//  Bilan de rendement AUTOMATIQUE (P_th gr réception, P bilan granulé).
// =====================================================================
const SECTIONS_GRANULATION = [
  _sec('gr_prelim', '1 · Opérations préliminaires & autorisation de démarrage', [
    _note('grp_instr', 'Opérations préliminaires — vérifications avant démarrage', `• Vide de ligne : machines et locaux libérés des matériaux et documents du produit précédent (selon check-list vide de ligne).
• Nettoyage des équipements et locaux vérifié ; étiquettes de nettoyage et logs book renseignés.
• Local et machine identifiés (fiches « utilisation salle » et « utilisation machine ») ; étiquettes « Nettoyé » et « Utilisation salle » collées.
• Nettoyage des pièces mobiles vérifié ; étiquettes « Nettoyé » jointes à l'IF.
• Vérification journalière des balances effectuée.
• Propreté et intégrité des contenants MP réceptionnés vérifiées.
• Conditions d'ambiance du local vérifiées : température (°C), HR (%), ΔP.
• En cas d'anomalies : stopper l'opération, alerter le responsable, reporter l'évènement sur la fiche incidents.
• Attendre l'autorisation AQ avant de procéder à cette étape.`),
    _note('grp_secu', 'Consignes de sécurité obligatoires', TXT_SECURITE),
    _note('grp_prec', 'Précautions de production', TXT_PRECAUTIONS),
    _txt('grp_date', 'Date de début', 'date', true),
    _txt('grp_salle', 'N° de salle de granulation'),
    _txt('grp_heure', 'Heure de début'),
    _num('grp_temp', 'Température de la salle', '°C', 15, 25, true),
    _num('grp_hr', 'Humidité relative', '%', null, 60, true),
    _num('grp_dp', 'Différentiel de pression (ΔP)', 'mmH₂O', 1, null, true)
  ], 2),
  _sec('gr_net', '2 · Vérification du nettoyage des équipements et locaux', [
    _note('grnet_note', 'Étiquettes de nettoyage', 'Remplacer les étiquettes « Nettoyé » salle et machine par les fiches « utilisation salle » et « utilisation machine ». Coller les étiquettes « Nettoyée » dans l\'instruction de fabrication.'),
    _chk('grnet_chk', 'Étiquettes « nettoyé » collées', 'oui', ['Salle de granulation', 'Équipements', 'Pièces mobiles']),
    _pj('grnet_pjsalle', 'Étiquette nettoyée de la salle (scan)'),
    _pj('grnet_pjequip', 'Étiquettes nettoyée des équipements (scan)'),
    _pj('grnet_pjmob', 'Étiquettes nettoyée des pièces mobiles (scan)'),
    _txt('grnet_visa', 'Vérifié par — Date & Visa')
  ], 2),
  _sec('gr_env', '3 · Conditions environnementales avant démarrage', [
    _note('grenv_note', 'Contrôle T° / HR / ΔP', 'Relever les données avant démarrage.'),
    _tab('grenv_tab', 'Contrôle de la température, de l\'humidité relative et de la différence de pression', [
      _ct('gren_etape', 'Étape'), _ct('gren_salle', 'N° salle'), _ct('gren_heure', 'Heure'),
      _cn('gren_t', 'T°C [15-25]', '°C', 15, 25), _cn('gren_hr', 'HR% ≤ 60', '%', null, 60), _cn('gren_dp', 'ΔP ≥ 1', 'mmH₂O', 1, null),
      _ct('gren_vop', 'Date/Visa Opérateur'), _ct('gren_vverif', 'Date/Visa Vérificateur')
    ])
  ]),
  _sec('gr_autor', '4 · Autorisation de démarrage', [
    _chk('graut_chk', 'Vide de ligne — conformité (joindre la checklist vide de ligne à l\'IF)', 'cnc', [
      'Instructions générales', 'Consignes de sécurité', 'Conditions environnementales', 'Nettoyage local et équipements'
    ]),
    _txt('graut_sup', 'Démarrage autorisé — Superviseur Fabrication (date / heure / visa)'),
    _txt('graut_aq', 'Démarrage autorisé — AQ Process (date / heure / visa)')
  ], 2),
  _sec('gr_vprel', '5 · Vérification préliminaire', [
    _chk('grvp_chk', 'Vérifications à effectuer', 'oui', [
      'Présence de tous les documents de l\'instruction de fabrication',
      'Habillage spécifique / réglementaire du personnel',
      'Absence de plaies ouvertes ou maladies contagieuses chez le personnel'
    ]),
    _txt('grvp_visa', 'Date / Visa')
  ], 2),
  _sec('gr_ope', '6 · Liste des opérateurs', [
    _tab('grope_tab', 'Opérateurs — Shift 01 : 06-14h · 02 : 14-22h · 03 : 22-06h', [
      _ct('grop_shift', 'N° Shift'), _ct('grop_poste', 'Poste'), _ct('grop_nom', 'Nom & prénom'),
      _ct('grop_date', 'Date'), _ct('grop_visa', 'Visa'), _ct('grop_verif', 'Vérifier par (Date & Visa)')
    ])
  ]),
  _sec('gr_equip', '7 · Vérification des équipements utilisés', [
    _note('greq_note', 'Équipements de granulation', 'Mélangeur granulateur COMASA P200 (PR034) · Lit d\'air fluidisé COMASA ESSICA 215 (PR035) · Calibreur CPS line (PR036/PR097) · Kevin super mill (PR310/PR311). Statuts : C / NC / NA.'),
    _tab('greq_tab', 'Équipements — qualification/calibration & parties vitrées', [
      _ct('gre_nom', 'Équipement'), _ct('gre_code', 'Code'),
      _ccnc('gre_qual', 'Statut qualification / calibration'), _ccnc('gre_vitr', 'État des parties vitrées'),
      _ct('gre_fait', 'Fait par / Date & Visa'), _ct('gre_verif', 'Vérifié par / Date & Visa'), _ct('gre_obs', 'Observation')
    ])
  ]),
  _sec('gr_etal', '8 · Vérification de l\'étalonnage des balances', [
    _tab('gretal_tab', 'Balances — calibrage', [
      _ct('gret_bal', 'Balance'), _ct('gret_code', 'Code'), _coo('gret_cal', 'Calibrage effectué'),
      _ct('gret_date', 'Date'), _ct('gret_vop', 'Date/Visa Opérateur'), _ct('gret_vverif', 'Date/Visa Vérificateur'), _ct('gret_obs', 'Observation')
    ])
  ]),
  _sec('gr_cond', '9 · Conditions T°C / ΔP / HR% au cours du process', [
    _note('grcond_note', 'Fréquence', 'Relever les données toutes les 30 min pendant le process.'),
    _tab('grcond_tab', 'Relevés en cours de process', [
      _ct('grco_date', 'Date'), _ct('grco_heure', 'Heure'),
      _cn('grco_t', 'Température 15≤T≤25', '°C', 15, 25), _cn('grco_hr', 'Humidité ≤60', '%', null, 60), _cn('grco_dp', 'ΔP ≥1', 'mmH₂O', 1, null),
      _ct('grco_salle', 'N° salle'), _ct('grco_fait', 'Fait par / Visa'), _ct('grco_verif', 'Vérifié par / Date & Visa')
    ])
  ]),
  _sec('gr_rec', '10 · Réception des matières', [
    _note('grrec_note', 'Réception', 'Vérifier l\'intégrité des contenants réceptionnés, avant le début du processus. Le lactose monohydraté est reçu en fractions (F1, F2, F3).'),
    _tab('grrec_tab', 'Matières réceptionnées (une ligne par fraction)', [
      _ct('grre_mat', 'Matière / Code interne'), _ct('grre_lot', 'N° lot interne'),
      _coo('grre_int', 'Contenant intègre scellé et identifié'), _ct('grre_frac', 'N° de fraction'),
      _coo('grre_etiq', 'Présence étiquette pesée'), _cn('grre_theo', 'Qté théorique', 'kg'),
      _cn('grre_liv', 'Quantité livrée', 'kg'), _ct('grre_fait', 'Fait par / Date & Visa'), _ct('grre_verif', 'Vérifié par / Date & Visa')
    ]),
    _num('gran_pthgr', 'Quantité totale — poids théorique du granulé (P_th gr)', 'kg')
  ]),
  _sec('gr_vfonc', '11 · Vérification du fonctionnement de l\'équipement avant opération', [
    _txt('grvf_date', 'Début — Date', 'date'), _txt('grvf_heure', 'Heure'),
    _tab('grvf_tab', 'Fonctionnement à vide', [
      _ct('grvf_nom', 'Équipement'), _ct('grvf_code', 'Code'), _ccnc('grvf_fonc', 'Fonctionnement à vide'),
      _ct('grvf_fait', 'Fait par / Date'), _ct('grvf_verif', 'Vérifié par / Date'), _ct('grvf_obs', 'Observation')
    ]),
    _note('grvf_note', 'Équipements à contrôler', 'Mélangeur granulateur COMASA P200 (PR034) · Lit d\'air fluidisé COMASA ESSICA 215 (PR035) · Calibreur CPS line (PR036/PR097/PR311).')
  ]),
  _sec('gr_eau', '12 · Pesée de l\'eau purifiée', [
    _txt('greau_debut', 'Début — Date / Heure'),
    _tab('greau_tab', 'Pesée (B : Brute · T : Tare · N : Net)', [
      _ct('grea_mat', 'Matière'), _ct('grea_pt', 'Point de prélèvement'),
      _cn('grea_apeser', 'Qté à peser', 'kg'), _ct('grea_bal', 'Code balance'),
      _cn('grea_pesee', 'Qté pesée (N)', 'kg'), _ct('grea_vop', 'Date/Visa opérateur'), _ct('grea_vsup', 'Date/Visa Superviseur')
    ]),
    _num('greau_qte', 'Eau purifiée pesée (consigne 3,40)', 'kg'),
    _txt('greau_fin', 'Fin — Heure'),
    _pj('greau_ticket', 'Ticket de pesée de l\'eau purifiée (scan)')
  ], 2),
  _sec('gr_pes', '13 · Pesée de l\'Indapamide et des excipients réceptionnés', [
    _note('grpes_note', 'Pesée', 'Refaire la pesée de l\'Indapamide, du Lactose monohydraté (F1/F2/F3) et du Povidone K30 (B : Brute).'),
    _txt('grpes_debut', 'Début de pesée — Date / Heure'),
    _tab('grpes_tab', 'Pesée API & excipients', [
      _ct('grpe_mat', 'Désignation / Code interne'), _ct('grpe_bal', 'Code balance'),
      _cn('grpe_glob', 'Qté globale réceptionnée / lot', 'kg'), _cn('grpe_pes', 'Qté après pesée / lot', 'kg'),
      _ct('grpe_fait', 'Fait par / Date & Visa'), _ct('grpe_verif', 'Vérifié par / Date & Visa')
    ]),
    _txt('grpes_fin', 'Fin de pesée — Date / Heure'),
    _pj('grpes_pjapi', 'Ticket de principe actif après pesée (scan)'),
    _pj('grpes_pjexc', 'Tickets des excipients après pesée (scan)')
  ], 2),
  _sec('gr_tam', '14 · Tamisage (tamis 1,25 mm) & autorisation', [
    _note('grtam_note', 'Mode opératoire', `Le tamisage de l'API et des excipients est effectué dans la même salle de granulation (tamis 1,25 mm, CPS line) dans l'ordre :
1- Tamiser l'Indapamide dans un sac en PE.
2- Tamiser 03 kg (F1) de Lactose monohydraté ; rincer le sac ayant contenu l'Indapamide avec cette quantité ; mélanger manuellement ~1 min ; verser le rinçage dans le sac de l'Indapamide tamisé.
3- Tamiser le lactose F2, puis F3, puis le Povidone K30.
Contrôle visuel du CPS-line après chaque matière.`),
    _chk('grtam_etapes', 'Étapes de tamisage (réalisées)', 'oui', [
      'Tamisage de l\'Indapamide',
      'Tamisage du Lactose monohydraté 03 kg (F1)',
      'Rinçage du sac Indapamide avec le F1 tamisé',
      'Mélange manuel du contenu ~1 min',
      'Versement du rinçage dans le sac Indapamide tamisé'
    ]),
    _num('grtam_maille', 'Ouverture de maille du tamis (consigne 1,25)', 'mm'),
    _num('grtam_vit', 'Vitesse du calibreur (consigne 500 ± 100)', 'RPM', 400, 600),
    _txt('grtam_hdeb', 'Heure de début tamisage'), _num('grtam_duree', 'Durée du tamisage', 'min'),
    _num('grtam_dmel', 'Durée du mélange manuel (consigne 1)', 'min'),
    _txt('grtam_sup', 'Démarrage tamisage & dilution autorisé — Superviseur / AQ (date / heure / visa)')
  ], 2),
  _sec('gr_tamr', '15 · Tamisage des excipients restants', [
    _chk('grtamr_chk', 'Matières tamisées', 'oui', ['Lactose monohydraté (F2)', 'Lactose monohydraté (F3)', 'Povidone K30']),
    _num('grtamr_maille', 'Ouverture de maille du tamis (consigne 1,25)', 'mm'),
    _num('grtamr_vit', 'Vitesse du calibreur (consigne 500 ± 100)', 'RPM', 400, 600),
    _txt('grtamr_hdeb', 'Heure de début'), _txt('grtamr_hfin', 'Heure de fin'),
    _txt('grtamr_visa', 'Date & Visa Opérateur / Superviseur')
  ], 2),
  _sec('gr_dil', '16 · Dilution — prémélange 1', [
    _note('grdil_note', 'Dilution', 'Mélange manuel de l\'Indapamide et des 03 kg de Lactose monohydraté tamisés jusqu\'à homogénéisation (prémélange 1). Fermer le sac en PE par un serre-sac avant le mélange.'),
    _txt('grdil_debut', 'Début — Date / Heure'),
    _chk('grdil_op', 'Opérations', 'oui', ['Fermeture du sac en PE vérifiée', 'Mélange manuel 02 à 03 min réalisé']),
    _txt('grdil_mdeb', 'Début du mélange'), _txt('grdil_mfin', 'Fin du mélange'), _num('grdil_duree', 'Durée réelle du mélange', 'min')
  ], 2),
  _sec('gr_sec', '17 · Mélange à sec (mélangeur-granulateur PR034)', [
    _note('grsec_note', 'Méthode sandwich', 'Introduire le prémélange 1 dans le mélangeur-granulateur (PR034) en sandwich avec les fractions de lactose et le povidone, dans l\'ordre : Lactose (F2) → Povidone K30 → Prémélange 1 → Lactose (F3).'),
    _txt('grsec_debut', 'Début — Date / Heure'),
    _chk('grsec_mat', 'Matières introduites (ordre sandwich)', 'oui', ['Lactose monohydraté (F2)', 'Povidone K30', 'Prémélange 1 (Indapamide + 03 kg lactose)', 'Lactose monohydraté (F3)']),
    _oo('grsec_ferm', 'Fermeture du granulateur-mélangeur vérifiée avant démarrage'),
    _num('grsec_vit', 'Vitesse impulseur (consigne 80)', 'RPM'),
    _txt('grsec_hach', 'Hachoir (consigne OFF)'),
    _txt('grsec_mdeb', 'Début du mélange'), _txt('grsec_mfin', 'Fin du mélange'), _num('grsec_duree', 'Durée du mélange (consigne 15)', 'min'),
    _txt('grsec_visa', 'Date & Visa Opérateur / Superviseur')
  ], 2),
  _sec('gr_mou', '18 · Mouillage', [
    _note('grmou_note', 'Mouillage', 'Ajouter 3,4 kg d\'eau purifiée au mélange par la pompe doseuse pendant environ 2 min 15 s.'),
    _num('grmou_vit', 'Vitesse impulseur (consigne 80)', 'tr/min'),
    _txt('grmou_hach', 'Hachoir (consigne ON)'),
    _num('grmou_pompe', 'Vitesse de la pompe de pulvérisation (consigne 10)', 'RPM'),
    _num('grmou_eau', 'Quantité d\'eau purifiée ajoutée (consigne 3,4)', 'kg'),
    _num('grmou_duree', 'Durée d\'introduction de l\'eau (consigne ≈2 min 15 s)', 'min'),
    _txt('grmou_visa', 'Date & Visa Opérateur / Superviseur')
  ], 2),
  _sec('gr_gra', '19 · Granulation', [
    _note('grgra_note', 'Granulation', 'Granuler avec les paramètres indiqués ci-dessous.'),
    _num('grgra_vit', 'Vitesse impulseur (consigne 80)', 'tr/min'),
    _txt('grgra_hach', 'Hachoir (consigne ON)'),
    _num('grgra_duree', 'Durée de granulation (consigne ≈2 min 15 s)', 'min'),
    _txt('grgra_visa', 'Date & Visa Opérateur / Superviseur / AQ')
  ], 2),
  _sec('gr_calh', '20 · Calibrage humide', [
    _num('grcalh_maille', 'Ouverture de maille du tamis (consigne 6)', 'mm'),
    _num('grcalh_vit', 'Vitesse de rotation', 'RPM', 600, 800),
    _num('grcalh_imp', 'Vitesse impulseur', 'tr/min', 5, 10),
    _num('grcalh_duree', 'Durée', 'min', 5, 30),
    _txt('grcalh_visa', 'Date & Visa Opérateur / Superviseur / AQ')
  ], 2),
  _sec('gr_sech', '21 · Séchage (lit d\'air fluidisé COMASA ESSICA)', [
    _note('grsech_prech', 'Préchauffage', 'Régler les paramètres de préchauffage du LAF Essica, puis transférer le granulé humide vers le sécheur à lit d\'air fluidisé.'),
    _num('grsech_ptemp', 'Préchauffage — Température (consigne 60)', '°C'),
    _num('grsech_pdebit', 'Préchauffage — Débit de soufflage (consigne 3500)', 'm³/h'),
    _oo('grsech_transf', 'Granulé humide transféré vers le sécheur à lit d\'air fluidisé'),
    _oo('grsech_ferm', 'Fermeture du lit d\'air fluidisé vérifiée'),
    _note('grsech_note', 'Séchage — consignes', 'Relever les résultats toutes les 15 min. T° soufflage 50-60 °C ; T° produit 30-33 °C (fin de séchage) ; T° sortie 26-30 °C (fin de séchage) ; débit 1500 puis diminution progressive jusqu\'à 700 m³/h ; secouage du filtre toutes les 30 min.'),
    _num('grsech_tsouf', 'Température de soufflage', '°C', 50, 60),
    _num('grsech_tprod', 'Température produit (fin de séchage)', '°C', 30, 33),
    _num('grsech_tsort', 'Température de sortie (fin de séchage)', '°C', 26, 30),
    _oo('grsech_filtre', 'Nettoyage du filtre effectué'),
    _txt('grsech_hdeb', 'Heure début séchage'), _txt('grsech_hfin', 'Heure fin séchage'), _num('grsech_duree', 'Durée de séchage', 'min'),
    _txt('grsech_visa', 'Date & Visa Opérateur / Superviseur')
  ], 2),
  _sec('gr_ipc', '22 · Contrôle IPC — humidité résiduelle (fin de séchage)', [
    _note('gript_note', 'Contrôle IPC', 'Prélever 5 g du granulé séché. Transférer à l\'AQ IPC : dessiccateur IR à 90 °C pendant 10 min (C_gr). Attendre le résultat IPC avant de poursuivre. Joindre la Fiche IPC à l\'IF.'),
    _num('gript_hum', 'Humidité résiduelle du granulé séché', '%', 0.5, 2.0),
    _txt('gript_visa', 'Visa AQ IPC — Date et Heure'),
    _pj('gript_pj', 'Fiche IPC humidité (scan)')
  ], 2),
  _sec('gr_calf', '23 · Calibrage (à sec, après séchage)', [
    _note('grcalf_note', 'Calibrage', 'Laisser le granulé séché se refroidir, puis tamiser soigneusement pelle par pelle (CPS-line ou Kevin super mill, tamis 1,25 mm). Contrôle visuel de l\'équipement après calibrage.'),
    _num('grcalf_maille', 'Ouverture de maille du tamis (consigne 1,25)', 'mm'),
    _num('grcalf_vit', 'Vitesse calibreur', 'RPM', 600, 650),
    _txt('grcalf_hdeb', 'Début de calibrage'), _txt('grcalf_hfin', 'Fin de calibrage'), _num('grcalf_duree', 'Durée de calibrage', 'min'),
    _oo('grcalf_visu', 'Contrôle visuel équipement — absence de poudre'),
    _txt('grcalf_visa', 'Date & Visa Opérateur / Superviseur')
  ], 2),
  _sec('gr_bil', '24 · Pesée du granulé après calibrage', [
    _note('grbil_note', 'Pesée du granulé', 'Préparer sacs PE et fûts PP propres. Tarer le sac vide, transférer le granulé calibré, peser le sac rempli (poids net = brut − tare), identifier chaque sac et fût. Répéter jusqu\'à complétion du granulé.'),
    _tab('grbil_tab', 'Bilan par fût', [
      _ct('grbi_fut', 'Fût N°'), _ct('grbi_sac', 'Sac N°'),
      _cn('grbi_tare', 'Tare (sac PE vide)', 'kg'), _cn('grbi_brute', 'Brute (sac + granulé)', 'kg'), _cn('grbi_net', 'Net (brute − tare)', 'kg'),
      _ct('grbi_fait', 'Fait par / Visa'), _ct('grbi_verif', 'Vérifié par / Visa')
    ]),
    _num('gran_p', 'P — Net Total du granulé calibré obtenu', 'kg'),
    _pj('grbil_pj', 'Ticket de pesée du granulé calibré (scan)')
  ]),
  _sec('gr_rdt', '25 · Bilan de la phase (rendement)', [
    _note('grrdt_note', 'Rendement (automatique depuis les données enregistrées)', `P_th gr (poids théorique du granulé, section 10) et P (granulé calibré obtenu, section 24) sont repris automatiquement. Saisir C_gr (masse de l'échantillon de contrôle HR%). Avarie A = P_th gr − P ; Rendement R1 = P × 100 / P_th gr. Norme : 98–100 %. Si R1 < 98 % : réajuster la pesée de la matière de la phase externe.`),
    _calc('grrdt_pthgr', 'P_th gr — poids théorique du granulé (rappel section 10)', '{gran_pthgr}', 'kg'),
    _calc('grrdt_p', 'P — granulé calibré obtenu (rappel section 24)', '{gran_p}', 'kg'),
    _num('gran_cgr', 'C_gr — masse totale échantillon de contrôle HR%', 'kg'),
    _calc('grrdt_a', 'Avarie A = P_th gr − P', '{gran_pthgr} - {gran_p}', 'kg'),
    _calc('grrdt_r1', 'Rendement R1 = P × 100 / P_th gr', '{gran_p} * 100 / {gran_pthgr}', '%', 98, 100),
    _ooi('grrdt_reaj', 'Réajustement de la pesée phase externe requis ? (si R1 < 98 %)'),
    _chk('grrdt_docs', 'Documents à joindre', 'oui', ['Bon d\'avarie', 'Bon de prélèvement']),
    _txt('grrdt_just', 'Justification de toute avarie hors normes'),
    _txt('grrdt_visa', 'Date / Visa Responsable Fabrication')
  ], 2),
  _sec('gr_inc', '26 · Suivi des incidents, arrêts & fiches', [
    _tab('grinc_tab', 'Incidents / arrêts', [
      _ct('grin_date', 'Date'), _ct('grin_harr', 'Heure d\'arrêt'), _ct('grin_sac', 'N° de sac'),
      _ct('grin_motif', 'Motif'), _ct('grin_action', 'Action corrective'),
      _ct('grin_ddem', 'Date de démarrage'), _ct('grin_hdem', 'Heure de démarrage'), _ct('grin_visa', 'Fait par / Visa')
    ]),
    _pj('grinc_fsalle', 'Fiche utilisation salle (scan)'),
    _pj('grinc_fmachine', 'Fiche utilisation machine (scan)'),
    _txt('grinc_visa', 'Vérifié par / Visa — Date')
  ])
]

// =====================================================================
//  Phase MÉLANGE & HOMOGÉNÉISATION (crème / pommade / gel) — IF MEBO 15 g
//  Pommade (PFJUL01, pages 22-38) — modélisée à l'identique. Produit semi-solide
//  mélangé à chaud dans une cuve double paroi CUISINOX (PR296). Le prémélange
//  (PREMIX) est reçu pré-pesé en fûts ; le rendement se calcule à partir du poids
//  brut reçu moins les fûts vides. Bilan de rendement AUTOMATIQUE (norme ≥ 98 %).
// =====================================================================
const SECTIONS_CREME = [
  _sec('cr_prelim', '1 · Opérations préliminaires & autorisation de démarrage', [
    _note('crp_instr', 'Opérations préliminaires — vérifications avant démarrage', `• Vide de ligne : machines et locaux libérés des matériaux et documents du produit précédent (selon check-list vide de ligne).
• Nettoyage des équipements et locaux vérifié ; étiquettes de nettoyage et logs book renseignés.
• Local et machine identifiés (fiches « utilisation salle » et « utilisation machine ») ; étiquettes « Nettoyé » et « Utilisation salle » collées.
• Nettoyage des pièces mobiles vérifié ; étiquettes « Nettoyé » jointes au dossier de lot.
• Vérification journalière des balances effectuée.
• Propreté et intégrité des contenants MP réceptionnés vérifiées.
• Conditions d'ambiance du local vérifiées : température (°C), HR (%), ΔP.
• En cas d'anomalies : stopper l'opération, alerter le responsable, reporter l'évènement sur la fiche incidents.
• Attendre l'autorisation AQ avant de procéder à cette étape.`),
    _note('crp_secu', 'Consignes de sécurité obligatoires', TXT_SECURITE),
    _note('crp_prec', 'Précautions de production', TXT_PRECAUTIONS),
    _txt('crp_date', 'Date de début', 'date', true),
    _txt('crp_salle', 'N° de salle de mélange'),
    _txt('crp_heure', 'Heure de début'),
    _num('crp_temp', 'Température de la salle', '°C', 15, 25, true),
    _num('crp_hr', 'Humidité relative', '%', null, 60, true),
    _num('crp_dp', 'Différentiel de pression (ΔP)', 'mmH₂O', 1, null, true)
  ], 2),
  _sec('cr_net', '2 · Vérification du nettoyage des équipements et locaux', [
    _note('crnet_note', 'Étiquettes de nettoyage', 'Remplacer les étiquettes « Nettoyé » salle et machine par les fiches « utilisation salle » et « utilisation machine ». Coller les étiquettes « Nettoyée » dans le dossier de lot.'),
    _chk('crnet_chk', 'Étiquettes « nettoyé » collées', 'oui', ['Salle de mélange', 'Équipements', 'Pièces mobiles']),
    _pj('crnet_pjsalle', 'Étiquette nettoyée de la salle (scan)'),
    _pj('crnet_pjequip', 'Étiquettes nettoyée des équipements (scan)'),
    _pj('crnet_pjmob', 'Étiquettes nettoyée des pièces mobiles (scan)'),
    _txt('crnet_visa', 'Vérifié par — Date & Visa')
  ], 2),
  _sec('cr_env', '3 · Conditions environnementales avant démarrage', [
    _note('crenv_note', 'Contrôle T° / HR / ΔP', 'Relever les données avant démarrage.'),
    _tab('crenv_tab', 'Contrôle de la température, de l\'humidité relative et de la différence de pression', [
      _ct('crev_etape', 'Étape'), _ct('crev_salle', 'N° salle'), _ct('crev_heure', 'Heure'),
      _cn('crev_t', 'T°C [15-25]', '°C', 15, 25), _cn('crev_hr', 'HR% ≤ 60', '%', null, 60), _cn('crev_dp', 'ΔP ≥ 1', 'mmH₂O', 1, null),
      _ct('crev_vop', 'Date/Visa Opérateur'), _ct('crev_vverif', 'Date/Visa Vérificateur')
    ])
  ]),
  _sec('cr_cuve', '4 · Vérification préliminaire de la cuve de mélange CUISINOX après nettoyage', [
    _note('crcuv_note', 'Vérification de la cuve double paroi CUISINOX', `• Vérifier l'état général de la paroi interne de la cuve en précisant l'absence de phénomène de noircissement.
• Maintenir un espace d'environ 1 mm entre les raclettes en polyamide et la surface interne de l'équipement (éviter le phénomène de polymérisation).
• Avant lancement, joindre le bon d'intervention MTC clôturé.`),
    _chk('crcuv_chk', 'Vérifications préliminaires de l\'équipement', 'oui', [
      'État général de la paroi interne — absence de noircissement',
      'Espace ~1 mm entre raclettes polyamide et surface interne',
      'Présence de la demande d\'intervention MTC clôturée'
    ]),
    _txt('crcuv_mtc', 'N° de la demande d\'intervention MTC'),
    _pj('crcuv_pj', 'Bon d\'intervention MTC clôturé (scan)')
  ], 2),
  _sec('cr_autor', '5 · Autorisation de démarrage', [
    _chk('craut_vl', 'Vide de ligne — conformité (joindre la checklist vide de ligne au dossier de lot)', 'cnc', [
      'Instructions générales', 'Consignes de sécurité', 'Conditions environnementales', 'Nettoyage local et équipements'
    ]),
    _txt('craut_sup', 'Démarrage mélange & homogénéisation autorisé — Superviseur Fabrication (date / heure / visa)'),
    _txt('craut_aq', 'Démarrage autorisé — AQ Process (date / heure / visa)')
  ], 2),
  _sec('cr_vprel', '6 · Vérification préliminaire', [
    _chk('crvp_chk', 'Vérifications à effectuer', 'oui', [
      'Présence de tous les documents du dossier de lot',
      'Habillage spécifique / réglementaire du personnel',
      'Absence de plaies ouvertes ou maladies contagieuses chez le personnel'
    ]),
    _txt('crvp_visa', 'Date / Visa')
  ], 2),
  _sec('cr_ope', '7 · Liste des opérateurs de mélange et homogénéisation', [
    _tab('crope_tab', 'Opérateurs — Shift 01 : 06-14h · 02 : 14-22h · 03 : 22-06h', [
      _ct('cro_shift', 'N° Shift'), _ct('cro_poste', 'Poste'), _ct('cro_nom', 'Nom & prénom'),
      _ct('cro_date', 'Date'), _ct('cro_visa', 'Visa'), _ct('cro_verif', 'Vérifier par (Date & Visa)')
    ])
  ]),
  _sec('cr_equip', '8 · Vérification des équipements utilisés', [
    _note('creqp_note', 'Équipement de mélange', 'Cuve de mélange double paroi CUISINOX (PR296). Statuts : C / NC / NA.'),
    _tab('creqp_tab', 'Équipements — qualification/calibration & parties vitrées', [
      _ct('crq_nom', 'Équipement'), _ct('crq_code', 'Code'),
      _ccnc('crq_qual', 'Statut qualification / calibration'), _ccnc('crq_vitr', 'État des parties vitrées'),
      _ct('crq_fait', 'Fait par / Date & Visa'), _ct('crq_verif', 'Vérifié par / Date & Visa'), _ct('crq_obs', 'Observation')
    ])
  ]),
  _sec('cr_etal', '9 · Vérification de l\'étalonnage des balances', [
    _note('cretl_note', 'Balance', 'Balance 150 kg 2M industries (PR087).'),
    _tab('cretl_tab', 'Balances — calibrage / étalonnage', [
      _ct('cret_bal', 'Balance'), _ct('cret_code', 'Code'), _coo('cret_cal', 'Calibrage effectué'),
      _ct('cret_date', 'Date'), _ct('cret_vop', 'Date/Visa Opérateur'), _ct('cret_vverif', 'Date/Visa Vérificateur'), _ct('cret_obs', 'Observation')
    ])
  ]),
  _sec('cr_cond', '10 · Conditions T°C / ΔP / HR% au cours du process', [
    _note('crcnd_note', 'Fréquence', 'Relever les données toutes les 30 min pendant le process.'),
    _tab('crcnd_tab', 'Relevés en cours de process', [
      _ct('crc_date', 'Date'), _ct('crc_heure', 'Heure'),
      _cn('crc_t', 'Température 15≤T≤25', '°C', 15, 25), _cn('crc_hr', 'Humidité ≤60', '%', null, 60), _cn('crc_dp', 'ΔP ≥1', 'mmH₂O', 1, null),
      _ct('crc_salle', 'N° salle'), _ct('crc_fait', 'Fait par / Visa'), _ct('crc_verif', 'Vérifié par / Date & Visa')
    ])
  ]),
  _sec('cr_rec', '11 · Réception des matières & bilan des fûts vides', [
    _note('crrec_note', 'Réception', 'Vérifier l\'intégrité des contenants réceptionnés, avant le début du processus. Le prémélange (PREMIX) est reçu pré-pesé en plusieurs fûts.'),
    _tab('crrec_tab', 'Matières réceptionnées (PREMIX — une ligne par fût)', [
      _ct('crr_mat', 'Matière / Code interne'), _ct('crr_lot', 'N° lot interne'),
      _coo('crr_int', 'Contenant intègre scellé et identifié'), _coo('crr_etiq', 'Présence étiquette pesée'),
      _cn('crr_theo', 'Qté théorique', 'kg'), _cn('crr_liv', 'Quantité livrée', 'kg'),
      _ct('crr_fait', 'Fait par / Date & Visa'), _ct('crr_verif', 'Vérifié par / Date & Visa')
    ]),
    _num('crm_pbrute', 'Quantité totale reçue — poids brut (P_brute)', 'kg'),
    _note('crfut_note', 'Bilan des fûts vides', 'Récupérer le contenu de chaque fût, puis peser les fûts vides.'),
    _tab('crfut_tab', 'Fûts vides', [
      _ct('crf_fut', 'Fût N°'), _cn('crf_poids', 'Poids du fût vide', 'kg'),
      _ct('crf_fait', 'Fait par'), _ct('crf_verif', 'Vérifié par')
    ]),
    _num('crm_ptv', 'Poids total des fûts vides (P_tv)', 'kg'),
    _pj('crrec_pj', 'Tickets de pesée des fûts vides (scan)')
  ]),
  _sec('cr_vfonc', '12 · Vérification du fonctionnement de l\'équipement avant mélange', [
    _txt('crvfc_date', 'Début — Date', 'date'), _txt('crvfc_heure', 'Heure'),
    _tab('crvfc_tab', 'Fonctionnement à vide', [
      _ct('crvfc_nom', 'Équipement'), _ct('crvfc_code', 'Code'), _ccnc('crvfc_fonc', 'Fonctionnement à vide'),
      _ct('crvfc_fait', 'Fait par / Date'), _ct('crvfc_verif', 'Vérifié par / Date'), _ct('crvfc_obs', 'Observation')
    ]),
    _note('crvfc_note', 'Équipement à contrôler', 'Cuve de mélange double parois CUISINOX (PR296).')
  ]),
  _sec('cr_mel', '13 · Mélange et homogénéisation', [
    _note('crml_note', 'Mélange', 'Transférer le PREMIX dans la cuve de mélange, chauffer et mélanger selon les paramètres ci-dessous, puis vérifier l\'homogénéité de la pommade.'),
    _chk('crml_op', 'Opérations avant mélange', 'oui', [
      'Transfert du PREMIX dans la cuve de mélange',
      'Transfert complet vérifié',
      'Fermeture du réacteur et des dispositifs de sécurité vérifiée'
    ]),
    _txt('crml_debut', 'Heure de début'),
    _num('crml_vit', 'Vitesse d\'agitation (consigne 30)', 'RPM'),
    _num('crml_temp', 'Température de chauffage (consigne 65)', '°C'),
    _num('crml_temps', 'Temps d\'agitation', 'min', 200, 240),
    _txt('crml_fin', 'Heure de fin'),
    _oo('crml_homog', 'Homogénéité de la pommade MEBO vérifiée'),
    _txt('crml_visa', 'Date & Visa Opérateur / Superviseur')
  ], 2),
  _sec('cr_ipc', '14 · Contrôle IPC de l\'aspect à la fin du mélange', [
    _note('crip_note', 'Contrôle IPC aspect', 'Prélever 5 g × 3 points (Haut, Milieu, Bas) du mélange final. Transférer à l\'AQ IPC pour contrôle de l\'aspect. Attendre les résultats IPC avant de poursuivre. Joindre la Fiche IPC au dossier de lot.'),
    _oc('crip_aspect', 'Aspect : pommade jaune brunâtre, lisse et homogène, sans particule granuleuse, odeur huileuse d\'herbes'),
    _txt('crip_visa', 'Visa AQ IPC — Date et Heure'),
    _pj('crip_pj', 'Fiche IPC aspect (scan)')
  ], 2),
  _sec('cr_cq', '15 · Réception du mélange (CQ) & fiches', [
    _note('crcq_rem', 'Remarque', 'Procéder au nettoyage immédiat des équipements et de la salle à la fin du process.'),
    _ooi('crcq_req', 'Contrôle du mélange requis CQ ? (si Oui : demande d\'échantillonnage réf. CQ-SOP-007)'),
    _ooi('crcq_bloq', 'Analyse bloquante ? (si Oui : attendre les résultats avant l\'étape de remplissage)'),
    _txt('crcq_obs', 'Observation'),
    _txt('crcq_fin', 'Fin — Date / Heure / Fait par / Vérifié par'),
    _pj('crcq_fsalle', 'Fiche utilisation salle (scan)'),
    _pj('crcq_fmachine', 'Fiche utilisation machine (scan)')
  ], 2),
  _sec('cr_bil', '16 · Bilan de la phase (rendement)', [
    _note('crm_note', 'Rendement (automatique depuis les données enregistrées)', `P_brute (poids brut reçu, section 11) et P_tv (poids total des fûts vides, section 11) sont repris automatiquement. Saisir P_mél (masse du mélange obtenu) et C_mél (échantillon de contrôle). Poids théorique du mélange P_th mél = P_brute − P_tv ; Avarie A = P_th mél − (P_mél + C_mél) ; Rendement R = P_mél × 100 / P_th mél. Norme : ≥ 98 %.`),
    _calc('crm_pbrute_e', 'P_brute — poids brut reçu (rappel section 11)', '{crm_pbrute}', 'kg'),
    _calc('crm_ptv_e', 'P_tv — poids total des fûts vides (rappel section 11)', '{crm_ptv}', 'kg'),
    _calc('crm_pthmel', 'P_th mél = P_brute − P_tv', '{crm_pbrute} - {crm_ptv}', 'kg'),
    _num('crm_pmel', 'P_mél — masse du mélange obtenu', 'kg'),
    _num('crm_cmel', 'C_mél — masse totale échantillon de contrôle', 'kg'),
    _calc('crm_ai', 'Avarie A = P_th mél − (P_mél + C_mél)', '{crm_pthmel} - ({crm_pmel} + {crm_cmel})', 'kg'),
    _calc('crm_ri', 'Rendement R = P_mél × 100 / P_th mél', '{crm_pmel} * 100 / {crm_pthmel}', '%', 98, null),
    _chk('crm_docs', 'Documents à joindre', 'oui', ['Bon d\'avarie', 'Bon de prélèvement']),
    _txt('crm_just', 'Justification de toute avarie hors normes'),
    _txt('crm_visa', 'Superviseur Production / Responsable Fabrication — Date / Heure / Visa')
  ], 2),
  _sec('cr_inc', '17 · Suivi des incidents et des arrêts', [
    _tab('crinc_tab', 'Incidents / arrêts', [
      _ct('cri_date', 'Date'), _ct('cri_harr', 'Heure d\'arrêt'), _ct('cri_sac', 'N° de sac'),
      _ct('cri_motif', 'Motif'), _ct('cri_action', 'Action corrective'),
      _ct('cri_ddem', 'Date de démarrage'), _ct('cri_hdem', 'Heure de démarrage'), _ct('cri_visa', 'Fait par / Visa')
    ]),
    _txt('crinc_visa', 'Vérifié par / Visa — Date')
  ])
]

// =====================================================================
//  Squelette générique d'une étape de fabrication (prélim, nettoyage,
//  opérateurs, équipements, conditions, opération, IPC, bilan, incidents).
//  Sert à pré-structurer les étapes dont le dossier n'est pas encore
//  modélisé ; à compléter via le Constructeur ou au partage des pages.
// =====================================================================
function phaseSkel (px, labelOp) {
  return [
    _sec(px + '_prelim', '1 · Opérations préliminaires & autorisation de démarrage', [
      _txt(px + '_date', 'Date de début', 'date', true),
      _txt(px + '_salle', 'N° de salle'),
      _txt(px + '_heure', 'Heure de début'),
      _num(px + '_temp', 'Température de la salle', '°C', 15, 25, true),
      _num(px + '_hr', 'Humidité relative', '%', null, 60, true),
      _num(px + '_dp', 'Différentiel de pression (ΔP)', 'mmH₂O', 1, null),
      _chk(px + '_vl', 'Vide de ligne — autorisation de démarrage', 'cnc', ['Instructions générales', 'Consignes de sécurité', 'Conditions environnementales', 'Nettoyage local & équipements']),
      _chk(px + '_prel', 'Vérification préliminaire', 'oui', ["Présence de tous les documents de l'instruction de fabrication", 'Habillage spécifique / réglementaire du personnel', 'Aptitude hygiène du personnel vérifiée (selon procédure)']),
      _txt(px + '_sup', 'Démarrage autorisé — Superviseur Fabrication (date / heure / visa)'),
      _txt(px + '_aq', 'Démarrage autorisé — AQ Process (date / heure / visa)')
    ], 2),
    _sec(px + '_net', '2 · Vérification du nettoyage (étiquettes « nettoyé »)', [
      _chk(px + '_netchk', 'Étiquettes « nettoyé » collées', 'oui', ['Salle', 'Équipements', 'Pièces mobiles']),
      _pj(px + '_netpj', 'Étiquettes « nettoyé » (scan)'),
      _txt(px + '_netvisa', 'Vérifié par — Date & Visa')
    ], 2),
    _sec(px + '_ope', '3 · Liste des opérateurs', [
      _tab(px + '_opetab', 'Opérateurs — Shift 01 : 06-14h · 02 : 14-22h · 03 : 22-06h', [
        _ct(px + '_opshift', 'N° Shift'), _ct(px + '_oppos', 'Poste'), _ct(px + '_opnom', 'Nom & prénom'), _ct(px + '_opdate', 'Date'), _ct(px + '_opvisa', 'Visa'), _ct(px + '_opver', 'Vérifié par')
      ])
    ]),
    _sec(px + '_equip', '4 · Vérification des équipements', [
      _tab(px + '_eqtab', 'Équipements', [
        _ct(px + '_eqnom', 'Équipement'), _ct(px + '_eqcode', 'Code'), _coc(px + '_eqqual', 'Qualification / calibration'), _coc(px + '_eqetat', 'État / fonctionnement à vide'), _ct(px + '_eqvisa', 'Visa')
      ])
    ]),
    _sec(px + '_cond', '5 · Conditions T° / HR / ΔP au cours du process', [
      _tab(px + '_condtab', 'Relevés', [
        _ct(px + '_cddate', 'Date'), _ct(px + '_cdheure', 'Heure'), _cn(px + '_cdt', 'Température', '°C', 15, 25), _cn(px + '_cdhr', 'Humidité', '%', null, 60), _cn(px + '_cddp', 'ΔP', 'mmH₂O', 1, null), _ct(px + '_cdsalle', 'N° salle'), _ct(px + '_cdvisa', 'Visa')
      ])
    ]),
    _sec(px + '_op', '6 · ' + labelOp, [
      _note(px + '_opnote', labelOp, "Section à compléter selon le dossier de lot de cette étape (paramètres machine, contrôles IPC, visas). Partagez les pages et je la modélise à l'identique, ou composez-la via le Constructeur."),
      _txt(px + '_opdeb', 'Date / heure de début'),
      _txt(px + '_opfin', 'Date / heure de fin'),
      _num(px + '_opduree', 'Durée', 'min'),
      _txt(px + '_opsig', 'Fait par / Vérifié par — Date & Visa')
    ], 2),
    _sec(px + '_ipc', '7 · Contrôles IPC', [
      _note(px + '_ipcnote', 'Contrôles en cours de process (IPC)', 'À définir selon l\'étape : aspect, masse, dureté, friabilité, désagrégation, humidité résiduelle…'),
      _pj(px + '_ipcpj', 'Fiche IPC / ticket (scan)')
    ], 2),
    _sec(px + '_bilan', '8 · Bilan / rendement', [
      _note(px + '_bnote', 'Rendement (automatique)', 'Saisir la quantité théorique et la quantité obtenue : l\'avarie et le rendement se calculent automatiquement. La norme (min/max) de rendement propre à l\'étape se définit via le Constructeur.'),
      _num(px + '_pth', 'Quantité théorique', 'kg'),
      _num(px + '_pobt', 'Quantité obtenue', 'kg'),
      _calc(px + '_av', 'Avarie = théorique − obtenue', '{' + px + '_pth} - {' + px + '_pobt}', 'kg'),
      _calc(px + '_rdt', 'Rendement = obtenue × 100 / théorique', '{' + px + '_pobt} * 100 / {' + px + '_pth}', '%'),
      _txt(px + '_bjust', 'Justification des écarts'),
      _txt(px + '_bvisa', 'Date / Visa Responsable Fabrication')
    ], 2),
    _sec(px + '_inc', '9 · Suivi des incidents et arrêts', [
      _tab(px + '_inctab', 'Incidents / arrêts', [
        _ct(px + '_indate', 'Date'), _ct(px + '_inharr', "Heure d'arrêt"), _ct(px + '_insac', 'N° de sac'), _ct(px + '_inmotif', 'Motif'), _ct(px + '_inact', 'Action corrective'), _ct(px + '_inddem', 'Date démarrage'), _ct(px + '_inhdem', 'Heure démarrage'), _ct(px + '_invisa', 'Visa')
      ])
    ])
  ]
}

// =====================================================================
//  Bibliothèque des ÉTAPES DE FABRICATION standard (modèle unique).
//  Pesée et Tamisage & Mélange : modélisés à l'identique du dossier.
//  Les autres : squelette standard à compléter.
// =====================================================================
const PHASES_STANDARD = {
  pesee:                 { nom: 'Pesée', sections: SECTIONS_PESEE },
  granulation_sechage:   { nom: 'Granulation & Séchage', sections: SECTIONS_GRANULATION },
  tamisage_melange:      { nom: 'Tamisage & Mélange', sections: SECTIONS_TM },
  compression:           { nom: 'Compression', sections: SECTIONS_COMPRESSION },
  remplissage_gelules:   { nom: 'Remplissage des gélules', sections: phaseSkel('ge', 'Opération de remplissage des gélules') },
  pelliculage:           { nom: 'Pelliculage', sections: SECTIONS_PELLICULAGE },
  melange_creme_pommade: { nom: 'Mélange crème & pommade', sections: SECTIONS_CREME }
}

// Liste ordonnée des étapes (pour l'éditeur de gamme).
export const ETAPES_FAB = [
  { k: 'pesee', nom: 'Pesée' },
  { k: 'granulation_sechage', nom: 'Granulation & Séchage' },
  { k: 'tamisage_melange', nom: 'Tamisage & Mélange' },
  { k: 'compression', nom: 'Compression' },
  { k: 'remplissage_gelules', nom: 'Remplissage des gélules' },
  { k: 'pelliculage', nom: 'Pelliculage' },
  { k: 'melange_creme_pommade', nom: 'Mélange crème & pommade' }
]

// Gamme par défaut (comprimé pelliculé) si le produit n'en définit pas.
const GAMME_DEFAUT = ['pesee', 'tamisage_melange', 'compression', 'pelliculage']

// Suffixe tous les identifiants (section, champs, colonnes, items) ET les
// références de formule {id} d'un lot de sections cloné — pour dupliquer une
// phase en plusieurs FRACTIONS sans collision d'identifiants. Les références de
// formule internes à la phase sont ré-aiguillées vers les ids suffixés.
function suffixerSections (sections, sfx) {
  const ids = new Set()
  for (const s of sections) for (const ch of (s.champs || [])) ids.add(ch.id)
  for (const s of sections) {
    s.id = s.id + sfx
    for (const ch of (s.champs || [])) {
      if (ch.type === 'calcul' && ch.formule) {
        ch.formule = String(ch.formule).replace(/\{([^}]+)\}/g, (m, id) => { id = id.trim(); return ids.has(id) ? '{' + id + sfx + '}' : m })
      }
      ch.id = ch.id + sfx
      for (const col of (ch.colonnes || [])) col.id = col.id + sfx
      for (const it of (ch.items || [])) it.id = it.id + sfx
    }
  }
  return sections
}

// Assemble le formulaire d'un produit à partir de sa gamme (liste d'étapes),
// en conservant l'ordre officiel des étapes et en clonant chaque section.
// `fractions` (optionnel) = map { cléÉtape: nombre } : une étape avec N>1
// fractions est répétée N fois (ex. granulation en 2 fractions), chaque
// fraction formant sa propre phase « Nom — Fraction k » avec ses propres ids.
export function assembleGamme (gamme, fractions) {
  const choisies = (Array.isArray(gamme) && gamme.length) ? gamme : GAMME_DEFAUT
  const fr = (fractions && typeof fractions === 'object') ? fractions : {}
  const sections = []
  for (const e of ETAPES_FAB) {
    if (!choisies.includes(e.k)) continue
    const ph = PHASES_STANDARD[e.k]
    if (!ph) continue
    const n = Math.max(1, Math.min(20, parseInt(fr[e.k], 10) || 1))
    for (let k = 1; k <= n; k++) {
      const nom = n > 1 ? (ph.nom + ' — Fraction ' + k) : ph.nom
      let clone = ph.sections.map(s => JSON.parse(JSON.stringify(s)))
      if (k > 1) clone = suffixerSections(clone, '_f' + k)   // fraction 1 = ids d'origine (rétro-compatible)
      for (const s of clone) sections.push({ ...s, phase: nom })
    }
  }
  return { sections }
}

// Modèle par défaut (gamme comprimé pelliculé).
export const FORMULAIRE_DEFAUT = assembleGamme(GAMME_DEFAUT)

export const PRODUITS_REF = {
  'ROSUSTINE ® 10 mg': {
    gamme: ['pesee', 'tamisage_melange', 'compression', 'pelliculage'],
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
    // Formule de fabrication (page 5)
    formule: [
      { c: 'MPPA0070', de: 'Rosuvastatine calcium', qn: '10,40', qt: '7,49', qc: 'A =' },
      { c: 'MPEX0013', de: 'Cellulose microcristalline PH102', qn: '29,82', qt: '21,47', qc: 'B =' },
      { c: 'MPEX0158', de: 'Lactose monohydrate (Flowlac 100)', qn: '89,50', qt: '64,44', qc: '64,44' },
      { c: 'MPEX0017', de: 'Crospovidone (POLYPLASDONE XL)', qn: '7,50', qt: '5,40', qc: '5,40' },
      { c: 'MPEX0253', de: 'Calcium phosphate Tribasic', qn: '10,90', qt: '7,85', qc: '7,85' },
      { c: 'MPEX0056', de: 'Stéarate de magnésium (LIGAMED MF-2-V)', qn: '1,88', qt: '1,35', qc: '1,35' }
    ],
    formuleP: [
      { c: 'MPEX0255', de: "Aquapolish P pink 041.47 (PREMELANGE D'ENROBAGE ROSE)", qn: '4,50', qt: '4,21 (2)', qc: '4,21 (2)' },
      { c: '/', de: 'Eau purifiée', qn: 'Q.S', qt: '25,90 (2)', qc: '25,90 (2)' }
    ],
    // Liste des matières (réception, bilan) : [désignation, code]
    mats: [
      ['Rosuvastatine calcium', 'MPPA0070'],
      ['Cellulose microcristalline PH102', 'MPEX0013'],
      ['Lactose monohydrate (Flowlac 100)', 'MPEX0158'],
      ['Crospovidone (POLYPLASDONE XL)', 'MPEX0017'],
      ['Calcium phosphate Tribasic', 'MPEX0253'],
      ['Stéarate de magnésium (LIGAMED MF-2-V)', 'MPEX0056'],
      ["Aquapolish P pink 041.47 (PREMELANGE D'ENROBAGE ROSE)", 'MPEX0255']
    ],
    // Excipients pesés (page 19-20) : [désignation, code, quantité théorique]
    exc: [
      ['Cellulose microcristalline PH102', 'MPEX0013', ''],
      ['Lactose monohydrate (Flowlac 100)', 'MPEX0158', '64,44'],
      ['Crospovidone (POLYPLASDONE XL)', 'MPEX0017', '5,40'],
      ['Calcium phosphate Tribasic', 'MPEX0253', '7,85'],
      ['Stéarate de magnésium (LIGAMED MF-2-V)', 'MPEX0056', '1,35'],
      ["Aquapolish P pink 041.47 (PREMELANGE D'ENROBAGE ROSE)", 'MPEX0255', '4,21']
    ],
    // Équipements de pesée (vérif + étalonnage) : [désignation, code]
    equip: [
      ['Balance Mettler Toledo MS 3200LL/01', 'PR042'],
      ['Balance de pesée Mettler Toledo', 'PR325']
    ],
    // Diagramme de fabrication (page 8) — flux d'opérations, IPC, équipements de la ligne
    diagramme: {
      flux: [
        { nom: 'Mélange 01', items: ['Rosuvastatine calcium', 'Crospovidone'] },
        { nom: 'Tamisage (Tamis à 0.8 mm)', items: ['Mélange 01'] },
        { nom: 'Mélange 02', items: ['Mélange 1', 'Lactose monohydrate', 'Cellulose microcristalline PH102', 'Calcium phosphate tribasic'] },
        { nom: 'Lubrification', items: ['Stéarate de Magnésium (LIGAMED MF-2-V)'] },
        { nom: 'Compression', items: [] },
        { nom: 'Pelliculage', items: ["Prémélange d'enrobage rose : Aquapolish P pink 041.47, Eau purifiée"] }
      ],
      ipc: [
        'LOD — Uniformité de mélange',
        'Aspect — Masse individuelle — Dureté — Friabilité — Désagrégation',
        'Aspect — Masse — Désagrégation'
      ],
      equipements: [
        'Balances, codes : PR042 / PR325',
        '« Mélangeur en V » MAKINA 100L, code : PR210',
        'Calibreur CPS line, code PR036/PR097 — Kevin super mill, code PR03/PR311',
        '« Mélangeur en V » MPY 400, code : PR032',
        'Comprimeuse Fette 1200i, codes : PR012/PR097/PR205',
        'Pelliculeuse LABORTECNIC, code : PR024'
      ]
    },
    // Formulaire de conduite du lot — modèle Pesée par défaut (partagé)
    formulaire: FORMULAIRE_DEFAUT
  }
}
