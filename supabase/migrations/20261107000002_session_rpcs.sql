-- RPCs the screens need, guards on the existing RPCs, and history-protecting triggers.
-- Host RPCs check ownership themselves: anonymous quizzers are also `authenticated`.

-- ---------------------------------------------------------------------
-- Quizzer RPCs
-- ---------------------------------------------------------------------
create function public.server_now() returns timestamptz
language sql stable set search_path = public as $$
  select now();
$$;

create function public.join_session(p_code text, p_display_name text) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_quizzer bigint := my_quizzer_id();
  v_name    text   := btrim(p_display_name);
  v_session bigint;
  v_kicked  boolean;
begin
  if v_quizzer is null then raise exception 'Quizzer profile required'; end if;
  if v_name is null or v_name = '' or length(v_name) > 40 then
    raise exception 'Display name must be 1 to 40 characters';
  end if;

  select id into v_session
    from sessions
   where join_code = upper(btrim(p_code)) and status <> 'finished';
  if not found then raise exception 'Invalid join code'; end if;

  select is_kicked into v_kicked
    from participants
   where session_id = v_session and quizzer_id = v_quizzer;
  if found then
    if v_kicked then raise exception 'You were removed from this session'; end if;
    return v_session;
  end if;

  begin
    insert into participants (session_id, quizzer_id, display_name)
    values (v_session, v_quizzer, v_name)
    on conflict (session_id, quizzer_id) do nothing;
  exception when unique_violation then
    raise exception 'Display name is taken';
  end;

  return v_session;
end $$;

-- Selected choice only. is_correct and points stay hidden until get_reveal().
create function public.get_my_answer(p_session_id bigint, p_question_id bigint) returns text
language sql stable security definer set search_path = public as $$
  select a.selected_choice::text
    from answers a
    join participants p on p.id = a.participant_id
   where a.session_id = p_session_id
     and a.question_id = p_question_id
     and p.quizzer_id = my_quizzer_id()
     and not p.is_kicked;
$$;

