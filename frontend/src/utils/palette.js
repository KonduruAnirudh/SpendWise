// The backend stores no colours, so the UI derives one per entity.
// Deterministic: the same key gets the same colour on every page (cards, charts, legends).
const PALETTE = [
  '#d4af37',
  '#6b8cae',
  '#c17f59',
  '#7a9e7e',
  '#8b7bb8',
  '#c46b7a',
  '#6a9aa0',
  '#b08968',
]

export function colorFor(key) {
  // Integer ids cycle through the palette, so neighbouring ids never share a colour.
  if (Number.isInteger(key)) return PALETTE[Math.abs(key) % PALETTE.length]

  const text = String(key ?? '')
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}
