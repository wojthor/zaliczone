-- Dane kontaktowe i notatki ucznia. Formularz w /uczniowie od dawna miał pola
-- telefon / e-mail / klasa / notatki, ale tabela students nie miała dla nich
-- kolumn - wpisane dane znikały po odświeżeniu strony.
alter table public.students
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists school_class text,
  add column if not exists notes text;

comment on column public.students.phone is 'Numer telefonu ucznia/rodzica (opcjonalnie).';
comment on column public.students.email is 'E-mail ucznia/rodzica (opcjonalnie).';
comment on column public.students.school_class is 'Klasa szkolna, np. "3a" (opcjonalnie).';
comment on column public.students.notes is 'Notatki nauczyciela o uczniu (opcjonalnie).';
