import { audio } from '../utils/audio'

export default function WelcomeModal({ onStartQuest, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #1a1a2e, #2d1b4e)',
          borderRadius: 24, padding: '28px 22px',
          maxWidth: 360, width: '100%',
          border: '2px solid rgba(255,107,26,0.3)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 8 }}>🎉</div>
        <h2 style={{
          fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 20,
          color: '#fff', textAlign: 'center', margin: '0 0 8px',
        }}>
          Bienvenue dans WTF!
        </h2>
        <p style={{
          fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600,
          color: 'rgba(255,255,255,0.7)', textAlign: 'center', margin: '0 0 16px', lineHeight: 1.5,
        }}>
          Tu as déjà collectionné tes premiers f*cts, bravo ! Tu viens de débloquer le mode Quest pour découvrir des WTF encore plus fous !
        </p>

        {/* Cadeau */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,107,26,0.15), rgba(255,107,26,0.08))',
          border: '1.5px solid rgba(255,107,26,0.4)',
          borderRadius: 16, padding: '12px 16px', marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🎁</div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 900, color: '#FF6B1A' }}>
            Cadeau de bienvenue : 1 ticket Quest offert !
          </div>
          <div style={{ fontFamily: 'Nunito, sans-serif', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            Les tickets te permettent de lancer des sessions Quest. Gagne-en plus en faisant des scores parfaits !
          </div>
        </div>

        {/* Bouton principal */}
        <button
          onClick={() => { audio.play('click'); onStartQuest() }}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 16,
            background: 'linear-gradient(135deg, #FF6B1A, #FF8C42)',
            border: 'none', cursor: 'pointer',
            fontFamily: "'Fredoka One', cursive", fontSize: 15, fontWeight: 400,
            color: '#fff', letterSpacing: '0.03em',
            boxShadow: '0 4px 16px rgba(255,107,26,0.4)',
          }}
        >
          Lancer ma première Quest !
        </button>

        {/* Bouton secondaire */}
        <button
          onClick={() => { audio.play('click'); onClose() }}
          style={{
            width: '100%', marginTop: 10, padding: '10px 0',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
