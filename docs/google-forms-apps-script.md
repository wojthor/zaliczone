# Google Apps Script — rekrutacja Zaliczone (CheckboxGrid → required_tests)

## Checklist produkcji

1. **Vercel → Settings → Environment Variables** — dodaj `GOOGLE_FORMS_WEBHOOK_SECRET` (Production) z tą samą wartością co w `.env.local`. Bez tego endpoint przyjmuje każde żądanie.
2. Redeploy po dodaniu zmiennej (albo „Redeploy” ostatniego deploymentu).
3. W Apps Script ustaw:
   - `WEBHOOK_URL = "https://www.zaliczone.edu.pl/api/webhooks/google-forms"`
   - `WEBHOOK_SECRET` = ta sama wartość co env
4. Trigger: **From form** → `onFormSubmit` (formularz główny + każdy quiz Biologii itd.).
5. Smoke: wyślij testowe zgłoszenie → kandydat w `/admin/rekrutacja`; wynik quizu → `test_results`.

**Dlaczego wynik quizu „nie widać”?**  
Wcześniej `TEST_RESULT` wymagał wcześniejszego `APPLICATION`. Jeśli Julia zrobiła tylko test Biologii (albo Apps Script nie miał e-maila / triggera), nic nie trafiło do bazy. Teraz wynik bez zgłoszenia tworzy stub kandydata. Formularz quizu **musi zbierać e-mail** (Ustawienia Forms) i mieć zainstalowany skrypt B) z triggerem.

## Logika najwyższego poziomu

Kandydat zaznacza w siatce wiele poziomów per przedmiot. **Na każdy przedmiot idzie tylko jeden test** — z najwyższego zaznaczonego poziomu.

Kolejność (rosnąco):
1. Szkoła podstawowa  
2. Szkoła średnia - poziom podstawowy  
3. Szkoła średnia - poziom rozszerzony  
4. Matura / Matura - poziom podstawowy / Matura - poziom rozszerzony  

## A) Formularz główny (APPLICATION)

