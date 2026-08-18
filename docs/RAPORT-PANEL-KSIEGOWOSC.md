# Panel księgowości admina - pełny raport (wersja przywrócona)

Dokument opisuje **poprzedni / aktualnie przywrócony** panel `/admin/ksiegowosc` (ewidencja sprzedaży bezrachunkowej + koszty operacyjne + kalkulator PIT/ZUS + zamknięcie miesiąca).

**Nie dotyczy** eksperymentalnego rewrite’u NDG/JDG (mocki, `obliczZaliczkePIT`, dashboardy limitów) - ten rewrite został cofnięty.

Stan odniesienia: `app/admin/ksiegowosc/page.tsx` + `ksiegowosc-client.tsx` (~1400 LOC).

---

## 1. Cel i rola panelu

Panel to **adminowe centrum miesięcznej i rocznej księgowości JDG** w ZALICZONE:

- **Ewidencja sprzedaży bezrachunkowej** - wyłącznie lekcje ze statusem `VERIFIED`.
- **Zestawienie kosztów** - rachunki/faktury operacyjne (CRUD) oraz w trybie rocznym także wypłaty PAID + premie.
- **KPI finansowe** - przychód, koszty, marża, liczba lekcji.
- **Kalkulator „Rozliczenia - Zrób to sam”** - szacunek PIT 12%, ZUS właściciela, zysk „na rękę”.
- **Kreator zamknięcia miesiąca** - archiwizacja w `closed_months` z blokadą dalszych zmian w tym miesiącu.

Miejsce w cyklu admina (dashboard / kalendarz operacyjny):

| Dzień (orientacyjnie) | Akcja |
|-----------------------|--------|
| ~15. | Zamknięcie miesiąca + koszty |
| ~16. | Weryfikacja finansów |
| ~20. | Zaliczka PIT (JDG) |

Sam panel **nie** linkuje do `/admin/wyplaty` ani `/admin/rozliczenia` - zależność jest odwrotna: najpierw weryfikacja lekcji i wypłaty, potem księgowość.

---

## 2. URL i domyślny miesiąc

| Element | Zachowanie |
|--------|------------|
| Ścieżka | `/admin/ksiegowosc` |
| Parametr | `?month=YYYY-MM` |
| Walidacja | regex `/^\d{4}-\d{2}$/` |
| Domyślnie | **poprzedni miesiąc kalendarzowy** (`previousMonthKey`), nie bieżący |

Zmiana miesiąca w selectcie:

- `router.push(/admin/ksiegowosc?month=…)`
- resetuje checkbox Warunku 3 (saldo bankowe)
- ustawia domyślną datę faktury kosztu na `YYYY-MM-01`

Widoki PDF / druku:

- `/admin/ksiegowosc/ewidencja?month=YYYY-MM` lub `?year=YYYY`
- `/admin/ksiegowosc/koszty?month=YYYY-MM` lub `?year=YYYY`

---

## 3. Design wizualny

### Paleta (`app/globals.css`)

| Token | Hex | Rola w panelu |
|-------|-----|----------------|
| `depths` / `royal` | `#000C4A` | granat - CTA, tile navy/green |
| `lime` | `#D5ED21` | limonka - aktywna zakładka, tekst na granacie |
| `soft-lime` / `butter` | `#DFFD6F` | badge „zamknięty”, etykiety na navy |
| `paper` | `#F6F5F0` | tła sekcji, sticky thead |
| `snow` | `#FFFFFF` | karty, tabele |
| `mist` / `luster` / `panel-frame` | `#E8E8E6` | ramki |
| `steel` | `#AAAAAA` | szary |
| `muted` | `#5F5E5A` | tekst pomocniczy |
| `claret`, `moss` | aliasy (obecnie też granat w designie Ops-Ledger) | statusy |
| `toffee` | `#AAAAAA` | kwoty kosztów |

### Typografia

- **`dash-sans`** (Space Grotesk w layoutcie admina) - nagłówki (`Księgowość`, sekcje kalkulatora).
- **`dash-mono`** (IBM Plex Mono) - kwoty, Lp., daty w tabelach (`tabular-nums`).

### Komponenty UI

- **`FinanceTile` / `FinanceTilesRow`** - 4 kafelki KPI.
- **`LedgerStat` / `LedgerBand`** - w design systemie admina istnieją, **w tym panelu nie są używane**.

| Tone `FinanceTile` | Tło | Label | Value |
|--------------------|-----|-------|-------|
| `navy` | `#000C4A` | `#DFFD6F` | `#D5ED21` |
| `orange` | `#D5ED21` | `#000C4A` | `#000C4A` |
| `green` | `#000C4A` | `#DFFD6F` | `#FFFFFF` |
| `red` | `#AAAAAA` | white | white |

