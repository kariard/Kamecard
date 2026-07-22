# KameCard – geplante Produkt- und Lernkonzepte

Diese Datei sammelt Produktideen und Lernkonzepte, die noch nicht umgesetzt sind. Sie beschreibt gewünschtes Verhalten, fachliche Leitlinien, offene Entscheidungen und erforderliche Tests. Sie ist keine Implementierungsspezifikation für bereits vorhandene Funktionen.

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

### Wiederholungsprinzip und Fehlerdurchgänge

Multiple Choice soll nicht die bestehende Strategie übernehmen, eine falsch beantwortete Karte bereits nach wenigen anderen Karten erneut zu zeigen. Stattdessen arbeitet eine Runde in klar getrennten Durchgängen:

1. Im ersten Durchgang werden alle für die Runde vorgesehenen Karten genau einmal gezeigt.
2. Falsch beantwortete Karten werden gesammelt, aber nicht sofort erneut eingereiht.
3. Nach Abschluss des Durchgangs beginnt ein neuer Fehlerdurchgang, der nur die zuvor falsch beantworteten Karten enthält.
4. Karten, die auch in diesem Fehlerdurchgang falsch beantwortet werden, bleiben für den nächsten Fehlerdurchgang vorgemerkt.
5. Richtig beantwortete Karten verlassen die Fehlermenge.
6. Die Runde endet, sobald jede Karte nach ihrem jeweils letzten Fehler in einem späteren Durchgang korrekt beantwortet wurde.

Dadurch liegt zwischen einem Fehler und der nächsten Prüfung derselben Karte ausreichend Abstand. Die Reihenfolge innerhalb eines Fehlerdurchgangs kann neu gemischt werden, solange jede enthaltene Karte einmal gezeigt wird und die Durchgangsgrenzen erhalten bleiben.

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