-- Returns null unless the caller is a non-kicked participant, the session is in
-- reveal, and the question is current. This is the only way quizzers see a key.
create function public.get_reveal(p_session_id bigint, p_question_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_kind        questionnaire_kind;
  v_participant bigint;
  v_total       bigint;
  v_correct     text;
  v_mine        jsonb;
  v_counts      jsonb;
begin
  select qn.kind into v_kind
    from sessions s
    join questionnaires qn on qn.id = s.questionnaire_id
   where s.id = p_session_id
     and s.status = 'reveal'
     and s.current_question_id = p_question_id;
  if not found then return null; end if;

  select p.id into v_participant
    from participants p
   where p.session_id = p_session_id
     and p.quizzer_id = my_quizzer_id()
     and not p.is_kicked;
  if not found then return null; end if;

  select coalesce(sum(a.points_awarded), 0) into v_total
    from answers a where a.participant_id = v_participant;

  if v_kind = 'pretest' then
    return jsonb_build_object('kind', v_kind, 'points_so_far', v_total);
  end if;

  select k.correct_choice::text into v_correct
    from question_keys k where k.question_id = p_question_id;

  select jsonb_build_object('selected_choice', a.selected_choice::text,
                            'is_correct', a.is_correct,
                            'points_awarded', a.points_awarded)
    into v_mine
    from answers a
   where a.participant_id = v_participant and a.question_id = p_question_id;

  select coalesce(jsonb_object_agg(c.selected_choice, c.n), '{}'::jsonb) into v_counts
    from (select a.selected_choice::text as selected_choice, count(*) as n
            from answers a
           where a.session_id = p_session_id and a.question_id = p_question_id
           group by 1) c;

  return jsonb_build_object('kind', v_kind,
                            'correct_choice', v_correct,
                            'my_answer', v_mine,
                            'counts', v_counts,
                            'points_so_far', v_total);
end $$;

-- ---------------------------------------------------------------------
-- Host session controls
-- ---------------------------------------------------------------------
create function public.create_session(p_questionnaire_id bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  -- Subset of [A-Z0-9] without O, 0, I and 1, so codes read clearly on a projector.
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_host bigint := my_host_id();
  v_code text;
  v_id   bigint;
begin
  if v_host is null or not exists (select 1 from questionnaires
                                    where id = p_questionnaire_id and host_id = v_host) then
    raise exception 'Not allowed';
  end if;
  if not exists (select 1 from questions where questionnaire_id = p_questionnaire_id) then
    raise exception 'Questionnaire has no questions';
  end if;
  if exists (select 1 from questions q
               left join question_keys k on k.question_id = q.id
              where q.questionnaire_id = p_questionnaire_id and k.question_id is null) then
    raise exception 'Every question needs a correct answer';
  end if;

  loop
    select string_agg(substr(v_alphabet, 1 + floor(random() * 32)::int, 1), '')
      into v_code from generate_series(1, 6);
    insert into sessions (host_id, questionnaire_id, join_code)
    values (v_host, p_questionnaire_id, v_code)
    on conflict (join_code) do nothing
    returning id into v_id;
    exit when v_id is not null;
  end loop;

  return v_id;
end $$;

create function public.reveal_question(p_session_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update sessions set status = 'reveal'
   where id = p_session_id and host_id = my_host_id() and status = 'question';
  if not found then raise exception 'No open question to reveal'; end if;
end $$;

create function public.finish_session(p_session_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update sessions
     set status = 'finished',
         ended_at = now(),
         current_question_id = null,
         question_started_at = null,
         question_ends_at = null
   where id = p_session_id and host_id = my_host_id() and status <> 'finished';
  if not found then raise exception 'Session cannot be finished'; end if;
end $$;

create function public.return_to_lobby(p_session_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  update sessions
     set status = 'lobby',
         current_question_id = null,
         question_started_at = null,
         question_ends_at = null
   where id = p_session_id and host_id = my_host_id() and status in ('question', 'reveal');
  if not found then raise exception 'Session cannot return to lobby'; end if;
end $$;

create or replace function public.start_question(p_session_id bigint, p_question_id bigint)
returns timestamptz
language plpgsql security definer set search_path = public as $$
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

create or replace function public.submit_answer(p_session_id bigint, p_question_id bigint, p_choice char)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_session      sessions%rowtype;
  v_participant  bigint;
  v_correct      char(1);
  v_points       int;
  v_choice_text  text;
  v_elapsed_ms   int;
  v_window_ms    numeric;
  v_is_correct   boolean;
  v_awarded      int := 0;
begin
  select * into v_session from sessions where id = p_session_id;
  if not found
     or v_session.status <> 'question'
     or v_session.current_question_id is distinct from p_question_id then
    raise exception 'Question is not open';
  end if;

  if now() > v_session.question_ends_at then
    raise exception 'Time is up';
  end if;

  select p.id into v_participant
    from participants p
   where p.session_id = p_session_id
     and p.quizzer_id = my_quizzer_id()
     and not p.is_kicked;
  if not found then raise exception 'Not a participant'; end if;

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

  v_elapsed_ms := greatest(0, floor(extract(epoch from now() - v_session.question_started_at) * 1000))::int;
  v_window_ms  := extract(epoch from v_session.question_ends_at - v_session.question_started_at) * 1000;
  v_is_correct := upper(p_choice) = v_correct;

  if v_is_correct then
    -- Speed bonus: full points instantly, half points at the buzzer.
    v_awarded := round(v_points * (1 - (v_elapsed_ms / v_window_ms) / 2));
  end if;

  insert into answers (session_id, participant_id, question_id, selected_choice,
                       is_correct, points_awarded, response_ms)
  values (p_session_id, v_participant, p_question_id, upper(p_choice),
          v_is_correct, v_awarded, v_elapsed_ms)
  on conflict (participant_id, question_id) do nothing;

  return found;   -- false = already answered
end $$;

-- Quizzers do not see the open question's points, so scores cannot reveal
-- whether an answer was right before the reveal.
create or replace function public.get_leaderboard(p_session_id bigint)
returns table (rank bigint, participant_id bigint, display_name text,
               score bigint, correct_count bigint, total_correct_ms bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_is_host boolean := p_session_id in (select my_hosted_session_ids());
  v_hidden  bigint;
begin
  if not v_is_host then
    if p_session_id not in (select my_session_ids()) then
      raise exception 'Not allowed';
    end if;
    select s.current_question_id into v_hidden
      from sessions s where s.id = p_session_id and s.status = 'question';
  end if;

  return query
  select rank() over (order by coalesce(sum(a.points_awarded), 0) desc,
                               coalesce(sum(a.response_ms) filter (where a.is_correct), 0) asc),
         p.id,
         p.display_name,
         coalesce(sum(a.points_awarded), 0),
         count(a.id) filter (where a.is_correct),
         coalesce(sum(a.response_ms) filter (where a.is_correct), 0)
    from participants p
    left join answers a on a.participant_id = p.id
                       and a.question_id is distinct from v_hidden
   where p.session_id = p_session_id and not p.is_kicked
   group by p.id, p.display_name
   order by 1;
end $$;

-- ---------------------------------------------------------------------
-- Host question RPCs: a question and its key are always saved together
-- ---------------------------------------------------------------------
create function public.check_question_input(p_prompt text, p_a text, p_b text, p_c text,
                                             p_d text, p_correct text) returns void
language plpgsql set search_path = public as $$
begin
  if nullif(btrim(p_prompt), '') is null then raise exception 'Prompt is required'; end if;
  if nullif(btrim(p_a), '') is null or nullif(btrim(p_b), '') is null then
    raise exception 'Choices A and B are required';
  end if;
  if upper(p_correct) is null or upper(p_correct) not in ('A', 'B', 'C', 'D') then
    raise exception 'Correct answer must be A, B, C or D';
  end if;
  if (upper(p_correct) = 'C' and nullif(btrim(p_c), '') is null)
     or (upper(p_correct) = 'D' and nullif(btrim(p_d), '') is null) then
    raise exception 'Correct answer points to an empty choice';
  end if;
end $$;

create function public.save_question(
  p_questionnaire_id bigint, p_question_id bigint, p_prompt text, p_image_path text,
  p_choice_a text, p_choice_b text, p_choice_c text, p_choice_d text,
  p_correct text, p_points int, p_seconds_override int
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_host bigint := my_host_id();
  v_id   bigint := p_question_id;
begin
  if v_host is null or not exists (select 1 from questionnaires
                                    where id = p_questionnaire_id and host_id = v_host) then
    raise exception 'Not allowed';
  end if;

  perform check_question_input(p_prompt, p_choice_a, p_choice_b, p_choice_c, p_choice_d, p_correct);

  if p_image_path is not null and p_image_path not like v_host::text || '/%' then
    raise exception 'Invalid image path';
  end if;

  if v_id is null then
    insert into questions (questionnaire_id, position, prompt, image_path,
                           choice_a, choice_b, choice_c, choice_d, points, seconds_override)
    values (p_questionnaire_id,
            (select coalesce(max(position), 0) + 1 from questions
              where questionnaire_id = p_questionnaire_id),
            btrim(p_prompt), p_image_path,
            btrim(p_choice_a), btrim(p_choice_b),
            nullif(btrim(p_choice_c), ''), nullif(btrim(p_choice_d), ''),
            coalesce(p_points, 1000), p_seconds_override)
    returning id into v_id;
  else
    update questions
       set prompt = btrim(p_prompt),
           image_path = p_image_path,
           choice_a = btrim(p_choice_a),
           choice_b = btrim(p_choice_b),
           choice_c = nullif(btrim(p_choice_c), ''),
           choice_d = nullif(btrim(p_choice_d), ''),
           points = coalesce(p_points, 1000),
           seconds_override = p_seconds_override
     where id = v_id and questionnaire_id = p_questionnaire_id;
    if not found then raise exception 'Not allowed'; end if;
  end if;

  insert into question_keys (question_id, correct_choice)
  values (v_id, upper(p_correct))
  on conflict (question_id) do update set correct_choice = excluded.correct_choice;

  return v_id;
end $$;

-- All or nothing: any bad row aborts the whole import.
create function public.import_questions(p_questionnaire_id bigint, p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_row   jsonb;
  v_index bigint;
  v_count int := 0;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'Import must be a non-empty JSON array';
  end if;

  for v_row, v_index in
    select value, ordinality from jsonb_array_elements(p_rows) with ordinality
  loop
    begin
      perform save_question(p_questionnaire_id, null, v_row->>'prompt', null,
                            v_row#>>'{choices,A}', v_row#>>'{choices,B}',
                            v_row#>>'{choices,C}', v_row#>>'{choices,D}',
                            v_row->>'answer',
                            (v_row->>'points')::int, (v_row->>'seconds')::int);
    exception when others then
      raise exception 'Row %: %', v_index, sqlerrm;
    end;
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

create function public.reorder_questions(p_questionnaire_id bigint, p_ids bigint[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from questionnaires
                  where id = p_questionnaire_id and host_id = my_host_id()) then
    raise exception 'Not allowed';
  end if;

  if (select array_agg(id order by id) from questions where questionnaire_id = p_questionnaire_id)
     is distinct from (select array_agg(i order by i) from unnest(p_ids) i) then
    raise exception 'Order must list every question exactly once';
  end if;

  -- questions_order_unique is deferred, so positions can swap in one statement.
  update questions q
     set position = o.ord::int
    from unnest(p_ids) with ordinality o(id, ord)
   where q.id = o.id;
end $$;

-- ---------------------------------------------------------------------
-- Reporting (all scoped to the calling admin)
-- ---------------------------------------------------------------------
create function public.get_history()
returns table (session_id bigint, started_at timestamptz, ended_at timestamptz,
               questionnaire_name text, kind questionnaire_kind, participant_count bigint,
               average_score numeric, average_accuracy numeric)
language sql stable security definer set search_path = public as $$
  with scores as (
    select p.session_id,
           p.id,
           coalesce(sum(a.points_awarded), 0) as score,
           count(a.id) as answered,
           count(a.id) filter (where a.is_correct) as correct
      from participants p
      left join answers a on a.participant_id = p.id
     where not p.is_kicked
     group by p.session_id, p.id
  )
  select s.id, s.started_at, s.ended_at, qn.name, qn.kind,
         count(sc.id),
         round(coalesce(avg(sc.score), 0), 1),
         round(coalesce(sum(sc.correct)::numeric / nullif(sum(sc.answered), 0), 0), 4)
    from sessions s
    join questionnaires qn on qn.id = s.questionnaire_id
    left join scores sc on sc.session_id = s.id
   where s.host_id = my_host_id() and s.status = 'finished'
   group by s.id, qn.id
   order by s.ended_at desc;
$$;

create function public.get_session_report(p_session_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_session sessions%rowtype;
  v_scores  jsonb;
  v_questions jsonb;
begin
  select * into v_session from sessions where id = p_session_id and host_id = my_host_id();
  if not found then raise exception 'Not allowed'; end if;

  select coalesce(jsonb_agg(l.score order by l.score desc), '[]'::jsonb) into v_scores
    from get_leaderboard(p_session_id) l;

  select coalesce(jsonb_agg(jsonb_build_object(
           'question_id', q.id,
           'position', q.position,
           'prompt', q.prompt,
           'answered', st.answered,
           'correct', st.correct,
           'accuracy', round(st.correct::numeric / nullif(st.answered, 0), 4),
           'average_response_ms', st.average_ms
         ) order by q.position), '[]'::jsonb)
    into v_questions
    from questions q
    left join lateral (
      select count(a.id) as answered,
             count(a.id) filter (where a.is_correct) as correct,
             round(avg(a.response_ms)) as average_ms
        from answers a
        join participants p on p.id = a.participant_id
       where a.session_id = p_session_id and a.question_id = q.id and not p.is_kicked
    ) st on true
   where q.questionnaire_id = v_session.questionnaire_id;

  return jsonb_build_object('scores', v_scores, 'questions', v_questions);
end $$;

create function public.get_participants_overview()
returns table (participant_id bigint, display_name text, session_id bigint, join_code text,
               questionnaire_name text, kind questionnaire_kind, score bigint,
               is_kicked boolean, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, s.id, s.join_code, qn.name, qn.kind,
         coalesce(sum(a.points_awarded), 0), p.is_kicked, p.joined_at
    from participants p
    join sessions s on s.id = p.session_id
    join questionnaires qn on qn.id = s.questionnaire_id
    left join answers a on a.participant_id = p.id
   where s.host_id = my_host_id()
   group by p.id, s.id, qn.id
   order by p.joined_at desc;
$$;

-- ---------------------------------------------------------------------
-- Triggers that protect history
-- ---------------------------------------------------------------------
create function public.block_kind_change() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from sessions where questionnaire_id = old.id) then
    raise exception 'Kind cannot change once a questionnaire has a session';
  end if;
  return new;
end $$;

create trigger questionnaires_block_kind_change
  before update of kind on public.questionnaires
  for each row when (old.kind is distinct from new.kind)
  execute function public.block_kind_change();

create function public.block_answered_question_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from answers where question_id = old.id) then
    raise exception 'A question with answers cannot be deleted';
  end if;
  return old;
end $$;

create trigger questions_block_answered_delete
  before delete on public.questions
  for each row execute function public.block_answered_question_delete();

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
revoke execute on function public.server_now()                          from public, anon;
revoke execute on function public.join_session(text, text)              from public, anon;
revoke execute on function public.get_my_answer(bigint, bigint)         from public, anon;
revoke execute on function public.get_reveal(bigint, bigint)            from public, anon;
revoke execute on function public.create_session(bigint)                from public, anon;
revoke execute on function public.reveal_question(bigint)               from public, anon;
revoke execute on function public.finish_session(bigint)                from public, anon;
revoke execute on function public.return_to_lobby(bigint)               from public, anon;
revoke execute on function public.save_question(bigint, bigint, text, text, text, text, text, text, text, int, int) from public, anon;
revoke execute on function public.import_questions(bigint, jsonb)       from public, anon;
revoke execute on function public.reorder_questions(bigint, bigint[])   from public, anon;
revoke execute on function public.get_history()                         from public, anon;
revoke execute on function public.get_session_report(bigint)            from public, anon;
revoke execute on function public.get_participants_overview()           from public, anon;

grant execute on function public.server_now()                          to authenticated;
grant execute on function public.join_session(text, text)              to authenticated;
grant execute on function public.get_my_answer(bigint, bigint)         to authenticated;
grant execute on function public.get_reveal(bigint, bigint)            to authenticated;
grant execute on function public.create_session(bigint)                to authenticated;
grant execute on function public.reveal_question(bigint)               to authenticated;
grant execute on function public.finish_session(bigint)                to authenticated;
grant execute on function public.return_to_lobby(bigint)               to authenticated;
grant execute on function public.save_question(bigint, bigint, text, text, text, text, text, text, text, int, int) to authenticated;
grant execute on function public.import_questions(bigint, jsonb)       to authenticated;
grant execute on function public.reorder_questions(bigint, bigint[])   to authenticated;
grant execute on function public.get_history()                         to authenticated;
grant execute on function public.get_session_report(bigint)            to authenticated;
grant execute on function public.get_participants_overview()           to authenticated;

-- Internal only: never callable through the API.
revoke execute on function public.check_question_input(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.block_kind_change()                                      from public, anon, authenticated;
revoke execute on function public.block_answered_question_delete()                         from public, anon, authenticated;
