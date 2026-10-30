


const GLYPH =
  
  'M23 29h10v52h-10z' +
  
  'M33 29h31l-5 11H33z' +
  
  'M33 44h17l-4 12H33z' +
  
  'M52 55a7 7 0 0 1 7-7h8a7 7 0 0 1 7 7v18a7 7 0 0 1 -7 7h-8a7 7 0 0 1 -7-7z' +
  
  'M69 62a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5a5 5 0 0 1 -5 5h-6a5 5 0 0 1 -5-5z' +
  
  'M77 59a3 3 0 1 0 0 6a3 3 0 1 0 0-6z'

export default function FundyLogo({ size = 36, mode = 'auto', className = '', style }) {
  const dark =
    mode === 'dark' ? true : mode === 'light' ? false
    : typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const box = dark ? '#ffffff' : '#1b1d1f'
  const glyph = dark ? '#1b1d1f' : '#ffffff'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={style}
      role="img"
      aria-label="Fundy"
    >
      <rect x="0" y="0" width="100" height="100" rx="24" fill={box} />
      <path d={GLYPH} fill={glyph} fillRule="evenodd" />
    </svg>
  )
}
