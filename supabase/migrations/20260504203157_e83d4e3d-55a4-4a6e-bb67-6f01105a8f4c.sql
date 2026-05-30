
-- Private storage bucket for bank transfer receipts
insert into storage.buckets (id, name, public)
values ('bank-receipts', 'bank-receipts', false)
on conflict (id) do nothing;

-- Allow public uploads to bank-receipts (file path must start with order session id / invoice number)
create policy "Anyone can upload bank receipts"
on storage.objects
for insert
to public
with check (bucket_id = 'bank-receipts');

-- Admins can read/manage all receipts
create policy "Admins can read bank receipts"
on storage.objects
for select
to authenticated
using (bucket_id = 'bank-receipts' and public.is_admin(auth.uid()));

create policy "Admins can manage bank receipts"
on storage.objects
for all
to authenticated
using (bucket_id = 'bank-receipts' and public.is_admin(auth.uid()))
with check (bucket_id = 'bank-receipts' and public.is_admin(auth.uid()));
