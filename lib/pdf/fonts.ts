import { Font } from '@react-pdf/renderer'
import path from 'path'

let _registered = false

export function registerLedgerFonts(): void {
  if (_registered) return
  _registered = true
  const base = path.resolve(process.cwd(), 'node_modules')
  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${base}/@fontsource/inter/files/inter-latin-400-normal.woff`, fontWeight: 400 },
      { src: `${base}/@fontsource/inter/files/inter-latin-600-normal.woff`, fontWeight: 600 },
      { src: `${base}/@fontsource/inter/files/inter-latin-700-normal.woff`, fontWeight: 700 },
    ],
  })
  Font.register({
    family: 'SourceSerif4',
    fonts: [
      { src: `${base}/@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff`, fontWeight: 400 },
      { src: `${base}/@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff`, fontWeight: 700 },
    ],
  })
}
