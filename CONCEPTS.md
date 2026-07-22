# KameCard – geplante Produkt- und Lernkonzepte

Diese Datei sammelt zentrale und geplante Produkt- und Lernkonzepte. Sie beschreibt den fachlichen Stand, gewünschtes Verhalten, Leitlinien, offene Entscheidungen und erforderliche Tests. Der Status eines Abschnitts kennzeichnet, ob ein Konzept bereits umgesetzt oder noch geplant ist.

## Adaptive Lernrunden

**Status:** Für **„Selbst bewerten“** und **„Antwort eintippen“** implementiert. Für Multiple Choice vorgesehen, sobald dieser Modus umgesetzt wird.

### Ziel und Geltungsbereich

Adaptive Lernrunden bilden die zentrale, gemeinsame Rundensystematik für alle Antwortmethoden. Sie sorgen innerhalb einer gestarteten Session dafür, dass jede Karte zunächst fair abgefragt und anschließend abhängig von ihrem Lernstand und den Fehlern der aktuellen Runde gefestigt wird.

Das System ist transparent und regelbasiert. Es verwendet weder KI noch Machine Learning. Es steuert ausschließlich den Ablauf einer laufenden Lernrunde und ist kein zeitbasiertes Spaced-Repetition-System für mehrere Tage. Tagespläne, Fälligkeitsdaten, automatische Tagesdecks und eine Aufteilung großer Decks in Lernpakete sind nicht Bestandteil dieses Konzepts.

### Phase 1: Garantierter erster Durchgang

- Jede Karte des ausgewählten Decks wird genau einmal gezeigt, bevor eine Karte wiederholt werden darf.
- Noch nicht erstmals gezeigte Karten haben immer Vorrang vor Wiederholungen.
- Jede Karte erhält dadurch unabhängig von ihrer Historie einen fairen ersten Versuch.
- Historisch starke Karten und die übrigen Karten werden zunächst getrennt mit einer kontrollierbaren Zufallsquelle gemischt.
- Anschließend werden die Gruppen ungefähr im Verhältnis von zwei übrigen Karten zu einer historisch starken Karte zusammengeführt. Restbestände werden sinnvoll eingefügt.
- Falls nur eine der beiden Gruppen vorhanden ist, wird diese normal gemischt.
- Die Zufallsquelle bleibt kontrollierbar und injizierbar, damit Reihenfolge und Richtungswahl reproduzierbar getestet werden können.

Die Mischung verhindert, dass bekannte Karten gesammelt am Anfang oder Ende erscheinen. Bewertungen während des ersten Durchgangs dürfen niemals dazu führen, dass eine Karte wiederholt wird, solange noch ungesehene Karten vorhanden sind.

### Phase 2: Adaptive Festigung

Nach dem ersten Durchgang bleiben nur Karten aktiv, die ihr individuelles Abschlusskriterium noch nicht erfüllt haben. Die nächste Karte wird über eine nachvollziehbare gewichtete Auswahl bestimmt:

- Fehler in der aktuellen Runde erhöhen die Priorität.
- Eine schwächere bisherige Mastery erhöht die Priorität.
- Eine schwächere historische Erfolgsquote erhöht die Priorität.
- Jede aktive und regulär auswählbare Karte behält ein positives Gewicht und damit eine reale Auswahlchance.

Bei neuen Karten ohne historische Antworten existiert noch keine belastbare Erfolgsquote. Für sie wird deshalb kein künstlicher Fehlquoten-Bonus berechnet; ihre niedrige Ausgangs-Mastery und ihr Zwei-Erfolge-Ziel priorisieren sie bereits nachvollziehbar.

Die implementierte Startgewichtung ist bewusst einfach und zentral definiert:

- Basisgewicht: `1`
- Fehlerbonus: `3` pro Fehler der aktuellen Runde, begrenzt auf die ersten drei Fehler
- Mastery-Bonus: `(5 - masteryLevel beim Sessionstart) × 0,5`
- historischer Fehlquoten-Bonus: `(1 - historische Erfolgsquote) × 2`, sofern historische Antworten vorhanden sind

Alle aktiven Karten behalten dadurch ein positives Grundgewicht. Der begrenzte Fehlerbonus priorisiert Problemkarten deutlich, ohne andere Karten mit wachsender Fehlerzahl praktisch vollständig zu verdrängen. Diese Werte sind eine erste Produktheuristik und können nach späteren Nutzungserfahrungen zentral angepasst werden.

