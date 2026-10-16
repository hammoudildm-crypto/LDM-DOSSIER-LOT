# Dossier de lot électronique (eBMR) — LDM

Application **autonome** de dossier de lot numérique, pour **remplacer la version papier**.
Première forme couverte : **comprimés** (forme sèche). Les gélules et le semi-solide
(crème/gel/pommade) viendront ensuite sur la même structure.

Pile : Vue 3 + Vite + Supabase (même base que ProdTrack / Pesée). SPA statique, GitHub Pages.

## Ce que fait l'app
- Saisie complète d'un dossier de lot comprimés : identification, composition/formule,
  équipements, conditions, étapes de fabrication (pesée → mélange → granulation → séchage →
  calibrage → lubrification → compression → pelliculage), contrôles en cours (IPC),
  rendements & réconciliation, déviations, revue & libération.
- Calculs automatiques (totaux matières, rendements %, bilan de réconciliation).
- **Enregistrement en base** (table `dossiers_lot`) et **rechargement** des dossiers.
- **Impression / PDF** d'un dossier de lot propre (via la fonction d'impression du navigateur).

## Étape unique avant d'enregistrer : créer la table
Dans Supabase → **SQL Editor** → colle le contenu de
`supabase_table_dossiers_lot.sql` → **Run**. (À faire une seule fois.)
Tant que la table n'existe pas, le formulaire fonctionne et s'imprime, mais
l'enregistrement en base est désactivé (un message te le rappelle).

## Mise en ligne (GitHub Pages)
1. Crée un dépôt **public** `LDM-DOSSIER-LOT` sous `hammoudildm-crypto`.
2. **Settings → Pages → Source = GitHub Actions.**
3. Dézippe et dépose **tout le contenu** (garde `.github`, `public`, `src`, et le
   `package-lock.json`). **Commit.**
4. En ligne sous `https://hammoudildm-crypto.github.io/LDM-DOSSIER-LOT/`.

> Dépôt nommé autrement ? Change la seule ligne `base:` dans `vite.config.js`.

## Développement local
```bash
npm install
npm run dev
npm run build
```

## Suite prévue
- Gélules (remplissage gélules au lieu de compression).
- Semi-solide (phase aqueuse/huileuse → émulsification → homogénéisation → refroidissement → remplissage tubes/pots).
- Pré-remplissage depuis les OF/produits de ProdTrack.
