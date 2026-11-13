# Próximos passos (para continuar a sessão)

Estado em 12/11/2026: versão 5 publicada no GitHub Pages, schema v5 rodado no Supabase,
`SERVICE_KEY` configurado e permissões do `service_role` concedidas. O agendamento (pg_cron)
roda a cada 5 min e a função `lembretes` envia com sucesso (`"sent":1` nos registros).

## Pendente
1. **Publicar a função `lembretes` de novo** (Edge Functions → lembretes → colar `supabase/functions/lembretes/index.ts` → Deploy).
   A versão no GitHub guarda a notificação por até 2 h (TTL 7200) e devolve um resumo do que avaliou (`debug`).
2. **iPhone (iOS):** a notificação chega, mas só aparece ao abrir o app. Provável Modo Foco / entrega silenciosa.
   Conferir: Ajustes → Foco (Não Perturbe e Dormir) → permitir o Raiz; Ajustes → Notificações → Raiz →
   Entrega Imediata, Banners, Sons; Modo de Pouca Energia desligado. Depois testar um lembrete 3 min à frente com o app em segundo plano.
3. Se ainda não aparecer, rodar no SQL Editor e analisar o campo `debug`:
   ```sql
   select left(content::text, 900) as resposta, created
   from net._http_response order by created desc limit 3;
   ```
4. Quando estiver tudo certo, dá para remover o campo `debug` da resposta da função (opcional).

## Testes locais
Há um teste de ponta a ponta com Supabase falso (puppeteer) que não está no repositório.
Para recriar: servir a pasta, interceptar o script do supabase-js e trocar por um cliente em memória.
