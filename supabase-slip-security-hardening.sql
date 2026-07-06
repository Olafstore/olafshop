-- OLAF SHOP slip verification hardening.
-- Additive / non-destructive guard for duplicate provider transaction IDs.
-- Run after the payment slip + points migrations. This file does not expose
-- credentials and does not delete or rewrite historical payment records.

begin;

do $$
begin
  if exists (
    select 1
    from public.payment_verifications
    where provider_transaction_id is not null
      and status in ('verified', 'rejected')
    group by provider, provider_transaction_id
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_PROVIDER_TRANSACTION_IDS_EXIST';
  end if;
end
$$;

create unique index if not exists payment_verifications_provider_transaction_nonreusable_uidx
on public.payment_verifications (provider, provider_transaction_id)
where provider_transaction_id is not null
  and status in ('verified', 'rejected');

commit;