Inne detale:

- `rounded-app` / `rounded-ledger`
- badge `badge-done` z tekstem **„Miesiąc zamknięty”**
- przyciski PDF: `bg-[#000C4A] text-lime`
- zebra wierszy: `bg-snow even:bg-paper/80`

### UI zamkniętego miesiąca - „ukończony etap”

Gdy wybrany miesiąc jest w `closed_months`:

- Badge **„Miesiąc zamknięty”**.
- **Ukryte** przełączniki „Księgowość miesięczna / roczna”.
- **Ukryte** sekcje: tabelaryczne podsumowanie oraz „Zrób to sam”.
- Banner kosztów: **„Miesiąc zamknięty - dodawanie i usuwanie kosztów jest zablokowane.”**
- Sekcja z ikoną kłódki: **„Miesiąc zamknięty - ukończony etap”** + siatka `ClosedFigure`:
  - przychód
  - koszty wypłat / operacyjne
  - podstawa opodatkowania
  - PIT
  - ZUS Ulga na start
  - zysk / strata na rękę
- Linki PDF nadal dostępne.

---

## 4. Tryb miesięczny - metryki i formuły

Źródło KPI w kafelkach: **client** (linie `VERIFIED` + payouts `PAID` + `operating_expenses`).  
Server `monthSummary` w `page.tsx` służy głównie do **Warunku 1/2** kreatora i spójnych liczb PIT.

### Kafelki (`FinanceTilesRow`)

1. **Przychód** - `Σ amountPln` linii VERIFIED miesiąca  
2. **Koszty wypłaty / wszystkie** - `paidPayoutsSum` / `allCosts`  
3. **Marża agencji** - `gross − allCosts` (może być ujemna)  
4. **Lekcje VERIFIED** - liczba linii  

### Formuły

```
grossRevenue        = Σ VERIFIED.amountPln
payrollCosts        = Σ payouts WHERE status=PAID AND month=M   // pełna kwota z premiami
operatingCosts      = Σ operating_expenses.amount_pln WHERE month=M
allCosts            = payrollCosts + operatingCosts
taxableIncome       = max(0, grossRevenue − allCosts)
estimatedPit        = round(taxableIncome × ADMIN_PIT_RATE, 2)
ADMIN_PIT_RATE      = 0.12   // lib/dates.ts
```

**Zysk „na rękę” (kalkulator / widok zamkniętego miesiąca):**

```
netProfit = gross − allCosts − suggestedPit − zusTotal
```

Uwaga: serwerowe `monthSummary.netProfitPln = taxableIncome − estimatedPit` **bez ZUS**. W UI klient liczy własny `netProfit` / `closedNetProfit` (z ZUS).

### Ewidencja sprzedaży (tabela miesięczna)

Kolumny UI:

**Lp.** · **Data wykon.** · **Data zapłaty** · **Nazwa usługi** · **Nabywca** · **Brutto** · **Kwota narastająco**

- Nazwa usługi: `Korepetycje - {przedmiot} ({classLevel?})`
- Data zapłaty: `paymentReceivedAt ?? date`

### Zestawienie kosztów (miesiąc)

Formularz: Data rachunku/faktury, Nr dok., Nazwa, Wystawca, Kwota, Plik (opcjonalny), **Dodaj**.  
Lista: Lp., Data, Numer, Nazwa, Wystawca, Kwota, Załącznik, Usuń.

---

## 5. Tryb roczny - funkcjonalność

Dostępny tylko gdy wybrany miesiąc **nie** jest zamknięty (przy zamkniętym toggle znika).

| Sekcja | Zachowanie |
|--------|------------|
| Kafelki KPI | Sumy za cały rok |
| Ewidencja | Tabela miesięcy: suma miesięczna + narastająco |
| Koszty | Tabela: Wypłaty · Premie · Koszty dodatkowe · Suma (+ footer „Suma roku”) |
| Podsumowanie | Przychód, Koszty, Marża, Nauczyciele, Uczniowie, Lekcje, Godziny, Wypłaty PAID, Status Otwarty/Zamknięty |
| Zrób to sam | ZUS × 12 (`zusMonthsInPeriod = 12`) |
| Kreator zamknięcia | Zastąpiony listą **„Zamknięcia w roku {Y}”** |

Wiersze kosztów rocznych obejmują miesiące od stycznia do bieżącego (dla roku bieżącego) oraz miesiące z danymi.

---

## 6. Kalkulator „Rozliczenia - Zrób to sam”

Widoczny przy **otwartym** miesiącu (oraz w trybie roku).