Schwierige Karten erscheinen dadurch häufiger, ohne dass die Runde dauerhaft nur die schwierigste Karte auswählt. Gewichte und Schwellenwerte sollen als benannte Konstanten oder klar benannte Hilfsfunktionen zentral definiert sein.

### Historische Einstufung

Für die Einstufung werden ausschließlich die bereits vorhandenen Kartenwerte `masteryLevel`, `currentStreak`, `correctCount` und `incorrectCount` verwendet.

Eine Karte gilt als **historisch stark**, wenn alle folgenden Bedingungen erfüllt sind:

- `masteryLevel >= 3`
- `currentStreak >= 2`
- mindestens drei historische Antworten vorhanden
- historische Erfolgsquote mindestens 75 Prozent

Eine Karte gilt als **neu**, wenn `correctCount + incorrectCount === 0` gilt. Jede Karte, die weder neu noch historisch stark ist, gilt als **unsicher**.

Diese Einstufung ist eine transparente erste Produktheuristik. Ihre Schwellenwerte können später anhand von Nutzungserfahrungen angepasst werden, ohne den grundsätzlichen Aufbau der Lernrunde zu ändern.

### Individuelle Abschlusskriterien

Für jede Karte gilt abhängig von ihrer Einstufung und den Antworten der aktuellen Runde ein eigenes Abschlussziel:

- Eine historisch starke Karte ist nach einem richtigen ersten Versuch für die Runde abgeschlossen.
- Eine neue oder unsichere Karte benötigt zwei getrennte richtige Antworten ohne zwischenzeitlichen Fehler.
- Nach jedem Fehler wird die korrekte Serie der betroffenen Karte auf null zurückgesetzt.
- Eine Karte mit mindestens einem Fehler in der aktuellen Runde benötigt nach ihrem letzten Fehler zwei getrennte richtige Antworten.
- Ein neuer Fehler zwischen diesen Erfolgen setzt die Serie erneut auf null.

Beispiele:

- Historisch stark: `richtig` → abgeschlossen
- Neu oder unsicher: `richtig` → später nochmals `richtig` → abgeschlossen
- Fehlerkarte: `falsch` → später `richtig` → später nochmals `richtig` → abgeschlossen
- Erneuter Fehler: `falsch` → `richtig` → erneut `falsch` → `richtig` → nochmals `richtig` → abgeschlossen

„Getrennt“ bedeutet, dass die Antworten in unterschiedlichen Versuchen erfolgen. Der Scheduler versucht, zwischen diesen Versuchen den nachfolgend beschriebenen Mindestabstand einzuhalten.

### Abstand zwischen Wiederholungen

Im Normalfall sollen zwischen zwei Versuchen derselben Karte mindestens vier andere Kartenversuche liegen. Die zentrale Richtgröße lautet:

`MIN_OTHER_ATTEMPTS_BETWEEN_REPEATS = 4`

Der Scheduler bevorzugt Karten, deren Mindestabstand bereits erreicht ist. Für kleine Decks und gegen Blockaden gelten folgende Fallbacks:

- Noch nicht erstmals gezeigte Karten haben immer Vorrang.
- Falls keine aktive Karte den regulären Mindestabstand erfüllt, wird die am längsten nicht gezeigte aktive Karte gewählt.
- Dieselbe Karte wird niemals direkt wiederholt, solange mindestens eine andere aktive Karte verfügbar ist.
- Falls nur noch eine aktive Karte vorhanden ist, darf sie mangels Alternative erneut gezeigt werden.
- Die Runde darf wegen des Mindestabstands weder blockieren noch in eine Endlosschleife geraten.

### Lernrichtung innerhalb einer Session

Die festen Richtungen **Vorderseite → Rückseite** und **Rückseite → Vorderseite** bleiben unverändert. Bei **Gemischt** wird jeder Karte beim Erstellen der Session einmal eine konkrete Richtung zugewiesen.

Alle Wiederholungen derselben Karte behalten diese Richtung während der gesamten Session. Ein Fehler muss dadurch mit späteren richtigen Antworten derselben Richtung gefestigt werden und kann nicht durch eine Antwort in der Gegenrichtung ausgeglichen werden.

