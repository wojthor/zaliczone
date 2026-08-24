# Raport aplikacji Zaliczone — od A do Z

**Data raportu:** 24 sierpnia 2026  
**Repozytorium:** `zaliczone`  
**Cel dokumentu:** kompletny opis funkcjonalny i techniczny — każda podstrona, panel, zakładka, reguła biznesowa, mutacja, cache i stack.

---

## Spis treści

1. [Czym jest Zaliczone](#1-czym-jest-zaliczone)
2. [Role użytkowników i dostęp](#2-role-użytkowników-i-dostęp)
3. [Cykl biznesowy miesiąca](#3-cykl-biznesowy-miesiąca)
4. [Statusy lekcji i wypłat](#4-statusy-lekcji-i-wypłat)
5. [Strefa publiczna](#5-strefa-publiczna)
6. [Panel nauczyciela (TUTOR)](#6-panel-nauczyciela-tutor)
7. [Panel admina (ADMIN)](#7-panel-admina-admin)
8. [API (Route Handlers)](#8-api-route-handlers)
9. [Model danych (Supabase)](#9-model-danych-supabase)
10. [Server Actions — katalog](#10-server-actions--katalog)
11. [Stack technologiczny](#11-stack-technologiczny)
12. [Cache i optymalizacje](#12-cache-i-optymalizacje)
13. [Integracje zewnętrzne](#13-integracje-zewnętrzne)
14. [Bezpieczeństwo](#14-bezpieczeństwo)
15. [Testy i seed](#15-testy-i-seed)
16. [Znane ograniczenia i uwagi](#16-znane-ograniczenia-i-uwagi)

---

## 1. Czym jest Zaliczone

**Zaliczone** to aplikacja webowa do zarządzania agencją korepetycji:

- **Koordynator (ADMIN)** — weryfikuje wpłaty uczniów, wypłaca nauczycieli, prowadzi księgowość (NDG/JDG), zarządza kadrą i cennikiem.
- **Korepetytor (TUTOR)** — planuje lekcje, prowadzi uczniów, zgłasza lekcje do weryfikacji, ogląda finanse i generuje ewidencję godzin do podpisu.
- **Uczeń** — **nie ma konta** w systemie. To rekord w tabeli `students` przypisany do nauczyciela (imię, przedmiot, poziom, kontakt, ewentualna blokada).

Landing publiczny (`/`) pozwala znaleźć korepetytora (filtr poziom/przedmiot/dni) i zostawić zgłoszenie waitlisty e-mailem.

---

## 2. Role użytkowników i dostęp

| Rola | Gdzie pracuje | Domyślne przekierowanie po logowaniu |
|------|---------------|--------------------------------------|
| `ADMIN` | `/admin/*` | `/admin` |
| `TUTOR` | `/panel`, `/terminarz`, `/uczniowie`, `/finanse`, `/profil`, `/przewodnik` | `/panel` |

### Middleware (`middleware.ts` + `lib/supabase/middleware.ts`)

1. Odświeża sesję Supabase (cookie SSR).
2. **Ścieżki publiczne** (bez logowania): `/`, `/login`, `/ustaw-haslo`, `/auth/callback`, `/regulamin`, `/polityka-prywatnosci`.
3. Brak sesji na chronionej ścieżce → `/login?next=<pathname>`.
4. Zalogowany na `/login` → `/panel` (ADMIN zaraz potem trafia na `/admin` przez regułę 5).
5. `ADMIN` na `/panel` → `/admin`.
6. Nie-`ADMIN` na `/admin*` → `/panel`.

### Auth callback (`app/auth/callback/route.ts`)

- Wymiana `code` na sesję (`exchangeCodeForSession`) albo `verifyOtp` (invite / magic link).
- Parametr `next` jest sanitizowany — tylko ścieżki względne zaczynające się od `/`.
- Błąd → `/login?error=invite`.

### Zaproszenie nauczyciela

Admin tworzy konto (`createTutorAccount`) → e-mail invite (Resend) → link `/auth/callback?…&next=/ustaw-haslo` → ustawienie hasła → `/panel`.

### Wylogowanie

`signOut()` z `lib/data/mutations.ts` → redirect `/login`.

---

## 3. Cykl biznesowy miesiąca

Źródło terminów: `lib/dates.ts` (`DATES`).

| Etap | Kiedy (w następnym miesiącu względem miesiąca pracy M) | Co się dzieje |
|------|--------------------------------------------------------|---------------|
| Ewidencja godzin | od 1., deadline 3. | Nauczyciel generuje PDF ewidencji, podpisuje, odsyła |
| Rachunki | wysyłka 3., zwrot do 5. | Dokumenty do podpisu (proces offline + checklisty w kalendarzu admina) |
| Weryfikacja dokumentów | od 6. | Zgodność podpisanych dokumentów z systemem |
| Wypłaty | do 10. | Admin oznacza `PAID` + przelew bankowy + e-mail |
| Zamknięcie miesiąca | najwcześniej od 6., target 15. | `closeMonth` w księgowości |
| Przegląd finansów | 16. | Limity NDG/VAT, koszty |
| Podatki | do 20. | Zaliczka PIT (głównie JDG) |

**Roczne:** zestawienie kosztów (15.01), PIT-11, PIT nauczycieli, PIT-36, zamknięcie roku.

### Premia nauczyciela

- Progi: **40 / 50 / 60 godzin** lekcji `VERIFIED` → po **+100 zł** na próg (łącznie do **300 zł**). Pasek na dashboardzie pokazuje tylko aktualny segment.
- Udział bazowy tutora w stawce klienta (fallback): **70%** (`TUTOR_SHARE = 0.7`).
- W praktyce wynagrodzenie liczone jest ze **stawek pracownika z cennika** (`worker_rate_pln` × godziny) + premia.

---

## 4. Statusy lekcji i wypłat

### Lekcje (`lessons.status`)

```
PLANNED
   │  (nauczyciel: „zalicz” / tutorToggleLessonVerification)
   ▼
PENDING_VERIFICATION  ←──── UNPAID (ponowne zgłoszenie przez nauczyciela)
   │
   ├─ adminVerifyLesson ──► VERIFIED  (data wpływu + metoda płatności; zablokowane dla tutora)
   │
   └─ adminRejectLessonPayment ──► UNPAID
```

**Zasady:**

| Kto | Może | Nie może |
|-----|------|----------|
| TUTOR | Tworzyć/edytować/usuwać `PLANNED` (nie przeszłe); przełączać PLANNED↔PENDING; UNPAID→PENDING | Cofnąć `VERIFIED`; mutować zamknięty miesiąc; lekcje zablokowanego ucznia; kolizje godzin |
| ADMIN | Zatwierdzić / oznaczyć brak wpłaty | — (w UI rozliczeń) |

**Alert streak:** 3 lekcje z rzędu w statusach `UNPAID|VERIFIED`, wszystkie `UNPAID` → alert `UNPAID_STREAK` dla ADMIN → opcjonalna blokada ucznia → alert `STUDENT_BLOCKED` dla tutora.

### Wypłaty (`payouts`)

- Brak rekordu = wypłata jeszcze nieoznaczona.
- `status === "PAID"` = wypłacone (UI „Wypłacone”).
- Typ `PENDING_DOCS` istnieje w typach, operacyjny flow opiera się głównie na obecności `PAID`.

### Zamknięty miesiąc (`closed_months`)

`assertMonthOpen(monthKey)` w `lib/actions/guards.ts` blokuje mutacje (lekcje, wypłaty, koszty) dla zamkniętego miesiąca. Fail-open, jeśli tabela jeszcze nie istnieje (pre-migracja).

---

## 5. Strefa publiczna

### 5.1 `/` — Landing

**Cel:** marketing, matching korepetytorów, waitlista, wejście do logowania.

**Dane (SSR):**

- `getPublicTutorCards()` — aktywni TUTOR bez zakończonej umowy, przedmioty/poziomy, telefon, e-mail, OLX, zdjęcie.
- `getPriceTiers()` — etykiety poziomów do filtra.

**UI:** `LandingPageClient`.

**Akcje:**

- Filtr: poziom + przedmiot + dni tygodnia.
- Karty korepetytorów z kontaktem.
- Modal waitlisty → Server Action `submitTutorWaitlist` → e-mail na `COMPANY.email` (`sendTutorWaitlistEmail`). **Bez zapisu do DB** w samej akcji.
- Linki: `/login`, `/regulamin`, `/polityka-prywatnosci`.

**Nie pozwala:** założyć konta ucznia, zarezerwować lekcji online.

### 5.2 `/login`

- Formularz e-mail + hasło (`LoginForm`).
- Klient Supabase `signInWithPassword` + odczyt `profiles.role` → redirect (patrz §2).
- Błędne dane → komunikat (bez ujawniania szczegółów konta).
- Brak UI „zapomniałem hasła”.

### 5.3 `/ustaw-haslo`

- Pierwsze hasło po zaproszeniu (`SetPasswordForm`).
- Min. 8 znaków, zgodność pól, wymagana sesja invite.
- Action: `setInitialPassword` → update przez service role + `signInWithPassword` → `/panel`.

### 5.4 `/regulamin` i `/polityka-prywatnosci`

- Publiczne dokumenty MDX + `LegalDocShell`.
- Bez auth, bez mutacji.

### 5.5 `/auth/callback`

- Endpoint OAuth/invite (patrz §2).

---

## 6. Panel nauczyciela (TUTOR)

**Shell:** `AppShell` + `LessonCompletionProvider` (z wyjątkiem printowych `/finanse/ewidencja`).

**Nawigacja główna:** Główna (`/panel`), Terminarz, Uczniowie, Finanse; dodatkowo Przewodnik, Profil; wylogowanie.

**Global search:** `searchWorkspace` → uczniowie (`/uczniowie?student=`), lekcje (`/terminarz?lesson=`).

**Guard stron:** brak profilu → `/login`; `ADMIN` → `/admin`.

---

### 6.1 `/panel` — Główna nauczyciela

**Cel:** skrót tygodnia, premia, alerty, uczniowie, finanse miesiąca.

**Dane:** lekcje, uczniowie, linie VERIFIED, cennik, alerty tutora; wyliczenia godzin/wypłaty (`sumTutorPayoutFromCennik`, premia `bonusProgress`), `lessonStats`.

**UI:** `DashboardLayout` — `AlertsBanner`, `BonusProgressBar`, `WeeklySchedule`, `MonthlyCalendar`, `StudentsPanel`, kafelki finansowe, skrót do przewodnika.

**Pozwala:**

- `tutorToggleLessonVerification` — PLANNED↔PENDING, UNPAID→PENDING.
- `dismissAlert` na alertach TUTOR.

**Nie pozwala:** CRUD lekcji/uczniów (to Terminarz / Uczniowie); cofnąć VERIFIED; oznaczać wypłat.

---

### 6.2 `/terminarz`

**Cel:** planowanie i zarządzanie lekcjami (tydzień / miesiąc).

**Dane:** lekcje, uczniowie, `active_subjects`, alerty.

**UI:** `TerminarzPageView` — kalendarz, modal lekcji, cykliczność (once / weekly / custom), deep-link `?lesson=`.

**Server Actions (`lib/actions/lessons.ts`):**

| Funkcja | Co robi | Blokady |
|---------|---------|---------|
| `insertLessons` | Tworzy lekcje `PLANNED` (seria opcjonalna) | Data ≥ dziś; przedmiot z uprawnień; uczeń nie `blocked`; brak kolizji; miesiąc otwarty |
| `updateLesson` | Edycja | Tylko własne `PLANNED`; nie przeszłe; otwarty miesiąc; bez kolizji |
| `deleteLesson` | Usunięcie | Tylko `PLANNED`, nie przeszłe |
| `deleteLessonAndRemainingInSeries` | Ta + późniejsze w serii | Tylko `PLANNED` |
| `deleteLessonsByIds` | Masowe usuwanie | Tylko `PLANNED` |
| `tutorToggleLessonVerification` | Zgłoszenie do weryfikacji / cofnięcie | VERIFIED locked; zamknięty miesiąc |

Pomocnicze: `lessonDatesFromDraft`, `assertNoTutorTimeConflict` / overlap `[start, end)`.

---

### 6.3 `/uczniowie`

**Cel:** baza uczniów nauczyciela.

**UI:** lista, sortowanie, filtr przedmiotu, modal add/edit, historia lekcji, badge `blocked`, deep-link `?student=`.

**Actions (`lib/actions/students.ts`):**

| Funkcja | Zasady |
|---------|--------|
| `insertStudent` | Przedmioty/poziom z `active_subjects`; stawka z `price_tiers` |
| `updateStudent` | Zablokowany → błąd („możesz go usunąć”); te same reguły uprawnień |
| `deleteStudent` | Tylko własni (`tutor_id`) |

**Nie pozwala:** edytować zablokowanego ucznia; dodawać lekcji dla zablokowanego (też w `insertLessons`).

---

### 6.4 `/finanse`

**Cel:** podgląd wynagrodzenia i lekcji VERIFIED (read-mostly).

**Dane:** linie VERIFIED, payouts, closed months, cennik, liczba uczniów.

**UI (`FinanseClient`):**

- Wybór miesiąca (zamknięte oznaczone).
- Modal cennika (tylko odczyt).
- „Do wypłaty” + premia + badge gdy `PAID`.
- Lista zatwierdzonych lekcji z udziałem nauczyciela.
- Link **Generuj ewidencję** → `/finanse/ewidencja?month=YYYY-MM` gdy są VERIFIED i PDF odblokowany (`isEwidencjaPdfAvailable` — od 1. dnia kolejnego miesiąca).

**Nie pozwala:** oznaczać wypłat, zmieniać statusów lekcji, edytować cennika.

### 6.4b `/finanse/ewidencja`

- Widok do druku (bez AppShell).
- Warunki: poprawny `month`, PDF dostępny, ≥1 lekcja VERIFIED.
- `EwidencjaPrintView` — dokument offline (podpis + mail do koordynatora — opis w przewodniku).

---

### 6.5 `/profil`

**Cel:** dostępność, przedmioty, dokumenty Drive (odczyt).

**Pozwala:**

- `setAcceptingStudents` — sync alertu `STOP_TEACHING`.
- `insertSubjectRequest` — wniosek o nowy przedmiot/poziom (`PENDING`).
- Przeglądanie i pobieranie plików Drive (`getTutorDriveFilesForViewer`, `GET /api/drive/files/[fileId]`).

**Nie pozwala (tylko admin):** edycja imienia, telefonu, OLX, konta bankowego, PIT, hasła (poza ścieżką invite), upload do Drive z UI profilu.

---

### 6.6 `/przewodnik`

- Statyczna instrukcja: terminy `DATES`, dane firmy do faktur, placeholder wideo.
- Bez mutacji.

### 6.7 `/kalendarz`

- **Redirect** → `/terminarz` (alias historyczny).

### 6.8 `/powiadomienia`

- **Redirect** → `/panel`.
- Infrastruktura (`notifications`, `markNotificationRead`, `NotificationsList`) istnieje, ale **nie jest podpięta** pod osobną trasę nauczyciela. Nauczyciel widzi głównie **alerty**.

---

## 7. Panel admina (ADMIN)

**Layout:** `app/admin/layout.tsx` + `AdminLayoutClient`.

**Sidebar:** Główna, Kalendarz, Lekcje, Wypłaty, Księgowość, Nauczyciele, Cennik i przedmioty, wylogowanie.

**Global search:** nauczyciele, lekcje, strony admina (`searchWorkspace`).

**Bez shella (print):** `/admin/ksiegowosc/ewidencja`, `/admin/ksiegowosc/koszty`, `/admin/wyplaty/lista-plac`.

**Badge alertów** na „Główna”: `getOpenAdminAlerts()`.

---

### 7.1 `/admin` — Główna (dashboard)

**Cel:** pulpit koordynatora — finanse miesiąca, zespół, lekcje, alerty, mini-cykl miesięczny.

**Finanse miesiąca (kafelki):**

| Kafelek | Znaczenie |
|---------|-----------|
| **Przychód** | Suma kwot klienta z lekcji `VERIFIED` w bieżącym miesiącu |
| **Koszty** | Koszt tutorów (cennik + premia) + koszty operacyjne miesiąca |
| **Dochód** | Przychód − koszty |
| **Nieopłacone** | Suma linii `UNPAID` w miesiącu |

**Podział (donut)** — w sekcji „Zespół i lekcje” (w miejscu dawnych „Umowy - 30 dni”): Koszty / Dochód / Nieopłacone — w tej samej skali wizualnej co donut „Lekcje”.

**Lekcje (donut):** Do zatwierdzenia / Zatwierdzone / Nieopłacone (liczby).

**Pozostałe:** liczba nauczycieli i uczniów; kalendarz bieżącego miesiąca + checklista terminów cyklu (**localStorage**, bez serwera); `AlertsBanner` (`blockStudentFromAlert`, `dismissAlert`).

**Źródła danych:** `getCachedCoordinatorDashboardLines`, `getAllOperatingExpenses`, `getAllTutorProfiles`, count `students`, `getPriceTiers`, `getOpenAdminAlerts`.

---

### 7.2 `/admin/rozliczenia` — Lekcje

**Cel:** weryfikacja wpłat uczniów w układzie tygodniowym — 3 kolumny.

| Kolumna | Status | Akcje |
|--------|--------|-------|
| Do zatwierdzenia | `PENDING_VERIFICATION` | Zatwierdź / Brak wpłaty |
| Zatwierdzone | `VERIFIED` | Tylko podgląd (data wpływu zablokowana) |
| Nieopłacone | `UNPAID` | Ponowne zatwierdzenie / obsługa |

**Filtry:** tydzień (`WeekNavigator`), wyszukiwanie tekstowe, deep-link `?q=&date=`.

**Actions:**

- `adminVerifyLesson(lessonId, paymentReceivedAt, paymentMethod?)` — wymaga metody: Przelew tradycyjny / BLIK / Przelewy24 / Gotówka; `syncUnpaidStreakAlert`; cache bust.
- `adminRejectLessonPayment(lessonId)` → `UNPAID`.

**Blokady:** `assertMonthOpen` po dacie lekcji; po VERIFIED data wpływu tylko do odczytu.

**UI:** `ConfirmDialog`, animacje pulse/hop, `WeekVerificationBar`. Karty zatwierdzonych lekcji: wyraźniejszy zielony border (`border-2 border-moss/70`), zaokrąglenie `rounded-app` (nie pełny pill).

---

### 7.3 `/admin/wyplaty` — Wypłaty

**Cel:** lista płac za **miesiąc pracy = poprzedni** względem wybranego „miesiąca wypłaty” (`previousMonthKey`). Tylko lekcje VERIFIED.

**Per nauczyciel:** lekcje, godziny, wynagrodzenie (cennik), premia, razem, status PAID, nr konta.

**Kafelki:** Przychód (klient) / Do wypłaty · Wypłacone / Marża agencji.

**Actions:**

| UI | Action |
|----|--------|
| Oznacz jako wypłacone | `markPayoutPaid` — upsert `payouts` + `sendPayoutConfirmationEmail`; kwotę można skorygować w dialogu |
| Odznacz | `unmarkPayoutPaid` |
| PDF | `/admin/wyplaty/lista-plac?month=…` |

**Blokady:** `assertMonthOpen(workMonthKey)`.

#### `/admin/wyplaty/lista-plac`

- Dokument do druku/PDF przeglądarki (umowy zlecenia).
- Guard ADMIN. Bez mutacji DB.
- **Uwaga:** PDF może liczyć udział `TUTOR_SHARE` (70%), podczas gdy tabela wypłat używa stawek z cennika — możliwe drobne różnice.

---

### 7.4 `/admin/ksiegowosc` — Księgowość

**Cel:** ewidencja sprzedaży, koszty, P&L, limity NDG/VAT, podatki/ZUS, zamknięcie miesiąca, przełączenie NDG→JDG.

**Query:** `?month=YYYY-MM`.

**Przełączniki UI:**

- **NDG / JDG** — tekst przy tytule „Księgowość” (`LegalModeInlineSwitch`); aktywny granatowy, nieaktywny wyblakły; zawsze widoczny. Przejście na JDG: `switchToJDG()` — **nieodwracalne**.
- **Księgowość miesięczna / roczna** — zawsze rozwinięte, pełna szerokość.

**Dane:** lekcje, payouts, closed months, operating expenses, business settings, price tiers.

#### Sekcje

1. **Kafelki KPI** — m.in. przychód, wypłaty, dochód, liczba lekcji zatwierdzonych (kafelek szary).
2. **Limity**
   - NDG: pasek kwartalny (`NDG_QUARTERLY_LIMIT` ≈ 10 813,5 zł), alert CEIDG 7 dni.
   - JDG: pasek VAT roczny (`VAT_ANNUAL_LIMIT` 240 000).
3. **Ewidencja sprzedaży** — cała sekcja w ramce (`card-quiet`): tabela VERIFIED + przycisk PDF.
4. **Koszty** — cała sekcja w ramce: nagłówek „Koszty”, podpis okresu, kompaktowy formularz (data, nr, opis, wystawca, kwota, plik w jednej linii), tabela faktur, PDF.
   - `createOperatingExpense` / `deleteOperatingExpense`.
   - Załącznik: Google Drive (`Faktury/YYYY/miesiąc YYYY/`) lub fallback Supabase Storage; max ~12 MB.
5. **Podsumowanie miesiąca** — tabela (tło `rgb(245,248,255)`, border granatowy); kolumna **Dochód** (dawniej Marża); bez zbędnego podtytułu.
6. **Rozliczenia – Zrób to sam** — 2 kolumny równej wysokości:
   - **Podatki** (ramka) — NDG: zera + kwota wolna; JDG: zaliczka PIT, ZUS, zdrowotna, etap Ulga na start / Preferencyjny.
   - **Podsumowanie** (neon `card-feature`) — przychód minus wypłaty/podatki/ZUS/koszty → zysk/strata na rękę (wiersz wyniku przyklejony do dołu karty).
7. **Zamykanie miesiąca** — checklista + checkbox zgodności z kontem bankowym + `closeMonth`.

#### Reguły zamknięcia

1. Najwcześniej od **6.** dnia następnego miesiąca.
2. Brak lekcji `PLANNED` / `PENDING_VERIFICATION`.
3. Wszystkie wypłaty miesiąca `PAID`.
4. Checkbox bankowy — **tylko UI** (nie walidowany na serwerze).
5. Po zamknięciu: brak dodawania/usuwania kosztów; mutacje lekcji/wypłat zablokowane przez `assertMonthOpen`.

#### NDG vs JDG (skrót)

| | NDG | JDG |
|---|-----|-----|
| PIT miesięczny | 0 (PIT-36 rocznie) | zaliczka ~12% − ulga |
| ZUS właściciela | 0 | Ulga na start (0 społeczne, 6 mies.) lub preferencyjny |
| Zdrowotna | 0 | 9% dochodu, min ~432,54 |
| Limit | kwartalny NDG | roczny VAT |

Logika: `lib/podatki.ts`, `lib/podatki-config.ts`.

#### Printy

| Trasa | Zawartość |
|-------|-----------|
| `/admin/ksiegowosc/ewidencja?month|year=` | Ewidencja sprzedaży VERIFIED |
| `/admin/ksiegowosc/koszty?month|year=` | Zestawienie kosztów (przy roku: wypłaty PAID + koszty) |

Wydruki = React + CSS print / „Zapisz jako PDF” w przeglądarce (bez Puppeteer).

---

### 7.5 `/admin/nauczyciele`

**Cel:** lista kadry — zakładki **Aktywni / Byli** (`contract_end ≤ dziś`).

**Akcje:**

- `createTutorAccount` — Auth invite, profil TUTOR, folder Drive, welcome e-mail, opcjonalnie zdjęcie.
- Karty: uczniowie, lekcje/godziny miesiąca, `BonusProgressBar`, link do profilu.

#### `/admin/nauczyciele/[id]` — profil nauczyciela

**Dane:** podsumowanie, uczniowie, lekcje miesiąca (pending/unpaid/verified — **tylko odczyt**), panel PIT.

**Side effects:** `ensureTutorRootFolder` / `ensureTutorDriveFolder` (foldery w tle).

**Actions (m.in.):**

| Action | Opis |
|--------|------|
| `updateTutorProfile` | Edycja; rename/move folderu Drive przy zmianie nazwy/końca umowy |
| `uploadTutorPhoto` / `clearTutorPhoto` | Max 5 MB, JPG/PNG/WebP |
| `archiveTutorAccount` | `contract_end`, ban Auth, folder → „byli” |
| `unblockStudent` | Odblokowanie ucznia |
| `updateTutorPitIdentity` / `updateTutorTaxYearEntry` | PESEL, US, NIP, koszty/zaliczki/ZUS/ulga młodych; przychód z PAID |

---

### 7.6 `/admin/cennik`

**Cel:** stawki poziomów + wnioski o przedmioty.

**Tabela:** poziom / klient płaci / nauczyciel dostaje / marża agencji.

**Actions:** `savePriceTiers` (delete-all + insert), `approveSubjectRequest`, `rejectSubjectRequest`.

**Efekt approve:** aktualizacja `active_subjects` nauczyciela + cache subjects/cennik.

---

### 7.7 `/admin/kalendarz`

**Cel:** kalendarz operacyjny + checklisty (Nowy pracownik, Wypłata, własne terminy).

**Stan:** **localStorage** — bez bazy.

**Terminy:** generowane z `DATES` (ewidencje, rachunki, weryfikacja, wypłaty, zamknięcie, limity, podatki, terminy roczne).

**UI:** statusy todo/doing/done, podzadania, nawigacja miesięcy.

---

## 8. API (Route Handlers)

| Endpoint | Dostęp | Cel |
|----------|--------|-----|
| `GET /api/drive/files/[fileId]?tutorId=` | TUTOR: własny folder; ADMIN: wymaga `tutorId` | Strumień pliku z folderu nauczyciela (Docs → PDF) |
| `GET /api/drive/invoices/[fileId]` | **tylko ADMIN** | Strumień faktury z drzewa Faktury |

`Cache-Control: private, no-store`. Asercje: plik musi należeć do właściwego folderu.

---

## 9. Model danych (Supabase)

Migracje SQL **nie leżą w tym repo** — stosowane ręcznie w projekcie Supabase (odniesienia w komentarzach: `0002`…`0017`).

### Tabele (skrót)

| Tabela | Rola |
|--------|------|
| `profiles` | 1:1 z Auth; rola, przedmioty, kontakt, bank, Drive, photo, PIT JSON |
| `students` | Uczniowie tutora; poziom, stawka, blocked, kontakt |
| `lessons` | Harmonogram + status + payment_received_at/method + series_id |
| `price_tiers` | Cennik poziomów |
| `payouts` | Wypłaty miesięczne + meta (lekcje, premia, count) |
| `subject_requests` | Wnioski o przedmioty |
| `closed_months` | Zamknięte miesiące księgowe |
| `business_settings` | Singleton NDG/JDG + data rejestracji JDG |
| `operating_expenses` | Koszty + załączniki |
| `document_folders` / `document_files` | Drzewo dokumentów (Storage) |
| `alerts` | UNPAID_STREAK, STOP_TEACHING, STUDENT_BLOCKED |
| `notifications` | EWIDENCJA_REQUEST, CENNIK_UPDATE, PAYOUT, INFO |

### Storage buckets

- `documents` — dokumenty + legacy załączniki kosztów.
- `tutor-photos` — publiczne URL zdjęć (landing).

### Rozróżnienie załączników kosztów

- `attachment_path` **bez `/`** = Google Drive fileId.
- `attachment_path` **ze `/`** = ścieżka Supabase Storage.

---

## 10. Server Actions — katalog

### Admin (`lib/actions/admin.ts`)

```
uploadTutorPhoto, clearTutorPhoto
createTutorAccount, updateTutorProfile, updateTutorContactFields
archiveTutorAccount, deleteTutorAccount (= archive)
updateTutorPitIdentity, updateTutorTaxYearEntry
savePriceTiers
approveSubjectRequest, rejectSubjectRequest
closeMonth, switchToJDG
markPayoutPaid, unmarkPayoutPaid
adminVerifyLesson, adminRejectLessonPayment
createOperatingExpense, deleteOperatingExpense
```

### Tutor / wspólne

| Moduł | Funkcje |
|-------|---------|
| `lessons.ts` | insert/update/delete (serie), `tutorToggleLessonVerification` |
| `students.ts` | insert/update/delete student, `insertSubjectRequest` |
| `profile.ts` | `setAcceptingStudents`, `setInitialPassword` |
| `alerts.ts` | `dismissAlert`, `blockStudentFromAlert`, `unblockStudent`, sync streak/stop |
| `notifications.ts` | `markNotificationRead` |
| `drive.ts` | list/ensure/sync folderów (viewer) |
| `documents.ts` | signed URL, ensure folders |
| `search.ts` | `searchWorkspace` |
| `waitlist.ts` | `submitTutorWaitlist` |
| `guards.ts` | `assertMonthOpen`, `monthKeyFromDate` |
| `mutations.ts` (client) | `signOut`, helpery dat draftu |

---

## 11. Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | **Next.js 16.1.6** (App Router) |
| UI | **React 19.2.3** |
| Język | **TypeScript 5** (`strict`) |
| Pakiety | **pnpm 10.19**, Node **≥ 20** |
| Baza / Auth / Storage | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) |
| Styling | **Tailwind CSS 4** + custom theme (`app/globals.css`) |
| Fonty | Poppins (logo), Space Grotesk + IBM Plex Mono (panel finansowy) |
| E-mail | **Resend** |
| Pliki | **Google Drive API** (`googleapis`) — Shared Drive |
| Dokumenty prawne | **MDX** (`@next/mdx`) |
| Testy | **Vitest 2.1.9** |
| Lint | ESLint 9 + `eslint-config-next` |
| Dev | `next dev --webpack` |

**Konfiguracja:** `experimental.serverActions.bodySizeLimit: "6mb"` (zdjęcia ≤ 5 MB).  
**React Compiler:** peer opcjonalny Nexta — **nie jest jawnie włączony** w `next.config.ts`.

---

## 12. Cache i optymalizacje

### 12.1 Strategia cache (`lib/cache.ts`)

| Mechanizm | Kiedy | Zachowanie |
|-----------|-------|------------|
| `bustTag` → `updateTag` | Mutacje krytyczne (Zalicz, wypłata, cennik, hasło, koszty…) | Natychmiastowe unieważnienie — **read-your-own-writes** |
| `staleTag` → `revalidateTag(tag, "max")` | KPI dashboardu | Dopuszczalna chwilowa nieświeżość |
| `revalidatePath` | Po mutacjach | Odświeżenie konkretnych tras RSC |
| `bustLessonAndBonus` | Zmiana lekcji | Tagi `lessons-{id}`, `bonus-{id}`, `TAG.lessons`, opcjonalnie `finance-{month}` |
| `revalidateLessonPages` | Po lekcjach | `/panel`, `/terminarz`, `/admin/rozliczenia`, `/finanse` |

**Tagi stałe (`TAG`):** `lessons`, `finance`, `accounting`, `cennik`, `notifications`, `documents`, `dashboard-stats`, `public-tutors`.

**Tagi per encja:** `lessons-`, `students-`, `subjects-`, `bonus-`, `finance-`, `payouts-`, `notifications-`, `documents-`.

### 12.2 `unstable_cache` (`lib/data/queries.ts`)

| Query | TTL | Tagi (skrót) |
|-------|-----|--------------|
| `getTutorStudents` | `revalidate: false` (tylko tagi) | students + lessons |
| `getTutorVerifiedFinanceLines` | **30 s** | lessons, bonus, finance |
| `getCachedCoordinatorDashboardLines` | **60 s** | dashboard-stats, lessons |
| `getAdminTutorSummaries` | **30 s** | lessons, dashboard, cennik, finance |
| `getPriceTiers` / `getClosedMonths` / subjects / documents / notifications | false + tagi | odpowiednie TAG |

Dodatkowo: **`React.cache`** na `getCurrentUserProfile` i części list lekcji — deduplikacja w jednym requestcie RSC.

### 12.3 Inne optymalizacje

1. **`Promise.all`** na niemal wszystkich page RSC (równoległe fetchowanie).
2. **Graceful degradation** — brak tabel/kolumn (kody PostgREST) → fallback / komunikat migracji zamiast twardego crasha.
3. **Drive streaming** — Readable → Web Streams, bez ładowania całego pliku do pamięci tam gdzie to możliwe.
4. **Resend opcjonalny** — brak `RESEND_API_KEY` → log warning, app działa.
5. **Drive opcjonalny** — koszty lecą do Storage; foldery nauczycieli tworzone gdy skonfigurowane.
6. **Print PDF w przeglądarce** — zero ciężkiego silnika PDF po stronie serwera.
7. **Instrumentation** — tłumienie znanych warningów Node.
8. **Obrazy** — `next/image` + remotePatterns (Supabase, Unsplash).
9. **localStorage** na checklistach kalendarza admina — zero roundtripów dla UI-only stanu.

### 12.4 Co NIE jest cache’owane agresywnie

- `getPublicTutorCards` na landingu — świeże odczyty (service role) w `Promise.all` z cennikiem.
- Wiele mutacji admina celowo robi szeroki `revalidatePath`, żeby UI od razu pokazywał stan po Zalicz / wypłacie / zamknięciu.

---

## 13. Integracje zewnętrzne

### Google Drive — nauczyciele

- Root: `GOOGLE_DRIVE_TEACHERS_FOLDER_ID`.
- Per tutor: folder + `profiles.drive_folder_id`.
- Archiwizacja → folder „byli” (`FORMER_TEACHERS_FOLDER_ID` / fallbacki wyszukiwania).
- Skrypt: `scripts/sync-drive-folders.mjs`.

### Google Drive — faktury

- Struktura: `Faktury / {rok} / {miesiąc} {rok} /` (polskie nazwy miesięcy).
- Service account wymaga **Shared Drive** (quota My Drive = 0 dla SA).
- Env: `GOOGLE_DRIVE_INVOICES_FOLDER_ID` (+ credentials SA).

### Resend

- From: marka Zaliczone / `kontakt@zaliczone.edu.pl`.
- Maile: welcome invite, potwierdzenie wypłaty, waitlista z landingu.

### Firma (`lib/company.ts`)

- Dane do faktur / przewodnika / waitlisty (nazwa, NIP, e-mail, adres).

---

## 14. Bezpieczeństwo

1. **Middleware** — rozdział ADMIN/TUTOR + publiczne ścieżki.
2. **Server Actions** — `requireAdmin` / sprawdzenie `tutor_id = user.id`.
3. **Service role** — świadomie używany do KPI, admin mutations i omijania edge-case RLS („sukces przy 0 wierszach”).
4. **API Drive** — asercja przynależności pliku do folderu tutora / drzewa faktur.
5. **Signed URL** dokumentów Storage — krótki TTL (~120 s).
6. **Sanityzacja `next`** w auth callback.
7. **Zamknięty miesiąc** — twarda blokada mutacji finansowych/lekcyjnych.
8. **RLS** — zakładane w Supabase; app nie polega wyłącznie na RLS (defense in depth przez actions + middleware).

---

## 15. Testy i seed

### Testy Vitest (`lib/**/*.test.ts`)

- `lib/podatki.test.ts` — zaliczki, limity, CEIDG.
- `lib/alerts/unpaid-streak.test.ts` — 3× UNPAID.
- `lib/dates.test.ts` — daty / bonus.

Brak E2E w repo.

### Seedy (`scripts/`, `--env-file=.env.local`)

| Skrypt | Cel |
|--------|-----|
| `seed-users.mjs` | konta admin/teacher |
| `seed-battle.mjs` | multi-tutor battle-test |
| `seed-demo.mjs` | demo lekcji |
| `seed-july21.mjs` | stan „środek miesiąca” |
| `seed-clean.mjs` | czyszczenie danych seed |
| `seed-tutor-pit.mjs` | pola PIT |
| `sync-drive-folders.mjs` | sync folderów Drive |

---

## 16. Znane ograniczenia i uwagi

1. **Brak roli STUDENT** — uczniowie to dane, nie loginy.
2. **`/powiadomienia`** — redirect; inbox powiadomień niepodpięty do UI nauczyciela.
3. **`/kalendarz` (tutor)** — alias → terminarz.
4. **Migracje SQL poza gitem** — schemat trzeba utrzymywać w Supabase; kod ma fallbacki.
5. **Lista płac PDF vs tabela wypłat** — możliwe różnice 70% vs stawki cennika.
6. **Checkbox „zgodność z kontem” przy zamknięciu miesiąca** — tylko UI.
7. **Przełączenie NDG→JDG** — nieodwracalne w aplikacji.
8. **Waitlista** — e-mail, bez trwałego rekordu DB w akcji.
9. **React Compiler** — nie włączony jawnie.
10. **Umowy kończące się ≤30 dni** — usunięte z dashboardu admina (zastąpione donutem Podział).

---

## Mapa plików kluczowych

```
app/
  page.tsx                          Landing
  login/, ustaw-haslo/, auth/       Auth
  panel/, terminarz/, uczniowie/    Panel TUTOR
  finanse/, profil/, przewodnik/
  admin/                            Panel ADMIN
    page.tsx                        Dashboard
    rozliczenia/                    Lekcje / weryfikacja
    wyplaty/ (+ lista-plac)         Wypłaty
    ksiegowosc/ (+ ewidencja, koszty)
    nauczyciele/ (+ [id])
    cennik/, kalendarz/
  api/drive/                        Stream plików
lib/
  actions/                          Server Actions
  data/queries.ts, mutations.ts, mappers.ts
  cache.ts                          Tagi cache
  podatki*.ts, dates.ts, guards.ts
  google-drive/                     Drive helpers
  emails/                           Resend
  supabase/                         clients + middleware
components/                         UI współdzielone
```

---

## Podsumowanie jednolinijkowe

**Zaliczone** to Next.js 16 + React 19 + Supabase + Drive + Resend: publiczny matching korepetytorów, panel nauczyciela (lekcje → weryfikacja), panel admina (rozliczenia → wypłaty → księgowość NDG/JDG z zamknięciem miesiąca), z dwupoziomowym cache (`updateTag` vs TTL KPI) i graceful degradation przy braku migracji/integracji.

---

*Koniec raportu. Dokument wygenerowany na podstawie stanu kodu w repozytorium (sierpień 2026).*
