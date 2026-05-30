-- Notifications table
create table if not exists public.investor_notifications (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null,
  kind text not null,
  title text not null,
  body text,
  link text,
  investment_id uuid,
  payout_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_investor_notifications_investor on public.investor_notifications(investor_id, created_at desc);
create index if not exists idx_investor_notifications_unread on public.investor_notifications(investor_id) where read_at is null;

alter table public.investor_notifications enable row level security;

create policy "Investors read own notifications"
  on public.investor_notifications for select to authenticated
  using (investor_id = auth.uid());

create policy "Investors mark own notifications read"
  on public.investor_notifications for update to authenticated
  using (investor_id = auth.uid())
  with check (investor_id = auth.uid());

create policy "Admins manage notifications"
  on public.investor_notifications for all to authenticated
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- Helper currency formatter
create or replace function public._fmt_money(_amount numeric, _currency text)
returns text language sql immutable as $$
  select coalesce(_currency,'USD') || ' ' || to_char(coalesce(_amount,0), 'FM999,999,990.00');
$$;

-- Trigger function: payouts
create or replace function public.notify_on_payout_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_body  text;
  v_kind  text;
  v_link  text := '/investor-portal/statements';
  v_type  text;
begin
  v_type := coalesce(new.payout_type, 'monthly');

  if (tg_op = 'INSERT') then
    if new.status = 'scheduled' then
      v_kind := 'payout_scheduled';
      v_title := 'New payout scheduled';
      v_body := 'A ' || v_type || ' payout of ' || _fmt_money(new.amount, new.currency)
                || coalesce(' for the period ending ' || to_char(new.period_end,'DD Mon YYYY'), '') || '.';
    elsif new.status = 'paid' then
      v_kind := 'payout_paid';
      v_title := 'Payout paid';
      v_body := 'Your ' || v_type || ' payout of ' || _fmt_money(new.amount, new.currency) || ' has been paid.';
    else
      return new;
    end if;

    insert into public.investor_notifications (investor_id, kind, title, body, link, investment_id, payout_id)
    values (new.investor_id, v_kind, v_title, v_body, v_link, new.investment_id, new.id);

  elsif (tg_op = 'UPDATE') then
    if old.status is distinct from new.status then
      if new.status = 'paid' then
        v_kind := 'payout_paid';
        v_title := 'Payout paid';
        v_body := 'Your ' || v_type || ' payout of ' || _fmt_money(new.amount, new.currency) || ' has been paid.';
      elsif new.status = 'scheduled' then
        v_kind := 'payout_approved';
        v_title := 'Payout approved';
        v_body := 'Your ' || v_type || ' payout of ' || _fmt_money(new.amount, new.currency) || ' is approved and scheduled.';
      elsif new.status = 'skipped' then
        v_kind := 'payout_skipped';
        v_title := 'Payout skipped';
        v_body := 'A scheduled ' || v_type || ' payout was skipped.';
      else
        return new;
      end if;

      insert into public.investor_notifications (investor_id, kind, title, body, link, investment_id, payout_id)
      values (new.investor_id, v_kind, v_title, v_body, v_link, new.investment_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_payout_change on public.investment_payouts;
create trigger trg_notify_payout_change
  after insert or update on public.investment_payouts
  for each row execute function public.notify_on_payout_change();

-- Trigger function: investments completed
create or replace function public.notify_on_investment_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE') and old.status is distinct from new.status then
    if new.status = 'active' then
      insert into public.investor_notifications (investor_id, kind, title, body, link, investment_id)
      values (new.investor_id, 'investment_active', 'Investment activated',
              'Your investment in ' || new.plan_name || ' is now active.',
              '/investor-portal/dashboard', new.id);
    elsif new.status = 'completed' then
      insert into public.investor_notifications (investor_id, kind, title, body, link, investment_id)
      values (new.investor_id, 'investment_completed', 'Investment completed',
              'Your investment in ' || new.plan_name || ' has reached the end of its term and the principal has been released.',
              '/investor-portal/dashboard', new.id);
    elsif new.status = 'cancelled' then
      insert into public.investor_notifications (investor_id, kind, title, body, link, investment_id)
      values (new.investor_id, 'investment_cancelled', 'Investment cancelled',
              'Your investment in ' || new.plan_name || ' has been cancelled.',
              '/investor-portal/dashboard', new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_investment_status on public.investments;
create trigger trg_notify_investment_status
  after update on public.investments
  for each row execute function public.notify_on_investment_status();