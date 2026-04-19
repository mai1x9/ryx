import { createClient } from '@supabase/supabase-js';

let supabase = null;

export async function initSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.log('[Supabase] URL or key not configured, skipping');
    return null;
  }

  supabase = createClient(url, key);

  const { error } = await supabase.from('users').select('id').limit(1);

  if (error && (error.message.includes('does not exist') || error.code === 'PGRST205')) {
    console.log('[Supabase] Creating users table...');
    try {
      await supabase.from('users').insert([{
        fullname: '_init_',
        email: 'init@temp.com',
        installation_id: '_init_'
      }]);
      await supabase.from('users').delete().eq('installation_id', '_init_');
      console.log('[Supabase] Table created successfully');
    } catch (e) {
      console.log('[Supabase] Table creation error:', e.message);
    }
  }

  console.log('[Supabase] Connected');
  return supabase;
}

export function getSupabase() {
  return supabase;
}

export async function saveUser(userData) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('users')
    .upsert(userData, { onConflict: 'installation_id' })
    .select()
    .single();

  return { data, error };
}

export async function getUserByEmail(email) {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  return { data, error };
}