### 1. Twój podatek dochodowy (PIT-12)

- Przychód (Ewidencja)
- Notatka VAT: art. 43 ust. 1 pkt 27
- Koszt (Wynagrodzenia studentów) = PAID
- Koszt (Wydatki operacyjne)
- Dochód (Zysk) = `taxableIncome`
- Twój podatek PIT (**12%**)

Termin (miesiąc): przelew do **20. dnia kolejnego miesiąca** na Mikrorachunek Podatkowy.

### 2. Składki za studentów (&lt;26)

- ZUS za studentów: **0,00 zł**
- PIT-4: **0,00 zł**

### 3. Twój własny ZUS (właściciel JDG)

| Etap | Label | `monthlyAmount` | `amountLabel` | Note |
|------|-------|-----------------|---------------|------|
| `start` | Ulga na start (tylko zdrowotne) | **410** | `~410,00 zł` | Pierwsze 6 miesięcy firmy |
| `maly` | Mały ZUS (preferencyjny) | **890** | `~480,00 zł + składka zdrowotna` | Preferencyjne + ok. 410 zł zdrowotnej |

Select UI:

- **„Ulga na start - ~410,00 zł / mies.”**
- **„Mały ZUS - ~480,00 zł + zdrowotna”**

### Podsumowanie zysku

Lista: Przychód − wynagrodzenia PAID − PIT − ZUS → **„Zostaje zysku na rękę”** / **„Strata na rękę”**.

Formuła używa `allCosts` (odejmuje też koszty operacyjne), mimo że w tej liście nie ma osobnej pozycji „− wydatki operacyjne”.

Przypomnienie: **JPK_V7 do 25. dnia miesiąca** (tryb miesięczny).

### Zamknięty miesiąc - ZUS na sztywno

Komentarz w kodzie: zamknięty miesiąc = zawsze **Ulga na start** (410), bez selecta; `closedNetProfit` z `closedZusTotal = 410`.

---

## 7. Koszty operacyjne - CRUD

| Operacja | Action | Warunki |
|----------|--------|---------|
| Create | `createOperatingExpense(FormData)` | `assertMonthOpen(month)`; wymagane: month, invoiceDate, expenseName, issuerName, amount ≥ 0; documentNumber opcjonalny |
| Delete | `deleteOperatingExpense(id)` | `assertMonthOpen` dla miesiąca rekordu |
| Attachment | opcjonalny | max **12 MB**; storage `documents` → `expenses/{month}/{uuid}-{name}` |

Pola FormData: `month`, `invoiceDate`, `documentNumber`, `expenseName`, `issuerName`, `amountPln`, `file?`.

Po sukcesie: `revalidatePath("/admin/ksiegowosc")`.  
UI: „Dodano wydatek.” / „Usunięto wydatek.”; załącznik przez `getSignedDownloadUrl`.

---

## 8. Zamykanie miesięcy

### Warunki w UI (kreator)

1. **Warunek 1** - brak lekcji `PLANNED` / `PENDING_VERIFICATION` (etykieta: VERIFIED lub UNPAID).  
2. **Warunek 2** - wszystkie wypłaty miesiąca mają status `PAID`.  
3. **Warunek 3** - checkbox **„potwierdzam zgodność salda z kontem bankowym”** (tylko UI - **nie** rewalidowany na serwerze).

Przycisk **„Zamknij miesiąc”** wymaga: `canCloseMonth` ∧ wszystkie 3 warunki.  
`ConfirmDialog`: ostrzeżenie o nieodwracalności z poziomu UI.

### Kalendarz dostępności

```ts
DATES.monthClose.earliestDayOfNextMonth = 6
canCloseMonth(monthKey) // today >= 6. dzień miesiąca następnego po monthKey
```

Tekst UI mówi czasem **„od 5. dnia następnego miesiąca”** - **rozjazd z kodem (dzień 6)**.  
Target operacyjny w `DATES`: ok. **15.** dnia następnego miesiąca.

### Serwer `closeMonth` (`lib/actions/admin.ts`)

1. `requireAdminUserId`
2. Format `YYYY-MM`
3. `canCloseMonth`
4. **`assertMonthCloseable`** - rewalidacja Warunku 1 i 2 w DB (nie ufa checkboxom)
5. `upsert` do `closed_months` (`month`, `closed_by`, `closed_at`)
6. `revalidatePath("/admin/ksiegowosc")`, `revalidatePath("/finanse")`

### Globalna ochrona `assertMonthOpen` (`lib/actions/guards.ts`)

Komunikat: **"Ten miesiąc jest już zamknięty - modyfikacja zabroniona"**.

