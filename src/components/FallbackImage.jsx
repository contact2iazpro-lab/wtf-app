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
      <div style={{ fontSize: '14px', fontWeight: 900, color: 'rgba(255,255,255,0.25)', letterSpacing: '4px' }}>WTF!</div>
      <div style={{ fontSize: '72px', fontWeight: 900, color: 'white', lineHeight: 1 }}>?</div>
      <div style={{ width: '60%', height: '1px', background: 'rgba(255,255,255,0.3)', margin: '4px 0' }} />
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', letterSpacing: '1px', textAlign: 'center' }}>CE FAIT EST SI INCROYABLE</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.5 }}>
        qu'on n'a pas encore trouvé<br/>une image à la hauteur...
      </div>
      <div style={{ width: '60%', height: '1px', background: 'rgba(255,255,255,0.3)', margin: '4px 0' }} />
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Image bientôt disponible</div>
    </div>
  )
}
