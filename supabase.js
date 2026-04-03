// =============================================
//  supabase.js — Configuración global de Supabase
//  Cambia SUPABASE_URL y SUPABASE_ANON_KEY por los tuyos
// =============================================

const SUPABASE_URL  = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON = 'TU_ANON_KEY';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

export { sb, SUPABASE_URL, SUPABASE_ANON };
