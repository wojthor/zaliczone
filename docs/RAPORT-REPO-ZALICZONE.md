# Raport repozytorium `ZALICZONE`

Dokument opisuje aktualny stan całego repozytorium aplikacji `ZALICZONE` na marzec 2026. Obejmuje architekturę, routing, główne komponenty, modele danych demonstracyjnych, przepływy użytkownika, moduły panelu korepetytora i panelu administratora, a także ograniczenia obecnej wersji oraz wskazówki, jak system działa teraz i jak byłby naturalnie rozwijany dalej.

---

## 1. Cel projektu

`ZALICZONE` jest demonstracyjną aplikacją webową typu dashboard dla działalności korepetycyjnej. W praktyce repo zawiera dwa duże obszary:

1. panel korepetytora, czyli codzienny interfejs pracy z lekcjami, uczniami, finansami, powiadomieniami i profilem,
2. panel administratora, czyli operacyjny moduł do nadzoru nad płatnościami, wypłatami, zespołem, cennikiem, dokumentami i komunikacją.

Projekt jest zbudowany jako spójny front-end bez zaplecza API. Większość akcji działa w pamięci przeglądarki przez `useState`. Jedyny mechanizm utrwalający część stanu między odświeżeniami to zapis zaliczenia lekcji w `localStorage`.

Z punktu widzenia produktu aplikacja pokazuje, jak mógłby wyglądać produkcyjny system dla małej lub średniej placówki edukacyjnej, ale obecnie pozostaje wersją demo, z naciskiem na UX, układ, logikę prezentacyjną i czytelność przepływów.

---

## 2. Stos technologiczny

### 2.1. Główne technologie

- `Next.js 16.1.6` z App Routerem
- `React 19.2.3`
- `TypeScript 5`
- `Tailwind CSS 4`
- `ESLint 9`
Pr9u3rzOpwqAY3Sq

### 2.2. Skrypty

Plik: `package.json`

- `pnpm dev` uruchamia `next dev --webpack`
- `pnpm build` buduje aplikację produkcyjną
- `pnpm start` uruchamia build produkcyjny
- `pnpm lint` uruchamia lint

### 2.3. Charakter aplikacji

- aplikacja jest głównie front-endowa,
- nie ma backendu, bazy danych, auth API ani trwałego systemu sesji,
- wszystkie dane biznesowe są w plikach demo w `lib/`,
- logika biznesowa jest lekka i osadzona bezpośrednio w komponentach.

---

## 3. Struktura wysokiego poziomu

### 3.1. Katalogi

- `app/` - routing Next.js
- `components/` - komponenty współdzielone i widoki złożone
- `components/dashboard/` - panele dashboardu korepetytora i kontekst zaliczeń
- `components/admin/` - komponenty panelu admina
- `components/terminarz/` - dedykowany widok terminarza
- `lib/` - dane demo i pomocnicze definicje
- `docs/` - dokumentacja repo

### 3.2. Wejście do aplikacji

- `app/layout.tsx` używa `AppRoot`
- `components/app-root.tsx` rozdziela zachowanie dla ścieżek admina i nie-admina
- dla zwykłego panelu użytkownika renderowany jest `AppShell`
- dla `/admin/**` renderowany jest osobny kontener admina

To rozdzielenie sprawia, że oba obszary są w jednym repo, ale mają inny layout, inną nawigację i trochę inną strukturę widoków.

---

## 4. Layout i nawigacja

### 4.1. `AppRoot`

Plik: `components/app-root.tsx`

Zadania:

- sprawdza `pathname`,
- wykrywa, czy ścieżka zaczyna się od `/admin`,
- otacza aplikację `LessonCompletionProvider`,
- dla panelu użytkownika renderuje `AppShell`,
- dla panelu admina renderuje prosty wrapper z `bg-luster`.

Znaczenie:

- dzięki temu kontekst zaliczeń działa i w dashboardzie korepetytora, i w terminarzu, i w finansach,
- jednocześnie panel admina nie korzysta z bocznego menu korepetytora.

### 4.2. `AppShell`

Plik: `components/app-shell.tsx`

