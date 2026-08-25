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

Ustaw `TEST_SUBJECT` i `TEST_LEVEL` w każdym quizie.

**Już wypełnione odpowiedzi:** wklej cały skrypt poniżej → zapisz → zaznacz funkcję `backfillExistingTestResults` → **Run** (jednorazowo). To wyśle do panelu wszystkie dotychczasowe odpowiedzi z tego Forms (np. Julię). Potem `onFormSubmit` łapie tylko nowe.

```javascript
/** @OnlyCurrentDoc */
var WEBHOOK_URL = "https://www.zaliczone.edu.pl/api/webhooks/google-forms";
var WEBHOOK_SECRET = "ZMIEŃ_NA_SEKRET"; // = GOOGLE_FORMS_WEBHOOK_SECRET z Vercel
var TEST_SUBJECT = "Biologia";
var TEST_LEVEL = "Szkoła średnia - poziom rozszerzony"; // dopasuj do tego quizu
var MAX_POINTS = 15; // max punktów w tym quizie (u Julii 15/15)

function onFormSubmit(e) {
  postTestResult(e.response);
}

/** Uruchom ręcznie raz: Run → backfillExistingTestResults */
function backfillExistingTestResults() {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  Logger.log("Backfill: " + responses.length + " odpowiedzi");
  for (var i = 0; i < responses.length; i++) {
    postTestResult(responses[i]);
    Utilities.sleep(200);
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

  // getScore() bywa null, gdy quiz nie „zwalnia” ocen od razu — sumujemy punkty z pytań.
  var points = null;
  try {
    var raw = r.getScore();
    Logger.log("raw getScore=" + raw + " (type " + typeof raw + ")");
    if (raw !== null && raw !== undefined && raw !== "") points = Number(raw);
  } catch (err) {
    Logger.log("getScore error: " + err);
  }
  if (points === null || isNaN(points)) {
    points = 0;
    var gotAny = false;
    try {
      var graded = r.getGradableItemResponses();
      for (var g = 0; g < graded.length; g++) {
        var ps = graded[g].getScore();
        Logger.log("item score[" + g + "]=" + ps);
        if (ps !== null && ps !== undefined && ps !== "") {
          points += Number(ps);
          gotAny = true;
        }
      }
    } catch (err2) {
      Logger.log("gradable error: " + err2);
    }
    if (!gotAny) points = null;
  }

  var score = "";
  if (points !== null && !isNaN(points)) {
    score = String(points) + "/" + MAX_POINTS;
  }

  var fullName = ans("Imię i nazwisko") || ans("Imię") || "";

  if (!email || email.indexOf("@") === -1) {
    Logger.log("SKIP brak email id=" + r.getId());
    return;
  }
  if (!score) {
    Logger.log(
      "SKIP brak score email=" + email +
        " — w Forms: Ustawienia → Quizy → Zwolnij oceny: Natychmiast po przesłaniu, potem Run ponownie."
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
```

Po Run: **Executions** → logi typu `jmiedzinska859@gmail.com 15/15 → 201 …`. Odśwież `/admin/rekrutacja`.
