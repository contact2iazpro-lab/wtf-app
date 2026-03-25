import { useState } from 'react'

export default function DuelPassScreen({ playerName, playerColor, playerEmoji, questionIndex, totalQuestions, onReady }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div
      className="flex flex-col h-full w-full items-center justify-center screen-enter select-none"
      style={{ background: '#070707' }}>

      {!revealed ? (
        <div
          className="flex flex-col items-center gap-6 px-8 text-center w-full h-full justify-center cursor-pointer"
          onClick={() => setRevealed(true)}>
          <div className="text-6xl">📱</div>
          <div className="text-white/40 text-sm font-bold uppercase tracking-widest">
            Passe le téléphone à
          </div>
          <div className="text-4xl font-black" style={{ color: playerColor }}>
            {playerName}
          </div>
          <div className="text-white/20 text-xs mt-6 animate-pulse">
            Appuie n'importe où pour continuer
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 px-8 text-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black"
            style={{ background: playerColor + '20', border: `2px solid ${playerColor}60` }}>
            {playerEmoji}
          </div>
          <div>
            <div className="text-2xl font-black text-white mb-1">{playerName}</div>
            <div className="text-white/40 text-sm">Question {questionIndex + 1} / {totalQuestions}</div>
          </div>
          <button
            onClick={onReady}
            className="btn-press px-10 py-4 rounded-2xl font-black text-white text-base uppercase tracking-wide mt-4 active:scale-95 transition-all"
            style={{
              background: `linear-gradient(135deg, ${playerColor} 0%, ${playerColor}bb 100%)`,
              boxShadow: `0 8px 32px ${playerColor}40`,
            }}>
            Je suis prêt(e) !
          </button>
        </div>
      )}
    </div>
  )
}
