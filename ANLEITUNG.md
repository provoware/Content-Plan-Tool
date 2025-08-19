# Anwenderhandbuch – Jahrescontent‑Kalender

Dieses Dokument erläutert die Verwendung des **Jahrescontent‑Kalenders** Schritt für Schritt. Die Anwendung unterstützt dich bei der Jahresplanung deiner Inhalte und bietet zahlreiche Komfortfunktionen wie farbliche Hervorhebungen, To‑Dos und flexible Exporte.

## 1 – Navigation und Aufbau

Die Oberfläche ist in drei Spalten unterteilt:

1. **Navigationsleiste (links)** – Über die Schaltflächen gelangst du zu den Bereichen **Kalender**, **Einstellungen** und **Hilfe**. Unten findest du Buttons für **Backup** (JSON‑Export) und **Abmelden** (Daten zurücksetzen).
   Zusätzlich gibt es einen Bereich **Debug**. In diesem Diagnosebereich kannst du den Zustand überprüfen (Self‑Check), das Ereignislog exportieren, den Speicher zurücksetzen und das automatische Backup ein‑ oder ausschalten.
2. **Arbeitsbereich (Mitte)** – Hier wird je nach Auswahl der entsprechende Inhalt angezeigt. Standardmäßig ist der Kalender aktiv.
3. **Info‑Panel (rechts)** – Dieses Panel zeigt das Dashboard mit Statistiken zum aktuellen Monat, eine Liste offener Tage, anstehende To‑Dos, deine persönlichen Notizen, das Ereignislog und eine kleine Tippsektion.

Am oberen Rand befindet sich ein fester **Kopfbereich** mit einem Navigations‑Toggle (nur auf kleinen Bildschirmen sichtbar), dem Titel der Anwendung und einer Statusanzeige. Die Statusanzeige informiert dich über den Speichervorgang, Backups oder andere Systemmeldungen.

Beim ersten Drücken der <kbd>Tab</kbd>-Taste erscheint ein versteckter Link „Zum Inhalt springen“, mit dem du direkt in den Hauptbereich springen kannst.

**Hinweis zum Design:** Die Farbauswahl orientiert sich am mitgelieferten Mockup (LAYOUT.png). Das dunkle Standard‑Theme verwendet ein tiefblaues Grundlayout, helle Beschriftungen und farbige Akzentrahmen. Jedes Monatsmodul besitzt einen individuellen Farbrahmen und eine dezent getönte Überschrift – so lässt sich der Kalender auf einen Blick strukturieren. Du kannst jederzeit auf ein helles oder kontrastreiches Farbschema umschalten und die Akzentfarben variieren.

## 2 – Kalender verwenden

1. **Jahr auswählen:** Über das Menü **Einstellungen** kannst du das gewünschte Jahr festlegen. Die Monate werden automatisch angepasst, wobei der aktuelle Monat (falls im gleichen Jahr) immer oben steht.
2. **Tage bearbeiten:** Klicke im Kalender auf einen Tag. Es öffnet sich rechts ein Editor‑Drawer. Dort kannst du folgende Angaben machen:
   - **Titel (Haupt):** Kurze Überschrift des Inhalts.
   - **Zusätzliche Titel:** Beliebig viele weitere Überschriften. Mit „+ Titel“ lässt sich ein Feld hinzufügen, mit „–“ entfernen.
   - **Beschreibung:** Ausführlicher Text, Links oder Notizen.
   - **Tags:** Komma‑separierte Schlagwörter zur Kategorisierung.
   - **To‑Dos:** Aufgabenliste für diesen Tag. Neue Einträge fügst du mit „+ To‑Do“ hinzu, erledigte To‑Dos haken ab. Der Zähler (offen/erledigt) erscheint in der Tageskachel, und die Titel deiner To‑Dos werden direkt als Vorschau in der Tageskachel angezeigt, damit du geplante Aufgaben auf einen Blick erkennst.
