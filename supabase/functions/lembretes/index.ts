// Edge Function "lembretes": roda a cada 5 minutos (agendada pelo pg_cron)
// e envia notificações para quem ativou lembretes no app.
//
// Segredos necessários (Supabase > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente.
//
// PRIVACIDADE: os textos são genéricos de propósito, porque aparecem
// na tela bloqueada do celular. Nunca coloque detalhes pessoais aqui.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const APP_URL = "https://llucasanttiago.github.io/lista-tarefas/";

webpush.setVapidDetails(
  APP_URL,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

type Msg = { key: string; title: string; body: string; tag: string };

function localNow(tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    min: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

const toMin = (hhmm?: string) => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendTo(sb: ReturnType<typeof createClient>, userId: string, payload: object) {
  const { data: subs } = await sb.from("push_subscriptions").select("*").eq("user_id", userId);
  let n = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload), { TTL: 600 },
      );
      n++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Botão "Enviar teste" do app: só envia para o próprio usuário logado
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data } = await sb.auth.getUser(jwt);
    if (!data?.user) return new Response("forbidden", { status: 403, headers: CORS });
    const n = await sendTo(sb, data.user.id, {
      title: "Teste 🌱", body: "Seus lembretes estão funcionando.", tag: "raiz-test", url: APP_URL,
    });
    return Response.json({ ok: true, sent: n }, { headers: CORS });
  }

  const { data: profiles, error } = await sb
    .from("profiles")
    .select("id, reminders, reminders_sent, focus_reminder_at")
    .not("reminders", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const p of profiles ?? []) {
    const r = p.reminders ?? {};
    if (!r.enabled) continue;

    const now = localNow(r.tz || "America/Sao_Paulo");
    const done: Record<string, string> = { ...(p.reminders_sent ?? {}) };
    const msgs: Msg[] = [];

    // Dispara dentro de uma janela de 30 min após o horário, uma vez por dia
    const due = (key: string, at: number | null) => {
      if (at === null || done[key] === now.date) return false;
      const diff = (now.min - at + 1440) % 1440;
      return diff < 30;
    };

    if (due("morning", toMin(r.morning))) {
      msgs.push({ key: "morning", tag: "raiz-morning", title: "Bom dia 🌱", body: "Uma coisa de cada vez. Veja sua sugestão para agora." });
    }
    if (due("evening", toMin(r.evening))) {
      msgs.push({ key: "evening", tag: "raiz-evening", title: "Hora de fechar o dia 🌙", body: "Leva 1 minuto. Sem julgamento." });
    }
    if (r.risk && Number.isInteger(r.riskHour)) {
      const at = (r.riskHour * 60 - 15 + 1440) % 1440; // 15 min antes
      if (due("risk", at)) {
        msgs.push({ key: "risk", tag: "raiz-risk", title: "Momento de atenção 💪", body: "Seu horário mais difícil está chegando. Abra o Raiz e lembre do seu plano." });
      }
    }

    let clearFocus = false;
    if (r.focus !== false && p.focus_reminder_at && new Date(p.focus_reminder_at) <= new Date()) {
      msgs.push({ key: "focus", tag: "raiz-focus", title: "Voltou? 🤍", body: "Me conta como foi. Qualquer resposta vale." });
      clearFocus = true;
    }

    if (!msgs.length) continue;

    for (const m of msgs) {
      sent += await sendTo(sb, p.id, { title: m.title, body: m.body, tag: m.tag, url: APP_URL });
      if (m.key !== "focus") done[m.key] = now.date;
    }

    const patch: Record<string, unknown> = { reminders_sent: done };
    if (clearFocus) patch.focus_reminder_at = null;
    await sb.from("profiles").update(patch).eq("id", p.id);
  }

  return Response.json({ ok: true, sent });
});
