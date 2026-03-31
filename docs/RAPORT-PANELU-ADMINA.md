# Raport panelu administratora — ZALICZONE

Dokument opisuje **stan implementacji na marzec 2026**: routing, widoki, dane demonstracyjne, komponenty i powiązania między modułami. Całość działa w przeglądarce **bez backendu** — stan jest trzymany w `useState` (wyjątki opisane przy modułach).

---

## 1. Cel i kontekst

Panel admina służy jako **centrum operacyjne placówki** (korepetycje): rozliczenia wpłat, widok księgowy, zespół nauczycieli, cennik, dokumenty, powiadomienia systemowe oraz wysyłka wiadomości do nauczycieli. Interfejs jest spójny wizualnie z resztą aplikacji (paleta `depths` / `lime` / `luster`, zaokrąglenia `rounded-app`).

**Technologie:** Next.js (App Router), React 19, TypeScript, Tailwind CSS v4. Szablony stron: `app/admin/**`; layout: `app/admin/layout.tsx` → `AdminLayoutClient`.

---

## 2. Nawigacja i szkielet UI

### 2.1. Pliki

| Plik | Rola |
|------|------|
| `app/admin/layout.tsx` | Opakowuje wszystkie podstrony w `AdminLayoutClient`. |
| `components/admin/admin-layout-client.tsx` | Sidebar (≥`lg`), lista linków, aktywny stan wg `usePathname()`. |
| `app/admin/*/page.tsx` | Poszczególne ekrany (część SSR, część z importem klientów). |

### 2.2. Pozycje menu (kolejność)

1. **Główna** — `/admin`  
2. **Rozliczenia** — `/admin/rozliczenia`  
3. **Wypłaty** — `/admin/wyplaty`  
4. **Księgowość** — `/admin/ksiegowosc`  
5. **Nauczyciele** — `/admin/nauczyciele`  
6. **Cennik i przedmioty** — `/admin/cennik`  
7. **Powiadomienia** — `/admin/powiadomienia`  
8. **Dokumenty** — `/admin/dokumenty`  

Ikony: `IconDashboard`, `IconWallet` (Rozliczenia / Księgowość / Cennik), **`IconPayroll` (Wypłaty)**, `IconUsers`, `IconBell`, `IconUser` (Dokumenty).

### 2.3. Układ

- **Sidebar:** szerokość `w-72`, tło `#000C4A`, logo „ZALICZONE”, podpis „Panel Admina”.  
- **Obszar treści:** `min-w-0 flex-1`, obramowanie, `bg-snow/90`, padding responsywny.  
- Poniżej `lg` sidebar jest ukryty (`hidden lg:block`) — **brak zduplikowanego menu mobilnego** w kodzie (możliwy punkt rozwoju).

---

## 3. Przegląd modułów (ścieżki)

| Ścieżka | Komponent główny | Typ |
|---------|------------------|-----|
| `/admin` | `app/admin/page.tsx` | Server Component |
| `/admin/rozliczenia` | `page.tsx` → `RozliczeniaClient` | Client |
| `/admin/wyplaty` | `page.tsx` → `WyplatyClient` | Client |
| `/admin/ksiegowosc` | `page.tsx` → `KsiegowoscClient` | Client |
| `/admin/nauczyciele` | `page.tsx` | Client |
| `/admin/nauczyciele/[id]` | `page.tsx` | Client |
| `/admin/cennik` | `page.tsx` | Client |
| `/admin/powiadomienia` | `page.tsx` | Client |
| `/admin/dokumenty` | `page.tsx` | Client |

---

## 4. Dashboard główny (`/admin`)

**Plik:** `app/admin/page.tsx`.

### 4.1. KPI (siatka do 4 kolumn na `xl`)

- **Łączny zysk (miesiąc)** — suma `amountPln` z `DEMO_FINANCE_LINES` (`lib/demo-data.ts`).  
- **Przepracowane godziny** — heurystyka z etykiet lekcji: `90 min` vs domyślnie `60 min`.  
- **Ilość studentów** — suma pól `students` po `ADMIN_TUTORS` (agregat „przypisanych” do nauczycieli w demo, nie lista unikalnych uczniów).  
- **Uczniowie łącznie** — `DEMO_STUDENTS.length`.

### 4.2. Sekcje pomocnicze

