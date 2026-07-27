-- Identyfikator serii lekcji cyklicznych (co tydzień / własne).
-- Pozwala usuwać „tę jedną” albo „wszystkie pozostałe” z tej samej serii.
alter table public.lessons
  add column if not exists series_id uuid;

create index if not exists lessons_series_id_idx on public.lessons (series_id)
  where series_id is not null;