```javascript
/** @OnlyCurrentDoc */
var WEBHOOK_URL = "https://www.zaliczone.edu.pl/api/webhooks/google-forms";
var WEBHOOK_SECRET = "ZMIEŃ_NA_SEKRET"; // = GOOGLE_FORMS_WEBHOOK_SECRET z Vercel

/** Im wyższy index, tym wyższy poziom. Dopasuj tytuły kolumn CheckboxGrid. */
var LEVEL_RANK = {
  "Szkoła podstawowa": 1,
  "Szkoła średnia - poziom podstawowy": 2,
  "Szkoła średnia - poziom rozszerzony": 3,
  "Matura": 4,
  "Matura - poziom podstawowy": 4,
  "Matura - poziom rozszerzony": 5,
};

function onFormSubmit(e) {
  try {
    postJson({ type: "APPLICATION", data: buildApplicationData(e) });
  } catch (err) {
    console.error(err);
  }
}

function buildApplicationData(e) {
  var r = e.response;

  function ans(title) {
    var items = r.getItemResponses();
    for (var i = 0; i < items.length; i++) {
      if (items[i].getItem().getTitle() === title) {
        var resp = items[i].getResponse();
        return Array.isArray(resp) ? resp : String(resp || "").trim();
      }
    }
    return "";
  }

  // CheckboxGrid zwykle wraca jako obiekt { "Biologia": ["Matura", "Szkoła podstawowa"], ... }
  // albo jako tablica stringów "Biologia [Matura]". Dopasuj do swojego formularza.
  var grid = ans("Przedmioty i poziomy"); // <- tytuł pytania CheckboxGrid
  var requiredTests = highestLevelPerSubject(grid);

  var first = String(ans("Imię") || "");
  var last = String(ans("Nazwisko") || "");
  var fullName = String(ans("Imię i nazwisko") || "").trim() || (first + " " + last).trim();

  return {
    full_name: fullName,
    email: String(ans("E-mail") || "").toLowerCase(),
    phone: String(ans("Telefon") || ""),
    dob: String(ans("Data urodzenia") || ""),
    student_status: /tak|yes/i.test(String(ans("Czy jesteś studentem?"))),
    university: String(ans("Uczelnia") || ""),
    experience: /tak|yes/i.test(String(ans("Doświadczenie"))),
    required_tests: requiredTests,
    levels: requiredTests.map(function (t) { return t.subject + ": " + t.level; }).join("; "),
    hours_per_week: String(ans("Ile godzin tygodniowo?") || ""),
    cv_url: String(ans("CV") || ans("Link do CV") || ""),
  };
}

/**
 * Wejście: obiekt { subject: [levels...] } albo tablica "Subject [Level]".
 * Wyjście: [{ subject, level }] — jeden wpis na przedmiot (najwyższy level).
 */
function highestLevelPerSubject(grid) {
  var map = {}; // subject -> { level, rank }

  function consider(subject, level) {
    subject = String(subject || "").trim();
    level = String(level || "").trim();
    if (!subject || !level) return;
    var rank = LEVEL_RANK[level] || 0;
    if (!map[subject] || rank > map[subject].rank) {
      map[subject] = { level: level, rank: rank };
    }
  }

  if (grid && typeof grid === "object" && !Array.isArray(grid)) {
    Object.keys(grid).forEach(function (subject) {
      var levels = grid[subject];
      if (Array.isArray(levels)) {
        levels.forEach(function (lvl) { consider(subject, lvl); });
      } else {
        consider(subject, levels);
      }
    });
  } else if (Array.isArray(grid)) {
    grid.forEach(function (row) {
      // np. "Biologia [Matura]" z eksportu
      var m = String(row).match(/^(.+?)\s*\[(.+)\]\s*$/);
      if (m) consider(m[1], m[2]);
    });
  }

  return Object.keys(map).map(function (subject) {
    return { subject: subject, level: map[subject].level };
  });
}

function postJson(payload) {
  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}
```

## B) Formularz testu (TEST_RESULT)

Biologia **już jest testem** (masz punkty i „Udostępnij oceny”) — nie musisz nic „robić od zera”.  
Wystarczy, żeby zaznaczone było **„Natychmiast po przesłaniu każdego formularza”** (nie „Później”). Bez tego Apps Script często dostaje pusty wynik.

Dodatkowo: **Odpowiedzi → Link do arkusza kalkulacyjnego** (jeśli jeszcze nie ma). W arkuszu jest kolumna **Score** / **Wynik** — skrypt czyta stamtąd, gdy `getScore()` jest puste.

**Import starych odpowiedzi:** wklej skrypt → `MAX_POINTS` / sekret → Run → **`backfillExistingTestResults`**.