- **Alerty — wpłaty:** suma `pendingPln` i `paidPln` po nauczycielach; link do **Rozliczenia**.  
- **Powiadomienia — od studentów:** skrót z `ADMIN_STUDENT_MESSAGES`; link do **Powiadomienia** (uwaga: pełna skrzynka admina to głównie alerty systemowe — sekcja na dashboardzie to osobny kanał demo).  
- **Wymagają akcji:** lista `ADMIN_PENDING_SUBJECTS`; link do **Cennik i przedmioty**.

---

## 5. Rozliczenia (`/admin/rozliczenia`)

**Plik:** `app/admin/rozliczenia/rozliczenia-client.tsx`.

### 5.1. Przeznaczenie

Widok **zaliczonych lekcji** z podziałem na **oczekujące wpłaty** i **opłacone**, metoda płatności (Przelew / BLIK), możliwość oznaczenia wpłaty („Opłać”).

### 5.2. Dane

- Bazowo: `DEMO_FINANCE_LINES`.  
- Rozszerzenie wiersza: `tutorName` (cyklicznie z `ADMIN_TUTORS`), `subject` z etykiety, `paymentMethod`, `paidAt` (data ISO lub brak).  

### 5.3. Funkcje UI

- **Wyszukiwarka** — filtr po tekście (nauczyciel, przedmiot, data, kwota, metoda, data wpłaty).  
- **Licznik dnia** — przełącznik „Dzisiaj” / „Wczoraj”; pokazuje ile pozycji z danego dnia jest opłaconych (`date` z demo mapowane na klucz dnia).  
- **Dwie tabele od `lg`:** „Oczekujące wpłaty” i „Opłacone”, grupowanie po dniu (malejąco).  
- **Animacja:** przy przeniesieniu do opłaconych — klasa `hop-to-paid` (`app/globals.css`, keyframes `hopToPaid`).  
- **Link** do **Księgowość**.

### 5.4. Stan

`useState` dla wierszy — zmiany **nie persistują** po odświeżeniu.

---

## 6. Wypłaty i bilans (`/admin/wyplaty`)

**Pliki:** `app/admin/wyplaty/page.tsx`, `app/admin/wyplaty/wyplaty-client.tsx`.

- **Miesiąc** — select jak w księgowości (`DEMO_FINANCE_LINES` + klucz `YYYY-MM` z pola `date`).
- **KPI:** przychód (suma `amountPln`), koszty zespołu (70% w demo), zysk netto agencji (30%, karta wyróżniona zielenią).
- **Mapowanie nauczyciel ↔ lekcja:** indeks pozycji w `DEMO_FINANCE_LINES` modulo `ADMIN_TUTORS.length` (spójnie z logiką rozliczeń).
- **Tabela:** zwinięcie listy do wypłaty, sticky nagłówki, `scrollbar-panel`; akcja „Oznacz jako wypłacone” → stan lokalny z datą PL.
- **Link** do **Rozliczenia**.

---

## 7. Księgowość (`/admin/ksiegowosc`)

**Plik:** `app/admin/ksiegowosc/ksiegowosc-client.tsx`.

### 7.1. Przeznaczenie

**Ewidencja sprzedaży** w ujęciu miesięcznym (tabela zbliżona do arkusza): Lp., daty, usługa, nabywca, kwota brutto.

### 7.2. Dane

- Filtrowanie `DEMO_FINANCE_LINES` wg miesiąca wyliczonego z `date` (format `dd.mm` + rok bieżący).  
- Nazwa usługi: `Korepetycje - {przedmiot z etykiety}`.

### 7.3. Funkcje UI

- Select **miesiąca** (lista miesięcy występujących w demo + bieżący jeśli brak).  
- Przycisk **Wygeneruj** — ustawia znacznik czasu (symulacja eksportu / zestawienia).  
- Linki: **← Rozliczenia**, **Archiwum →** (`/admin/dokumenty`).  
- Tabela: `table-fixed`, kompaktowa typografia, sticky nagłówek, przewijanie pionowe (`scrollbar-panel`).

### 7.4. Stan

Miesiąc, `generatedStamp` — tylko w sesji.

---

## 8. Nauczyciele

### 8.1. Lista (`/admin/nauczyciele`)

**Plik:** `app/admin/nauczyciele/page.tsx`.

