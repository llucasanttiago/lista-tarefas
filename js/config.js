// Configuração do Supabase.
// A chave "publishable" é feita para ficar no site; seus dados são protegidos
// pelas regras de segurança (RLS) do banco. NUNCA coloque aqui a chave "secret".
window.RAIZ_CONFIG = {
  SUPABASE_URL: 'https://uosapownxjnfkxyehhmk.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable__Znexq4ZIfEFCWOa1JJl6g_AxYgeevi',
  // Chave PÚBLICA dos lembretes (a privada fica só no Supabase)
  VAPID_PUBLIC_KEY: 'BAq2nXCrvpis7XfS_Xu29AF-AbfJfWwNmm6-WO1JE9I6jevIDR9CrCcsYhkLGWKjk8t1iHMjPh7zbzzxKrXWnSU'
};
