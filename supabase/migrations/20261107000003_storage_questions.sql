-- The questions bucket had 0 objects when this ran, so going private breaks nothing.
-- Images are served through signed URLs. Path format: {host_id}/{questionnaire_id}/{uuid}.ext
-- (The bucket is created in the baseline migration.)
update storage.buckets
   set public = false,
       file_size_limit = 5242880,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
 where id = 'questions';

-- Dashboard template policies. They allowed any authenticated user, which includes
-- anonymous quizzers, to write to the private/ folder.
-- (A fresh project created the bucket via SQL, so these may not exist: `if exists`.)
drop policy if exists "Give users authenticated access to folder 15k0kst_0" on storage.objects;
drop policy if exists "Give users authenticated access to folder 15k0kst_1" on storage.objects;
drop policy if exists "Give users authenticated access to folder 15k0kst_2" on storage.objects;
drop policy if exists "Give users authenticated access to folder 15k0kst_3" on storage.objects;

create function public.can_read_question_image(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from questions q
      join sessions s     on s.current_question_id = q.id
      join participants p on p.session_id = s.id
     where q.image_path = p_name
       and p.quizzer_id = my_quizzer_id()
       and not p.is_kicked
       and s.status in ('question', 'reveal')
  );
$$;

revoke execute on function public.can_read_question_image(text) from public, anon;
grant  execute on function public.can_read_question_image(text) to authenticated;

create policy question_images_host_select on storage.objects
  for select to authenticated
  using (bucket_id = 'questions'
         and (storage.foldername(name))[1] = public.my_host_id()::text);

create policy question_images_host_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'questions'
              and (storage.foldername(name))[1] = public.my_host_id()::text);

create policy question_images_host_update on storage.objects
  for update to authenticated
  using (bucket_id = 'questions'
         and (storage.foldername(name))[1] = public.my_host_id()::text)
  with check (bucket_id = 'questions'
              and (storage.foldername(name))[1] = public.my_host_id()::text);

create policy question_images_host_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'questions'
         and (storage.foldername(name))[1] = public.my_host_id()::text);

create policy question_images_quizzer_select on storage.objects
  for select to authenticated
  using (bucket_id = 'questions' and public.can_read_question_image(name));
