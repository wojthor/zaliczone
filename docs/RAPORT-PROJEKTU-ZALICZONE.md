# Raport projektu **Zaliczone**

Dokument opisuje aplikację webową **Zaliczone** — demonstracyjny **panel korepetytora** w języku polskim. Zawiera: cel produktu, stos technologiczny, architekturę interfejsu, opis każdej podstrony i każdego istotnego panelu, model danych (demo), przepływy użytkownika oraz ograniczenia wersji demonstracyjnej.

---

## 1. Czym jest projekt i co robi

**Zaliczone** to aplikacja typu **dashboard**: umożliwia korepetytorowi (lub osobie współpracującej ze szkołą / placówką) w jednym miejscu:

- przeglądać **plan lekcji** w widoku tygodniowym i **kalendarz** miesięczny;
- **oznaczać lekcje jako zaliczone** (wykonane) dla konkretnej daty — wpływa to na **finanse** i podsumowania;
- przeglądać **bazę uczniów** (karty z kontaktem, przedmiotami, stawką) i **dodawać nowych uczniów** (stan tylko w przeglądarce);
- na podstronie **Terminarz** — **dodawać, edytować i usuwać lekcje** z opcjami powtarzalności i notatkami;
- śledzić **powiadomienia** (symulacja skrzynki: placówka / panel automatyczny);
- przeglądać **finanse**: sumy za miesiąc, godziny, listę wpływów powiązaną z terminarzem;
- zarządzać **profilem** (dane demo, aktywne przedmioty, zgłaszanie nowych przedmiotów do akceptacji — tylko UI).

**Ważne:** Backendu, logowania i trwałego zapisu danych (poza `localStorage` dla „zaliczonych” lekcji) **nie ma**. Lista uczniów dodanych w UI, lekcje zmienione w terminarzu itd. żyją w **stanie React** i po pełnym odświeżeniu strony wracają do danych z `lib/demo-data.ts` (z wyjątkiem flag zaliczenia zapisanych w `localStorage`).

---

## 2. Stos technologiczny

| Warstwa | Technologia |
|--------|-------------|
| Framework | **Next.js 16** (App Router) |
| UI | **React 19** |
| Język | **TypeScript 5** |
| Style | **Tailwind CSS 4** (utility-first, tokeny kolorystyczne typu `text-depths`, `bg-luster`, `border-panel-frame` itd.) |
| Ikony / SVG | Komponenty w `components/icons.tsx` |
| Hostowanie treści | Wyłącznie front — brak API aplikacji |