To główny shell panelu korepetytora.

Obsługuje:

- boczne menu,
- tryb mobilny z drawerem,
- zwijanie i rozwijanie menu na desktopie,
- sticky pasek mobilny,
- obszar treści z różnym zachowaniem dla dashboardu i zwykłych podstron.

Elementy menu korepetytora:

- `/`
- `/terminarz`
- `/uczniowie`
- `/powiadomienia`
- `/finanse`
- `/profil`

### 4.3. `PageShell`

Plik: `components/page-shell.tsx`

To wspólny wrapper dla podstron poza dashboardem.

Wspiera:

- `title`
- `fillViewport`
- `compact`
- `surface: "snow" | "luster"`

Znaczenie:

- ujednolica nagłówki podstron,
- pozwala robić bardziej kompaktowe i pełnoekranowe układy dla takich ekranów jak `powiadomienia`,
- umożliwia różnicowanie tła bez duplikowania kodu.

### 4.4. `AdminLayoutClient`

Plik: `components/admin/admin-layout-client.tsx`

To layout panelu administratora.

Obsługuje:

- sidebar tylko od `lg`,
- aktywny stan linków przez `usePathname`,
- listę modułów admina,
- dolny link `Wyloguj`.

Kolejność modułów admina:

1. `/admin`
2. `/admin/rozliczenia`
3. `/admin/wyplaty`
4. `/admin/ksiegowosc`
5. `/admin/nauczyciele`
6. `/admin/cennik`
7. `/admin/powiadomienia`
8. `/admin/dokumenty`

---

## 5. System wizualny

### 5.1. Kolory i tokeny

Plik: `app/globals.css`

Najważniejsze tokeny:

- `depths` - granat bazowy
- `luster` - jasny chłodny odcień tła
- `snow` - biel
- `lime` - akcent limonkowy
- `steel`, `muted`, `panel-frame`, `jodhpur`, `taupe`, `aster`

### 5.2. Konwencje UI

- `rounded-app` jako standard zaokrąglenia,
- granat `#000C4A` jako główny kolor akcji i paneli priorytetowych,
- limonka jako kolor CTA, statusu albo wyróżnionej wartości,
- `bg-luster` i `bg-snow` jako podstawy powierzchni,
- cienkie obramowania `border-panel-frame`,
- szerokie wykorzystanie kart, paneli i miękkich przejść.

### 5.3. Ikony

Plik: `components/icons.tsx`

Zawiera m.in.:

- `IconDashboard`
- `IconCalendar`
- `IconUsers`
- `IconBell`
- `IconWallet`
- `IconPayroll`
- `IconUser`
- `IconMenu`
- `IconFolder`
- `IconFileDoc`
- `IconLogout`

---

## 6. Dane demo i model stanu

### 6.1. `lib/demo-data.ts`

To główne źródło danych panelu korepetytora.

Zawiera:

- `DEMO_CENNIK`
- `DEMO_ACTIVE_SUBJECTS`
- `DEMO_STUDENTS`
- `DEMO_MESSAGES`
- `DEMO_FINANCE_LINES`
- `subjectsFromLine()`

#### `DEMO_CENNIK`

Opisuje poziomy zajęć oraz dwie kwoty:

- `forClientPln` - cena dla klienta,
- `yourSharePln` - udział / stawka korepetytora.

W praktyce dziś cennik jest używany:

- w `finanse`,
- przy dodawaniu ucznia,
- pośrednio do opisywania poziomów.

#### `DEMO_ACTIVE_SUBJECTS`

To lista aktywnych przedmiotów.

Jest używana:

- w `profil`,
- w `terminarz`,
- w `uczniowie`.

#### `DEMO_STUDENTS`

Każdy rekord ma m.in.:

- `id`
- `name`
- `initials`
- `subjectsLine`
- `phone`
- `email`
- `guardian`
- `classLabel`
- `schoolClass`
- `notes`
- `ratePerHourPln`
- `nextLesson`

#### `DEMO_MESSAGES`

Model wiadomości dla panelu korepetytora:

- `employer` - komunikaty od placówki,
- `system` - komunikaty automatyczne.

