-- Cennik musi być czytelny dla zalogowanych nauczycieli (wyliczenie wypłaty).
grant select on table public.price_tiers to authenticated;

drop policy if exists "price_tiers_select_authenticated" on public.price_tiers;
create policy "price_tiers_select_authenticated"
  on public.price_tiers
  for select
  to authenticated
  using (true);
