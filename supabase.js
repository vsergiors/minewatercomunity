// =============================================
//  supabase.js — Configuración global de Supabase
//  Cambia SUPABASE_URL y SUPABASE_ANON_KEY por los tuyos
// =============================================

const SUPABASE_URL  = 'https://gkuuwuqwumoorqmqkuka.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdXV3dXF3dW1vb3JxbXFrdWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjUwMDksImV4cCI6MjA5MDQ0MTAwOX0.ME8C09iSbowqcak2Bezbd4otWzTXyR3bV8kf4hfodUg';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

export { sb, SUPABASE_URL, SUPABASE_ANON };
