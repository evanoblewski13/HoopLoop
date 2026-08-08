(() => {
  'use strict';
  async function syncTheme() {
    const config = window.HOOPLOOP_CONFIG || {};
    const configured = /^https:\/\/.+\.supabase\.co$/i.test(String(config.SUPABASE_URL || ''))
      && Boolean(config.SUPABASE_ANON_KEY)
      && !String(config.SUPABASE_ANON_KEY).includes('PASTE_');
    if (!configured || !window.supabase || !window.HoopLoopTheme) return;
    try {
      const client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
      });
      const { data: { session } } = await client.auth.getSession();
      if (!session?.user?.id) return;
      const { data } = await client.from('profiles').select('accent_color').eq('id', session.user.id).maybeSingle();
      if (data?.accent_color) window.HoopLoopTheme.apply(data.accent_color);
    } catch (error) {
      console.warn('HoopLoop theme sync skipped:', error?.message || error);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncTheme, { once:true });
  else syncTheme();
})();
