# Jahrescontent‑Kalender

Dieses Repository enthält die Quelltexte des **Jahrescontent‑Kalenders**, eines webbasierten Werkzeugs zur Jahresplanung von Inhalten. Es ist vollständig clientseitig umgesetzt und speichert alle Daten im Browser‐Speicher (mit Fallback auf ein In‑Memory‑Store). Die Anwendung orientiert sich gestalterisch am modularen Drei‑Spalten‑Layout aus dem mitgelieferten Mockup.

## Projektaufbau

* **index.html** – Die HTML‑Grundstruktur mit einem fixen Kopfbereich, einer Navigationsleiste, dem Arbeitsbereich, einem Informationspanel, einem Editor‑Drawer und einem Modal zur Anzeige von Übersichten. Der Kalender selbst wird dynamisch in das Element `#calendar` eingefügt.
* **styles.css** – Enthält alle Gestaltungsvorgaben. Farben und Abstände sind über CSS‑Variablen konfigurierbar; drei Themes (hell, dunkel, kontrast) sowie vier Akzentpaletten (blau, grün, violett, rot) sind vordefiniert. Die Layout‑Definition realisiert eine dreigeteilte Oberfläche, die sich responsiv an kleinere Bildschirme anpasst. Jedes Monatsmodul erhält zur besseren Orientierung einen individuellen Farbrahmen und eine sanft eingefärbte Kopfzeile; diese Akzentfarben orientieren sich am mitgelieferten Mockup `LAYOUT.png`.
  Die dunkle Standarddarstellung orientiert sich farblich am Mockup: ein tiefblauer Hintergrund, leicht abgesetzte Panels und farbige Akzentrahmen sorgen für gute Sichtbarkeit und hohe Kontraste.
  Für die professionelle Version wurde die Darstellung weiter verfeinert: die Tage sind höher, um Raum für eine To‑Do‑Vorschau zu schaffen; das „Max“‑Symbol in den Monatsüberschriften vergrößert den ausgewählten Monat und blendet die übrigen Monate aus; die To‑Do‑Badges nutzen die Akzentfarbe und werden direkt in der Tageskachel angezeigt. Bei allen Elementen achten wir auf ausreichend hohen Kontrast: Nach den WCAG‑Richtlinien muss der Kontrast zwischen Text und Hintergrund mindestens 4,5 : 1 betragen (bzw. 3 : 1 für große Schrift【49846733074050†L40-L46】) und grafische Icons sollen einen Kontrast von mindestens 3 : 1 zu ihrer Umgebung aufweisen【870339551967733†L29-L40】.
* **app.js** – Kernlogik der Anwendung. Kapselt den Zustand (Jahr, Einträge, Logs, Einstellungen), rendert den Kalender und das Dashboard, pflegt die Eingabeformulare des Drawers und kümmert sich um das Speichern, Laden und Exportieren der Daten. Ein Self‑Check stellt beim Laden des Zustands Inkonsistenzen fest und repariert sie. Die Speicherfunktionen verwenden bei fehlenden Zugriffsrechten auf `localStorage` automatisch ein Fallback.
  Im Profimodus werden zusätzliche Komfortfunktionen bereitgestellt: Jedes Tagesfeld zeigt neben dem Haupttitel eine Vorschau der offenen To‑Dos, und im Dashboard können die nächsten To‑Dos übersichtlich verfolgt werden. Die „Max“‑Schaltfläche eines Monats blendet alle anderen Monate aus und maximiert den gewählten Monat über die volle Breite. Der Debug‑Bereich erlaubt interaktive Einstellungen (z. B. automatisches Backup ein/aus) und führt einen Selbstheilungs‑Check durch, der redundante oder fehlerhafte Daten bereinigt. Alle Bearbeitungen werden erst beim Verlassen des Eingabefeldes gespeichert, damit Nutzer unbeabsichtigtes Springen während der Eingabe vermeiden.