Wołane m.in. przy:

- `createOperatingExpense` / `deleteOperatingExpense`
- `markPayoutPaid`
- mutacjach lekcji zależnych od miesiąca (`lib/actions/lessons.ts`)
- innych akcjach admina chronionych strażnikiem

Brak tabeli / błąd odczytu `closed_months` → fail-open (nie blokuje).

### Skutki zamknięcia w panelu

- brak dodawania/usuwania kosztów
- brak kreatora i kalkulatora „Zrób to sam”
- widok archiwalny „ukończony etap”
- PDF nadal działa

---

## 9. Widoki drukowania

### Ewidencja sprzedaży (`/ewidencja`)

**Miesiąc - kolumny:** Lp. · Data sprzedaży · Data wpływu · Metoda płatności · Nazwa usługi · Nabywca · Brutto · Kwota narastająco.  
Footer: **„Suma przychodów w okresie”**.  
Nagłówek: **„Ewidencja sprzedaży bezrachunkowej”** + dane firmy (placeholdery NIP/adres) + podpis.

**Rok:** Miesiąc · Suma z ewidencji miesięcznej · Kwota narastająco · Suma roku.

### Koszty (`/koszty`)

**Miesiąc:** Lp. · Data rachunku/faktury · Numer dokumentu · Nazwa wydatku · Dane wystawcy · Kwota.  
Podtytuł: rachunki/faktury **poza wypłatami tutorów**.

**Rok:** Miesiąc · Wypłaty · Premie · Koszty dodatkowe · Suma.

Przycisk **„Drukuj / Zapisz PDF”** (`window.print()`).

---

## 10. Powiązania z innymi modułami

| Kierunek | Szczegóły |
|----------|-----------|
| W panelu | Linki do PDF ewidencji/kosztów + nawigacja `?month=` |
| Z zewnątrz | Dashboard/kalendarz: wypłaty → rozliczenia → **ksiegowosc** (dni 15/16/20); kalendarz może linkować `/admin/ksiegowosc/koszty` |
| Dane wejściowe | Lekcje `VERIFIED` z rozliczeń; wypłaty `PAID` z `/admin/wyplaty` |

---

## 11. Kluczowe pliki i server actions

| Plik | Rola |
|------|------|
| `app/admin/ksiegowosc/page.tsx` | RSC: dane, agregacje miesiąca, props do clienta |
| `app/admin/ksiegowosc/ksiegowosc-client.tsx` | UI (~1400 LOC): tryby, tabele, CRUD, ZUS, zamknięcie |
| `app/admin/ksiegowosc/ewidencja/*` | Print ewidencji |
| `app/admin/ksiegowosc/koszty/*` | Print kosztów |
| `lib/dates.ts` | `ADMIN_PIT_RATE = 0.12`, `canCloseMonth`, `DATES.monthClose` |
| `lib/actions/admin.ts` | `closeMonth`, `assertMonthCloseable`, `createOperatingExpense`, `deleteOperatingExpense` |
| `lib/actions/guards.ts` | `assertMonthOpen` |
| `lib/actions/documents.ts` | `getSignedDownloadUrl` (załączniki) |
| `lib/data/queries.ts` | `getAllLessonLines`, `getAllPayouts`, `getClosedMonths`, `getAllOperatingExpenses`, … |
| `components/admin/finance-tile.tsx` | KPI tiles |
| `app/globals.css` | tokeny kolorów, `dash-sans` / `dash-mono` |

### Stałe liczbowe (z kodu)

| Stała | Wartość |
|-------|---------|
| `ADMIN_PIT_RATE` | **0.12** |
| ZUS Ulga na start | **410** zł/mies. |
| ZUS Mały (w kalkulatorze) | **890** zł/mies. |
| Max załącznik | **12 MB** |
| Najwcześniejsze zamknięcie | **6.** dzień następnego miesiąca (`canCloseMonth`) |
| Target zamknięcia (DATES) | **15.** dzień następnego miesiąca |
| Deadline PIT (DATES / UI) | **20.** dzień |
| Przypomnienie JPK (UI) | **25.** dzień |

---

## 12. Co zostało cofnięte (rewrite NDG/JDG)

Na prośbę użytkownika przywrócono poprzedni panel i usunięto artefakty rewrite’u:

- dashboardy NDG/JDG, `LimitProgressBar`
- `lib/podatki.ts` / mocki / testy vitest pod podatki
- uproszczone `page.tsx` bez agregacji DB

Aktualny stan operacyjny to **ten raportowany panel**.

---

*Wygenerowano na podstawie kodu w repozytorium ZALICZONE (panel przywrócony z git).*
