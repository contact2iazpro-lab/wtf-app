/**
 * FactPreview — live in-game preview using the REAL QuestionScreen and
 * RevelationScreen components from the game source.
 *
 * Architecture:
 *  • @game alias in vite.config.js resolves to ../src (game source)
 *  • game-preview-stubs Vite plugin redirects audio → no-op and
 *    SettingsModal → null so there are no audio/modal side-effects in preview
 *  • Fact data is adapted from admin (snake_case) to game (camelCase) format
 *  • Both screens are rendered in a fixed 320×620 phone container
 *  • A ↺ button resets the circular timer without refreshing the page
 */

import { useState } from 'react'
import QuestionScreen from '@game/screens/QuestionScreen'
import RevelationScreen from '@game/screens/RevelationScreen'
import { resolveImageUrl } from '../utils/imageUrl'

// ── Fact format adapter ───────────────────────────────────────────────────────
// Admin tool stores snake_case; game components expect camelCase.
function adaptFact(fact) {
  if (!fact) return null
  const options = (fact.options || []).filter(opt => opt && opt.trim() !== '')
  return {
    ...fact,
    options,
    imageUrl:     resolveImageUrl(fact.image_url) ?? null,
    correctIndex: fact.correct_index ?? 0,
    sourceUrl:    fact.source_url ?? null,
  }
}

// Preview difficulty — Normal mode, no hints, 20s timer
const PREVIEW_DIFFICULTY = {
  duration:     20,
  hintsAllowed: false,
  choices:      4,
  label:        'Normal',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FactPreview({ fact }) {
  const [tab, setTab] = useState('question')
  const [cycleKey, setCycleKey] = useState(0)

  const gameFact = adaptFact(fact)

  if (!gameFact?.question) {
    return (
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center text-slate-500 text-sm">
        🎮 L'aperçu apparaîtra dès que la question est renseignée
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">

      {/* Header + tabs */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">🎮 Aperçu en jeu</h3>

        <div className="flex items-center gap-2">
          {/* Reset timer / restart preview */}
          <button
            onClick={() => setCycleKey(k => k + 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all text-sm"
            title="Relancer le timer"
          >
            ↺
          </button>

          {/* Question / Revelation tabs */}
          <div className="flex rounded-lg overflow-hidden border border-slate-600">
            <button
              onClick={() => setTab('question')}
              className="px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: tab === 'question' ? 'rgba(255,107,26,0.2)' : 'transparent',
                color:      tab === 'question' ? '#FF6B1A' : 'rgba(255,255,255,0.4)',
              }}
            >
              🎯 Question
            </button>
            <button
              onClick={() => setTab('revelation')}
              className="px-3 py-1.5 text-xs font-bold transition-all border-l border-slate-600"
              style={{
                background: tab === 'revelation' ? 'rgba(255,107,26,0.2)' : 'transparent',
                color:      tab === 'revelation' ? '#FF6B1A' : 'rgba(255,255,255,0.4)',
              }}
            >
              🧠 Révélation
            </button>
          </div>
        </div>
      </div>

      {/* Phone frame */}
      <div className="p-4 flex justify-center">
        <div
          key={`${tab}-${cycleKey}`}
          style={{
            width:        320,
            height:       620,
            position:     'relative',
            overflow:     'hidden',
            borderRadius: 24,
            border:       '1px solid rgba(255,255,255,0.08)',
            boxShadow:    '0 0 0 4px rgba(0,0,0,0.4)',
          }}
        >
          {/* Inject minimal game CSS not present in admin-tool */}
          <style>{`
            .scrollbar-hide { scrollbar-width: none; }
            .scrollbar-hide::-webkit-scrollbar { display: none; }
          `}</style>

          {tab === 'question' ? (
            <QuestionScreen
              key={cycleKey}
              fact={gameFact}
              factIndex={0}
              totalFacts={10}
              hintsUsed={0}
              onSelectAnswer={() => {}}
              onOpenValidate={() => {}}
              onUseHint={() => {}}
              onTimeout={() => {}}
              onQuit={() => {}}
              category={fact.category}
              gameMode="solo"
              difficulty={PREVIEW_DIFFICULTY}
              playerName=""
              playerColor="#FF5C1A"
              playerEmoji="🎮"
              playerCoins={42}
            />
          ) : (
            <RevelationScreen
              key={cycleKey}
              fact={gameFact}
              isCorrect={true}
              selectedAnswer={gameFact.correctIndex}
              pointsEarned={1}
              hintsUsed={0}
              onNext={() => {}}
              onShare={() => {}}
              onQuit={() => {}}
              factIndex={0}
              totalFacts={10}
              duelContext={null}
              gameMode="solo"
              sessionScore={1}
            />
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-600 pb-3">
        Composants réels du jeu · Synchronisé en temps réel avec le formulaire
      </p>
    </div>
  )
}