- Lista z `useState` zainicjowanego z `ADMIN_TUTORS` (nowi **dopisywani na górę**).  
- Dla każdego: imię, kontakt, **select statusu** (`statusByTutor` lub domyślnie z danych), link **Szczegóły**, chipy przedmiotów, statystyki (godziny, uczniowie, opłacone/oczekujące zł).  
- **Dodaj nauczyciela** → modal `AddTutorModal`.

### 8.2. Modal dodawania (`components/admin/add-tutor-modal.tsx`)

- Pola: imię i nazwisko, e-mail, telefon, numer konta, przedmioty (CSV `,` / `;`), status.  
- Po zapisie: ekran sukcesu z animacją (`add-tutor-success-pop` w `globals.css`), **login** (z lokalnej części e-maila + unikalność) i **hasło** losowe (`crypto.getRandomValues`).  
- Duplikat e-maila — komunikat, brak dodania.  
- Nowy rekord: `id` losowy, `students`/`lessons`/`pending`/`paid` zerowe lub domyślne.

### 8.3. Szczegóły (`/admin/nauczyciele/[id]`)

**Plik:** `app/admin/nauczyciele/[id]/page.tsx`.

- Odczyt z **statycznego** `ADMIN_TUTORS` — wpisy dodane tylko w stanie listy **nie pojawią się** na podstronie `[id]` bez integracji API / wspólnego store.  
- KPI, przedmioty, sekcje nieopłacone/opłacone lekcje (powiązanie z `DEMO_FINANCE_LINES` modulo nauczyciel).

---

## 9. Cennik i przedmioty (`/admin/cennik`)

**Plik:** `app/admin/cennik/page.tsx`.

### 9.1. Ewidencja stawek

- **Aktualny cennik:** tabela `table-fixed` z proporcjami kolumn (poziom ~34%, trzy kolumny kwot po ~22%): kwota dla klienta, stawka pracownika, marża (różnica, kolor zielony).  
- Opis pól nad tabelą.

### 9.2. Edycja

- Przycisk **Edytuj cały cennik** — modal z wierszami: poziom, kwoty, marża read-only.  
- Przy otwarciu **`draftRows` kopiowane z aktualnego `rows`**.  
- **Zapisz** — aktualizuje `rows` i zamyka modal.

### 9.3. Oczekujące przedmioty

- Lista `ADMIN_PENDING_SUBJECTS` z przyciskami **Zatwierdź** / **Odrzuć** (usuwa z lokalnego stanu).

---

## 10. Powiadomienia (`/admin/powiadomienia`)

**Plik:** `app/admin/powiadomienia/page.tsx`.  
**Komponenty wspólne:** `components/inbox-mail.tsx` (`InboxGroupedList`, `InboxMailRow`, `InboxDetailPanel`, `InboxSentRow`, `InboxDetailModal`, `useMinWidthMd`).

### 10.1. Skrzynka odbiorcza

- Wyłącznie **alerty systemowe** z `ADMIN_SYSTEM_ALERTS` (`preview`, `body`, `unread`).  
- Klik wiersza → oznaczenie jako przeczytane + wybór do panelu bocznego.  
- **Desktop (`md+`):** siatka lista | panel szczegółów z metadanymi (Od, Data, Temat) i pełną treścią (akapity wg `\n\n`).  
- **Mobile:** dolny sheet (`InboxDetailModal`), otwierany po wyborze (nie przy pierwszym wejściu).

### 10.2. Wysyłka (tylko admin)

- **Nowa wiadomość** — modal: odbiorca (wszyscy lub jeden z `ADMIN_TUTORS`), temat, treść.  
- Po wysłaniu wpis trafia do **Wysłane** (`InboxSentRow` w grupie), wybór fokusu na nową wiadomość.

### 10.3. Dane alertów

Typ `AdminSystemAlert` w `lib/admin-demo.ts`: m.in. zaległa płatność za lekcję (Tomasz K.), nowy przedmiot do akceptacji, zaległa wypłata dla nauczyciela.

---

## 11. Dokumenty (`/admin/dokumenty`)

**Plik:** `app/admin/dokumenty/page.tsx`.  
**Ikony:** `IconFolder`, `IconFileDoc` w `components/icons.tsx`.

### 11.1. Ewidencje (firmowe / z księgowości)

- Grupowanie po **`monthKey`** (`YYYY-MM` lub `firma` → „Dokumenty ogólne”).  
- Kolejność grup: miesiące malejąco, **na końcu** dokumenty ogólne.  
- W każdej grupie osobna **tabela**: nazwa (z ikoną pliku), źródło, data, status (Gotowy / Oczekuje).  
- Tekst informacyjny: przyszły import z modułu księgowości.

