# 🌱 Raiz: hábitos que te sustentam

App pessoal para criar hábitos saudáveis, controlar impulsos e acalmar a ansiedade.
Os dados ficam salvos no Supabase, com login e senha. Funciona no PC e no celular e pode ser instalado como app.

## O que tem

- **Tela inicial focada**: mostra só UMA sugestão do que fazer agora. Você toca em "Começar", recebe uma mensagem para focar e, ao voltar, conta como foi (consegui / fiz só um pouco / não deu). Toda resposta é recebida com acolhimento
- **À noite, "Fechar o dia"**: confirma os hábitos de evitar e manter (gatilhos, sono…) sem julgamento
- **Plano anti-impulso**: seus motivos e planos "Se… então…", mostrados automaticamente quando você aperta 🌊 Impulso
- **Mapa de risco**: em que horários e dias os impulsos aparecem; nesse horário a tela Hoje mostra seu plano
- **Revisão da semana** (domingo a terça): resumo, o que deu certo e UM foco para a semana seguinte
- **Lembretes** no celular: bom dia, fechar o dia, horário de risco e "como foi?" (textos sempre genéricos)
- **Menus**: Hoje · Plano (hábitos, metas, tarefas) · Mente · Progresso (com conquistas) · Perfil
- **Hábitos diários** com meta semanal (ex.: malhar 4x por semana) e bolinhas da semana
- **Sequência de dias** 🔥 com **protetores** 🛡️: a cada 7 dias seguidos você ganha 1, e ele salva sua sequência se você falhar um dia
- **XP, níveis e 28 conquistas**, de Semente até Floresta
- **Botão 🌊 Impulso**: respiração guiada de 90s para "surfar a onda", registro de gatilhos e se você resistiu
- **Check-in de humor e ansiedade**, de manhã e à noite
- **Meditação mindfulness** com timer e botão **"Me distraí e voltei"**, que conta cada volta ao foco (também tem escaneamento corporal, para ansiedade e silenciosa)
- **Escrita terapêutica** de até 10 minutos, com perguntas-guia; os textos ficam salvos só para você
- **Metas**: contador de "Dias livre de…" com marcos (1, 3, 7, 14, 30, 90… dias) e recomeço sem perder o recorde, mais metas numéricas
- **Sugestões de hábitos** por categoria (corpo, mente, autocontrole, sono, vida)
- **Marcação automática**: meditar, escrever ou resistir a um impulso já marca o hábito correspondente
- **Bloqueio com PIN** por aparelho e **recuperação de senha** por email
- **Socorro rápido**: respiração 4-7-8, respiração quadrada, aterramento 5-4-3-2-1
- **Progresso**: mapa de dias, gráfico de humor e ansiedade, taxa por hábito, estatísticas de impulsos
- **"O que te ajuda"**: mostra quais hábitos baixam sua ansiedade, com base nos seus próprios dados
- **Modo dia difícil** 🌧️: mostra só os hábitos essenciais
- **Tarefas avulsas** do dia
- **Backup**: baixe todos os seus dados em JSON

## Configuração (uma vez só)

### 1. Criar o banco no Supabase
1. Entre em [supabase.com](https://supabase.com) e crie uma conta (pode usar "Continue with GitHub").
2. **New project**: dê um nome (ex.: `raiz`), crie uma senha do banco (guarde) e escolha a região **South America (São Paulo)**.
3. Quando o projeto terminar de criar, vá em **SQL Editor → New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.

### 2. Conectar o app
1. No Supabase: **Project Settings → API** (ou **Data API / API Keys**).
2. Copie a **Project URL** e a chave **anon public**.
3. Cole as duas em [`js/config.js`](js/config.js).

> A chave `anon` pode ficar no código: seus dados são protegidos pelas regras de segurança (RLS) do banco.
> **Nunca** use a chave `service_role` no app.

### 3. Links de email (confirmação e "esqueci minha senha")
Em **Authentication → URL Configuration**:
- **Site URL:** `https://llucasanttiago.github.io/lista-tarefas/`
- **Redirect URLs:** adicione o mesmo endereço.

Sem isso, os links dos emails abrem uma página errada.

### 4. Fechar o cadastro (privacidade)
Depois de criar a sua conta, vá em **Authentication → Sign In / Providers** e desligue **Allow new users to sign up**.
Assim ninguém mais consegue criar conta no seu app. Mesmo com o cadastro aberto, ninguém veria seus dados, mas fechar é mais seguro.

### 5. Lembretes no celular (opcional)
As chaves ficam no arquivo local `.secrets/lembretes.txt`, que **não** vai para o GitHub.

1. **Edge Functions → Deploy a new function → Via Editor.** Nome: `lembretes`. Apague o código de exemplo, cole todo o [`supabase/functions/lembretes/index.ts`](supabase/functions/lembretes/index.ts) e clique em **Deploy**.
2. Abra a função `lembretes` → **Details / Settings** e **desligue "Verify JWT"** (Enforce JWT verification). Sem isso, o agendamento não consegue chamar a função.
3. **Edge Functions → Secrets:** adicione as 3 chaves do arquivo `.secrets/lembretes.txt` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`).
4. **SQL Editor:** rode o bloco "SQL para agendar" do mesmo arquivo. Ele chama a função a cada 5 minutos.
5. No celular, abra o app pelo endereço do GitHub Pages e vá em **Perfil → Lembretes → Ativar**. Depois toque em **Enviar teste**.
   No iPhone, primeiro instale o app: **Compartilhar → Adicionar à Tela de Início**.

> Se você atualizar o app e ele pedir, rode o `supabase/schema.sql` de novo. Pode rodar quantas vezes quiser: ele não apaga nada.

## Usar

- **No PC:** dê dois cliques no `index.html`.
- **Publicado (para usar no celular):** ative o GitHub Pages no repositório (**Settings → Pages → Branch: main / root**).
  O endereço fica `https://SEU-USUARIO.github.io/lista-tarefas/`.
- **Instalar no celular:** abra o endereço no Chrome (Android) ou Safari (iPhone) e toque em **"Adicionar à tela inicial"**.

## Estrutura

```
index.html            telas e navegação
css/style.css         visual
js/config.js          chaves do Supabase
js/utils.js           datas, sons, toasts, modais
js/data.js            acesso ao banco e estado
js/gamification.js    XP, níveis, sequência, protetores, conquistas
js/exercises.js       impulso, respiração, meditação, aterramento
js/views.js           telas (Hoje, Meditar, Progresso, Conquistas, Perfil)
js/app.js             login, ações e inicialização
supabase/schema.sql   tabelas e regras de segurança
sw.js, manifest       app instalável (PWA)
```

## Apoio gratuito

O Raiz é uma ferramenta de apoio e não substitui ajuda profissional.
- **CVV: 188** (24h, gratuito) ou chat em cvv.org.br
- **CAPS / SUS**: atendimento psicológico gratuito, inclusive para dependências (CAPS AD). Procure a UBS do seu bairro.
- **Clínicas-escola de Psicologia** em faculdades: gratuito ou a preço simbólico.
