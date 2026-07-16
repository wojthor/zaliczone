# RAPORT AKTUALNY STAN — ZALICZONE

**Data raportu:** 13 lipca 2026  
**Wersja aplikacji:** Next.js 16.1.6 + Supabase (Auth + PostgreSQL) + Resend  
**Status:** Full-stack z workflow księgowo-administracyjnym (maszyna stanów lekcji, e-maile transakcyjne, CRUD admin/tutor). Część modułów UI nadal korzysta z danych demonstracyjnych (cennik tabelaryczny, powiadomienia korepetytora).

> **Uwaga:** Starszy dokument `docs/RAPORT-REPO-ZALICZONE.md` opisuje wersję wyłącznie front-endową (bez Supabase). Ten raport jest **źródłem prawdy** o stanie kodu po wdrożeniu workflow z 13 lipca 2026.

---

## Spis treści

1. [Podsumowanie wykonawcze](#1-podsumowanie-wykonawcze)
2. [Model księgowo-prawny (2 filary)](#2-model-księgowo-prawny-2-filary)
3. [Stan PRZED promptem 13 lipca 2026](#3-stan-przed-promptem-13-lipca-2026)
4. [Prompt: 13 lipca — workflow admin-korepetytor](#4-prompt-13-lipca--workflow-admin-korepetytor)
5. [Co wprowadzono PO prompcie](#5-co-wprowadzono-po-prompcie)
6. [Co usunięto / odchudzono PO prompcie](#6-co-usunięto--odchudzono-po-prompcie)
7. [Maszyna stanów lekcji](#7-maszyna-stanów-lekcji)
8. [Stos technologiczny i uruchomienie](#8-stos-technologiczny-i-uruchomienie)
9. [Baza danych Supabase](#9-baza-danych-supabase)
10. [Konta seed i zmienne środowiskowe](#10-konta-seed-i-zmienne-środowiskowe)
11. [Warstwa danych (`lib/`)](#11-warstwa-danych-lib)
12. [E-maile transakcyjne (Resend)](#12-e-maile-transakcyjne-resend)
13. [Routing — wszystkie strony](#13-routing--wszystkie-strony)
14. [Supabase vs demo — mapa modułów](#14-supabase-vs-demo--mapa-modułów)
15. [Przepływy użytkownika krok po kroku](#15-przepływy-użytkownika-krok-po-kroku)
16. [Znane ograniczenia i luki](#16-znane-ograniczenia-i-luki)
17. [Indeks plików (kluczowe)](#17-indeks-plików-kluczowe)

---

## 1. Podsumowanie wykonawcze

**ZALICZONE** to panel webowy dla placówki korepetycyjnej z dwoma rolami i **formalnym workflow rozliczeń** zgodnym z modelem ewidencji sprzedaży bezrachunkowej (US) oraz ewidencji czasu pracy (ZUS/PIP/księgowa).

| Rola | Konta (po `pnpm seed:battle`) | Hasło | Panel |
|------|-------------------------------|-------|-------|
| **ADMIN** | `admin@zaliczone.pl` | `123456` | `/admin` |
| **TUTOR** | `teacher@zaliczone.pl` (Benio Beniowski) | `123456` | `/` |
| **TUTOR** | `martyna@zaliczone.pl` (Martyna Wilczyńska) | `123456` | `/` |
| **TUTOR** | `marcel@zaliczone.pl` (Marcel Kowalski) | `123456` | `/` |

**Minimalny seed** (`pnpm seed`) tworzy tylko admin + Benio.

**Dane trwałe w Supabase:**
- użytkownicy (`auth.users` + `profiles` z `active_subjects`, `ewidencja_unlocked_for_month`)
- uczniowie (`students`)
- lekcje (`lessons`) ze **`status`** (maszyna stanów — zamiast `is_completed` / `is_paid`)
- zgłoszenia przedmiotów (`subject_requests`)
- wypłaty (`payouts`)

**Integracje:**
- **Resend** — e-maile transakcyjne (powitanie, ewidencja, wypłata, cennik); wymaga `RESEND_API_KEY` (bez klucza — log + skip)

**Build:** `pnpm lint` i `pnpm build` przechodzą (stan na 13.07.2026).

---

## 2. Model księgowo-prawny (2 filary)

Workflow aplikacji odzwierciedla dwa **oddzielne** filary rozliczeniowe placówki edukacyjnej korzystającej ze zwolnienia z kasy fiskalnej (przyjmowanie wpłat na konto + ścisła ewidencja).

### Filar 1: Ewidencja sprzedaży bezrachunkowej (US)

| Element | Implementacja w systemie |
|---------|------------------------|
| Moment wpisu | Admin klika **„Zatwierdź”** w `/admin/rozliczenia` → lekcja przechodzi na `VERIFIED` |
| Warunek prawny | Data weryfikacji w panelu = data wpływu na wyciągu bankowym |
| Widok księgowy | `/admin/ksiegowosc` — tylko lekcje `VERIFIED` |
| Odrzucenie wpłaty | **„Brak wpłaty”** → `UNPAID`; korepetytor musi interweniować |

### Filar 2: Ewidencja czasu pracy (ZUS / PIP / księgowa)

| Element | Implementacja w systemie |
|---------|------------------------|
| Źródło danych | Tylko lekcje `VERIFIED` (klient zapłacił) |
| Odblokowanie PDF | Admin: **„Poproś o ewidencję”** w `/admin/wyplaty` → `profiles.ewidencja_unlocked_for_month` + e-mail |
| Generowanie | Korepetytor: `/finanse` → **„Generuj Ewidencję (PDF)”** → `/finanse/ewidencja?month=…` (drukuj / zapisz PDF) |
| Obieg papierowy | PDF → podpis korepetytora → skan do księgowości (poza systemem — na razie brak uploadu) |
| Wypłata | Admin: **„Wypłacone”** w `/admin/wyplaty` → `payouts.status = PAID` + e-mail potwierdzający |

---

## 3. Stan PRZED promptem 13 lipca 2026

Poniżej stan aplikacji **bezpośrednio przed** wdrożeniem workflow opisanego w prompcie „13 lipca — workflow admin-korepetytor”.

### 3.1. Baza danych

- Jedna migracja: `0001_initial_schema.sql`
- Tabela `lessons` z **`is_completed`** (korepetytor „Zalicz”) i **`is_paid`** (admin „Opłać”)
- Brak: `subject_requests`, `payouts`, `profiles.active_subjects`, `profiles.ewidencja_unlocked_for_month`

### 3.2. Logika biznesowa

| Obszar | Stan przed |
|--------|------------|
| Zaliczanie lekcji | `setLessonCompleted()` → `is_completed` |
| Opłacanie | `setLessonPaid()` → `is_paid` |
| Finanse korepetytora | Wszystkie **zaliczone** lekcje (`is_completed = true`) |
| Rozliczenia admina | Jedna lista; przycisk **„Opłać”** |
| Wypłaty | Lokalny `useState` — status „wypłacono” znika po odświeżeniu |
| Nauczyciele | Read-only lista z Supabase; `AddTutorModal` **niepodłączony** (demo w pamięci) |
| Cennik admina | Lokalny `useState`; przedmioty z `ADMIN_PENDING_SUBJECTS` (demo) |
| Profil korepetytora | Hardcoded „Jan Kowalczyk”; zgłoszenia przedmiotów w `useState` |
| Uczniowie | Tylko **dodawanie**; brak edycji/usuwania |
| E-maile | Brak integracji |
| Seed | `pnpm seed` — 2 konta (admin + Benio), bez historycznych lekcji |

### 3.3. Panel admina — demo w UI

Moduły oparte o **`lib/admin-demo.ts`** (fikcyjni nauczyciele Anna/Michał/Karolina itd.):

| Moduł | Demo przed cleanup |
|-------|-------------------|
| `/admin` | Widgety: `ADMIN_STUDENT_MESSAGES`, `ADMIN_PENDING_SUBJECTS`, `ADMIN_SYSTEM_ALERTS` |
| `/admin/dokumenty` | `ADMIN_TUTORS` + szablon plików `EMPLOYEE_MONTH_TEMPLATE` + `EWIDENCJA_DEMO` |
| `/admin/powiadomienia` | Pełna skrzynka demo + composer z listą `ADMIN_TUTORS` |
| `/admin/nauczyciele` | Lista z Supabase OK, ale modal dodawania — demo |

### 3.4. Co już działało na Supabase (zachowane)

- Auth + middleware + RBAC
- CRUD lekcji (tutor)
- Dodawanie uczniów
- Dashboard, terminarz, finanse (stary model boolean)
- Rozliczenia / księgowość / wypłaty (częściowo — stary model)
- `pnpm dev`, migracja 0001, seed podstawowy

---

## 4. Prompt: 13 lipca — workflow admin-korepetytor

Poniżej **pełna treść promptu**, który zainicjował wdrożenie workflow (architektura, Resend, UI, seed). Kotwica czasowa: **poniedziałek, 13 lipca 2026**.

---

> **Role:** Expert Full-Stack Next.js (App Router) Developer, Supabase Architect, and UX/UI Engineer.
>
> **Context:** We are massively upgrading the "ZALICZONE" tutoring management application. We are implementing a strict state-machine workflow for lessons, integrating "Resend" for transactional emails, building complete CRUD interfaces, and generating a highly realistic seed script set to July 13, 2026.
>
> ### PHASE 1: DATABASE SCHEMA UPGRADES (Supabase SQL)
>
> Create a new migration file to alter the existing schema to support the new workflow:
>
> Modify lessons table: Remove is_completed and is_paid. Add a new column status with a strict ENUM constraint:
>
> - `'PLANNED'` (Scheduled by tutor)
> - `'PENDING_VERIFICATION'` (Tutor clicked "Zalicz")
> - `'VERIFIED'` (Admin verified payment - locked for tutor)
> - `'UNPAID'` (Admin rejected due to no payment - tutor must intervene)
>
> Modify profiles table: Add active_subjects (text[]) and ewidencja_unlocked_for_month (text, e.g., '2026-06', to control when the PDF button appears).
>
> Create subject_requests table: id, tutor_id, subject, status ('PENDING', 'APPROVED', 'REJECTED').
>
> Create payouts table: id, tutor_id, month (e.g., '2026-06'), amount, status ('PENDING_DOCS', 'PAID').
>
> ### PHASE 2: RESEND EMAIL INTEGRATION
>
> Install resend package. Assume RESEND_API_KEY is in .env.local.
>
> Create lib/emails/actions.ts with Server Actions to send emails using a generic sender (e.g., powiadomienia@zaliczone.pl):
>
> - sendTutorWelcomeEmail(email, tempPassword)
> - sendEwidencjaRequestEmail(email, month)
> - sendPayoutConfirmationEmail(email, month, amount)
> - sendCennikUpdateEmail(emailsArray)
>
> ### PHASE 3: ADMIN PANEL WORKFLOW UPGRADES
>
> **/admin/nauczyciele:** Implement full CRUD. "Add Tutor" must create the Auth User (using Supabase Admin API), insert the profile, and trigger sendTutorWelcomeEmail.
>
> **/admin/rozliczenia:** Redesign to a 2-column layout:
> - Left Column: "Oczekujące na weryfikację" (Lessons with 'PENDING_VERIFICATION' status, or 'UNPAID' if resubmitted). Action buttons: "Zatwierdź" (changes to 'VERIFIED') and "Brak wpłaty" (changes to 'UNPAID').
> - Right Column: "Zatwierdzone" (Lessons with 'VERIFIED' status).
>
> **/admin/cennik:** Add the "Oczekujące przedmioty" panel to approve/reject subject_requests. When the global Cennik is updated, trigger sendCennikUpdateEmail to all tutors.
>
> **/admin/wyplaty:** Admin clicks "Poproś o ewidencję" -> sets ewidencja_unlocked_for_month for tutors and sends email. When admin clicks "Wypłacone", update payouts table and trigger sendPayoutConfirmationEmail.
>
> ### PHASE 4: TUTOR PANEL WORKFLOW UPGRADES
>
> **/uczniowie:** Implement full CRUD (Add, Edit, Delete).
>
> **/terminarz:** Lesson tile UI based on status: 'PLANNED' (default), 'PENDING_VERIFICATION' (yellow, clickable to undo), 'VERIFIED' (green, locked, unclickable), 'UNPAID' (red border, bold alert "Brak wpłaty - interweniuj", clickable to re-submit to 'PENDING_VERIFICATION').
>
> **/finanse:** Show balances ONLY calculating 'VERIFIED' lessons. If profiles.ewidencja_unlocked_for_month matches the selected month, display a prominent button: "Generuj Ewidencję (PDF)".
>
> **/profil:** Add "Zgłoś przedmiot" feature inserting into subject_requests.
>
> ### PHASE 5: THE BATTLE-TEST SEED SCRIPT (Temporal Anchor: July 13, 2026)
>
> Update scripts/seed-users.mjs (or create a new seed-battle.mjs) to generate a rich, realistic state exactly for the date Monday, July 13, 2026. You must use Supabase Admin API to bypass RLS for seeding.
>
> **Tutors:**
> - Admin: admin@zaliczone.pl
> - Tutor 1: teacher@zaliczone.pl (Benio Beniowski)
> - Tutor 2: martyna@zaliczone.pl (Martyna Wilczyńska)
> - Tutor 3: marcel@zaliczone.pl (Marcel)
>
> **Historical Data (June 2026):** Create 'VERIFIED' lessons for June. Create records in payouts marked as 'PAID' so historical finances look full.
>
> **Previous Week (July 6 - July 12):** This is what the admin verifies today. Generate 10-15 lessons across all tutors. Set most to 'PENDING_VERIFICATION', set 2 of Martyna's lessons to 'UNPAID' (to test the red alert), and set 3 of Marcel's to 'VERIFIED'.
>
> **Current Week (July 13 - July 19):** Generate 15-20 lessons set to 'PLANNED'.
>
> Ensure all students (at least 2 per tutor) are correctly linked to their tutors.
>
> **Execution Rules:** Ensure all client-side mutations now call Server Actions or Supabase Client to update the new status enum. Maintain the strict Tailwind design system currently in place. Write the full SQL migration first.

---

**Kontekst prawno-księgowy z tego samego wątku (nie był w bloku technicznym Cursora, ale definiuje produkt):**

1. **Ewidencja sprzedaży (US)** — wpis tylko po „Zatwierdź”; data = wpływ na koncie.
2. **Ewidencja czasu pracy** — PDF tylko z lekcji `VERIFIED`; skan podpisu → dopiero wypłata i „Wypłacone” w systemie.

---

## 5. Co wprowadzono PO prompcie

### 5.1. Faza 1 — Baza danych

**Plik:** `supabase/migrations/0002_lesson_status_workflow.sql`  
**Status:** Do uruchomienia w Supabase SQL Editor (po 0001). Użytkownik potwierdził: *Success. No rows returned*.

| Zmiana | Szczegóły |
|--------|-----------|
| Enum `lesson_status` | `PLANNED`, `PENDING_VERIFICATION`, `VERIFIED`, `UNPAID` |
| `lessons` | Kolumna `status`; usunięte `is_completed`, `is_paid` (migracja backfill ze starych booleanów) |
| `profiles` | `active_subjects text[]`, `ewidencja_unlocked_for_month text` |
| `subject_requests` | Zgłoszenia przedmiotów przez korepetytorów |
| `payouts` | Wypłaty per tutor + month (unique `tutor_id, month`) |
| RLS | Polityki dla nowych tabel; admin UPDATE na `profiles` |

### 5.2. Faza 2 — Resend

| Plik | Rola |
|------|------|
| `lib/emails/send.ts` | Implementacja wysyłki (Resend); nadawca `ZALICZONE <powiadomienia@zaliczone.pl>` |
| `lib/emails/actions.ts` | Re-export Server Actions |
| `lib/supabase/admin.ts` | Klient service role (tworzenie kont, wypłaty) |
| `lib/actions/admin.ts` | Server Actions: `createTutorAccount`, `approveSubjectRequest`, `requestEwidencjaForMonth`, `markPayoutPaid`, `notifyCennikUpdate`, … |
| `package.json` | Zależność `resend` ^6.17.2 |
| `.env.example` | `RESEND_API_KEY=` |

### 5.3. Faza 3 — Panel admina

| Route | Wprowadzone |
|-------|-------------|
| `/admin/nauczyciele` | `nauczyciele-client.tsx` — dodawanie (Auth + profil + e-mail), usuwanie; lista z Supabase |
| `/admin/nauczyciele/[id]` | Podział: oczekujące vs zatwierdzone (statusy) |
| `/admin/rozliczenia` | 2 kolumny: oczekujące (`PENDING_VERIFICATION`, `UNPAID`) vs zatwierdzone (`VERIFIED`); **Zatwierdź** / **Brak wpłaty** |
| `/admin/cennik` | `cennik-client.tsx` — `subject_requests` z DB; zatwierdź/odrzuć; zapis cennika → e-mail do tutorów |
| `/admin/wyplaty` | **Poproś o ewidencję**, **Wypłacone** → `payouts` + e-maile; dane z `VERIFIED` |
| `/admin` (home) | KPI z Supabase; liczniki pending verification / subject requests (bez demo widgetów) |
| `/admin/ksiegowosc` | Tylko lekcje `VERIFIED` (alias query) |

### 5.4. Faza 4 — Panel korepetytora

| Route | Wprowadzone |
|-------|-------------|
| `/uczniowie` | Dodawanie, **edycja**, **usuwanie** uczniów |
| `/terminarz` + dashboard | Kafelki wg `status` (kolory, alert UNPAID, lock VERIFIED); `tutorToggleLessonVerification()` |
| `/finanse` | Saldo **tylko VERIFIED**; przycisk PDF gdy `ewidencja_unlocked_for_month` = wybrany miesiąc |
| `/finanse/ewidencja` | Widok do druku / PDF (`ewidencja-print.tsx`) |
| `/profil` | `profil-client.tsx` — dane z Supabase; **Zgłoś przedmiot** → `subject_requests` |

### 5.5. Faza 5 — Seed battle-test

| Plik | Opis |
|------|------|
| `scripts/seed-battle.mjs` | 4 konta, uczniowie, ~40+ lekcji, scenariusz 13.07.2026 |
| `package.json` | Skrypt `pnpm seed:battle` |

**Scenariusz seeda:**
- **Czerwiec 2026:** lekcje `VERIFIED` + `payouts` `PAID`
- **6–12 lipca:** mix `PENDING_VERIFICATION`; 2× `UNPAID` (Martyna); 3× `VERIFIED` (Marcel)
- **13–19 lipca:** lekcje `PLANNED`
- Czyści tabele: `lessons`, `students`, `payouts`, `subject_requests` przed insertem

### 5.6. Warstwa danych — refaktor

| Plik | Zmiany |
|------|--------|
| `lib/types/database.ts` | `LessonStatus`, `SubjectRequest`, `Payout`, rozszerzony `Profile`, `FinanceLineUi.status` |
| `lib/data/queries.ts` | `getPendingVerificationLines`, `getAllVerifiedFinanceLines`, `getSubjectRequests`, `getAllPayouts`, … |
| `lib/data/mutations.ts` | `setLessonStatus`, `tutorToggleLessonVerification`, `adminVerifyLesson`, `adminRejectLessonPayment`, CRUD uczniów, `insertSubjectRequest` |
| `lib/data/mappers.ts` | `isLessonLocked`, mapowanie `status`, finanse tylko VERIFIED |
| `components/dashboard/weekly-schedule.tsx` | UI statusów |
| `components/dashboard/lesson-data.ts` | Typ `LessonStatus` na `Lesson` |

### 5.7. Poprawki po wdrożeniu (13 lipca, wieczór)

| Problem | Fix |
|---------|-----|
| Duplicate React keys `Matematyka`, `Fizyka`… | Dedup przedmiotów w `getAdminTutorSummaries()` (`Set`) |
| ESLint React Compiler | Uproszczenie `rozliczenia-client`, usunięcie `useEffect`+`setState` w powiadomieniach |
| Usunięto | `components/admin/add-tutor-modal.tsx` (zastąpiony przez `nauczyciele-client`) |

---

## 6. Co usunięto / odchudzono PO prompcie

### 6.1. Schema / API (zastąpione)

| Usunięte | Zastąpione przez |
|----------|------------------|
| `lessons.is_completed` | `lessons.status` |
| `lessons.is_paid` | `lessons.status` (`VERIFIED` = opłacone i zatwierdzone) |
| `setLessonCompleted()` | `tutorToggleLessonVerification()` / `setLessonStatus()` |
| `setLessonPaid()` | `adminVerifyLesson()` / `adminRejectLessonPayment()` |
| `getTutorCompletedFinanceLines()` | `getTutorVerifiedFinanceLines()` (+ alias deprecated) |
| `FinanceLineUi.isPaid` | `FinanceLineUi.status` |

### 6.2. UI admina — demo wycięte z widoku

| Moduł | Co usunięto |
|-------|-------------|
| `/admin` | Sekcje z `ADMIN_STUDENT_MESSAGES`, `ADMIN_PENDING_SUBJECTS`, `ADMIN_SYSTEM_ALERTS`; kafelek „Dokumenty” |
| `/admin/dokumenty` | Cała lista demo: `EWIDENCJA_DEMO`, `EMPLOYEE_MONTH_TEMPLATE`, foldery `ADMIN_TUTORS` (Anna, Michał, Karolina…) → **pusty opis + status modułu** |
| `/admin/powiadomienia` | Skrzynka demo + composer z `ADMIN_TUTORS` → **informacja o e-mailach Resend** |
| Menu admina | Link **„Dokumenty”** usunięty z `admin-layout-client.tsx` |
| `components/admin/add-tutor-modal.tsx` | Plik usunięty (demo modal) |

**Uwaga:** Plik `lib/admin-demo.ts` **nadal istnieje** w repo, ale **nie jest importowany** w `app/admin/*` po cleanup.

### 6.3. Dokumentacja

| Plik | Status |
|------|--------|
| `docs/RAPORT-PANELU-ADMINA.md` | Usunięty wcześniej z repo |
| `docs/RAPORT-PROJEKTU-ZALICZONE.md` | Przestarzały (pre-Supabase) |
| `docs/RAPORT-AKTUALNY-STAN.md` | **Ten dokument** — zaktualizowany 13.07.2026 |

---

## 7. Maszyna stanów lekcji

```
PLANNED
  └─ (korepetytor: „Zalicz”) → PENDING_VERIFICATION

PENDING_VERIFICATION
  ├─ (admin: „Zatwierdź”) → VERIFIED  ← wpis do ewidencji US; finanse korepetytora; wypłaty
  └─ (admin: „Brak wpłaty”) → UNPAID

UNPAID
  └─ (korepetytor: „Ponów”) → PENDING_VERIFICATION

VERIFIED
  └─ zablokowane dla korepetytora (brak cofnięcia)
```

| Status | Kolor kafelka (terminarz) | Korepetytor | Admin |
|--------|---------------------------|-------------|-------|
| `PLANNED` | Domyślny (taupe) | Zalicz | — |
| `PENDING_VERIFICATION` | Żółty / amber | Cofnij (→ PLANNED) | Zatwierdź / Brak wpłaty |
| `VERIFIED` | Zielony | Zablokowane | Widoczne w „Zatwierdzone” |
| `UNPAID` | Czerwona obwódka + alert | Ponów | Widoczne w „Oczekujące” |

---

## 8. Stos technologiczny i uruchomienie

### 8.1. Zależności produkcyjne

| Pakiet | Wersja | Rola |
|--------|--------|------|
| `next` | 16.1.6 | App Router |
| `react` / `react-dom` | 19.2.3 | UI |
| `@supabase/ssr` | ^0.10.3 | Sesja cookie |
| `@supabase/supabase-js` | ^2.107.0 | Klient Supabase |
| `resend` | ^6.17.2 | E-maile transakcyjne |

### 8.2. Skrypty

| Skrypt | Komenda |
|--------|---------|
| `dev` | `next dev --webpack` |
| `dev:clean` | `rm -rf .next && next dev --webpack` |
| `build` | `next build` |
| `lint` | `eslint` |
| `seed` | `node --env-file=.env.local scripts/seed-users.mjs` |
| **`seed:battle`** | `node --env-file=.env.local scripts/seed-battle.mjs` |

### 8.3. Uruchomienie od zera (13 lipca 2026)

1. `.env.example` → `.env.local` (Supabase + opcjonalnie `RESEND_API_KEY`)
2. SQL Editor: `supabase/migrations/0001_initial_schema.sql`
3. SQL Editor: `supabase/migrations/0002_lesson_status_workflow.sql`
4. `pnpm install`
5. **`pnpm seed:battle`** (pełna symulacja) *lub* `pnpm seed` (tylko 2 konta)
6. `pnpm dev` lub `pnpm dev:clean`
7. Zaloguj jako admin → `/admin/rozliczenia` (weryfikacja lekcji z poprzedniego tygodnia)

---

## 9. Baza danych Supabase

### 9.1. Migracja 0001 (bez zmian w strukturze pliku)

Tabele: `profiles`, `students`, `lessons` (legacy booleans — nadpisane przez 0002).

### 9.2. Migracja 0002 — workflow

**Enumy:** `lesson_status`, `subject_request_status`, `payout_status`

**`profiles` — dodatkowe kolumny:**

| Kolumna | Typ | Opis |
|---------|-----|------|
| `active_subjects` | `text[]` | Zatwierdzone przedmioty korepetytora |
| `ewidencja_unlocked_for_month` | `text` | Np. `'2026-06'` — odblokowuje PDF w Finansach |

**`lessons.status`** zamiast `is_completed` / `is_paid`.

**`subject_requests`:**

| Kolumna | Opis |
|---------|------|
| `tutor_id`, `subject`, `status` | PENDING / APPROVED / REJECTED |

**`payouts`:**

| Kolumna | Opis |
|---------|------|
| `tutor_id`, `month`, `amount`, `status` | PENDING_DOCS / PAID |

---

## 10. Konta seed i zmienne środowiskowe

### 10.1. `pnpm seed` — minimalny

| Email | Hasło | Rola |
|-------|-------|------|
| admin@zaliczone.pl | 123456 | ADMIN |
| teacher@zaliczone.pl | 123456 | TUTOR (Benio) |

### 10.2. `pnpm seed:battle` — pełna symulacja

Dodatkowo: `martyna@zaliczone.pl`, `marcel@zaliczone.pl` (hasło `123456`), uczniowie, lekcje, wypłaty czerwca.

### 10.3. Zmienne `.env.local`

| Zmienna | Wymagana | Użycie |
|---------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Tak | Klient Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tak | Klient Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed + Server Actions admin | Service role |
| `RESEND_API_KEY` | Opcjonalna | E-maile; bez klucza — skip z logiem |
| `DATABASE_URL` | Nie | Nieużywane przez Next.js |

---

## 11. Warstwa danych (`lib/`)

### 11.1. Typy — `lib/types/database.ts`

`LessonStatus`, `SubjectRequest`, `Payout`, `PayoutStatus`, rozszerzone `Profile`, `AdminTutorSummary`, `FinanceLineUi`.

### 11.2. Zapytania — `lib/data/queries.ts` (wybrane)

| Funkcja | Opis |
|---------|------|
| `getPendingVerificationLines()` | `PENDING_VERIFICATION` + `UNPAID` — rozliczenia admina |
| `getAllVerifiedFinanceLines()` | Tylko `VERIFIED` — księgowość, wypłaty |
| `getTutorVerifiedFinanceLines(tutorId)` | Finanse korepetytora |
| `getSubjectRequests(status?)` | Panel cennika |
| `getAllPayouts()` | Wypłaty admina |
| `getTutorSubjectRequests(tutorId)` | Profil korepetytora |
| `getAdminTutorSummaries()` | Lista nauczycieli (przedmioty deduplikowane) |

### 11.3. Mutacje — `lib/data/mutations.ts`

| Funkcja | Opis |
|---------|------|
| `insertStudent` / `updateStudent` / `deleteStudent` | CRUD uczniów |
| `insertLessons` | Nowe lekcje ze `status: PLANNED` |
| `tutorToggleLessonVerification` | PLANNED ↔ PENDING; UNPAID → PENDING |
| `adminVerifyLesson` | → VERIFIED |
| `adminRejectLessonPayment` | → UNPAID |
| `insertSubjectRequest` | Zgłoszenie przedmiotu |

### 11.4. Server Actions — `lib/actions/admin.ts`

| Akcja | Efekt |
|-------|-------|
| `createTutorAccount` | Auth user + profil + e-mail powitalny |
| `deleteTutorAccount` | Usunięcie użytkownika Auth |
| `approveSubjectRequest` / `rejectSubjectRequest` | Cennik |
| `requestEwidencjaForMonth` | Ustawia `ewidencja_unlocked_for_month` + e-mail |
| `markPayoutPaid` | Upsert `payouts` + e-mail |
| `notifyCennikUpdate` | E-mail do wszystkich tutorów |

---

## 12. E-maile transakcyjne (Resend)

| Funkcja | Trigger |
|---------|---------|
| `sendTutorWelcomeEmail` | Dodanie nauczyciela |
| `sendEwidencjaRequestEmail` | „Poproś o ewidencję” |
| `sendPayoutConfirmationEmail` | „Wypłacone” |
| `sendCennikUpdateEmail` | Zapis cennika w adminie |

Nadawca: `powiadomienia@zaliczone.pl` (wymaga skonfigurowanej domeny w Resend w produkcji).

---

## 13. Routing — wszystkie strony

| Trasa | Rola | Źródło danych | Uwagi |
|-------|------|---------------|-------|
| `/login` | Public | Supabase Auth | |
| `/` | TUTOR | Supabase | Dashboard |
| `/terminarz` | TUTOR | Supabase | Statusy lekcji |
| `/uczniowie` | TUTOR | Supabase | CRUD |
| `/finanse` | TUTOR | Supabase VERIFIED | Przycisk PDF |
| `/finanse/ewidencja` | TUTOR | Supabase | Druk / PDF |
| `/profil` | TUTOR | Supabase | Zgłoszenia przedmiotów |
| `/powiadomienia` | TUTOR | **DEMO** | `DEMO_MESSAGES` |
| `/kalendarz` | — | Redirect / legacy | |
| `/admin` | ADMIN | Supabase | KPI bez demo widgetów |
| `/admin/rozliczenia` | ADMIN | Supabase | 2 kolumny statusów |
| `/admin/wyplaty` | ADMIN | Supabase | Ewidencja + wypłaty |
| `/admin/ksiegowosc` | ADMIN | Supabase VERIFIED | Ewidencja sprzedaży |
| `/admin/nauczyciele` | ADMIN | Supabase + Actions | CRUD |
| `/admin/nauczyciele/[id]` | ADMIN | Supabase | |
| `/admin/cennik` | ADMIN | DB requests + lokalny cennik | E-mail przy zapisie |
| `/admin/powiadomienia` | ADMIN | **Placeholder** | Opis e-maili Resend |
| `/admin/dokumenty` | ADMIN | **Placeholder** | Route istnieje; brak w menu |

---

## 14. Supabase vs demo — mapa modułów

| Moduł | Supabase / produkcyjne | Demo / placeholder |
|-------|------------------------|-------------------|
| Auth, middleware, RBAC | ✅ | |
| Uczniowie CRUD | ✅ | Pola telefon/email/notatki tylko w UI |
| Lekcje + statusy | ✅ | |
| Rozliczenia / księgowość | ✅ | Metoda płatności Przelew/BLIK — losowana w UI |
| Wypłaty + payouts | ✅ | Model 70/30 marży — stała w kodzie |
| Nauczyciele CRUD | ✅ | |
| Zgłoszenia przedmiotów | ✅ | |
| Ewidencja PDF | ✅ | Brak uploadu skanu |
| E-maile | ✅ (Resend) | Skip bez API key |
| Cennik (tabela stawek) | ❌ | `useState` + `DEMO_CENNIK` w UI tutor/admin |
| Lista przedmiotów w formularzach | ❌ | `DEMO_ACTIVE_SUBJECTS` |
| Powiadomienia korepetytora | ❌ | `DEMO_MESSAGES` |
| Powiadomienia admina | ❌ | Placeholder tekstowy |
| Dokumenty admina | ❌ | Placeholder tekstowy |
| Upload plików / Storage | ❌ | Planowane |

---

## 15. Przepływy użytkownika krok po kroku

### 15.1. Korepetytor — normalna lekcja

1. Lekcja `PLANNED` w terminarzu  
2. Po zajęciach: **Zalicz** → `PENDING_VERIFICATION`  
3. Admin weryfikuje wpływ → **Zatwierdź** → `VERIFIED`  
4. Kwota widoczna w `/finanse` (saldo VERIFIED)

### 15.2. Brak wpłaty

1. Admin: **Brak wpłaty** → `UNPAID`  
2. Korepetytor widzi czerwony alert „Brak wpłaty — interweniuj”  
3. Po kontakcie z rodzicem: **Ponów** → z powrotem `PENDING_VERIFICATION`

### 15.3. Wypłata miesięczna

1. Admin: **Poproś o ewidencję** (np. za czerwiec)  
2. Korepetytor: Finanse → **Generuj Ewidencję (PDF)** → druk, podpis, skan (poza app)  
3. Admin: przelew + **Wypłacone** → `payouts.PAID` + e-mail

### 15.4. Nowy przedmiot

1. Korepetytor: Profil → **Zgłoś przedmiot** → `subject_requests.PENDING`  
2. Admin: Cennik → **Zatwierdź** → `profiles.active_subjects` rozszerzone

---

## 16. Znane ograniczenia i luki

1. **`pnpm seed:battle`** — użytkownik musi uruchomić ręcznie; bez tego brak Marty/Marcela i scenariusza lipca.  
2. **Cennik** — stawki w UI nie są w Postgres; tylko lokalny stan + demo fallback.  
3. **Dokumenty** — brak Supabase Storage i listy plików per tutor.  
4. **Powiadomienia in-app** — korepetytor nadal ma demo skrzynkę.  
5. **Data weryfikacji** — system nie zapisuje osobno `verified_at`; data lekcji ≠ data wpływu (do rozszerzenia).  
6. **Resend** — w dev bez klucza e-maile nie wychodzą (celowe).  
7. **`lib/admin-demo.ts`** — martwy kod w repo (nie używany w admin UI po cleanup).  
8. **Usuwanie ucznia** — CASCADE lekcji zależy od FK w Supabase (sprawdzić w 0001).

---

## 17. Indeks plików (kluczowe)

```
supabase/migrations/
  0001_initial_schema.sql
  0002_lesson_status_workflow.sql

scripts/
  seed-users.mjs
  seed-battle.mjs

lib/
  actions/admin.ts
  data/queries.ts, mutations.ts, mappers.ts
  emails/send.ts, actions.ts
  supabase/admin.ts, client.ts, server.ts, middleware.ts
  types/database.ts
  demo-data.ts          # nadal: cennik, messages, subjects
  admin-demo.ts         # martwy w UI admina

app/admin/
  page.tsx
  rozliczenia/rozliczenia-client.tsx
  wyplaty/wyplaty-client.tsx
  ksiegowosc/ksiegowosc-client.tsx
  nauczyciele/nauczyciele-client.tsx
  cennik/cennik-client.tsx
  powiadomienia/page.tsx   # placeholder
  dokumenty/page.tsx       # placeholder

app/finanse/
  page.tsx
  ewidencja/page.tsx, ewidencja-print.tsx

app/profil/profil-client.tsx
components/uczniowie/uczniowie-client.tsx
components/dashboard/weekly-schedule.tsx
components/finanse/finanse-client.tsx
middleware.ts
docs/RAPORT-AKTUALNY-STAN.md   # ten plik
```

---

*Koniec raportu — wygenerowano / zaktualizowano 13 lipca 2026 po wdrożeniu workflow admin–korepetytor.*
