# Google Apps Script — rekrutacja Zaliczone (CheckboxGrid → required_tests)

## Checklist produkcji

1. **Vercel → Settings → Environment Variables** — dodaj `GOOGLE_FORMS_WEBHOOK_SECRET` (Production) z tą samą wartością co w `.env.local`. Bez tego endpoint przyjmuje każde żądanie.
2. Redeploy po dodaniu zmiennej (albo „Redeploy” ostatniego deploymentu).
3. W Apps Script ustaw:
   - `WEBHOOK_URL = "https://www.zaliczone.edu.pl/api/webhooks/google-forms"`
   - `WEBHOOK_SECRET` = ta sama wartość co env
4. Trigger: **From form** → `onFormSubmit` (formularz główny + każdy quiz Biologii itd.).
5. Smoke: wyślij testowe zgłoszenie → kandydat w `/admin/rekrutacja`; wynik quizu → `test_results`.

**Kolejność:** Formularz rekrutacyjny (APPLICATION) → karta w panelu + podpowiedź testów → checkbox „wysłane” → wyniki quizów (TEST_RESULT) dopinają się do **tej samej** karty (ten sam e-mail). Sam test bez zgłoszenia **nie** tworzy karty.

## Logika najwyższego poziomu

Kandydat zaznacza w **siatce** (CheckboxGrid) poziomy **per przedmiot**.  
**Na każdy przedmiot idzie tylko jeden test** — z najwyższego zaznaczonego poziomu dla tego przedmiotu.

Kolejność (rosnąco):
1. Szkoła podstawowa  
2. Szkoła średnia - poziom podstawowy  
3. Szkoła średnia - poziom rozszerzony  
4. Matura / Matura - poziom podstawowy / Matura - poziom rozszerzony  

**Ważne:** nie używaj osobnych pytań „Jakiego przedmiotu…” + „Na jakim poziomie…” jako głównego źródła — wtedy ten sam najwyższy poziom leci na *wszystkie* przedmioty (błąd typu: Chemia SP + Biologia ROZ → obie ROZ albo obie SP).

## A) Formularz główny (APPLICATION)

Flow: **najpierw to zgłoszenie** tworzy kartę w `/admin/rekrutacja`. Testy dopinasz później.

Pytanie kluczowe (tytuł 1:1 jak w Forms):
- `Przedmioty i poziomy` — **CheckboxGrid** (wiersze = przedmioty, kolumny = poziomy)

W bazie zapisujemy **wszystkie** zaznaczenia (do podglądu), a panel podpowiada **jeden test na przedmiot** (najwyższy poziom).

**Już wypełnione zgłoszenia:** wklej skrypt → Run → **`backfillExistingApplications`** (raz). Potem `onFormSubmit` łapie tylko nowe.