```javascript
/** @OnlyCurrentDoc */
var WEBHOOK_URL = "https://www.zaliczone.edu.pl/api/webhooks/google-forms";
var WEBHOOK_SECRET = "ZMIEŃ_NA_SEKRET"; // = GOOGLE_FORMS_WEBHOOK_SECRET z Vercel
var TEST_SUBJECT = "Biologia";
var TEST_LEVEL = "Szkoła średnia - poziom rozszerzony";
var MAX_POINTS = 15;

function onFormSubmit(e) {
  postTestResult(e.response);
}

/** Run → backfillExistingTestResults (jednorazowo) */
function backfillExistingTestResults() {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  Logger.log("Backfill: " + responses.length + " odpowiedzi");
  for (var i = 0; i < responses.length; i++) {
    postTestResult(responses[i]);
    Utilities.sleep(250);
  }
  Logger.log("Backfill done");
}

function postTestResult(r) {
  function ans(title) {
    var items = r.getItemResponses();
    for (var i = 0; i < items.length; i++) {
      if (items[i].getItem().getTitle() === title) {
        return String(items[i].getResponse() || "").trim();
      }
    }
    return "";
  }

  var email = "";
  try { email = r.getRespondentEmail() || ""; } catch (_) {}
  if (!email) email = ans("Adres e-mail") || ans("Email") || ans("E-mail");

  var score = resolveScore(r, email);
  var fullName = ans("Imię i nazwisko") || ans("Imię") || "";

  if (!email || email.indexOf("@") === -1) {
    Logger.log("SKIP brak email id=" + r.getId());
    return;
  }
  if (!score) {
    Logger.log(
      "SKIP brak score email=" + email +
        " | Ustaw „Udostępnij oceny: Natychmiast” ALBO Odpowiedzi→arkusz z kolumną Score, potem Run znowu."
    );
    return;
  }

  var payload = {
    type: "TEST_RESULT",
    email: String(email).toLowerCase().trim(),
    subject: TEST_SUBJECT,
    level: TEST_LEVEL,
    score: score,
  };
  if (fullName) payload.full_name = fullName;

  var res = UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  Logger.log(email + " " + score + " → " + res.getResponseCode() + " " + res.getContentText());
}

/** 1) getScore 2) suma pytań 3) kolumna Score/Wynik w arkuszu odpowiedzi */
function resolveScore(r, email) {
  try {
    var raw = r.getScore();
    Logger.log("raw getScore=" + raw);
    if (raw !== null && raw !== undefined && raw !== "" && !isNaN(Number(raw))) {
      return Number(raw) + "/" + MAX_POINTS;
    }
  } catch (e) {
    Logger.log("getScore err " + e);
  }

  try {
    var sum = 0;
    var any = false;
    var graded = r.getGradableItemResponses();
    for (var g = 0; g < graded.length; g++) {
      var ps = graded[g].getScore();
      if (ps !== null && ps !== undefined && ps !== "") {
        sum += Number(ps);
        any = true;
      }
    }
    if (any) return sum + "/" + MAX_POINTS;
  } catch (e2) {
    Logger.log("gradable err " + e2);
  }

  var fromSheet = scoreFromDestinationSheet(email, r.getTimestamp());
  if (fromSheet) return fromSheet;
  return "";
}

function scoreFromDestinationSheet(email, timestamp) {
  var form = FormApp.getActiveForm();
  var sid = form.getDestinationId();
  if (!sid) {
    Logger.log("Brak arkusza docelowego (Odpowiedzi → Link do arkusza).");
    return "";
  }
  var ss = SpreadsheetApp.openById(sid);
  var sheet = ss.getSheets()[0];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return "";

  var headers = values[0].map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var scoreCol = -1;
  var emailCol = -1;
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    if (scoreCol < 0 && (h === "score" || h === "wynik" || h.indexOf("score") === 0 || h.indexOf("wynik") === 0)) {
      scoreCol = c;
    }
    if (emailCol < 0 && (h.indexOf("email") >= 0 || h.indexOf("e-mail") >= 0 || h.indexOf("adres e-mail") >= 0)) {
      emailCol = c;
    }
  }
  Logger.log("sheet scoreCol=" + scoreCol + " emailCol=" + emailCol);

  if (scoreCol < 0) return "";

  var wantEmail = String(email || "").toLowerCase().trim();
  for (var r = values.length - 1; r >= 1; r--) {
    var rowEmail = emailCol >= 0 ? String(values[r][emailCol] || "").toLowerCase().trim() : "";
    if (wantEmail && rowEmail && rowEmail !== wantEmail) continue;

    var cell = values[r][scoreCol];
    if (cell === null || cell === undefined || cell === "") continue;

    var s = String(cell).trim();
    // "15 / 15" | "15/15" | 15
    var m = s.match(/(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/);
    if (m) return m[1].replace(",", ".") + "/" + m[2].replace(",", ".");
    if (!isNaN(Number(s))) return Number(s) + "/" + MAX_POINTS;

    if (wantEmail && rowEmail === wantEmail) break;
  }
  return "";
}
```

Po udanym Run w logu: `jmiedzinska859@gmail.com 15/15 → 201 …` → odśwież `/admin/rekrutacja`.