Każda wiadomość ma:

- `from`
- `subject`
- `preview`
- `body`
- `date`
- `unread`
- `category`

#### `DEMO_FINANCE_LINES`

To lista pozycji finansowych, np. pojedynczych opłaconych zajęć.

Każda pozycja ma:

- `studentName`
- `label`
- `amountPln`
- `date`

Te dane są wykorzystywane:

- w dashboardzie korepetytora,
- w `finanse`,
- w dashboardzie admina,
- w modułach admina: rozliczenia, wypłaty, księgowość.

### 6.2. `lib/admin-demo.ts`

To główne źródło danych panelu administratora.

Zawiera:

- `ADMIN_TUTORS`
- `ADMIN_PENDING_SUBJECTS`
- `ADMIN_ANNOUNCEMENTS`
- `ADMIN_STUDENT_MESSAGES`
- `ADMIN_SYSTEM_ALERTS`

Na tych danych bazują:

- dashboard admina,
- nauczyciele,
- cennik,
- powiadomienia admina,
- dokumenty,
- rozliczenia i wypłaty.

### 6.3. `components/dashboard/lesson-data.ts`

Definiuje model lekcji dla dashboardu i terminarza:

- `Lesson`
- `DASHBOARD_LESSONS`
- `DAY_LABELS_SHORT`
- `dayLabel()`
- `lessonsForWeekdayMon0()`
- `calendarDayToMondayWeekday()`
- `lessonsOnCalendarDate()`

Typ `Lesson` ma obecnie:

- `id`
- `dayIndex`
- `start`
- `end`
- `subject`
- `initials`
- `classLabel`
- `studentName`
- `notes?`

### 6.4. Trwałość danych

Stan aplikacji dzieli się na dwa typy:

1. stan trwały tylko częściowo:
   - zaliczenie lekcji przez `LessonCompletionProvider` i `localStorage`
2. stan nietrwały:
   - dodani uczniowie,
   - zmiany w terminarzu,
   - odczytane wiadomości,
   - oczekujące przedmioty w profilu,
   - większość akcji admina

Po odświeżeniu większość zmian wraca do wersji z plików demo.

---

## 7. Dashboard korepetytora

### 7.1. Plik wejściowy

- `app/page.tsx`
- `components/dashboard/dashboard-layout.tsx`

### 7.2. Układ

Dashboard jest siatką paneli:

- `WeeklySchedule`
- `MonthlyCalendar`
- `StudentsPanel`
- `NotificationsPanel`
- `FinanceProfilePanel`

Na dużych ekranach:

- plan lekcji zajmuje 3 kolumny,
- kalendarz 1 kolumnę,
- drugi rząd to uczniowie, powiadomienia i finanse/profil.

### 7.3. `WeeklySchedule`

Plik: `components/dashboard/weekly-schedule.tsx`

Funkcje:

- pokazuje dni tygodnia,
- grupuje lekcje per dzień,
- pozwala oznaczać lekcję jako zaliczoną,
- ma kompaktowe karty lekcji,
- korzysta z `LessonCompletionProvider`.

To najważniejszy operacyjny komponent panelu korepetytora.

### 7.4. `MonthlyCalendar`

Plik: `components/dashboard/monthly-calendar.tsx`

Funkcje:

- pokazuje miesiąc jako siatkę,
- pozwala przełączać miesiące,
- oznacza dni wolne, dni z lekcjami i dni pełnego zaliczenia.

### 7.5. `StudentsPanel`

Plik: `components/students-panel.tsx`

To skrót do `/uczniowie`.

Pokazuje:

- inicjały ucznia,
- imię i nazwisko,
- przedmioty,
- następną lekcję.

Jest to podgląd, nie pełna baza.

### 7.6. `NotificationsPanel`

Plik: `components/dashboard/notifications-panel.tsx`

To skrót do `/powiadomienia`.

Pokazuje 3 pierwsze komunikaty z `DEMO_MESSAGES`, z oznaczeniem:

- `Placówka`
- `Panel`
- `Nowe`

### 7.7. `FinanceProfilePanel`

