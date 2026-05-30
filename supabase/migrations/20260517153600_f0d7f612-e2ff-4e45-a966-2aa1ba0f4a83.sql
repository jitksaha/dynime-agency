-- Storage bucket for HR request attachments (private)
insert into storage.buckets (id, name, public)
values ('hr-request-attachments', 'hr-request-attachments', false)
on conflict (id) do nothing;

-- RLS policies: employees upload/read their own files under {auth.uid()}/...
-- HR + admins can read everything in this bucket.
create policy "Employees upload own request attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'hr-request-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Employees read own request attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'hr-request-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Employees delete own request attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'hr-request-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "HR staff read all request attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'hr-request-attachments'
  and (is_admin(auth.uid()) or has_role(auth.uid(), 'hr'::app_role))
);