### Transienter Session-Zustand

Der nicht persistierte Session-Zustand hält pro Karte mindestens fest:

- ob sie bereits erstmals gezeigt wurde,
- die Anzahl ihrer Fehler in der aktuellen Runde,
- die Anzahl korrekter Antworten seit dem letzten Fehler,
- die benötigte Anzahl korrekter Antworten,
- ob sie vollständig abgeschlossen ist,
- den Index beziehungsweise Zeitpunkt ihres letzten Versuchs,
- ihre für diese Session festgelegte Richtung.

Dieser Zustand ist die gemeinsame Quelle der Wahrheit dafür, welche Karte als Nächstes erscheint, wann eine Karte abgeschlossen ist, wann die Session endet und ob der Mindestabstand erfüllt ist.

### Statistik, Fortschritt und Persistenz

Jeder echte Antwortversuch aktualisiert weiterhin die vorhandenen Kartenstatistiken `correctCount`, `incorrectCount`, `currentStreak`, `masteryLevel`, `lastReviewedAt` und `updatedAt`. `masteryLevel` bleibt auf den Bereich von 0 bis 5 begrenzt.

Für die Session gilt:

- `correctAnswers` zählt richtige Versuche.
- `incorrectAnswers` zählt falsche Versuche.
- `totalCards` bleibt die Anzahl eindeutiger Karten der Runde.
- `completedCardIds` enthält nur Karten, die ihr individuelles Abschlussziel vollständig erreicht haben.
- Der Fortschritt basiert auf vollständig gefestigten eindeutigen Karten und nicht auf der Anzahl der Versuche.
- Schwierige Karten werden weiterhin anhand ihrer Fehler in der aktuellen Runde ermittelt.

Der adaptive Zustand bleibt vollständig transient. Persistiertes Karten- und Deck-Datenmodell, localStorage-Schema, Backup-Format und Import-Format werden nicht verändert; eine Migration ist nicht erforderlich.

## Multiple-Choice-Lernmodus

**Status:** Geplantes Konzept, noch nicht implementiert.

### Ziel

Multiple Choice soll als dritter Antwortmodus neben **„Selbst bewerten“** und **„Antwort eintippen“** angeboten werden. Der Modus richtet sich besonders an neue oder noch unsichere Karten und trainiert in erster Linie das Wiedererkennen einer richtigen Antwort.

Multiple Choice ist als Einstiegshilfe gedacht. Es soll das anspruchsvollere freie Abrufen einer Antwort langfristig nicht ersetzen. Sobald eine Karte besser bekannt ist, sollte der Lernende möglichst zur Texteingabe oder zur Selbstbewertung wechseln.

### Grundablauf einer Karte

1. KameCard zeigt die Aufgabe beziehungsweise Promptseite wie in den bestehenden Lernmodi.
2. Darunter erscheinen genau drei Antwortmöglichkeiten:
   - eine richtige Antwort,
   - zwei plausible falsche Antworten.
3. Die beiden falschen Antworten stammen aus derselben Antwortseite anderer Karten desselben Decks.
4. Die drei Optionen werden für jede Aufgabe zufällig angeordnet.
5. Nach der Auswahl zeigt KameCard sofort eine verständliche Rückmeldung:
   - die falsche Auswahl wird als falsch markiert,
   - die richtige Antwort wird hervorgehoben.
6. Nach der ersten Auswahl werden alle Optionen gesperrt. Weitere Klicks oder Tastatureingaben dürfen die Karte nicht erneut bewerten.
7. Die Rückmeldung bleibt sichtbar, bis der Lernende **„Nächste Karte“** auswählt oder Enter drückt.

Schnelles mehrfaches Klicken oder wiederholtes Drücken von Enter darf weder eine doppelte Bewertung auslösen noch versehentlich mehrere Karten überspringen.

### Lernrichtungen

Die bereits für die Lernrunde festgelegte Richtung bestimmt sowohl die Aufgabe als auch den Pool möglicher Antworten.

| Lernrichtung | Aufgabe | Richtige Antwort und Ablenker |
| --- | --- | --- |
| Vorderseite → Rückseite | Vorderseite der aktuellen Karte | Rückseiten der Karten |
| Rückseite → Vorderseite | Rückseite der aktuellen Karte | Vorderseiten der Karten |
| Gemischt | Die für die aktuelle Karte festgelegte Promptseite | Immer die zur festgelegten Richtung gehörende erwartete Antwortseite |