Plik: `components/dashboard/finance-profile-panel.tsx`

Składa się z trzech bloków:

1. `Wypłata`
2. `Łącznie` - godziny i liczba uczniów
3. `Profil` - Jan Kowalczyk + link do `/profil` + `Wyloguj`

Przycisk `Wyloguj` kieruje obecnie na `/`. To jest wylogowanie prezentacyjne, nie połączone z realnym systemem sesji.

---

## 8. Podstrona `/terminarz`

### 8.1. Pliki

- `app/terminarz/page.tsx`
- `components/terminarz/terminarz-page-view.tsx`

### 8.2. Zawartość

Widok zawiera:

- plan tygodniowy,
- kalendarz miesięczny,
- listę lekcji,
- modal dodawania i edycji.

### 8.3. Formularz lekcji

Obsługuje:

- wybór przedmiotu z `DEMO_ACTIVE_SUBJECTS`,
- wybór ucznia tylko po wybranym przedmiocie,
- automatyczne uzupełnianie inicjałów i poziomu ucznia,
- mini-kalendarz,
- godziny od/do,
- tryby powtarzania:
  - `once`
  - `weekly`
  - `custom`
- notatki.

### 8.4. Zapis

- dodanie lekcji dopisuje pozycje do lokalnego `useState`,
- edycja aktualizuje istniejącą lekcję,
- przy trybie `custom` może utworzyć kilka wpisów,
- usunięcie działa przez `confirm`.

### 8.5. Ograniczenia

- brak backendu,
- brak synchronizacji nowych lekcji do danych finansowych,
- po odświeżeniu lista wraca do danych startowych.

---

## 9. Podstrona `/uczniowie`

### 9.1. Plik

- `app/uczniowie/page.tsx`

### 9.2. Funkcje

- lista kart uczniów,
- sortowanie:
  - najnowsi,
  - najstarsi,
  - A-Z,
  - Z-A,
- filtr po przedmiocie,
- modal `+ Dodaj ucznia`.

### 9.3. Dodawanie ucznia

Formularz wspiera:

- imię i nazwisko,
- wybór wielu przedmiotów jako chipów,
- poziom z `DEMO_CENNIK`,
- automatyczne wyliczenie stawki,
- klasę szkolną,
- następną lekcję,
- telefon,
- e-mail,
- notatki.

Dodany uczeń jest dopisywany do lokalnego stanu strony.

### 9.4. Ograniczenia

- nowe rekordy nie zasilają `DEMO_STUDENTS`,
- dashboard i terminarz nie widzą nowo dodanych uczniów,
- nie ma edycji ani usuwania.

---

## 10. Podstrona `/finanse`

### 10.1. Plik

- `app/finanse/page.tsx`

### 10.2. Funkcje

- wybór miesiąca od najwcześniejszego wpisu demo do bieżącego,
- modal `Cennik`,
- KPI:
  - przychód miesiąca,
  - liczba godzin,
  - liczba uczniów,
- lista wpływów jako osobne karty.

### 10.3. Cennik

Modal prezentuje tabelę:

- zajęcia,
- cena zajęć,
- Twoja stawka.

### 10.4. Liczenie danych

- miesiąc jest liczony z pola `date` w `DEMO_FINANCE_LINES`,
- godziny są parsowane z tekstu `90 min` / `60 min`,
- liczba uczniów bazuje na `DEMO_STUDENTS.length`.

### 10.5. Ograniczenia

- obecna wersja nie filtruje finansów po realnie zaliczonych lekcjach,
- brak eksportu,
- brak faktycznych rozliczeń księgowych.

---

## 11. Podstrona `/powiadomienia`

### 11.1. Plik

- `app/powiadomienia/page.tsx`

### 11.2. Układ

- górna sekcja statusowa `Centrum powiadomień`,
- lewa kolumna z listą komunikatów,
- prawa kolumna z treścią wybranego komunikatu.

### 11.3. Funkcje

- sortowanie nieprzeczytane najpierw,
- otwieranie wiadomości,
- oznaczanie pojedynczych wiadomości jako przeczytane przez wybór,
- zbiorcze `Oznacz wszystkie`.

