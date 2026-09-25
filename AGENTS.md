#AGENTS.md
-Optimiere in jeder Iteration einen Aspekt der Nutzerfreundlichkeit
-Optimiere in jeder Iteration einen Aspekt der GUI und grafischen Aspekte
-aktuallisiere in jeder Iteration einen Fortschritts.txt mit angabe einer Prozentzahl der fertigstellung
-implementiere hilfreiches element, funktion oder verbesserung, oder option im tool um laienoptimierung zu perfektionieren.
-verstehe und implementiere für diesen perfektes hilfreicheselement oder feature.
-Ist jede Funktion auf erfolg und konsistenz geprüft?
-Gibt es schwachstellen, oder fehler?

---

## PROVOWARE GLOBAL DEVELOPMENT CONTRACT

Dieser globale Kern gilt zusätzlich zu den projektspezifischen Regeln. Bei Sicherheits- oder Nachvollziehbarkeitskonflikten hat er Vorrang; lokale Regeln dürfen ihn verschärfen, nicht stillschweigend abschwächen.

- **Frozen Current Plan:** Laufenden freigegebenen Plan nicht durch neue Ideen erweitern; Neues in die nächste Iteration einordnen.
- **Conflict Gate:** Unterbrechen nur bei nachgewiesenem Konflikt mit Planvoraussetzung, Sicherheit, Ausgangs-SHA, Scope oder Invariant.
- **Single Writer:** Pro produktivem Scope nur ein autorisierter Executor; Analyse/Planung/Prüfung dürfen parallel lesen.
- **SHA + Scope:** Vor Mutation HEAD und erlaubten/verbotenen Scope prüfen; keine stillen Nebenrefactorings.
- **Evidence:** Kein PASS ohne echten Test; Evidence muss zum geprüften HEAD gehören.
- **Controlled Evidence Lab:** Echte Mutationen, Fehler-Injektion und Recovery-Tests nur in isolierten Testbereichen; Produktivdaten bleiben geschützt.
- **Next Queue:** Neue Anforderungen/Findings append-only erfassen und Beziehungen wie BLOCKS, REQUIRES, SUPERSEDES, DUPLICATE oder CONFLICTS dokumentieren.
- **Statusklarheit:** OBSERVED/SUSPECTED/REPRODUCED/CONFIRMED/DISPROVED nicht vermischen.
- **Recovery Key:** Nach Abbruch oder Agentenwechsel müssen Stand, Ziel, Frozen Plan, Scope, Findings, Gates und nächster erlaubter Schritt ohne alten Chat rekonstruierbar sein.
- **Traceability:** Requirement/Decision → Finding → Plan → Change → Test/Evidence → Gate/Checkpoint nachvollziehbar halten.
- **Negativtests:** Schutzmechanismen absichtlich gegen falschen SHA, zweiten Writer, Scope-Verstoß und unbelegtes PASS testen.
- **Sichtbarer Fortschritt:** Längere Prüfungen mit Schritt, Fortschritt, Ergebnis und Ampelstatus darstellen.

Leitsatz: **Kein Agent muss sich erinnern. Kein Agent darf raten. Keine Änderung verliert ihren Ursprung. Kein PASS existiert ohne Evidence.**