Bei einer gemischten Lernrunde wird die Richtung pro Karte festgelegt. Sie darf während der Anzeige und Bewertung dieser Karte nicht wechseln. Alle Optionen müssen aus der jeweils erwarteten Antwortseite stammen.

### Regeln für Ablenker

- KameCard verwendet ausschließlich bereits vorhandene Antworten aus demselben Deck.
- Es werden keine Antworten erfunden und keine Inhalte durch eine externe KI erzeugt.
- KameCard stellt für diesen Modus keine Verbindung zu einem KI-Dienst oder einer anderen externen API her.
- Innerhalb einer Aufgabe dürfen keine doppelten Antworttexte vorkommen.
- Jeder Ablenker muss sich von der korrekten Antwort unterscheiden.
- Die richtige Antwort darf nicht durch eine stets gleiche Position erkennbar sein. Ihre Position muss zufällig wechseln.
- Länge, Formatierung, Hervorhebung und Anordnung vor der Auswahl dürfen die richtige Option nicht verraten.
- Die falschen Antworten sollen plausibel sein, weil sie aus derselben Antwortseite realer Karten des aktuellen Decks stammen.
- Die vollständigen Kartentexte bleiben unverändert. Eine visuelle Begrenzung langer Optionen darf nur die Darstellung betreffen.

#### Zu wenige unterschiedliche Antworten

Vor dem Start muss geprüft werden, ob neben der korrekten Antwort mindestens zwei unterschiedliche geeignete Ablenker verfügbar sind. Falls das Deck dafür zu wenige unterschiedliche Antworttexte enthält, sind zwei Produktvarianten denkbar:

1. Es werden weniger als drei Optionen angezeigt.
2. Multiple Choice wird für dieses Deck deaktiviert.

In beiden Fällen muss die Oberfläche verständlich erklären, weshalb nicht die regulären drei Optionen angeboten werden können. Die genaue Produktentscheidung und die daraus folgende minimale Deckgröße sind noch offen.

### Wiederholungsprinzip und adaptive Lernrunde

