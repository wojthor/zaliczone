# Google Apps Script — rekrutacja Zaliczone (CheckboxGrid → required_tests)

## Checklist produkcji

1. **Vercel → Settings → Environment Variables** — dodaj `GOOGLE_FORMS_WEBHOOK_SECRET` (Production) z tą samą wartością co w `.env.local`. Bez tego endpoint przyjmuje każde żądanie.
2. Redeploy po dodaniu zmiennej (albo „Redeploy” ostatniego deploymentu).
3. W Apps Script ustaw:
   - `WEBHOOK_URL = "https://www.zaliczone.edu.pl/api/webhooks/google-forms"`
   - `WEBHOOK_SECRET` = ta sama wartość co env
4. Trigger: **From form** → `onFormSubmit` (formularz główny + każdy quiz Biologii itd.).
5. Smoke: wyślij testowe zgłoszenie → kandydat w `/admin/rekrutacja`; wynik quizu → `test_results`.

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

Ustaw `TEST_SUBJECT` i `TEST_LEVEL` w każdym quizie (zgodnie z najwyższym poziomem z `required_tests`).

```javascript
/** @OnlyCurrentDoc */
var WEBHOOK_URL = "https://www.zaliczone.edu.pl/api/webhooks/google-forms";
var WEBHOOK_SECRET = "ZMIEŃ_NA_SEKRET"; // = GOOGLE_FORMS_WEBHOOK_SECRET z Vercel
var TEST_SUBJECT = "Biologia";
var TEST_LEVEL = "Szkoła średnia - poziom rozszerzony"; // dopasuj do tego quizu
var MAX_POINTS = 20;

function onFormSubmit(e) {
  var r = e.response;
  var email = "";
  try { email = r.getRespondentEmail() || ""; } catch (_) {}

  var score = "";
  try { score = String(r.getScore()); } catch (_) {}
  if (score && score.indexOf("/") === -1) score = score + "/" + MAX_POINTS;

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    payload: JSON.stringify({
      type: "TEST_RESULT",
      email: String(email).toLowerCase().trim(),
      subject: TEST_SUBJECT,
      level: TEST_LEVEL,
      score: score,
    }),
    muteHttpExceptions: true,
  });
}
```
