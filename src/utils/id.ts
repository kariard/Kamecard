export function createId(): string {
  try {
    const cryptoApi = globalThis.crypto

    if (typeof cryptoApi?.randomUUID === 'function') {
      return cryptoApi.randomUUID()
    }
  } catch {
    // Der Fallback funktioniert auch in älteren oder eingeschränkten Browsern.
  }

  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).slice(2, 12)

  return `kc_${timestamp}_${randomPart}`
}
