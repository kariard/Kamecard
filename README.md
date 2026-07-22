# KameCard

KameCard ist eine kostenlose, deutschsprachige Karteikarten-App für Browser. Decks,
Karten und Lernstände bleiben vollständig lokal im verwendeten Browser. Es gibt
kein Benutzerkonto, kein Backend, kein Tracking und keine externe KI-API.

Das MVP ist für Desktop und Smartphone ausgelegt und kann nach dem ersten
erfolgreichen Laden auch offline verwendet werden. Das Repository heißt
`Kamecard`; die Anwendung trägt den Namen **KameCard**.

## Funktionen

- Mehrere Decks anlegen, umbenennen und nach Bestätigung löschen
- Karten mit Unicode-Text auf Vorder- und Rückseite erstellen, bearbeiten und
  löschen
- Automatisches Beispielddeck „Japanisch – Vokale & K-Reihe“ beim ersten Start
- Lernrichtung wählen: Vorderseite → Rückseite, Rückseite → Vorderseite oder
  gemischt
- Vor der Session zwischen „Selbst bewerten“ und „Antwort eintippen“ wählen
- Antworten aufdecken und anschließend mit „Gewusst“ oder „Nicht gewusst“
  bewerten
- Eingetippte Antworten nachvollziehbar normalisieren, prüfen und mit der
  richtigen Lösung vergleichen
- Jede Karte zuerst einmal zeigen und anschließend adaptiv festigen
- Fehlerhafte und historisch schwächere Karten regelbasiert häufiger auswählen,
  ohne den Mindestabstand zwischen Wiederholungen aus dem Blick zu verlieren
- Lernfortschritt, Trefferzähler, Streak und Mastery-Level lokal speichern
- TXT- und TSV-Inhalte einfügen oder als UTF-8-Datei hochladen
- Ungültige Zeilen und Dubletten vor dem Import in einer Vorschau erkennen
- Anpassbaren KI-Importprompt kopieren – ohne Daten an einen Dienst zu senden
- Einzelne Decks sowie ein vollständiges, versioniertes JSON-Backup exportieren
- Vollständige Backups nach Prüfung und ausdrücklicher Bestätigung importieren
- Responsives, tastaturbedienbares Design mit sichtbaren Fokuszuständen
- Installierbares PWA-Manifest und Offline-Unterstützung über einen Service Worker

## Datenschutz und lokale Daten

KameCard speichert die Daten über eine Storage-Abstraktion im `localStorage` des
Browsers. Die App überträgt keine Karteninhalte an einen Server. Daten sind
deshalb an das jeweilige Browserprofil und Gerät gebunden. Das Löschen von
Website-Daten, ein privates Browserfenster oder manche automatische
Browserbereinigungen können sie entfernen.

Regelmäßige JSON-Backups sind empfehlenswert. Exportdateien enthalten die
Kartentexte und Lernstände im Klartext und sollten entsprechend sicher aufbewahrt
werden.

## Voraussetzungen

- Node.js 20.19 oder neuer (alternativ eine aktuelle Node.js-22-Version)
- npm
- ein moderner Browser mit aktiviertem JavaScript

## Installation

~~~bash
git clone <repository-url>
cd Kamecard
npm install
~~~

Wer das Repository bereits lokal geöffnet hat, führt nur `npm install` im
Repository-Root aus.

## Lokale Entwicklung

~~~bash
npm run dev
~~~

Vite zeigt anschließend die lokale Adresse im Terminal an. Aufgrund des für
GitHub Pages benötigten Basispfads ist die App üblicherweise unter
`http://localhost:5173/Kamecard/` erreichbar. Änderungen werden während der
Entwicklung automatisch neu geladen.

## Qualitätsprüfungen und Tests

~~~bash
npm run lint
npm run test
npm run build
~~~

Die wichtigsten verfügbaren Befehle:

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Lokalen Vite-Entwicklungsserver starten |
| `npm run lint` | TypeScript- und React-Code statisch mit ESLint prüfen |
| `npm run test` | Vitest-Tests einmalig ausführen |
| `npm run test:watch` | Vitest während der Entwicklung im Watch-Modus ausführen |
| `npm run build` | TypeScript prüfen und einen Produktionsbuild erstellen |

Die Logiktests decken insbesondere TSV-Parsing, ungültige Importzeilen,
Dublettenerkennung, die Lernwarteschlange, Mastery-Änderungen und
Backup-Validierung ab.

## Produktionsbuild

~~~bash
npm run build
~~~

Der statische Produktionsbuild landet in `dist/`. Vite ist für den
Repository-Pfad `/Kamecard/` konfiguriert; dadurch zeigen Asset- und
Service-Worker-Pfade auf GitHub Pages auf den richtigen Ort.

