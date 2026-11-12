// Camada de dados (Supabase) e estado global do app.
(function () {
  const C = window.RAIZ_CONFIG || {};

  window.S = {
    user: null,
    profile: null,
    habits: [],
    logs: [],          // { habit_id, date }
    logSet: new Set(), // "habitId|date"
    tasks: [],
    moods: [],
    impulses: [],
    meds: [],
    freezes: [],       // datas salvas por protetor
    journal: [],
    goals: [],
    achievements: new Map(), // code -> unlocked_at
    flags: { hardDay: false, grounding: false },
    tab: 'hoje'
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

  const DB = {
    client: null,

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
      const { data, error } = await this.client.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },
    async insertMany(table, rows) {
      const { data, error } = await this.client.from(table).insert(rows).select();
      if (error) throw error;
      return data;
    },
    async update(table, id, patch, key = 'id') {
      const { data, error } = await this.client.from(table).update(patch).eq(key, id).select().single();
      if (error) throw error;
      return data;
    },
    async upsert(table, row, onConflict) {
      const { data, error } = await this.client.from(table).upsert(row, { onConflict }).select().single();
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
      S.profile = profile;

      const [habits, logs, tasks, moods, impulses, meds, freezes, ach, journal, goals, reviews] = await Promise.all([
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
        this.fetchAll('weekly_reviews').catch(e => { console.warn('weekly_reviews:', e.message); return []; })
      ]);
      S.journal = journal;
      S.goals = goals;
      S.reviews = reviews;
      S.habits = habits;
      S.logs = logs.map(l => ({ habit_id: l.habit_id, date: l.date }));
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