### 11.4. Źródła wiadomości

- `Placówka Zaliczone`
- `Zaliczone · automat`

To model powiadomień bliższy systemowi operacyjnemu niż klasycznej skrzynce mailowej.

---

## 12. Podstrona `/profil`

### 12.1. Plik

- `app/profil/page.tsx`

### 12.2. Sekcje

- dane kontaktowe,
- aktywne przedmioty,
- zgłoszenie nowego przedmiotu,
- lista oczekujących przedmiotów,
- dokumenty,
- ewidencja godzin.

### 12.3. Logika

- aktywne przedmioty startują z `DEMO_ACTIVE_SUBJECTS`,
- formularz zgłoszenia korzysta z listy sugestii nieużywanych jeszcze w aktywnych i oczekujących,
- po zgłoszeniu przedmiot trafia do lokalnej listy `pendingSubjects`.

### 12.4. Ograniczenia

- brak prawdziwego uploadu,
- brak zapisu do backendu,
- zgłoszenia są tylko wizualne.

---

## 13. Panel administratora

### 13.1. Routing admina

Ścieżki:

- `/admin`
- `/admin/rozliczenia`
- `/admin/wyplaty`
- `/admin/ksiegowosc`
- `/admin/nauczyciele`
- `/admin/nauczyciele/[id]`
- `/admin/cennik`
- `/admin/powiadomienia`
- `/admin/dokumenty`

### 13.2. Dashboard admina

Plik: `app/admin/page.tsx`

Funkcje:

- hero z powitaniem i skrótami,
- KPI przychód / koszty / zysk / godziny,
- kafelki modułów,
- sekcja przepływu rozliczeń,
- ranking nauczycieli,
- skróty wiadomości i tematów wymagających akcji.

### 13.3. Rozliczenia

Pliki:

- `app/admin/rozliczenia/page.tsx`
- `app/admin/rozliczenia/rozliczenia-client.tsx`

Funkcje:

- oczekujące i opłacone pozycje,
- wyszukiwanie,
- przełączniki dzienne,
- oznaczanie opłacenia.

### 13.4. Wypłaty

Pliki:

- `app/admin/wyplaty/page.tsx`
- `app/admin/wyplaty/wyplaty-client.tsx`

Funkcje:

- wybór miesiąca,
- KPI przychód / koszty / zysk netto,
- lista wypłat na nauczyciela,
- lokalne oznaczanie `Wypłacono`.

Model:

- 70% dla zespołu,
- 30% marży agencji,
- mapowanie wpisów do nauczycieli po indeksie modulo `ADMIN_TUTORS.length`.

### 13.5. Księgowość

Pliki:

- `app/admin/ksiegowosc/page.tsx`
- `app/admin/ksiegowosc/ksiegowosc-client.tsx`

Funkcje:

- miesięczna ewidencja sprzedaży,
- wybór miesiąca,
- generowanie zestawienia,
- tabela z usługą, nabywcą i kwotą brutto.

### 13.6. Nauczyciele

Pliki:

- `app/admin/nauczyciele/page.tsx`
- `app/admin/nauczyciele/[id]/page.tsx`
- `components/admin/add-tutor-modal.tsx`

Funkcje:

- lista nauczycieli,
- status,
- statystyki,
- szczegóły pojedynczego nauczyciela,
- dodawanie nauczyciela w modalu.

### 13.7. Cennik

Plik:

- `app/admin/cennik/page.tsx`

Funkcje:

- lista poziomów i stawek,
- marża,
- modal edycji całego cennika,
- lista oczekujących przedmiotów.

### 13.8. Powiadomienia admina

Plik:

- `app/admin/powiadomienia/page.tsx`

Wersja admina korzysta z komponentów inboxowych i jest bardziej zbliżona do skrzynki:

- lista wiadomości,
- szczegóły,
- widok desktop / mobile,
- modal tworzenia wiadomości do zespołu.

### 13.9. Dokumenty

Plik:

- `app/admin/dokumenty/page.tsx`

Funkcje:

