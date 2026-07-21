import { describe, expect, it } from 'vitest'
import { AI_IMPORT_PROMPT, copyAiImportPrompt } from './aiPrompt'

describe('AI_IMPORT_PROMPT', () => {
  it('enthält alle verbindlichen Inhalts- und Formatregeln', () => {
    const requiredPassages = [
      'Analysiere das gesamte Material vollständig',
      'kompakte, aber vollständige und eigenständig verständliche Karten',
      'Erfinde nichts',
      'genau einen echten Tabulator (Unicode U+0009)',
      'keine weiteren Tabulatoren und keine Zeilenumbrüche',
      'ausschließlich den direkt importierbaren TSV-Inhalt',
      'keine Markdown-Codeblöcke',
      'keine Erklärungen',
      'UTF-8',
      'Entferne inhaltlich identische Dubletten',
      'kamecard-import.tsv',
      'Vorderseite soll enthalten:',
      'Rückseite soll enthalten:',
    ]

    requiredPassages.forEach((passage) => {
      expect(AI_IMPORT_PROMPT).toContain(passage)
    })
  })

  it('zeigt im Formatbeispiel genau einen echten Tabulator', () => {
    expect(AI_IMPORT_PROMPT).toContain('<Vorderseite>\t<Rückseite>')
    expect(AI_IMPORT_PROMPT.match(/\t/g)).toHaveLength(1)
  })
})

describe('copyAiImportPrompt', () => {
  it('kopiert den vollständigen Prompt unverändert', async () => {
    let copiedText = ''
    const clipboard = {
      writeText(text: string) {
        copiedText = text
        return Promise.resolve()
      },
    }

    await expect(copyAiImportPrompt(clipboard)).resolves.toBe(true)
    expect(copiedText).toBe(AI_IMPORT_PROMPT)
  })

  it('meldet einen fehlgeschlagenen Clipboard-Zugriff defensiv', async () => {
    const clipboard = {
      writeText() {
        return Promise.reject(new Error('Clipboard gesperrt'))
      },
    }

    await expect(copyAiImportPrompt(clipboard)).resolves.toBe(false)
  })
})