## Lernmodus und Antwortprüfung

Vor einer Session stehen zwei Antwortmethoden zur Wahl:

- **Selbst bewerten** ist die Standardmethode. Zuerst wird die Antwort
  aufgedeckt, danach bewertet der Nutzer sie mit „Gewusst“ oder „Nicht gewusst“.
- **Antwort eintippen** funktioniert für Vorderseite → Rückseite,
  Rückseite → Vorderseite und gemischte Sessions. Enter oder „Antwort prüfen“
  wertet die Eingabe aus. Anschließend zeigt KameCard eindeutig richtig oder
  falsch an; bei einer falschen Antwort bleiben die eigene Eingabe und die
  richtige Lösung sichtbar. Erst ein weiteres Enter oder „Nächste Karte“ führt
  weiter.

Für den Textvergleich normalisiert KameCard beide Antworten vorher:

1. Unicode wird mit NFKC normalisiert.
2. Leerraum am Anfang und Ende wird entfernt.
3. Mehrere aufeinanderfolgende Leerzeichen oder andere Whitespaces werden zu
   einem Leerzeichen zusammengefasst.
4. Groß- und Kleinschreibung wird nur bei lateinischen Zeichen ignoriert.

Die Prüfung erfindet bewusst keine Synonyme, Schreibvarianten oder Romaji. Eine
Alternative gilt nur dann als richtig, wenn sie nach diesen klaren Regeln mit
der gespeicherten Antwort übereinstimmt.

Jede Lernrunde beginnt mit einem garantierten ersten Durchgang, in dem jede
Karte genau einmal erscheint. Danach bleiben nur Karten aktiv, deren Rundenziel
noch nicht erreicht ist. Historisch starke Karten können nach einem direkten
Erfolg abgeschlossen sein; neue, unsichere oder in der Runde falsch
beantwortete Karten benötigen zwei richtige Versuche ohne dazwischenliegenden
Fehler. Fehler setzen diese korrekte Serie zurück.

Die adaptive Auswahl berücksichtigt Fehler der aktuellen Runde, die bisherige
Mastery und die historische Erfolgsquote. Im Normalfall liegen mindestens vier
andere Versuche zwischen Wiederholungen derselben Karte. Kleine Decks verwenden
einen sicheren Fallback, damit die Runde weder blockiert noch eine Karte direkt
wiederholt wird, solange eine Alternative aktiv ist. Bei gemischten Sessions
behält jede Karte ihre zu Beginn festgelegte Richtung bei allen Wiederholungen.

## Karten importieren

Im Importdialog kann Text direkt eingefügt oder eine `.txt`- bzw.
`.tsv`-Datei in UTF-8 ausgewählt werden.

Das Standardformat hat:

- genau eine Karte pro Zeile,
- Vorder- und Rückseite getrennt durch einen Tabulator,
- keine erforderliche Kopfzeile.

Beispiel (zwischen den Spalten steht jeweils ein echter Tabulator):

~~~text
あ	a
い	i
う	u
~~~

Falls eine Zeile keinen Tabulator enthält, wird auch `::` als Trennzeichen
akzeptiert:

~~~text
ありがとう::Danke
水::Wasser
~~~

Leere Zeilen werden ignoriert. Vor dem Speichern zeigt KameCard eine Vorschau.
Dabei werden ungültige Zeilen, Dubletten innerhalb des Imports und bereits im
Deck vorhandene identische Karten getrennt ausgewiesen. Fehlerhafte Zeilen
blockieren gültige Karten nicht.

### Optionaler KI-Ablauf

Der KI-Import ist eine manuelle Vorbereitungshilfe und keine KI-Integration:

1. Das vollständige Ausgangsmaterial bei einem beliebigen KI-Werkzeug einfügen
   oder als Datei hochladen.
2. In KameCard „KI-Importprompt kopieren“ wählen, die Felder für Vorder- und
   Rückseite bei Bedarf anpassen und den Prompt an die KI senden.
3. Das erzeugte TSV-Ergebnis kopieren oder als `.tsv`- beziehungsweise
   `.txt`-Datei speichern; alternativ kann das Werkzeug die UTF-8-Datei
   `kamecard-import.tsv` bereitstellen.
4. Den TSV-Text in KameCard einfügen oder die gespeicherte Datei auswählen.
5. Die lokale Vorschau einschließlich ungültiger Zeilen und Dubletten prüfen und
   die Karten erst danach importieren.