* **Debug‑Modul** – Über die Schaltfläche „Debug“ in der Navigationsleiste erreichst du ein Diagnosefenster. Dieses zeigt Speicherstatus und Speichergröße an, führt einen Self‑Check aus, exportiert das Ereignislog, setzt den Speicher zurück und steuert das automatische Backup (Autosave).
* **README.md** – Diese Datei; beschreibt Aufbau und Entwicklungsaspekte.
* **ANLEITUNG.md** – Anwenderhandbuch mit einer Schritt‑für‑Schritt‑Erklärung der Funktionen.

## Schnellstart

1. Öffne `index.html` in einem modernen Browser (aktuelle Versionen von Chrome, Firefox oder Edge). Es ist keine Serverinstallation erforderlich, da alle Ressourcen lokal geladen werden.
2. Wähle im linken Navigationsbereich **Kalender**, **Einstellungen** oder **Hilfe** aus. Standardmäßig öffnet sich der Kalender.
3. Trage im Kalender per Klick auf einen Tag deine Inhalte ein. Es öffnet sich ein Editor‑Drawer, in dem du Titel, zusätzliche Titel, Beschreibungstexte, Tags und To‑Dos erfassen kannst. Die Texte deiner To‑Dos werden als Vorschau direkt in der Tageskachel angezeigt, sodass du wichtige Aufgaben schon in der Monatsansicht siehst.
4. Alle Änderungen werden automatisch gespeichert (sobald du das Feld verlässt oder den Drawer schließt). Über das Statusfeld im Kopfbereich wirst du über den Speichervorgang informiert. Zusätzlich wird ein automatisches Backup angelegt, sobald die Seite fünf Minuten geöffnet ist.
5. Nutze das rechte Info‑Panel (Dashboard) zur Übersicht freier Tage, anstehender To‑Dos, persönlicher Notizen und Ereignislogs. Hier findest du auch Buttons zum Exportieren offener Tage und des aktuellen Monats.
6. Unter **Einstellungen** kannst du das Jahr anpassen, zwischen den Themes wechseln, die Akzentfarbe ändern sowie die Textgröße festlegen. Die gewählten Einstellungen werden zusammen mit deinen Daten gespeichert.
7. Im Bereich **Debug** kannst du einen Self‑Check ausführen, das Log exportieren, den gespeicherten Zustand zurücksetzen oder das automatische Backup deaktivieren/aktivieren. Der Speicherstatus (Browser oder Fallback) sowie die Größe deines Datensatzes werden hier angezeigt.

## Entwicklungshinweise

* Die Kalenderansicht ist vollständig dynamisch. Beim Wechsel des Jahres wird das Raster neu aufgebaut. Der aktuelle Monat wird, falls das ausgewählte Jahr dem realen Jahr entspricht, an den Anfang gesetzt.
* Für persistente Daten werden die Schlüssel `provoware_calendar_state`, `provoware_theme`, `provoware_fs` und `provoware_palette` im `localStorage` verwendet. Fällt der Zugriff aus (z. B. im Inkognito‑Modus), landen die Daten im Fallback‑Objekt.
* Das automatische Backup wird unter `provoware_calendar_backup` abgelegt, sofern noch keines existiert. Dieses Backup dient lediglich der Wiederherstellung innerhalb desselben Browsers; es wird nicht heruntergeladen.
* Für externe Exporte werden die Inhalte in Text‑Dateien zusammengeführt und über einen Blob zum Download bereitgestellt.
* Die Anwendung ist für die Erweiterung mit weiteren Moduleinträgen in der Navigationsleiste vorbereitet. Weitere Sektionen können durch Hinzufügen eines neuen `<section>`‑Elements mit der Klasse `module` und eine entsprechende Navigationstaste integriert werden.

## Lizenz

Dieses Projekt wird ohne explizite Lizenz zur Verfügung gestellt. Es steht dem Benutzer frei, die Dateien anzupassen und für eigene Zwecke zu verwenden.