Skrypty NPM: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`.

---

## 3. Architektura aplikacji

### 3.1. Obudowa (`AppShell`)

Plik: `components/app-shell.tsx`.

- **Sidebar** (nawigacja) po lewej na `lg+`: zwijany / rozwijany (strzałka), logo **ZALICZONE** / litera **Z**, linki do wszystkich głównych podstron.
- **Mobile:** wysuwany panel („drawer”) + przycisk menu w sticky pasku nad treścią.
- Otacza całą aplikację i wstrzykuje **`LessonCompletionProvider`** — dzięki temu **zaliczenia lekcji** działają na dashboardzie, terminarzu i finansach.

### 3.2. Dostawca zaliczeń lekcji

Plik: `components/dashboard/lesson-completion-context.tsx`.

- Klucz **lekcja + data** (format daty `YYYY-MM-DD`).
- Stan zapisany w **`localStorage`** pod kluczem `zaliczone:lesson-done:v1`.
- API kontekstu: `isLessonDoneOnDate(lessonId, dateKey)`, `setLessonDoneOnDate(lessonId, dateKey, value)`.

To **jedyne** trwałe (między sesjami) dopisanie danych przez użytkownika w obecnym zakresie projektu.

### 3.3. Szablon podstrony (`PageShell`)

Plik: `components/page-shell.tsx`.

- Nagłówek strony (`h1` + zielona kreska dekoracyjna).
- Opcje: `fillViewport`, `compact`, `surface` (`snow` | `luster`).
- Używany przez podstrony inne niż sam dashboard (który jest pełnoekranową siatką paneli).

### 3.4. Dashboard (strona główna)

Plik: `app/page.tsx` → `components/dashboard/dashboard-layout.tsx`.

- Siatka responsywna: **2 wiersze × kolumny** na dużych ekranach (`lg:grid-cols-4`, `lg:grid-rows` z `minmax(0,1fr)`).
- Komórki: **Plan lekcji** (3 kol.), **Kalendarz** (1 kol.), **Baza uczniów** (2 kol.), **Powiadomienia** (1 kol.), **Finanse / profil** (1 kol.).

---

## 4. Nawigacja (boczne menu)

Linki (plik `app-shell.tsx`, tablica `nav`):

| Ścieżka | Etykieta |
|---------|--------|
| `/` | Dashboard |
| `/terminarz` | Terminarz |
| `/uczniowie` | Uczniowie |
| `/powiadomienia` | Powiadomienia |
| `/finanse` | Finanse |
| `/profil` | Profil |

**Przekierowanie:** `/kalendarz` → **`/terminarz`** (`app/kalendarz/page.tsx`), żeby uniknąć duplikatu widoku kalendarza.

---

## 5. Strona główna — szczegółowy opis paneli

### 5.1. Panel **„Plan lekcji”** (`WeeklySchedule`)

Plik: `components/dashboard/weekly-schedule.tsx`.

- Tytuł panelu: **„Plan lekcji”** (wcześniej nazwa „Terminarz” została zmieniona dla jasności).
- Nagłówek z linkiem do `/terminarz` (poza samą podstroną terminarza).
- **Nawigacja tygodniowa:** poprzedni tydzień (‹), etykieta zakresu dat po polsku, **„Dziś”**, następny tydzień (›).
- Siedem kolumn (Pn–Nd); w każdej **chipy lekcji** (przedmiot, inicjały, ewentualnie skrót poziomu).
- **Zaliczenie:** przy lekcji w kontekście **konkretnego dnia tygodnia** użytkownik może oznaczyć zajęcia jako wykonane (stan z `LessonCompletionContext` + data przypisana do dnia w wybranym tygodniu).
- Na podstronie terminarza ten sam komponent dostaje `lessons` z lokalnego stanu i `panelOnTerminarzPage` (m.in. bez linku w nagłówku do tej samej strony, inne tło nagłówka w kalibracji z kalendarzem).

**Źródło lekcji (dashboard):** `DASHBOARD_LESSONS` z `components/dashboard/lesson-data.ts`.

### 5.2. Panel **„Kalendarz”** (`MonthlyCalendar`)

Plik: `components/dashboard/monthly-calendar.tsx`.

- Widok **jednego miesiąca** (siatka dni), przełączanie **miesiąca** (‹ / ›).
- Dni z lekcjami vs wolne; **stan zaliczenia** danego dnia (wszystkie lekcje tego dnia zaliczone / część / brak).
- Nagłówek z linkiem do `/terminarz` (poza terminarzem).
- Na `/terminarz`: dopasowanie nagłówka w pionie do „Plan lekcji” (`-mt-0.5`), ten sam zestaw lekcji co na terminarzu.

### 5.3. Panel **„Baza uczniów”** (`StudentsPanel`)

Plik: `components/students-panel.tsx`.

- Lista kart uczniów z **`DEMO_STUDENTS`** (statyczne demo).
- Każda karta: **inicjały** w kółku (jasny kolor na granatowym tle), **imię i nazwisko**, **linia przedmiotów** (tekst z `subjectsLine`), **następna lekcja** (tekst demo).
- Link „zobacz więcej” do `/uczniowie` (`SeeMoreLink`).
- **Uwaga:** uczniowie dodani na `/uczniowie` **nie** aktualizują tego panelu — nadal tylko `DEMO_STUDENTS`.

### 5.4. Panel **„Powiadomienia”** (`NotificationsPanel`)

Plik: `components/dashboard/notifications-panel.tsx`.

- Trzy **statyczne** alerty (tytuł + meta), przycisk **„Otwórz”** → `/powiadomienia`.
- Layout karty: treść bez `line-clamp`, przycisk zaokrąglony (`rounded-full`), na dole po prawej.

### 5.5. Panel **finansowy + skrót profilu** (`FinanceProfilePanel`)

Plik: `components/dashboard/finance-profile-panel.tsx`.

Składa się z trzech warstwowych bloków:

1. **Wypłata** (granatowe tło): suma **`DEMO_FINANCE_LINES`** dla **bieżącego miesiąca** (`currentMonthKey()`), ale tylko pozycje, dla których `isLessonDoneOnDate(linkedLessonId, linkedDateKey)` jest prawdziwe. Wyświetlana duża kwota w zł, link do `/finanse`.
2. **„Łącznie”** (jasniejsze tło z ramką): **godziny** (z zaliczonych linii, przez `minutesForDemoFinanceLine`) oraz **liczba uczniów** = `DEMO_STUDENTS.length`. Link do `/uczniowie`.
3. **Profil** — skrót: ikona, **Jan Kowalczyk**, link do `/profil`.

---

## 6. Podstrona **Terminarz** (`/terminarz`)

Pliki: `app/terminarz/page.tsx`, `components/terminarz/terminarz-page-view.tsx`.

### 6.1. Układ

- U góry opis tekstowy (dane demonstracyjne).
- **Siatka jak na dashboardzie** (większa wysokość paneli na `lg`, proporcje kolumn 3:1): **Plan lekcji** + **Kalendarz** — oba dostają **ten sam** stan `lessons` z `useState` (kopia startowa z `DASHBOARD_LESSONS`).
- Sekcja **„Lista lekcji”:** każda lekcja jako wiersz z inicjałami, **uczeń**, **przedmiot · poziom**, **dzień · godziny**, opcjonalnie **notatki** obok (Separator pionowy od `sm`), przyciski **Edytuj** / **Usuń**.

### 6.2. CRUD lekcji

- **+ Dodaj** — modal **Nowa lekcja**.
- **Edytuj** — modal z polami wypełnionymi z wybranej lekcji; przy zmianie powtarzalności logika może tworzyć **dodatkowe wpisy** (np. wiele dni tygodnia).
- **Usuń** — z potwierdzeniem `confirm`.

### 6.3. Formularz w modalu (`LessonModal`)

Pola (skrót):

- **Przedmiot** — select z **`DEMO_ACTIVE_SUBJECTS`**.
- **Uczeń** — select z **`DEMO_STUDENTS`** filtrowany po przedmiocie (`subjectsFromLine`); po wyborze **inicjały** i **poziom** (`classLabel` z danych ucznia) tylko do odczytu.
- **Mini kalendarz** (miesiąc, siatka dni) — wybór **daty**.
- **Godziny** Od / Do (`type="time"`).
- **Powtarzanie:** jednorazowo / co tydzień (dzień z kalendarza) / własne (wybór dni tygodnia checkboxami).
- **Notatki** (opcjonalnie, textarea) — zapis w obiekcie lekcji (`Lesson.notes`), wyświetlane w liście jeśli niepuste.

Typ lekcji rozszerzony o `notes?: string` w `lesson-data.ts`.

---

## 7. Podstrona **Uczniowie** (`/uczniowie`)

Plik: `app/uczniowie/client` logic w `page.tsx` (**`"use client"`**).

### 7.1. Lista

- Start: kopia **`DEMO_STUDENTS`** + pola **`schoolClass`** (klasa szkolna) w danych demo.
- Karty: inicjały, imię, **poziom** (`classLabel` z cennika lub starsze opisy demo), **klasa**, przedmioty jako **chipy**, telefon, email, stawka, następna lekcja, notatki.

### 7.2. Dodawanie ucznia

- Przycisk **„+ Dodaj ucznia”** (styl granat / limonkowy tekst).
- Modal: imię; **przedmioty** — multi-wybór chipów wg **`DEMO_ACTIVE_SUBJECTS`**; **poziom** — select z **`DEMO_CENNIK`** (etykieta jak w Finanse); **stawka** tylko z cennika (pole tylko do odczytu); **klasa (opcjonalnie)**; telefon, email. Zapis tylko w `useState` strony.
- Odporność na HMR: bezpieczne `selectedSubjects ?? []`.

### 7.3. Sortowanie i filtr

- **Sortowanie:** od najnowszych / od najstarszych (timestamps `createdAtTs` — demo ma syntetyczne, nowi dostają `Date.now()`), alfabet A–Z / Z–A.
- **Filtr przedmiotu:** tylko **`DEMO_ACTIVE_SUBJECTS`** w selectcie; filtrowe po `subjectsLine`.

### 7.4. Ograniczenia

- Brak edycji/usuwania ucznia w UI.
- Brak synchronizacji z **`DEMO_STUDENTS`** używanym w terminarzu i panelu na home — to osobne „widoki” demo.

---

## 8. Podstrona **Finanse** (`/finanse`)

Plik: `app/finanse/page.tsx`.

### 8.1. Sterowanie

- Przycisk **Cennik** — modal z tabelą **`DEMO_CENNIK`** (cena dla kursanta, „Twoja stawka” — demo).
- **Wybór miesiąca** — zakres od najwcześniejszego `monthKey` w `DEMO_FINANCE_LINES` do bieżącego (wg `currentMonthKey()`).

### 8.2. KPI — trzy kafle

1. **Ten miesiąc / Wybrany miesiąc** — suma **`amountPln`** tylko z pozycji **zaliczonych** w terminarzu (`isLessonDoneOnDate`). Dodatkowy tekst z liczbą zaliczonych vs wszystkich pozycji w miesiącu. **Bez ramki** (na prośbę — tylko zaokrąglenie i tło).
2. **Godziny** — suma minut z `minutesForDemoFinanceLine` dla zaliczonych linii, przeliczone na godziny z jednym miejscem po przecinku.
3. **Uczniowie** — `DEMO_STUDENTS.length` (nie zależy od filtra miesiąca w kodzie).

### 8.3. Sekcja **„Saldo za lekcje”**

- Lista **wszystkich** `DEMO_FINANCE_LINES` w wybranym miesiącu.
- Każda pozycja: uczeń, opis (etykieta + data), kwota „+X zł”; przy braku zaliczenia w terminarzu — przyciemnienie + tekst **„Nie zaliczono w terminarzu”**.
- Otoczka sekcji **bez ramki** (zaokrąglenie + `bg-luster/60`).

---

## 9. Podstrona **Powiadomienia** (`/powiadomienia`)

Pliki: `app/powiadomienia/page.tsx`, `components/powiadomienia/powiadomienia-feed.tsx`.

- `PageShell` z `fillViewport` + `compact`.
- **Lewy panel:** lista wiadomości z `DEMO_MESSAGES` (kategoria: placówka / panel), sortowanie (nieprzeczytane pierwsze).
- **Prawy panel:** treść wybranej wiadomości (`subject`, `body`, nadawca, data).
- Akcje: **Oznacz jako przeczytane**, **Oznacz wszystkie** — stan tylko w `useState` (brak API).

---

## 10. Podstrona **Profil** (`/profil`)

Plik: `app/profil/page.tsx` (**client**).

### 10.1. Sekcje (skrót)

- **Dane kontaktowe** — imię, email, telefon, link demo do ogłoszenia OLX.
- **Przedmioty:** lista **aktywnych** (stała startowa `DEMO_ACTIVE_SUBJECTS`), chipy w stylu granat/limonka; **oczekujące** — formularz z selectem sugerowanych przedmiotów (`SUBJECT_SUGGESTIONS` minus zajęte), zapis do `pendingSubjects` w stanie (bez backendu).
- Customowa strzałka przy selectcie (SVG), pozycjonowanie `right-4.5`.
- Dalsze sekcje w pliku (ewidencja / dokumenty — copy „demo / wkrótce”).

---

## 11. Model danych i pliki `lib/`

### 11.1. `lib/demo-data.ts` (wybrane elementy)

- **`DEMO_ACTIVE_SUBJECTS`** — lista aktywnych przedmiotów profilu (używana w profilu, terminarzu, filtrze uczniów).
- **`DEMO_CENNIK`** — poziomy i stawki (`forClientPln`, `yourSharePln`).
- **`DemoStudent`** — m.in. `subjectsLine`, `classLabel`, `schoolClass`, `ratePerHourPln`, …
- **`DEMO_STUDENTS`**, **`DEMO_MESSAGES`**, **`DEMO_FINANCE_LINES`** z powiązaniami `linkedLessonId` + `linkedDateKey`.
- Funkcje pomocnicze: **`subjectsFromLine`**.

### 11.2. `lib/finance-month.ts`

- **`currentMonthKey`**, **`formatMonthLongPl`**, **`enumerateMonthsInclusive`** — obsługa miesięcy w finansach.

### 11.3. `lib/demo-finance-minutes.ts`

- **`minutesForDemoFinanceLine`** — dla demo przypisuje długość zajęć do kwoty w finansach (spójność godzin).

### 11.4. `components/dashboard/lesson-data.ts`

- Typ **`Lesson`**: `id`, `dayIndex` (0 = poniedziałek), `start`/`end`, `subject`, `initials`, `classLabel`, `studentName`, opcjonalnie `notes`.
- **`DASHBOARD_LESSONS`** — mapowanie inicjałów na imię i nazwisko (`STUDENT_BY_INITIALS`).
- Funkcje: **`lessonsForWeekdayMon0`**, **`lessonsOnCalendarDate`**, **`dayLabel`**, **`lessonDurationMinutes`**.

---

## 12. Wspólne komponenty UI (skrót)

| Komponent | Rola |
|-----------|------|
| `PanelHeader` | Nagłówek panelu (tytuł, opcjonalny link, slot na akcje) |
| `SeeMoreLink` | Link „więcej” do podstron |
| `components/icons.tsx` | Zestaw ikon (dashboard, kalendarz, użytkownicy, dzwonek, portfel, menu) |

---

## 13. Co użytkownik może realnie „zrobić” w tej wersji

1. **Przeglądać** cały interfejs jak produkcyjny panel.
2. **Zaliczać lekcje** w planie i kalendarzu — wpływ na **sumy finansowe** i godziny na dashboardzie oraz na `/finanse`.
3. **Terminarz:** dodawać / edytować / usuwać lekcje z **powtarzalnością** i **notatkami** (stan sesji).
4. **Uczniowie:** dodawać karty uczniów (stan sesji), sortować i filtrować.
5. **Powiadomienia:** czytać i oznaczać jako przeczytane (stan sesji).
6. **Profil:** symulować zgłoszenie przedmiotu do akceptacji (stan sesji).

### Czego nie ma (świadomie, w demo)

- Kont użytkowników, ról, uprawnień.
- Persystencji uczniów / lekcji / wiadomości na serwerze.
- Eksportów PDF, uploadu plików (tylko copy „wkrótce”).
- Powiadomień push ani e-mail.

---

## 14. Mapa katalogów (orientacyjna)

```
app/                    — trasy Next (page.tsx)
components/
  app-shell.tsx         — layout globalny + sidebar + provider
  page-shell.tsx        — szablon podstron
  dashboard/            — panel home, kalendarz, plan, kontekst zaliczeń, finanse-panel
  terminarz/            — widok terminarza + modal lekcji
  powiadomienia/        — feed wiadomości
  students-panel.tsx    — baza uczniów na home
  icons.tsx
lib/
  demo-data.ts          — dane demonstracyjne i typy
  demo-finance-minutes.ts
  finance-month.ts
```

---

## 15. Podsumowanie dla interesariuszy

**Zaliczone** to **wysokiej jakości prototyp UI/UX** panelu dla korepetytora w ekosystemie placówki: terminarz, uczniowie, finanse powiązane ze **statusem zaliczenia zajęć**, powiadomienia i profil. Technicznie jest to **Next.js + React + Tailwind**, z **danymi demo** i **lokalnym zapisem tylko dla zaliczeń lekcji**. Idealny jako baza pod wdrożenie API, bazy danych i autoryzacji — bez zmiany głównego podziału na podstrony i panele opisanych powyżej.

---

*Dokument wygenerowany na podstawie stanu kodu w repozytorium; przy refaktoryzacji nazw plików lub tras warto zaktualizować odpowiednie sekcje.*