- dokumenty ogólne,
- grupowanie po miesiącu,
- foldery pracowników,
- pliki demo w sekcjach miesięcznych i stałych.

### 13.10. Wylogowanie

W adminie `Wyloguj` znajduje się na dole sidebara i obecnie, podobnie jak w panelu korepetytora, ma charakter nawigacyjny, nie sesyjny.

---

## 14. Co działa naprawdę, a co jest symulacją

### 14.1. Działa realnie w sensie interakcji

- routing między stronami,
- responsive layout,
- oznaczanie lekcji jako zaliczone,
- lokalne dodawanie uczniów,
- lokalna edycja terminarza,
- lokalne oznaczanie wiadomości,
- lokalne zmiany w panelu admina.

### 14.2. Jest symulacją

- logowanie i wylogowanie,
- wysyłka wiadomości,
- eksporty dokumentów,
- upload plików,
- realne płatności,
- rzeczywiste konto użytkownika i role,
- trwała synchronizacja danych.

---

## 15. Ograniczenia architektoniczne

1. Brak backendu powoduje, że większość zmian znika po odświeżeniu.
2. Dane demo są współdzielone tylko częściowo, więc nie wszystkie widoki aktualizują się między sobą.
3. Panel korepetytora i panel admina są spójne wizualnie, ale korzystają z osobnych modeli danych i osobnych lokalnych stanów.
4. Wylogowanie jest tylko linkiem nawigacyjnym.
5. Brak testów automatycznych i warstwy API ogranicza wiarygodność biznesową zmian.

---

## 16. Jak system naturalnie rozwinąć

### 16.1. Najbardziej logiczne kolejne kroki

- dodać prawdziwy system auth,
- przenieść dane demo do API i bazy,
- ujednolicić model ucznia, lekcji i finansów,
- spiąć `terminarz`, `uczniowie` i `finanse` w jedno źródło prawdy,
- dodać trwałe akcje admina,
- dodać testy komponentowe i integracyjne.

### 16.2. Co już jest przygotowane pod rozwój

- rozdzielenie layoutów user/admin,
- tokeny stylów,
- oddzielne komponenty panelowe,
- osobne pliki danych demo,
- modularny routing.

---

## 17. Mapa głównych plików

### 17.1. Główne trasy

- `app/page.tsx`
- `app/terminarz/page.tsx`
- `app/uczniowie/page.tsx`
- `app/finanse/page.tsx`
- `app/powiadomienia/page.tsx`
- `app/profil/page.tsx`
- `app/admin/**`

### 17.2. Najważniejsze komponenty

- `components/app-root.tsx`
- `components/app-shell.tsx`
- `components/page-shell.tsx`
- `components/icons.tsx`
- `components/dashboard/dashboard-layout.tsx`
- `components/dashboard/weekly-schedule.tsx`
- `components/dashboard/monthly-calendar.tsx`
- `components/dashboard/notifications-panel.tsx`
- `components/dashboard/finance-profile-panel.tsx`
- `components/students-panel.tsx`
- `components/terminarz/terminarz-page-view.tsx`
- `components/admin/admin-layout-client.tsx`
- `components/admin/add-tutor-modal.tsx`
- `components/inbox-mail.tsx`

### 17.3. Dane i pomocnicze pliki

- `lib/demo-data.ts`
- `lib/admin-demo.ts`
- `components/dashboard/lesson-data.ts`
- `components/dashboard/lesson-completion-context.tsx`

---

## 18. Podsumowanie

Repozytorium `ZALICZONE` jest dziś rozbudowaną demonstracją dwóch interfejsów operacyjnych: panelu korepetytora i panelu administratora. Kod jest zorganizowany w sposób wystarczająco modularny, by rozwijać go dalej, ale nadal działa głównie jako bogaty prototyp front-endowy.

Najważniejsze cechy obecnej wersji:

- spójny design system,
- dwa niezależne layouty,
- bogaty dashboard użytkownika,
- rozbudowany panel admina,
- wiele lokalnych przepływów UI,
- brak backendu, ale sensowna baza pod dalszą produkcyjną rozbudowę.
