-- Pre-tests run self-paced. The host opens the pre-test once, and each quizzer moves to
-- the next question with a "Next" button, on their own server-side timer.
-- Standard and post-test sessions keep the host-driven flow.

-- 1. Per-participant progress
alter table public.participants
  add column current_question_id bigint references public.questions(id) on delete set null,
  add column question_started_at timestamptz,
  add column question_ends_at    timestamptz,
  add column questions_served    int not null default 0,
  add column finished_at         timestamptz;

-- 2. Host: open a pre-test. Status 'question' means "open" for a pre-test; the session
--    itself never has a current question.
create function public.open_pretest(p_session_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update sessions s
     set status = 'question',
         started_at = coalesce(s.started_at, now())
    from questionnaires qn
   where s.id = p_session_id
     and s.host_id = my_host_id()
     and s.status = 'lobby'
     and qn.id = s.questionnaire_id
     and qn.kind = 'pretest';
  if not found then raise exception 'Pre-test cannot be opened'; end if;
end $$;

-- 3. Host-driven controls refuse pre-tests
create or replace function public.start_question(p_session_id bigint, p_question_id bigint)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session sessions%rowtype;
  v_seconds int;
  v_ends    timestamptz;
begin
  select * into v_session
    from sessions
   where id = p_session_id and host_id = my_host_id()
     for update;
  if not found then raise exception 'Not allowed'; end if;

  if exists (select 1 from questionnaires
              where id = v_session.questionnaire_id and kind = 'pretest') then
    raise exception 'Pre-tests are self-paced';
  end if;

  if v_session.status = 'finished' then raise exception 'Session is finished'; end if;
  if v_session.status = 'question' and now() <= v_session.question_ends_at then
    raise exception 'A question is already running';
  end if;
  if v_session.current_question_id = p_question_id then
    raise exception 'This question has already been asked';
  end if;

  select coalesce(q.seconds_override, qn.seconds_per_question)
    into v_seconds
    from questions q
    join questionnaires qn on qn.id = q.questionnaire_id
   where q.id = p_question_id and qn.id = v_session.questionnaire_id;
  if not found then raise exception 'Not allowed'; end if;

  if not exists (select 1 from question_keys where question_id = p_question_id) then
    raise exception 'Question has no correct answer';
  end if;

  v_ends := now() + make_interval(secs => v_seconds);

  update sessions
     set status = 'question',
         current_question_id = p_question_id,
         question_started_at = now(),
         question_ends_at = v_ends,
         started_at = coalesce(started_at, now())
   where id = p_session_id;

  return v_ends;
end $$;

-- A self-paced pre-test has no current question, so these no longer match it.
create or replace function public.reveal_question(p_session_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update sessions set status = 'reveal'
   where id = p_session_id and host_id = my_host_id()
     and status = 'question' and current_question_id is not null;
  if not found then raise exception 'No open question to reveal'; end if;
end $$;

create or replace function public.return_to_lobby(p_session_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update sessions
     set status = 'lobby',
         current_question_id = null,
         question_started_at = null,
         question_ends_at = null
   where id = p_session_id and host_id = my_host_id()
     and status in ('question', 'reveal') and current_question_id is not null;
  if not found then raise exception 'Session cannot return to lobby'; end if;
end $$;

-- 4. Quizzer: move to the next question. Only ever hands out the next one, so nobody
--    can read ahead. The current one must be answered or timed out first.
create function public.next_question(p_session_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant participants%rowtype;
  v_next        bigint;
  v_seconds     int;
begin
  if not exists (
    select 1 from sessions s join questionnaires qn on qn.id = s.questionnaire_id
     where s.id = p_session_id and s.status = 'question' and qn.kind = 'pretest'
  ) then
    raise exception 'Pre-test is not open';
  end if;

  select * into v_participant
    from participants
   where session_id = p_session_id and quizzer_id = my_quizzer_id() and not is_kicked
     for update;
  if not found then raise exception 'Not a participant'; end if;
  if v_participant.finished_at is not null then
    raise exception 'You have finished this pre-test';
  end if;

  if v_participant.current_question_id is not null
     and now() <= v_participant.question_ends_at
     and not exists (select 1 from answers
                      where participant_id = v_participant.id
                        and question_id = v_participant.current_question_id) then
    raise exception 'Answer or wait for the timer first';
  end if;

  -- shortcut: progress is a count, so reordering or deleting questions mid-session
  -- can skip or repeat one; store served ids if hosts start editing live pre-tests.
  select q.id, coalesce(q.seconds_override, qn.seconds_per_question)
    into v_next, v_seconds
    from sessions s
    join questionnaires qn on qn.id = s.questionnaire_id
    join questions q on q.questionnaire_id = qn.id
   where s.id = p_session_id
     and exists (select 1 from question_keys k where k.question_id = q.id)
   order by q.position, q.id
  offset v_participant.questions_served
   limit 1;

  if v_next is null then
    update participants
       set current_question_id = null,
           question_started_at = null,
           question_ends_at = null,
           finished_at = now()
     where id = v_participant.id;
  else
    update participants
       set current_question_id = v_next,
           question_started_at = now(),
           question_ends_at = now() + make_interval(secs => v_seconds),
           questions_served = questions_served + 1
     where id = v_participant.id;
  end if;
end $$;

-- 5. Quizzer: kind and own progress. Quizzers cannot read questionnaires.
create function public.get_my_progress(p_session_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'kind', qn.kind,
           'question_id', p.current_question_id,
           'question_started_at', p.question_started_at,
           'question_ends_at', p.question_ends_at,
           'served', p.questions_served,
           'total', (select count(*) from questions q
                      where q.questionnaire_id = qn.id
                        and exists (select 1 from question_keys k where k.question_id = q.id)),
           'finished_at', p.finished_at)
    from participants p
    join sessions s on s.id = p.session_id
    join questionnaires qn on qn.id = s.questionnaire_id
   where p.session_id = p_session_id
     and p.quizzer_id = my_quizzer_id()
     and not p.is_kicked;
$$;

-- 6. Answers check the participant's own timer on a pre-test
create or replace function public.submit_answer(p_session_id bigint, p_question_id bigint, p_choice char)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session      sessions%rowtype;
  v_kind         questionnaire_kind;
  v_participant  participants%rowtype;
  v_started      timestamptz;
  v_ends         timestamptz;
  v_correct      char(1);
  v_points       int;
  v_choice_text  text;
  v_elapsed_ms   int;
  v_window_ms    numeric;
  v_is_correct   boolean;
  v_awarded      int := 0;
begin
  select * into v_session from sessions where id = p_session_id;
  if not found then raise exception 'Question is not open'; end if;

  select kind into v_kind from questionnaires where id = v_session.questionnaire_id;

  select * into v_participant
    from participants p
   where p.session_id = p_session_id
     and p.quizzer_id = my_quizzer_id()
     and not p.is_kicked;
  if not found then raise exception 'Not a participant'; end if;

  if v_kind = 'pretest' then
    if v_session.status <> 'question'
       or v_participant.current_question_id is distinct from p_question_id then
      raise exception 'Question is not open';
    end if;
    v_started := v_participant.question_started_at;
    v_ends    := v_participant.question_ends_at;
  else
    if v_session.status <> 'question'
       or v_session.current_question_id is distinct from p_question_id then
      raise exception 'Question is not open';
    end if;
    v_started := v_session.question_started_at;
    v_ends    := v_session.question_ends_at;
  end if;

  if now() > v_ends then
    raise exception 'Time is up';
  end if;

  select k.correct_choice, q.points,
         case upper(p_choice)
           when 'A' then q.choice_a
           when 'B' then q.choice_b
           when 'C' then q.choice_c
           when 'D' then q.choice_d
         end
    into v_correct, v_points, v_choice_text
    from question_keys k join questions q on q.id = k.question_id
   where k.question_id = p_question_id;
  if not found then raise exception 'Question has no correct answer'; end if;

  if nullif(btrim(v_choice_text), '') is null then
    raise exception 'Invalid choice';
  end if;

  v_elapsed_ms := greatest(0, floor(extract(epoch from now() - v_started) * 1000))::int;
  v_window_ms  := extract(epoch from v_ends - v_started) * 1000;
  v_is_correct := upper(p_choice) = v_correct;

  if v_is_correct then
    -- Speed bonus: full points instantly, half points at the buzzer.
    v_awarded := round(v_points * (1 - (v_elapsed_ms / v_window_ms) / 2));
  end if;

  insert into answers (session_id, participant_id, question_id, selected_choice,
                       is_correct, points_awarded, response_ms)
  values (p_session_id, v_participant.id, p_question_id, upper(p_choice),
          v_is_correct, v_awarded, v_elapsed_ms)
  on conflict (participant_id, question_id) do nothing;

  return found;   -- false = already answered
end $$;

-- 7. Quizzers can read their own current pre-test question and its image
create or replace function public.my_current_question_ids()
returns setof bigint
language sql
stable
security definer
set search_path = public
as $$
  select s.current_question_id
    from sessions s
    join participants p on p.session_id = s.id
   where p.quizzer_id = my_quizzer_id()
     and not p.is_kicked
     and s.status in ('question', 'reveal')
     and s.current_question_id is not null
  union
  select p.current_question_id
    from participants p
    join sessions s on s.id = p.session_id
   where p.quizzer_id = my_quizzer_id()
     and not p.is_kicked
     and s.status = 'question'
     and p.current_question_id is not null;
$$;

create or replace function public.can_read_question_image(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from questions q
      join participants p on p.quizzer_id = my_quizzer_id() and not p.is_kicked
      join sessions s     on s.id = p.session_id
     where q.image_path = p_name
       and (   (s.current_question_id = q.id and s.status in ('question', 'reveal'))
            or (p.current_question_id = q.id and s.status = 'question'))
  );
$$;

-- 8. Grants
revoke execute on function public.open_pretest(bigint)    from public, anon;
revoke execute on function public.next_question(bigint)   from public, anon;
revoke execute on function public.get_my_progress(bigint) from public, anon;

grant execute on function public.open_pretest(bigint)    to authenticated;
grant execute on function public.next_question(bigint)   to authenticated;
grant execute on function public.get_my_progress(bigint) to authenticated;
