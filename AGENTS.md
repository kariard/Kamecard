# Kamecard – Arbeitsregeln für Codex

## Projekt

Kamecard ist eine kostenlose, lokal arbeitende Karteikarten-Web-App. Dieses Repository enthält ausschließlich das Kamecard-Projekt. Frühere Regeln anderer Projekte gelten hier nicht.

## Stack

- React und TypeScript
- Vite mit dem GitHub-Pages-Basispfad `/Kamecard/`
- modernes, responsives CSS ohne UI-Framework
- localStorage hinter einer Storage-Abstraktion
- Vitest für Logiktests
- ESLint für statische Prüfungen
- statische PWA-Dateien für Manifest und Offline-Unterstützung

## Wichtige Befehle

- `npm install` – Abhängigkeiten installieren
- `npm run dev` – lokale Entwicklung starten
- `npm run lint` – Lint-Prüfung
- `npm run test` – Tests einmalig ausführen
- `npm run build` – TypeScript prüfen und Produktionsbuild erstellen

## Architektur

- `src/components/` – wiederverwendbare UI-Bausteine
- `src/views/` – Ansichten und größere Nutzerabläufe
- `src/types/` – persistierte Datentypen
- `src/storage/` – defensive localStorage-Abstraktion
- `src/features/import/` – Text-/TSV-Import
- `src/features/backup/` – JSON-Export und -Validierung
- `src/features/study/` – reine, testbare Lernlogik
- `src/hooks/` – React-Zustand und Datenoperationen
- `src/utils/` – kleine allgemeine Hilfsfunktionen

## Qualitätsregeln

- Änderungen klein, nachvollziehbar und möglichst ohne große Refactorings halten.
- Persistierte Daten und Imports immer defensiv validieren; beschädigte Daten dürfen die App nicht abstürzen lassen.
- Unicode-Inhalte vollständig erhalten.
- Bedienung mit Maus, Touch und Tastatur berücksichtigen; sichtbare Fokuszustände und ausreichenden Kontrast bewahren.
- Vor Abschluss jeder Aufgabe mindestens `npm run lint`, `npm run test` und `npm run build` ausführen und Fehler aus dem eigenen Code beheben.
- Keine kostenpflichtigen Dienste, Backends, Cloud-Datenbanken, Tracking-Skripte oder externen APIs ohne ausdrückliche Zustimmung ergänzen.
- Keine externe KI-API integrieren. Der KI-Import bleibt ein kopierbarer Prompt.
- Nutzerdaten bleiben lokal im Browser.
- Keine Git-Operationen, kein Push und kein Deployment ohne ausdrückliche Freigabe.
