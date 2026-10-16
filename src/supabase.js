import { createClient } from '@supabase/supabase-js'

// URL + clé "publishable" en dur. Sans risque : ces 2 valeurs sont de toute
// façon visibles dans le site. Ce sont les règles RLS qui protègent les données.
// (Mêmes valeurs que ProdTrack / LDM-FAB3 — l'app Pesée pointe sur la MÊME base.)
const SUPABASE_URL = 'https://lpojdepnssxpnsqrrwoc.supabase.co'
const SUPABASE_KEY = 'sb_publishable_dyH_MussLiMxLVcjE3QoEA_E2h0XEHw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
