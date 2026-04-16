export default function FallbackImage({ categoryColor = '#1a3a5c' }) {
  return (
    <div style={{
      background: `linear-gradient(160deg, ${categoryColor}22 0%, ${categoryColor} 100%)`,
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '24px',
    }}>
      <div style={{
        fontSize: '72px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', lineHeight: 1,
        textShadow: '0 0 30px rgba(127,119,221,0.4)',
      }}>?</div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px' }}>Image bientôt disponible</div>
    </div>
  )
}
