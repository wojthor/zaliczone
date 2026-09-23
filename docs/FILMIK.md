# Tryb Filmik

Wersja panelu nauczyciela pod nagranie filmu instruktażowego: żywe dane (lekcje, uczniowie, premia, ewidencja) i odblokowany przycisk **Wygeneruj ewidencję**.

## Włączenie

1. W `.env.local` dodaj:
   ```
   NEXT_PUBLIC_FILMIK=1
   ```
2. Zrestartuj `pnpm dev`.
3. Załaduj dane:
   ```
   pnpm seed:filmik
   ```
4. Zaloguj się: `teacher@zaliczone.pl` / `123456` (Benio).

W menu pojawi się zielona plakietka **Filmik**.

## Co jest w seedzie

- 6 uczniów (imię + inicjał nazwiska), przedmioty Matematyka / Fizyka
- Sierpień 2026: lekcje VERIFIED → ewidencja / rozliczenie
- Wrzesień 2026: VERIFIED (pasek premii) + tydzień 22–28.09 z PLANNED („Zalicz”), PENDING, UNPAID
- Profil: OLX, „Przyjmuje nowych uczniów”, zgłoszenie Chemii oczekujące

## Powrót do czystej wersji („powróć”)

1. Usuń `NEXT_PUBLIC_FILMIK` z `.env.local`.
2. `pnpm seed:clean`
3. Zrestartuj `pnpm dev`.

Kod (`lib/filmik.ts`, gałęzie w datach / UI) przy wyłączonej fladze nic nie zmienia. Żeby fizycznie usunąć pliki Filmik z repo: skasuj `lib/filmik.ts`, `scripts/seed-filmik.mjs`, `docs/FILMIK.md`, skrypt `seed:filmik` w `package.json` i gałęzie `isFilmikMode` / badge — albo napisz w czacie **powróć**.