### 11.2. Dokumentacja pracowników

- Jeden poziom: **folder pracownika** (`ADMIN_TUTORS`, filtrowanie wyszukiwarką).  
- W środku: **podfoldery miesięcy** (marzec / luty / styczeń 2026 + dokumenty stałe) — osobno zwijane (`openMonths` z kluczem `tutorId::monthKey`).  
- Pliki demo: ewidencje godzin, zestawienia, rachunki; w „stałych” umowa, aneks, ZUS.

---

## 12. Biblioteka danych `lib/admin-demo.ts`

| Eksport | Zastosowanie |
|---------|----------------|
| `ADMIN_TUTORS`, `AdminTutor`, `AdminTutorStatus` | Nauczyciele, rozliczenia (mapowanie), cennik (select w modalu powiadomień), dokumenty (foldery). |
| `ADMIN_PENDING_SUBJECTS` | Dashboard, sekcja cennika. |
| `ADMIN_ANNOUNCEMENTS` | **Obecnie nieużywane** na stronach (zachowane w pliku). |
| `ADMIN_STUDENT_MESSAGES` | Dashboard (skrót), nie główna skrzynka powiadomień. |
| `ADMIN_SYSTEM_ALERTS` | Powiadomienia admina. |

---

## 13. Zależności od `lib/demo-data.ts`

- `DEMO_FINANCE_LINES` — rozliczenia, wypłaty, księgowość, dashboard (zysk, godziny).  
- `DEMO_STUDENTS` — licznik uczniów na dashboardzie.

---

## 14. Style i animacje specyficzne

- `hop-to-paid` — rozliczenia.  
- `add-tutor-success-pop` — sukces dodania nauczyciela.  
- `scrollbar-panel` — przewijanie tabel (księgowość, wypłaty, listy inbox).  

---

## 15. Ograniczenia i spójność (ważne przy rozwoju)

1. **Brak API** — większość operacji jest **ulotna** (odświeżenie strony cofa zmiany).  
2. **Nauczyciel dodany w UI** nie jest widoczny na `/admin/nauczyciele/[id]` bez wspólnego źródła prawdy.  
3. **Księgowość → Dokumenty** — link „Archiwum” jest nawigacją; **brak automatycznego przekazywania** wygenerowanych plików do tabeli ewidencji (do zbudowania).  
4. **Sidebar** niewidoczny na wąskich ekranach bez menu zastępczego.  
5. **Powiadomienia** na dashboardzie (wiadomości od studentów) vs **powiadomienia systemowe** — dwa różne zestawy danych; produkcyjnie warto ujednolicić lub opisać role.

---

## 16. Sugerowany kierunek rozwoju (krótko)

- API + baza: nauczyciele, rozliczenia, dokumenty, powiadomienia.  
- Eksport ewidencji z księgowości do **Dokumentów** (ten sam model `monthKey` / typ pliku).  
- Real-time lub polling alertów systemowych.  
- Rozróżnienie ikon nawigacji (Rozliczenia vs Księgowość vs Cennik).  
- Menu mobilne dla admina (hamburger / drawer).

---

## 17. Indeks plików źródłowych

```
app/admin/layout.tsx
app/admin/page.tsx
app/admin/rozliczenia/page.tsx
app/admin/rozliczenia/rozliczenia-client.tsx
app/admin/wyplaty/page.tsx
app/admin/wyplaty/wyplaty-client.tsx
app/admin/ksiegowosc/page.tsx
app/admin/ksiegowosc/ksiegowosc-client.tsx
app/admin/nauczyciele/page.tsx
app/admin/nauczyciele/[id]/page.tsx
app/admin/cennik/page.tsx
app/admin/powiadomienia/page.tsx
app/admin/dokumenty/page.tsx
components/admin/admin-layout-client.tsx
components/admin/add-tutor-modal.tsx
components/inbox-mail.tsx
components/icons.tsx (IconFolder, IconFileDoc, IconPayroll, …)
lib/admin-demo.ts
lib/demo-data.ts (fragmenty używane przez admina)
app/globals.css (animacje, scrollbary)
```

---

*Raport sporządzony na podstawie kodu repozytorium; przy każdej większej zmianie funkcji warto zaktualizować ten plik.*
