// Edge Function "lembretes": roda a cada 5 minutos (agendada pelo pg_cron)
// e envia notificações para quem ativou lembretes no app.
//
// Segredos necessários (Supabase > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET
//   SERVICE_KEY (opcional): a chave "secret" (sb_secret_...) do projeto. Use quando o
//   projeto tem as chaves novas e a SUPABASE_SERVICE_ROLE_KEY automática não funciona.
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

function dowOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1; // 1=seg … 7=dom
}
function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

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

type SendErr = { status?: number; message: string };

async function sendTo(sb: ReturnType<typeof createClient>, userId: string, payload: object, errors?: SendErr[]) {
  const { data: subs } = await sb.from("push_subscriptions").select("*").eq("user_id", userId);
  let n = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload), { TTL: 600, urgency: "high" },
      );
      n++;
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string };
      const code = err.statusCode;
      console.error("push falhou", code, err.body || err.message);
      errors?.push({ status: code, message: String(err.body || err.message || e).slice(0, 200) });
      if (code === 404 || code === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return n;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const custom = (Deno.env.get("SERVICE_KEY") ?? "").trim();
  const ADMIN_KEY = custom || (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const sb = createClient(URL_, ADMIN_KEY, { auth: { persistSession: false } });
  // tipo da chave em uso (sem revelar a chave): ajuda no diagnóstico
  const keyKind = ADMIN_KEY.startsWith("sb_secret_") ? "secret (sb_secret_)"
    : ADMIN_KEY.startsWith("sb_publishable_") ? "publishable (errada: é a pública)"
    : ADMIN_KEY.startsWith("eyJ") ? "JWT antiga (service_role ou anon)" : ADMIN_KEY ? "formato desconhecido" : "vazia";

  // Botão "Enviar teste" do app: só envia para o próprio usuário logado
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    // cliente com o login da própria pessoa (não depende da chave de administrador)
    const me = createClient(URL_, apikey, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
    const { data } = await me.auth.getUser(jwt);
    if (!data?.user) return new Response("forbidden", { status: 403, headers: CORS });
    const { count, error: cErr } = await me.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", data.user.id);
    // confere se a chave de administrador (usada pelos lembretes agendados) funciona
    const { count: aCount, error: aErr0 } = await sb.from("profiles").select("id", { count: "exact", head: true }).eq("id", data.user.id);
    const aErr = aErr0 ?? (aCount ? null : { message: "a chave não tem acesso de administrador (não enxerga os perfis)" });
    const errors: SendErr[] = [];
    const n = await sendTo(me, data.user.id, {
      title: "Teste 🌱", body: "Seus lembretes estão funcionando.", tag: "raiz-test", url: APP_URL,
    }, errors);
    return Response.json({
      ok: true, sent: n, subs: count ?? 0, subsError: cErr?.message ?? null, errors,
      adminOk: !aErr, adminError: aErr?.message ?? null, adminKey: custom ? "SERVICE_KEY" : "SUPABASE_SERVICE_ROLE_KEY", keyKind,
      version: 9,
    }, { headers: CORS });
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

    // Lembrete de cada hábito (horário definido no app) e "sequência em risco"
    if (r.habits !== false || r.streak !== false) {
      const { data: habits } = await sb.from("habits")
        .select("id, name, icon, remind_at, days, daily_goal, archived")
        .eq("user_id", p.id).eq("archived", false);
      const { data: logs } = await sb.from("habit_logs")
        .select("habit_id, date, amount")
        .eq("user_id", p.id).gte("date", addDays(now.date, -2));
      const goal = new Map((habits ?? []).map((h) => [h.id, Math.max(1, h.daily_goal ?? 1)]));
      const doneOn = (hid: string, date: string) =>
        (logs ?? []).some((l) => l.habit_id === hid && l.date === date && (l.amount ?? 1) >= (goal.get(hid) ?? 1));
      const dow = dowOf(now.date);

      if (r.habits !== false) {
        for (const h of habits ?? []) {
          if (!h.remind_at) continue;
          if (h.days && h.days.length && !h.days.includes(dow)) continue;
          if (doneOn(h.id, now.date)) continue;
          const key = "h:" + h.id;
          if (!due(key, toMin(h.remind_at))) continue;
          msgs.push({
            key, tag: "raiz-h-" + h.id,
            title: r.showNames ? `${h.icon ?? "⏰"} ${h.name}` : "Hora do seu hábito ⏰",
            body: "Um passo pequeno agora. Bora?",
          });
        }
      }

      if (r.streak !== false) {
        const anyToday = (habits ?? []).some((h) => doneOn(h.id, now.date));
        const anyYesterday = (habits ?? []).some((h) => doneOn(h.id, addDays(now.date, -1)));
        if (!anyToday && anyYesterday && due("streak", toMin(r.streakAt || "20:30"))) {
          msgs.push({ key: "streak", tag: "raiz-streak", title: "🔥 Sua sequência está em risco", body: "Faça 1 hábito hoje para não perder seus dias seguidos." });
        }
      }
    }

    // Treino anti-coçar: modo noite (aviso de início + checagens "como estão suas mãos?")
    const hn = r.hrtNight;
    if (hn && hn.on) {
      const from = toMin(hn.from), to = toMin(hn.to);
      const inWin = from !== null && to !== null && (from <= to ? now.min >= from && now.min < to : now.min >= from || now.min < to);
      if (inWin) {
        if (due("hrtStart", from)) {
          msgs.push({ key: "hrtStart", tag: "raiz-hrt-night", title: "🌙 Começou seu horário de atenção", body: "Deixe as mãos ocupadas. Se vier a vontade: mãos nas coxas por 1 minuto." });
          done.hrtLast = new Date().toISOString();
        } else {
          const last = done.hrtLast ? new Date(done.hrtLast).getTime() : 0;
          if (Date.now() - last >= Math.max(15, Number(hn.every) || 30) * 60000) {
            msgs.push({ key: "hrtCheck", tag: "raiz-hrt-remind", title: "✋ Como estão suas mãos?", body: "Repare no corpo por 3 segundos. Vontade não é ordem." });
            done.hrtLast = new Date().toISOString();
          }
        }
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
      if (m.key !== "focus" && m.key !== "hrtCheck") done[m.key] = now.date;
    }
    // limpa marcas antigas de lembretes de hábitos
    for (const k of Object.keys(done)) {
      if (k.startsWith("h:") && done[k] !== now.date) delete done[k];
    }

    const patch: Record<string, unknown> = { reminders_sent: done };
    if (clearFocus) patch.focus_reminder_at = null;
    await sb.from("profiles").update(patch).eq("id", p.id);
  }

  return Response.json({ ok: true, sent });
});
