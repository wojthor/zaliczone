# Google Drive - nakładka ZALICZONE

Aplikacja łączy się z **Twoim prywatnym Dyskiem Google** przez **konto usługi** (service account).
Admin wrzuca pliki do `zaliczone/nauczyciele/<Imię Nazwisko>` - nauczyciel widzi je w **Profil → Dokumenty** (tylko podgląd i pobieranie).

> **Język konsoli:** w prawym górnym rogu Google Cloud kliknij ikonę ustawień / profilu i ustaw język na **Polski**, jeśli widzisz angielskie menu.

---

## 1. Folder na Dysku Google

Docelowa struktura:

```text
zaliczone/
  nauczyciele/
    Benio Beniowski/
  byli pracownicy/
    Lamine Yamal/
```

1. Otwórz folder **nauczyciele** w przeglądarce - ID z URL → `GOOGLE_DRIVE_TEACHERS_FOLDER_ID`.
2. (Zalecane) Utwórz obok folder **byli pracownicy**, **udostępnij** go temu samemu kontu usługi (**Edytujący**) i opcjonalnie wpisz ID do `GOOGLE_DRIVE_FORMER_TEACHERS_FOLDER_ID`.
3. Jeśli nie utworzysz osobnego folderu, aplikacja zrobi fallback: `nauczyciele/byli pracownicy/`.

---

## 2. Google Cloud Console (wersja polska)

