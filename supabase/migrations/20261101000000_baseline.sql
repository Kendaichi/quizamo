-- ============================================================================
-- Quizamo baseline schema (reconstructed).
--
-- The original project applied `docs/quizmosa-db.sql` by hand; that file is not
-- in the repo. This baseline was reconstructed from the generated Database type
-- and from what the 5 incremental migrations assume. It is the PRE-migration
-- state, so it deliberately leaves out anything the later migrations add:
--   * participants' self-paced columns (added by …_self_paced_pretest)
--   * the helper fns my_host_id / my_hosted_session_ids / my_session_ids /
--     my_current_question_ids (created by …_rls_fixes)
--   * all the session/host/quizzer RPCs (created by …_session_rpcs, _self_paced)
-- It DOES provide what …_rls_fixes needs before it runs: my_quizzer_id(),
-- is_host(), get_leaderboard(bigint) (stub, replaced later), and the base
-- policies it drops & recreates.
--
-- Run order: this file first, then the 4 numbered migrations in order.
-- ============================================================================

-- Enums ----------------------------------------------------------------------
create type public.questionnaire_kind as enum ('standard', 'pretest', 'posttest');
create type public.session_status     as enum ('lobby', 'question', 'reveal', 'finished');

-- Tables ---------------------------------------------------------------------
create table public.hosts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  host_name  text not null,
  created_at timestamptz not null default now()
);

create table public.quizzers (
  id         bigint generated always as identity primary key,
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  full_name  text not null,
  alias      text,
  created_at timestamptz not null default now()
);

create table public.questionnaires (
  id                   bigint generated always as identity primary key,
  host_id              bigint not null references public.hosts (id) on delete cascade,
  name                 text not null,
  kind                 public.questionnaire_kind not null default 'standard',
  seconds_per_question int not null default 20,
  created_at           timestamptz not null default now()
);

create table public.questions (
  id               bigint generated always as identity primary key,
  questionnaire_id bigint not null references public.questionnaires (id) on delete cascade,
  prompt           text not null,
  choice_a         text not null,
  choice_b         text not null,
  choice_c         text,
  choice_d         text,
  points           int not null default 1000,
  position         int not null,
  image_path       text,
  seconds_override int,
  created_at       timestamptz not null default now(),
  -- Deferred so reorder_questions can swap positions in one statement.
  constraint questions_order_unique unique (questionnaire_id, position) deferrable initially deferred
);

create table public.question_keys (
  question_id    bigint primary key references public.questions (id) on delete cascade,
  correct_choice text not null
);

create table public.sessions (
  id                  bigint generated always as identity primary key,
  host_id             bigint not null references public.hosts (id) on delete cascade,
  questionnaire_id    bigint not null references public.questionnaires (id) on delete cascade,
  join_code           text not null unique,
  status              public.session_status not null default 'lobby',
  current_question_id bigint references public.questions (id) on delete set null,
  started_at          timestamptz,
  ended_at            timestamptz,
  question_started_at timestamptz,
  question_ends_at    timestamptz,
  created_at          timestamptz not null default now()
);

create table public.participants (
  id           bigint generated always as identity primary key,
  session_id   bigint not null references public.sessions (id) on delete cascade,
  quizzer_id   bigint not null references public.quizzers (id) on delete cascade,
  display_name text not null,
  is_kicked    boolean not null default false,
  joined_at    timestamptz not null default now(),
  constraint participants_session_quizzer_unique unique (session_id, quizzer_id),
  constraint participants_session_name_unique    unique (session_id, display_name)
);

create table public.answers (
  id             bigint generated always as identity primary key,
  session_id     bigint not null references public.sessions (id) on delete cascade,
  participant_id bigint not null references public.participants (id) on delete cascade,
  question_id    bigint not null references public.questions (id) on delete cascade,
  selected_choice text not null,
  is_correct     boolean not null,
  points_awarded int not null default 0,
  response_ms    int not null,
  submitted_at   timestamptz not null default now(),
  constraint answers_participant_question_unique unique (participant_id, question_id)
);

create index on public.questions (questionnaire_id);
create index on public.sessions (questionnaire_id);
create index on public.participants (session_id);
create index on public.participants (quizzer_id);
create index on public.answers (session_id);
create index on public.answers (participant_id);
create index on public.answers (question_id);

