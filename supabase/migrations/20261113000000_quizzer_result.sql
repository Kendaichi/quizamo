-- Instant per-question feedback for a quizzer: their own correctness and running
-- score, readable only AFTER they've answered (the answers row must exist), so
-- nobody can peek before locking in. Does NOT return the correct choice, so it
-- never spoils the host reveal or a later post-test.
create or replace function public.get_my_result(p_session_id bigint, p_question_id bigint)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'is_correct', a.is_correct,
           'points_awarded', a.points_awarded,
           'points_so_far', (select coalesce(sum(a2.points_awarded), 0)
                               from answers a2 where a2.participant_id = a.participant_id))
    from participants p
    join answers a on a.participant_id = p.id and a.question_id = p_question_id
   where p.session_id = p_session_id
     and p.quizzer_id = my_quizzer_id()
     and not p.is_kicked;
$$;

revoke execute on function public.get_my_result(bigint, bigint) from public, anon;
grant  execute on function public.get_my_result(bigint, bigint) to authenticated;
