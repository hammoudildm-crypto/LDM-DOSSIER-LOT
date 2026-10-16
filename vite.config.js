import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Pré-configuré pour un dépôt GitHub nommé : hammoudildm-crypto/LDM-DOSSIER-LOT
// → site servi sous https://hammoudildm-crypto.github.io/LDM-DOSSIER-LOT/
// ⚠️ Si tu crées le dépôt sous un AUTRE nom, change UNIQUEMENT cette ligne.
export default defineConfig({
  plugins: [vue()],
  base: '/LDM-DOSSIER-LOT/',
})