-- Baseline helper functions (…_rls_fixes grants on these, so they must exist) --
create function public.my_quizzer_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from quizzers where user_id = auth.uid();
$$;

create function public.is_host() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from hosts where user_id = auth.uid());
$$;

-- Stub: …_session_rpcs replaces this with the real body. Signature must match.
create function public.get_leaderboard(p_session_id bigint)
returns table (rank bigint, participant_id bigint, display_name text,
               score bigint, correct_count bigint, total_correct_ms bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  return;
end $$;

-- Row level security ---------------------------------------------------------
alter table public.hosts          enable row level security;
alter table public.quizzers       enable row level security;
alter table public.questionnaires enable row level security;
alter table public.questions      enable row level security;
alter table public.question_keys  enable row level security;
alter table public.sessions       enable row level security;
alter table public.participants   enable row level security;
alter table public.answers        enable row level security;

-- Policies named the way …_rls_fixes expects (it drops & recreates most of
-- these using the security-definer helpers; the inline subqueries below are the
-- pre-fix versions and only need to exist and be valid).

create policy host_self on public.hosts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Not touched by …_rls_fixes, so this is the live host policy for questionnaires.
create policy host_questionnaires on public.questionnaires
  for all to authenticated
  using (host_id in (select id from hosts where user_id = auth.uid()))
  with check (host_id in (select id from hosts where user_id = auth.uid()));

create policy host_questions on public.questions
  for all to authenticated
  using (questionnaire_id in (select qn.id from questionnaires qn
           join hosts h on h.id = qn.host_id where h.user_id = auth.uid()))
  with check (questionnaire_id in (select qn.id from questionnaires qn
           join hosts h on h.id = qn.host_id where h.user_id = auth.uid()));

create policy quizzer_current_question on public.questions
  for select to authenticated
  using (id in (select s.current_question_id from sessions s
           join participants p on p.session_id = s.id
          where p.quizzer_id = my_quizzer_id() and not p.is_kicked
            and s.status in ('question', 'reveal') and s.current_question_id is not null));

create policy host_keys on public.question_keys
  for all to authenticated
  using (question_id in (select q.id from questions q
           join questionnaires qn on qn.id = q.questionnaire_id
           join hosts h on h.id = qn.host_id where h.user_id = auth.uid()))
  with check (question_id in (select q.id from questions q
           join questionnaires qn on qn.id = q.questionnaire_id
           join hosts h on h.id = qn.host_id where h.user_id = auth.uid()));

create policy host_sessions on public.sessions
  for all to authenticated
  using (host_id in (select id from hosts where user_id = auth.uid()))
  with check (host_id in (select id from hosts where user_id = auth.uid()));

create policy quizzer_sessions on public.sessions
  for select to authenticated
  using (id in (select session_id from participants
                 where quizzer_id = my_quizzer_id() and not is_kicked));

create policy host_participants on public.participants
  for all to authenticated
  using (session_id in (select s.id from sessions s
           join hosts h on h.id = s.host_id where h.user_id = auth.uid()))
  with check (session_id in (select s.id from sessions s
           join hosts h on h.id = s.host_id where h.user_id = auth.uid()));

create policy quizzer_participant on public.participants
  for select to authenticated
  using (quizzer_id = my_quizzer_id());

create policy host_answers on public.answers
  for select to authenticated
  using (session_id in (select s.id from sessions s
           join hosts h on h.id = s.host_id where h.user_id = auth.uid()));

create policy quizzer_answers on public.answers
  for select to authenticated
  using (participant_id in (select id from participants where quizzer_id = my_quizzer_id()));

-- Quizzers create their own profile from the client (useCreateQuizzer).
create policy quizzer_self_insert on public.quizzers
  for insert to authenticated
  with check (user_id = auth.uid());

-- Table grants (RLS still restricts rows). Supabase default privileges usually
-- cover this, but being explicit avoids a surprise.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Realtime: the host control and play screens subscribe to these.
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.answers;

-- Storage bucket for question images (…_storage_questions makes it private).
insert into storage.buckets (id, name, public)
values ('questions', 'questions', true)
on conflict (id) do nothing;