```javascript
/** @OnlyCurrentDoc */
var WEBHOOK_URL = "https://www.zaliczone.edu.pl/api/webhooks/google-forms";
var WEBHOOK_SECRET = "ZMIEŃ_NA_SEKRET"; // = GOOGLE_FORMS_WEBHOOK_SECRET z Vercel

var LEVEL_RANK = {
  "szkola podstawowa": 1,
  "szkola srednia poziom podstawowy": 2,
  "szkola srednia poziom rozszerzony": 3,
  "matura": 4,
  "matura poziom podstawowy": 4,
  "matura poziom rozszerzony": 5,
};

function onFormSubmit(e) {
  try {
    postApplication(e.response);
  } catch (err) {
    console.error(err);
  }
}

/** Run → backfillExistingApplications — jednorazowo importuje już wypełnione zgłoszenia. */
function backfillExistingApplications() {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  Logger.log("Backfill APPLICATION: " + responses.length + " odpowiedzi");
  for (var i = 0; i < responses.length; i++) {
    postApplication(responses[i]);
    Utilities.sleep(250);
  }
  Logger.log("Backfill APPLICATION done");
}

function postApplication(r) {
  var data = buildApplicationDataFromResponse(r);
  if (!data.email || data.email.indexOf("@") === -1) {
    Logger.log("SKIP brak email id=" + r.getId());
    return;
  }
  if (!data.full_name) {
    Logger.log("SKIP brak imienia email=" + data.email);
    return;
  }
  if (!data.required_tests || data.required_tests.length === 0) {
    Logger.log("SKIP brak przedmiotów/poziomów email=" + data.email);
    return;
  }
  var res = postJson({ type: "APPLICATION", data: data });
  Logger.log(data.email + " → " + res.getResponseCode() + " " + res.getContentText());
}

function buildApplicationDataFromResponse(r) {
  function ans(title) {
    var items = r.getItemResponses();
    for (var i = 0; i < items.length; i++) {
      if (items[i].getItem().getTitle() === title) {
        var resp = items[i].getResponse();
        return Array.isArray(resp) ? resp : (resp && typeof resp === "object" ? resp : String(resp || "").trim());
      }
    }
    return "";
  }

  // 1) CheckboxGrid — poziomy PER przedmiot (właściwe źródło)
  var requiredTests = allLevelsPerSubject(ans("Przedmioty i poziomy"));
  if (requiredTests.length === 0) {
    requiredTests = allLevelsPerSubject(ans("Jakich przedmiotów i na jakim poziomie chcesz uczyć?"));
  }

  // 2) Ostateczność: dwa osobne pytania (ten sam najwyższy poziom na wszystkie — niedokładne)
  if (requiredTests.length === 0) {
    var subjects = toList(ans("Jakiego przedmiotu chcesz uczyć?"));
    var levels = toList(ans("Na jakim poziomie chcesz udzielać korepetycji?"));
    requiredTests = buildRequiredTestsSameLevel(subjects, levels);
  }

  var first = String(ans("Imię") || "");
  var last = String(ans("Nazwisko") || "");
  var fullName = String(ans("Imię i nazwisko") || "").trim() || (first + " " + last).trim();

  var email = "";
  try { email = r.getRespondentEmail() || ""; } catch (_) {}
  if (!email) email = String(ans("E-mail") || ans("Adres e-mail") || "");

  var offerings = {};
  requiredTests.forEach(function (t) {
    if (!offerings[t.subject]) offerings[t.subject] = [];
    if (offerings[t.subject].indexOf(t.level) === -1) offerings[t.subject].push(t.level);
  });

  return {
    full_name: fullName,
    email: String(email).toLowerCase().trim(),
    phone: String(ans("Telefon") || ""),
    dob: String(ans("Data urodzenia") || ""),
    student_status: /tak|yes/i.test(String(
      ans("Czy jesteś studentem?") ||
      ans("Czy jesteś studentem/studentką?") ||
      ans("Status studenta") ||
      ""
    )),
    university: String(ans("Nazwa i adres uczelni") || ans("Uczelnia") || ""),
    experience: /tak|yes/i.test(String(ans("Doświadczenie") || ans("Czy masz doświadczenie?") || ans("Czy masz doświadczenie w nauczaniu?") || "")),
    offerings: offerings,
    required_tests: requiredTests,
    levels: Object.keys(offerings).map(function (s) {
      return s + ": " + offerings[s].join(", ");
    }).join("; "),
    hours_per_week: String(
      ans("Ile godzin tygodniowo?") ||
      ans("Ile godzin tygodniowo chcesz pracować?") ||
      ans("Ile godzin w tygodniu?") ||
      ans("Dostępność godzinowa") ||
      ""
    ),
    cv_url: String(ans("CV") || ans("Link do CV") || ""),
  };
}

function toList(v) {
  if (Array.isArray(v)) return v.map(function (x) { return String(x || "").trim(); }).filter(Boolean);
  var s = String(v || "").trim();
  if (!s) return [];
  return s.split(/[,;\n|]+/).map(function (x) { return x.trim(); }).filter(Boolean);
}

function normKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ą/g, "a").replace(/ć/g, "c").replace(/ę/g, "e")
    .replace(/ł/g, "l").replace(/ń/g, "n").replace(/ó/g, "o")
    .replace(/ś/g, "s").replace(/ź/g, "z").replace(/ż/g, "z")
    .replace(/[()]/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levelRank(level) {
  return LEVEL_RANK[normKey(level)] || 0;
}

function pickHighestLevel(levels) {
  var best = "";
  var bestRank = -1;
  levels.forEach(function (level) {
    var rank = levelRank(level);
    if (rank > bestRank) {
      best = level;
      bestRank = rank;
    }
  });
  return best;
}

/** Wszystkie zaznaczenia z siatki (wiele poziomów na przedmiot). */
function allLevelsPerSubject(grid) {
  var map = {};
  function consider(subject, level) {
    subject = String(subject || "").trim();
    level = String(level || "").trim();
    if (!subject || !level) return;
    // Forms często zwraca "SP,SS pp,SS roz" jako JEDEN string — rozbijamy.
    var parts = level.split(/[,;|]+/);
    if (parts.length > 1) {
      parts.forEach(function (p) { consider(subject, p); });
      return;
    }
    if (!map[subject]) map[subject] = {};
    map[subject][level] = true;
  }
  if (grid && typeof grid === "object" && !Array.isArray(grid)) {
    Object.keys(grid).forEach(function (subject) {
      var levels = grid[subject];
      if (Array.isArray(levels)) levels.forEach(function (lvl) { consider(subject, lvl); });
      else consider(subject, levels);
    });
  } else if (Array.isArray(grid)) {
    grid.forEach(function (row) {
      var m = String(row).match(/^(.+?)\s*\[(.+)\]\s*$/);
      if (m) consider(m[1], m[2]);
    });
  }
  var out = [];
  Object.keys(map).forEach(function (subject) {
    Object.keys(map[subject]).forEach(function (level) {
      out.push({ subject: subject, level: level });
    });
  });
  return out;
}

/** Fallback: jeden wspólny najwyższy poziom na wszystkie przedmioty. */
function buildRequiredTestsSameLevel(subjects, levels) {
  var highest = pickHighestLevel(levels);
  var out = [];
  var seen = {};
  subjects.forEach(function (subject) {
    subject = String(subject || "").trim();
    if (!subject || !highest || seen[subject.toLowerCase()]) return;
    seen[subject.toLowerCase()] = true;
    out.push({ subject: subject, level: highest });
  });
  return out;
}

function postJson(payload) {
  return UrlFetchApp.fetch(WEBHOOK_URL, {
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
var TEST_SUBJECT = "Biologia"; // zmień per Forms
var TEST_LEVEL = "Szkoła średnia - poziom rozszerzony"; // zmień per Forms
var MAX_POINTS = 15; // max punktów w tym quizie

function onFormSubmit(e) {
  // Nie uruchamiaj z menu Run — tylko trigger Forms. Do importu starych: backfillExistingTestResults.
  if (!e || !e.response) {
    Logger.log("SKIP: uruchom backfillExistingTestResults (nie onFormSubmit z edytora).");
    return;
  }
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

Webhook zapisuje **każdy** wynik jako osobną pozycję `(przedmiot + poziom)`. Jeśli ktoś zrobił matmę rozszerzoną, a potem dostał podstawową — w profilu widać **oba** wyniki.
Po udanym Run w logu: `jmiedzinska859@gmail.com 15/15 → 201 …` → odśwież `/admin/rekrutacja`.