Der kopierte Prompt verlangt eine vollständige Analyse des Materials, kompakte
und dennoch vollständige Karten sowie ausschließlich belegte Inhalte. Er
verbietet erfundene Ergänzungen, Überschriften, Markdown und Erklärtext. Jede
Ausgabezeile muss genau eine Vorder- und Rückseite enthalten, getrennt durch
einen echten einzelnen Tabulator. Innerhalb der beiden Kartenhälften sind keine
weiteren Tabulatoren oder Zeilenumbrüche erlaubt. Unicode muss als UTF-8 erhalten
bleiben und Dubletten sollen entfernt werden.

KameCard stellt keine Verbindung zu einem KI-Dienst her, lädt keine Datei zu
einer KI hoch und sendet keine Karteninhalte nach außen. Nutzer entscheiden
außerhalb der App selbst, welches Werkzeug sie verwenden und welche Inhalte sie
dort teilen. Vertrauliches Material sollte nicht an externe Werkzeuge gegeben
werden.

## Export und Backup

In einer Deckansicht kann ein einzelnes Deck als JSON-Datei exportiert werden.
Es lässt sich später über die Backup-Ansicht als zusätzliches Deck wieder
importieren. Die Backup-Funktion in der Deckübersicht exportiert alle Decks
einschließlich der Lernstände. Exportdateien verwenden sinnvolle Namen mit
Datum; vollständige Backups enthalten außerdem eine `schemaVersion`.

Beim Wiederherstellen wird die JSON-Struktur defensiv geprüft. Ein vollständiger
Import ersetzt die aktuellen lokalen Daten erst nach einer deutlichen
Bestätigung. Vorher sollte ein aktuelles Backup exportiert werden. Ungültige oder
beschädigte Dateien werden abgelehnt, ohne die App zum Absturz zu bringen.

## PWA und Offline-Nutzung

Nach einem erfolgreichen Online-Aufruf speichert der Service Worker die
App-Hülle sowie verwendete statische Dateien. Danach kann die bereits geladene
Version ohne Netzwerk geöffnet werden. Je nach Browser lässt sich KameCard über
„App installieren“ oder „Zum Startbildschirm hinzufügen“ installieren.

Hinweise:

- Der allererste Aufruf benötigt eine Netzwerkverbindung.
- Neue Versionen werden beim nächsten Online-Aufruf geladen.
- Karten und Lernstände liegen weiterhin im lokalen Browser-Speicher und nicht
  im Offline-Cache.
- Das Leeren von Website-Daten entfernt sowohl lokale Nutzerdaten als auch
  Offline-Dateien.

## Veröffentlichung mit GitHub Pages

Die Datei `.github/workflows/deploy-pages.yml` enthält den vorbereiteten
Workflow. Bei einem Push auf `main` oder einem manuellen Start prüft er das
Projekt in dieser Reihenfolge:

1. `npm ci`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. Upload von `dist/` als Pages-Artefakt
6. Deployment über GitHub Pages

Ein Repository-Administrator muss unter **Settings → Pages → Build and
deployment** als Quelle **GitHub Actions** auswählen. Nach einem bewusst
ausgeführten Push auf `main` ist die App normalerweise unter
`https://<github-name>.github.io/Kamecard/` erreichbar.

Das Anlegen des Workflows veröffentlicht für sich allein nichts. Push und
Deployment müssen bewusst durch den Repository-Besitzer ausgelöst werden.

## Projektstruktur

~~~text
src/components/        Wiederverwendbare UI-Bausteine
src/views/             Ansichten und größere Nutzerabläufe
src/types/             Persistierte Datentypen
src/storage/           Defensive localStorage-Abstraktion
src/features/import/   Text- und TSV-Import
src/features/backup/   JSON-Export und Backup-Validierung
src/features/study/    Reine, testbare Lernlogik
src/hooks/             React-Zustand und Datenoperationen
src/utils/             Kleine allgemeine Hilfsfunktionen
public/                Manifest, Icons und Service Worker
~~~

## Aktuelle MVP-Einschränkungen

- Keine Benutzerkonten, Cloud-Speicherung oder Gerätesynchronisierung
- Daten nur im aktuellen Browserprofil; keine automatische Wiederherstellung
- Keine Bilder, Audiodateien oder Anhänge auf Karten
- Noch kein wissenschaftlich kalibrierter Spaced-Repetition-Algorithmus
- Nur textbasierter TXT-/TSV-Import und JSON-Export
- Keine Verschlüsselung der lokalen Daten oder Exportdateien
- Offline-Nutzung erst nach einem erfolgreichen ersten Laden

## Geplante Erweiterungen

- Bilder auf Karten
- Audio und Aussprachehilfen
- IndexedDB für größere Datenmengen und Medien
- Echte, zeitbasierte Spaced Repetition
- Optionale, datenschutzfreundliche Gerätesynchronisierung

Diese Erweiterungen sind bewusst nicht Teil des schlanken MVP.