3. **Speichern:** Änderungen werden automatisch beim Verlassen des Eingabefeldes oder Schließen des Drawers gespeichert. Du kannst zusätzlich mit <kbd>S</kbd> eine manuelle Speicherung auslösen.
4. **Markierungen:** Freie Tage sind rot hinterlegt, belegte Tage grün. Heute wird mit einem gelben Rahmen markiert. Der Zähler in der Ecke zeigt offene/erledigte To‑Dos.
5. **Monate maximieren:** Über „Max“ vergrößerst du einen Monat. In der Profiversion wird der ausgewählte Monat allein angezeigt und belegt die gesamte Breite der Kalenderansicht; alle anderen Monate werden ausgeblendet, sodass du dich auf diesen Abschnitt konzentrieren kannst. Ein weiterer Klick auf „Max“ stellt die normale Ansicht wieder her. „Vollbild“ schaltet den Monat in einen eigenen Vollbildmodus; mit erneutem Klick, der Taste <kbd>Esc</kbd> oder dem Tastenkürzel <kbd>Strg</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> verlässt du ihn. Unterstützt dein Browser die Vollbild‑Technik nicht, simuliert die Anwendung den Modus als Fallback und meldet dies in der Statuszeile.
6. **Übersichten:** „Info“ öffnet eine tabellarische Monatsübersicht. Im Kopfbereich des Kalenders findest du Buttons für Jahres‑ und Monatsübersichten, PDF‑Druck und Text‑Export.

## 3 – Dashboard nutzen

Das Dashboard im rechten Panel bietet folgende Informationen und Funktionen:

* **Datum und Uhrzeit:** Oben zeigt eine Live-Uhr aktuelle Werte. Ein Klick kopiert die Anzeige in die Zwischenablage (Clipboard). Falls dein Browser das automatische Kopieren nicht unterstützt, wird der Text markiert, damit du ihn mit <kbd>Strg</kbd>+<kbd>C</kbd> kopieren kannst. Über den danebenstehenden Knopf „24 h/12 h" lässt sich das Zeitformat umstellen.
* **Aktueller Monat:** Anzeige des Monatsnamens, Anzahl freier und belegter Tage sowie eine Legende für die Farbkennzeichnung.
* **Offene Datumsangaben:** Liste aller freien Tage im aktuellen Monat. Mit einem Klick springst du direkt zum ausgewählten Tag im Kalender.
* **Export:** Buttons zum Export der offenen Tage und des aktuellen Monats als Textdatei.
* **Nächste To‑Dos:** Zeigt die kommenden offenen Aufgaben aus dem gesamten Jahr. Ein Klick öffnet den entsprechenden Tag.
* **Notizen:** Ein freies Textfeld für deine eigenen Gedanken. Die Notizen werden beim Verlassen des Feldes gespeichert und bleiben browserseitig erhalten.
* **Letzte Ereignisse:** Protokolliert Aktionen wie Änderungen, Exporte oder Backups. Das Log lässt sich leeren. Über „Duplikate prüfen“ kannst du nach doppelt verwendeten Titeln suchen; das Ergebnis wird als Textdatei exportiert.
* **Tipps:** Zusammenfassung der wichtigsten Tastenkürzel und Hinweise zur Bedienung.

## 4 – Einstellungen anpassen

Im Bereich **Einstellungen** stehen dir folgende Optionen zur Verfügung:

| Einstellung      | Beschreibung                                          |
|-----------------|--------------------------------------------------------|
| Jahr            | Wählt das Kalenderjahr aus (±3 Jahre um das aktuelle).|
| Theme           | Drei Farbschemata: Hell, Dunkel und Kontrast. Beim ersten Start richtet sich die Auswahl nach deinem System (hell oder dunkel). |
| Akzentfarbe     | Blau, Grün, Violett oder Rot. Beeinflusst Highlights. |
| Textgröße       | Vier Skalierungen von 100 % bis 137 %.                 |
| Daten löschen   | Setzt alle Einträge und Einstellungen zurück.         |

Die Einstellungen werden sofort angewandt und gespeichert. Sollte dein Browser keinen Zugriff auf `localStorage` erlauben (z. B. im privaten Modus), greift ein In‑Memory‑Fallback; die Daten gehen dann jedoch beim Schließen des Fensters verloren.

