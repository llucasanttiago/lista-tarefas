// Camada de dados (Supabase) e estado global do app.
(function () {
  const C = window.RAIZ_CONFIG || {};

  window.S = {
    user: null,
    profile: null,
    habits: [],
    logs: [],          // { habit_id, date, amount, created_at }
    logMap: new Map(), // "habitId|date" -> amount
    tasks: [],
    moods: [],
    impulses: [],
    meds: [],
    freezes: [],       // datas salvas por protetor
    journal: [],
    goals: [],
    achievements: new Map(), // code -> unlocked_at
    flags: { hardDay: false, grounding: false },
    reviews: [],
    focusSessions: [],
    tab: 'hoje',
    online: navigator.onLine !== false
  };

  // Nomes genéricos de propósito: o código é público. Renomeie no app
  // (Perfil → Meus hábitos) e o nome real fica só no seu banco privado.
  const DEFAULT_HABITS = [
    { name: 'Meditação mindfulness', icon: '🧘', target_per_week: 7, essential: true },
    { name: '30 min de caminhada ou exercício', icon: '🚶', target_per_week: 5, essential: true },
    { name: 'Não obedeci automaticamente aos impulsos', icon: '🌊', target_per_week: 7, essential: true },
    { name: 'Evitei os gatilhos da compulsão', icon: '🧭', target_per_week: 7, essential: false },
    { name: 'Escrita terapêutica (até 10 min)', icon: '✍️', target_per_week: 7, essential: false },
    { name: 'Mantive horário regular de sono', icon: '😴', target_per_week: 7, essential: false }
  ];

  // Colunas que só existem depois de rodar o schema.sql v5.
  const V5_COLS = {
    habits: ['days', 'time_of_day', 'daily_goal', 'unit', 'kind', 'remind_at', 'color'],
    habit_logs: ['amount'],
    tasks: ['priority', 'note'],
    profiles: ['coins', 'settings', 'daily']
  };
  const LOCAL_PROFILE = 'raiz-local-profile';

  const DB = {
    client: null,
    v5: false,

    // Sem o banco atualizado, remove os campos novos (e guarda os do perfil no aparelho)
    strip(table, row) {
      if (this.v5 || !V5_COLS[table]) return row;
      const out = Array.isArray(row) ? row.map(r => this.strip(table, r)) : { ...row };
      if (!Array.isArray(out)) V5_COLS[table].forEach(k => delete out[k]);
      return out;
    },

    configured() {
      return typeof C.SUPABASE_URL === 'string' && /^https:\/\//.test(C.SUPABASE_URL) &&
        typeof C.SUPABASE_ANON_KEY === 'string' && C.SUPABASE_ANON_KEY.length > 20;
    },

    init() {
      if (!this.configured() || !window.supabase) return false;
      this.client = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      return true;
    },

    // Busca todas as linhas (o Supabase devolve no máximo 1000 por vez).
    async fetchAll(table, order = 'created_at') {
      const size = 1000;
      let from = 0, out = [];
      for (;;) {
        const { data, error } = await this.client.from(table).select('*')
          .order(order, { ascending: true }).range(from, from + size - 1);
        if (error) throw error;
        out = out.concat(data);
        if (data.length < size) return out;
        from += size;
      }
    },

    async insert(table, row) {
      const { data, error } = await this.client.from(table).insert(this.strip(table, row)).select().single();
      if (error) throw error;
      return data;
    },
    async insertMany(table, rows) {
      const { data, error } = await this.client.from(table).insert(this.strip(table, rows)).select();
      if (error) throw error;
      return data;
    },
    async update(table, id, patch, key = 'id') {
      const clean = this.strip(table, patch);
      if (!Object.keys(clean).length) return null;
      const { data, error } = await this.client.from(table).update(clean).eq(key, id).select().single();
      if (error) throw error;
      return data;
    },
    async upsert(table, row, onConflict) {
      const { data, error } = await this.client.from(table).upsert(this.strip(table, row), { onConflict }).select().single();
      if (error) throw error;
      return data;
    },
    async remove(table, match) {
      let q = this.client.from(table).delete();
      for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
      const { error } = await q;
      if (error) throw error;
    },

    async updateProfile(patch) {
      Object.assign(S.profile, patch);
      if (!this.v5) {
        const local = {};
        V5_COLS.profiles.forEach(k => { if (k in patch) local[k] = patch[k]; });
        if (Object.keys(local).length) {
          try {
            const all = JSON.parse(localStorage.getItem(LOCAL_PROFILE) || '{}');
            all[S.user.id] = Object.assign(all[S.user.id] || {}, local);
            localStorage.setItem(LOCAL_PROFILE, JSON.stringify(all));
          } catch { /* ignore */ }
        }
      }
      return this.update('profiles', S.user.id, patch);
    },

    async loadAll() {
      const uid = S.user.id;
      let { data: profile, error } = await this.client.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (error) throw error;

      if (!profile) {
        const name = (S.user.user_metadata && S.user.user_metadata.name) || (S.user.email || '').split('@')[0];
        profile = await this.insert('profiles', { id: uid, display_name: name });
        await this.insertMany('habits', DEFAULT_HABITS.map((h, i) => ({ ...h, position: i, user_id: uid })));
      }
      this.v5 = 'settings' in profile && 'coins' in profile;
      if (!this.v5) {
        // banco antigo: moedas, missões e ajustes ficam guardados neste aparelho
        let local = {};
        try { local = (JSON.parse(localStorage.getItem(LOCAL_PROFILE) || '{}'))[uid] || {}; } catch { /* ignore */ }
        profile = Object.assign({ coins: 0, settings: {}, daily: {} }, local, profile);
      }
      profile.settings = profile.settings || {};
      profile.daily = profile.daily || {};
      profile.coins = profile.coins || 0;
      S.profile = profile;

      const [habits, logs, tasks, moods, impulses, meds, freezes, ach, journal, goals, reviews, focusSessions] = await Promise.all([
        this.fetchAll('habits', 'position'),
        this.fetchAll('habit_logs', 'date'),
        this.fetchAll('tasks'),
        this.fetchAll('mood_checkins', 'date'),
        this.fetchAll('impulse_logs'),
        this.fetchAll('meditation_sessions'),
        this.fetchAll('streak_freezes', 'date'),
        this.fetchAll('achievements', 'unlocked_at'),
        // tabelas mais novas: se ainda não existirem, o app abre mesmo assim
        this.fetchAll('journal_entries').catch(e => { console.warn('journal_entries:', e.message); return []; }),
        this.fetchAll('goals', 'position').catch(e => { console.warn('goals:', e.message); return []; }),
        this.fetchAll('weekly_reviews').catch(e => { console.warn('weekly_reviews:', e.message); return []; }),
        this.fetchAll('focus_sessions').catch(e => { console.warn('focus_sessions:', e.message); return []; })
      ]);
      S.focusSessions = focusSessions;
      S.journal = journal;
      S.goals = goals;
      S.reviews = reviews;
      S.habits = habits;
      S.logs = logs.map(l => ({ habit_id: l.habit_id, date: l.date, amount: l.amount || 1, created_at: l.created_at }));
      S.tasks = tasks;
      S.moods = moods;
      S.impulses = impulses;
      S.meds = meds;
      S.freezes = freezes.map(f => f.date);
      S.achievements = new Map(ach.map(a => [a.code, a.unlocked_at]));
      G.reindex();
    }
  };

  window.DB = DB;
})();
