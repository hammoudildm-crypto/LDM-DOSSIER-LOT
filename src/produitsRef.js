// =====================================================================
//  Catalogue des produits (données de référence de l'IF par produit).
//  Sélectionner un produit charge ces données fixes dans le dossier ;
//  l'opérateur ne saisit ensuite que les valeurs réelles du lot.
//  Pour ajouter un produit : copier ce bloc et adapter les valeurs.
// =====================================================================
export const PRODUITS_REF = {
  'ROSUSTINE ® 10 mg': {
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
    ]
  }
}