## 5 – Tastenkürzel

| Kombination | Wirkung                                                 |
|-------------|---------------------------------------------------------|
| <kbd>T</kbd> | Springt zum heutigen Datum und öffnet den Editor.        |
| <kbd>F</kbd> | Springt zum nächsten freien Tag und öffnet den Editor.    |
| <kbd>S</kbd> | Speichert den aktuellen Zustand manuell.                 |
| <kbd>Strg</kbd>/<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> | Vollbild für den aktuellen Monat umschalten. |
| <kbd>Strg</kbd>/<kbd>Cmd</kbd>+<kbd>Z</kbd> | Letzte Aktion rückgängig (Undo ↶). |
| <kbd>Strg</kbd>/<kbd>Cmd</kbd>+<kbd>Y</kbd> | Rückgängig gemachte Aktion wiederholen (Redo ↷). |
| <kbd>Esc</kbd> | Schließt geöffnete Dialoge (Drawer oder Übersicht).      |

Die Tastenkürzel sind deaktiviert, solange du dich in einem Eingabefeld befindest, damit sie nicht versehentlich ausgelöst werden.

Die Buttons ↶ Undo und ↷ Redo findest du im Bereich „Debug“. Sie sind grau, solange kein Verlauf vorhanden ist.

## 6 – Export und Import

* **Backup (JSON):** Über die Schaltfläche „Backup“ in der Navigationsleiste kannst du einen JSON‑Dump deiner Daten herunterladen. Dieser enthält alle Jahreseinträge und Einstellungen.
* **Text‑Exporte:** Offene Tage, Monats‑ oder Jahresübersichten lassen sich als `.txt` herunterladen. Der Export erfolgt in einer strukturierten Listenform.
* **PDF‑Export:** Tabellenübersichten können über den „PDF“‑Button im Übersichtsdialog gedruckt oder als PDF gespeichert werden.

Ein direkter Import per Datei ist momentan nicht vorgesehen. Du kannst jedoch ein zuvor heruntergeladenes JSON manuell in den `localStorage` laden, indem du es im Entwicklerwerkzeug deines Browsers unter dem Schlüssel `provoware_calendar_state` speicherst.

## 7 – Fehlerbehandlung und Selbstheilung

Die Anwendung überprüft beim Laden automatisch den Zustand der gespeicherten Daten. Fehlende Felder werden repariert, und Inkonsistenzen werden im Ereignislog protokolliert. Speicherfehler durch volles oder nicht verfügbares `localStorage` werden abgefangen; in diesem Fall arbeitet das Tool intern weiter, weist jedoch darauf hin, dass die Daten möglicherweise verloren gehen. Beachte die Statusanzeige im Kopfbereich.

## 8 – Barrierefreiheit und Benutzerfreundlichkeit

* **Kontraste:** Alle Themes erfüllen die WCAG‑Kontrastkriterien. Buttons und interaktive Elemente besitzen gut sichtbare Fokusrahmen.
* **Schriftgrößen:** Wähle unter Einstellungen die für dich passende Textgröße. Große Tageszahlen erleichtern das Lesen.
* **Responsive Design:** Auf kleineren Bildschirmen fährt die Navigationsleiste ein; das Info‑Panel wird ausgeblendet, um Platz zu sparen.
* **Klar beschriftete Bereiche:** Jede Sektion verfügt über eine Überschrift, und Formulare sind mit Labels versehen. Tooltips erklären Funktionen.
* **Reduzierte Bewegung:** Wenn dein System „Weniger Bewegung“ vorgibt, werden Animationen und Übergänge abgeschaltet.

Wir wünschen dir viel Erfolg bei der Planung deiner Inhalte mit dem Jahrescontent‑Kalender!

## 9 – Automatische Startroutine

Mit `npm start` führst du eine Startroutine aus. Diese prüft die Node‑Version, installiert bei Bedarf fehlende Abhängigkeiten (Pakete) und startet anschließende Tests. Alle Schritte werden im Terminal beschrieben. Fehler werden abgefangen und automatisch repariert, soweit möglich.