Multiple Choice erhält nach seiner Implementierung keine eigene Fehlerdurchgangslogik. Der Modus verwendet stattdessen ebenfalls das zentrale, unter [Adaptive Lernrunden](#adaptive-lernrunden) beschriebene Rundensystem mit garantiertem ersten Durchgang, individuellen Abschlusskriterien, Mindestabstand und adaptiver Festigung.

Das Ergebnis einer Multiple-Choice-Auswahl wird dabei als richtiger oder falscher Versuch an denselben Scheduler übergeben. Multiple-Choice-spezifisch bleiben die Erzeugung und Darstellung der Antwortoptionen, das Auswahlfeedback sowie die noch festzulegende schwächere Mastery-Gewichtung.

Bis zur Umsetzung von Multiple Choice gilt das adaptive Rundensystem für Selbstbewertung und Texteingabe.

### Mastery und Lerngewichtung

Ein richtiger Multiple-Choice-Treffer soll schwächer zählen als eine frei eingegebene oder selbst als gewusst bewertete Antwort. Die geplante fachliche Gewichtung lautet:

| Antwort | Geplanter Lernerfolg |
| --- | --- |
| Texteingabe richtig | voller Lernerfolg |
| Selbstbewertung „Gewusst“ | voller Lernerfolg |
| Multiple Choice richtig | leichter Lernerfolg |
| Multiple Choice falsch | normaler Fehler |

Für die technische Abbildung sind drei Varianten offen:

1. **Zwei MC-Erfolge erforderlich:** Erst zwei aufeinanderfolgende richtige Multiple-Choice-Antworten erhöhen die Mastery.
2. **Langsamere Erhöhung:** Ein richtiger MC-Treffer erhöht Mastery mit einem geringeren Gewicht oder erst nach mehreren gewichteten Erfolgen.
3. **Getrennte Mastery-Werte:** Erkennungs-Mastery und Abruf-Mastery werden langfristig getrennt gespeichert und ausgewertet.

Variante 3 bildet den fachlichen Unterschied zwischen Wiedererkennen und freiem Abrufen am saubersten ab. Sie würde jedoch das persistierte Datenmodell verändern und eine defensive Migration für vorhandene localStorage-Daten sowie bestehende Backup-Dateien erfordern. Vor einer Umsetzung muss deshalb ausdrücklich über Datenmodell, Migration und Rückwärtskompatibilität entschieden werden.

### Empfohlene Lernleiter

1. **Neue oder unsichere Karte:** Multiple Choice zum ersten Wiedererkennen.
2. **Teilweise bekannte Karte:** Antwort eintippen und frei abrufen.
3. **Langfristige Wiederholung:** Antwort eintippen oder selbst bewerten.

Diese Lernleiter kann zunächst als Empfehlung erklärt werden. Ob KameCard später automatisch einen Modus empfiehlt oder der Lernende ihn immer manuell auswählt, bleibt offen.

### Benutzeroberfläche und Barrierefreiheit

- Multiple Choice erscheint als dritte Antwortmethode in der Vorbereitung einer Lernrunde.
- Die drei Optionen benötigen große, auf Smartphones gut erreichbare Touch-Ziele.
- Der komplette Ablauf muss mit der Tastatur bedienbar sein.
- Optional können die Zifferntasten **1**, **2** und **3** die entsprechenden Antwortmöglichkeiten auswählen.
- Enter bestätigt nach sichtbarem Feedback den Wechsel zur nächsten Karte, darf aber keine zweite Bewertung auslösen.
- Lange Kartentexte und Antwortmöglichkeiten dürfen das responsive Layout nicht zerstören.
- Vor der Auswahl dürfen alle Optionen nur neutral dargestellt werden.
- Richtige, falsche, ausgewählte und gesperrte Zustände müssen außer durch Farbe auch durch Text, Symbole oder andere eindeutig erkennbare Merkmale vermittelt werden.
- Fokuszustände müssen sichtbar bleiben. Nach dem Kartenwechsel soll der Fokus sinnvoll gesetzt werden, ohne Tastatur- oder Screenreader-Nutzer zu überraschen.
- Die Rückmeldung soll barrierefrei angekündigt werden und bis zur bewussten Fortsetzung stabil sichtbar bleiben.

### Erforderliche Tests

Eine spätere Implementierung benötigt mindestens automatisierte Tests für:

- genau eine richtige Antwort pro Aufgabe,
- eindeutige Optionen,
- Auswahl der korrekten Antwortseite für jede Lernrichtung,
- Vorderseite → Rückseite,
- Rückseite → Vorderseite,
- deterministisch prüfbare gemischte Richtungen,
- wechselnde beziehungsweise steuerbar zufällige Position der richtigen Antwort,
- keine doppelten Antworttexte,
- Ablenker, die von der richtigen Antwort verschieden sind,
- Verhalten bei einem zu kleinen Deck oder zu wenigen unterschiedlichen Antworten,
- korrekte Bewertung einer richtigen Auswahl,
- korrekte Bewertung einer falschen Auswahl,
- stabiles Feedback bis zur bewussten Fortsetzung,
- keine doppelte Bewertung bei Mehrfachklick oder wiederholtem Enter,
- Sammlung falscher Karten und Aufbau der Fehlerdurchgänge,
- Verbleib erneut falscher Karten im nächsten Fehlerdurchgang,
- korrektes Ende der Runde nach späterem Erfolg aller Karten,
- keine Regressionen in Selbstbewertung und Texteingabe,
- keine Regressionen bei vorhandenen Decks, Statistiken, localStorage-Daten, Backups oder Importen.

Zufallsabhängige Tests sollen eine kontrollierbare Zufallsquelle verwenden, damit Reihenfolge und Position reproduzierbar geprüft werden können.

### Offene Entscheidungen

- genaue Mastery-Gewichtung für richtige Multiple-Choice-Antworten,
- Einführung getrennter Erkennungs- und Abruf-Mastery,
- minimale Deckgröße beziehungsweise minimale Anzahl unterschiedlicher Antworten,
- feste oder konfigurierbare Anzahl der Antwortoptionen,
- Verhalten bei nur einer verfügbaren falschen Antwort,
- ausschließlich manuelle Moduswahl oder automatische Empfehlung anhand des Lernstands.

Diese Entscheidungen müssen vor der Implementierung geklärt werden, insbesondere wenn sie das persistierte Datenmodell, bestehende Backups oder das Verhalten laufender Lernrunden betreffen.