Wejdź na: [https://console.cloud.google.com/?hl=pl](https://console.cloud.google.com/?hl=pl)

### 2.1. Utwórz projekt

1. U góry, obok „Google Cloud”, kliknij wybór projektu.
2. **Nowy projekt**.
3. **Nazwa projektu:** np. `zaliczone-drive`.
4. Kliknij **Utwórz**.
5. Upewnij się, że ten projekt jest **aktywny** (wybrany u góry).

### 2.2. Włącz Google Drive API

1. Menu ☰ po lewej → **Interfejsy API i usługi** → **Biblioteka**.
2. W wyszukiwarce wpisz: `Google Drive API`.
3. Kliknij wynik **Google Drive API**.
4. Kliknij **Włącz**.

(Możesz też użyć bezpośredniego linku:  
[Włącz Google Drive API](https://console.cloud.google.com/flows/enableapi?apiid=drive.googleapis.com&hl=pl))

### 2.3. Utwórz konto usługi

1. Menu ☰ → **IAM i administracja** → **Konta usługi**.  
   (albo: **Interfejsy API i usługi** → **Dane logowania** → **Utwórz dane logowania** → **Konto usługi**)
2. Kliknij **Utwórz konto usługi**.
3. **Nazwa konta usługi:** np. `zaliczone-drive`.
4. (Opcjonalnie) krótki opis, np. `Dostęp ZALICZONE do Dysku`.
5. Kliknij **Utwórz i kontynuuj**.
6. Krok „Uprawnienia” - **pomiń** (nie musisz nadawać ról w projekcie). Kliknij **Dalej** / **Gotowe**.

Na liście kont pojawi się e-mail w stylu:

`zaliczone-drive@TWOJ-PROJEKT.iam.gserviceaccount.com`

**Skopiuj ten adres e-mail** - będzie potrzebny przy udostępnianiu folderu na Dysku.

### 2.4. Utwórz klucz JSON (konta usługi - NIE „API Keys”)

> **Uwaga:** sekcja **Interfejsy API i usługi → Dane logowania → Klucze API / API keys** to **coś innego**.  
> Nam potrzebny jest klucz **konta usługi** (plik JSON z `private_key`). Bez tego Drive nie zadziała.

**Ścieżka A (najpewniejsza):**

1. Wejdź bezpośrednio:  
   [https://console.cloud.google.com/iam-admin/serviceaccounts?hl=pl](https://console.cloud.google.com/iam-admin/serviceaccounts?hl=pl)
2. Sprawdź u góry, że masz wybrany projekt `zaliczone-drive` (lub jak nazwałeś).
3. Na liście kliknij **e-mail** konta usługi (nie trzy kropki z boku) - np. `zaliczone-drive@….iam.gserviceaccount.com`.
4. Otworzy się strona szczegółów konta. U góry są zakładki typu:  
   **Szczegóły | Uprawnienia | Klucze | Dane logowania…**
5. Kliknij zakładkę **Klucze** (ang. *Keys*).
6. **Dodaj klucz** → **Utwórz nowy klucz**.
7. Typ: **JSON** → **Utwórz**.
8. Pobierze się plik `.json` - **to jedyna kopia**, nie wrzucaj go do gita.

**Ścieżka B (z menu):**

1. Menu ☰ → **IAM i administracja** → **Konta usługi**
2. Dalej jak w punktach 3–8 powyżej.

Jeśli nie widzisz zakładki **Klucze**:
- upewnij się, że kliknąłeś **w samo konto** (szczegóły), a nie stoisz tylko na liście;
- nie jesteś w „Klucze API” / Credentials / API keys;
- konto ma status aktywne (nie usunięte).

### 2.5. Co wziąć z pliku JSON

Otwórz pobrany plik w edytorze tekstu. Potrzebujesz dwóch pól:

| Pole w JSON     | Zmienna w `.env.local`      |
|-----------------|-----------------------------|
| `client_email`  | `GOOGLE_DRIVE_CLIENT_EMAIL` |
| `private_key`   | `GOOGLE_DRIVE_PRIVATE_KEY`  |

`private_key` wklej **w całości** (z `-----BEGIN PRIVATE KEY-----` do `-----END PRIVATE KEY-----`), w cudzysłowie. Znaki `\n` z JSON zostaw jak są - aplikacja je zamieni na nowe linie.

---

## 3. Udostępnij folder kontu usługi (Dysk Google)

Bez tego krok aplikacja **nie zobaczy** Twojego Dysku.

1. Otwórz [Dysk Google](https://drive.google.com).
2. Kliknij prawym folder **nauczyciele** (albo cały `zaliczone`) → **Udostępnij**.
3. Wklej e-mail konta usługi (`...@....iam.gserviceaccount.com`).
4. Uprawnienia: **Edytujący** (nie „Przeglądający”).
5. Odznacz powiadomienie e-mail (konto usługi i tak nie czyta skrzynki).
6. **Udostępnij** / **Gotowe**.

---

## 4. Zmienne w `.env.local`

```env
GOOGLE_DRIVE_CLIENT_EMAIL=zaliczone-drive@TWOJ-PROJEKT.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_TEACHERS_FOLDER_ID=ID_FOLDERU_nauczyciele
```

Zrestartuj serwer:

```bash
pnpm dev
```

---

## 5. Migracja Supabase

W **Supabase → SQL Editor** uruchom plik:

`supabase/migrations/0012_drive_folder_id.sql`

Kolumna `profiles.drive_folder_id` trzyma ID folderu nauczyciela na Dysku.

---

## 6. Pierwsze uruchomienie w ZALICZONE

1. Upewnij się, że folder `nauczyciele` jest udostępniony kontu usługi (**Edytujący**).
2. Otwórz profil nauczyciela w adminie (albo utwórz nowego) - system **podłączy / utworzy** folder na Dysku.
3. Wrzuć testowy PDF do folderu nauczyciela na Dysku Google.
4. Zaloguj się jako nauczyciel → **Profil** → Dokumenty → **Podgląd** / **Pobierz**.

Admin zarządza plikami **tylko na Dysku Google** (bez osobnej zakładki w panelu).

---

## Zachowanie

| Akcja | Kto / efekt |
|--------|-------------|
| Tworzenie nauczyciela | folder w `zaliczone/nauczyciele/` |
| Zakończenie współpracy | folder przenoszony do `zaliczone/byli pracownicy/` |
| Zmiana imienia i nazwiska | renamuje folder na Dysku |
| Wrzuć / usuń / edytuj plik | tylko Ty na Dysku Google |
| Podgląd / pobranie | nauczyciel w aplikacji |

Nauczyciel **nie może** edytować ani usuwać plików przez ZALICZONE.

Opcjonalnie w `.env.local`:

```env
GOOGLE_DRIVE_FORMER_TEACHERS_FOLDER_ID=   # ID folderu „byli pracownicy”; jeśli puste - tworzony automatycznie obok „nauczyciele”
```

Jednorazowa synchronizacja (np. po wdrożeniu):

```bash
node --env-file=.env.local scripts/sync-drive-folders.mjs
```

---

## Szybki słownik EN → PL (gdy konsola jest po angielsku)

| Angielski | Polski |
|-----------|--------|
| APIs & Services | Interfejsy API i usługi |
| Library | Biblioteka |
| Enable | Włącz |
| IAM & Admin | IAM i administracja |
| Service accounts | Konta usługi |
| Create service account | Utwórz konto usługi |
| Keys | Klucze |
| Add key → Create new key | Dodaj klucz → Utwórz nowy klucz |
| Credentials | Dane logowania |
| Share (Drive) | Udostępnij |
| Editor | Edytujący |
