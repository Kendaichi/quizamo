-- Baseline: docs/quizmosa-db.sql was applied by hand and is not in the migration history.
-- This migration fixes the RLS recursion between sessions and participants, stops
-- quizzers from creating hosts rows, and hides answer results before reveal.

-- Helpers run as the table owner, so they skip RLS. Policies that call them cannot
-- recurse into each other.
create function public.my_host_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from hosts where user_id = auth.uid();
$$;

create function public.my_hosted_session_ids() returns setof bigint
language sql stable security definer set search_path = public as $$
  select id from sessions where host_id = my_host_id();
$$;

create function public.my_session_ids() returns setof bigint
language sql stable security definer set search_path = public as $$
  select session_id from participants
   where quizzer_id = my_quizzer_id() and not is_kicked;
$$;

create function public.my_current_question_ids() returns setof bigint
language sql stable security definer set search_path = public as $$
  select s.current_question_id
    from sessions s
    join participants p on p.session_id = s.id
   where p.quizzer_id = my_quizzer_id()
     and not p.is_kicked
     and s.status in ('question', 'reveal')
     and s.current_question_id is not null;
$$;

revoke execute on function public.my_host_id()              from public, anon;
revoke execute on function public.my_hosted_session_ids()   from public, anon;
revoke execute on function public.my_session_ids()          from public, anon;
revoke execute on function public.my_current_question_ids() from public, anon;
grant  execute on function public.my_host_id()              to authenticated;
grant  execute on function public.my_hosted_session_ids()   to authenticated;
grant  execute on function public.my_session_ids()          to authenticated;
grant  execute on function public.my_current_question_ids() to authenticated;

-- Anonymous quizzers are also `authenticated`, so this was a privilege escalation:
-- hosts rows can no longer be inserted or deleted from the client.
drop policy host_self on public.hosts;
create policy host_self_select on public.hosts
  for select to authenticated using (user_id = auth.uid());
create policy host_self_update on public.hosts
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy host_questions on public.questions;
create policy host_questions on public.questions
  for all to authenticated
  using (questionnaire_id in (select id from questionnaires where host_id = my_host_id()))
  with check (questionnaire_id in (select id from questionnaires where host_id = my_host_id()));

drop policy host_keys on public.question_keys;
create policy host_keys on public.question_keys
  for all to authenticated
  using (question_id in (select q.id from questions q
                           join questionnaires qn on qn.id = q.questionnaire_id
                          where qn.host_id = my_host_id()))
  with check (question_id in (select q.id from questions q
                                join questionnaires qn on qn.id = q.questionnaire_id
                               where qn.host_id = my_host_id()));

drop policy host_sessions on public.sessions;
create policy host_sessions on public.sessions
  for all to authenticated
  using (host_id = my_host_id())
  with check (host_id = my_host_id()
              and questionnaire_id in (select id from questionnaires where host_id = my_host_id()));

drop policy host_participants on public.participants;
create policy host_participants on public.participants
  for all to authenticated
  using (session_id in (select my_hosted_session_ids()))
  with check (session_id in (select my_hosted_session_ids()));

drop policy host_answers on public.answers;
create policy host_answers on public.answers
  for select to authenticated
  using (session_id in (select my_hosted_session_ids()));

drop policy quizzer_sessions on public.sessions;
create policy quizzer_sessions on public.sessions
  for select to authenticated
  using (id in (select my_session_ids()));

drop policy quizzer_current_question on public.questions;
create policy quizzer_current_question on public.questions
  for select to authenticated
  using (id in (select my_current_question_ids()));

-- A kicked quizzer keeps reading their own row, so the app can tell them they were kicked.
drop policy quizzer_participant on public.participants;
create policy quizzer_participant on public.participants
  for select to authenticated
  using (quizzer_id = my_quizzer_id());

-- The row carries is_correct and points_awarded, readable right after submitting.
-- Quizzers use get_my_answer() and get_reveal() instead.
drop policy quizzer_answers on public.answers;

revoke execute on function public.is_host()                from public, anon;
revoke execute on function public.my_quizzer_id()          from public, anon;
revoke execute on function public.get_leaderboard(bigint)  from public, anon;
grant  execute on function public.is_host()                to authenticated;
grant  execute on function public.my_quizzer_id()          to authenticated;
grant  execute on function public.get_leaderboard(bigint)  to authenticated;
