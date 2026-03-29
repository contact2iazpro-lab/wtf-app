import { useState } from 'react'
import { CATEGORY_MAP } from '../constants/categories'

// Couleurs de catégorie (identiques au jeu)
const CATEGORY_COLORS = {
  animaux:      '#6BCB77',
  art:          '#A07CD8',
  'corps-humain': '#F07070',
  definition:   '#C8C8C8',
  gastronomie:  '#FFA500',
  geographie:   '#40D9C8',
  histoire:     '#E8CFA0',
  kids:         '#FFEF60',
  phobies:      '#A8B8D8',
  records:      '#E8B84B',
  sante:        '#90F090',
  sciences:     '#80C8E8',
  sport:        '#E84535',
  technologie:  '#C0C0C0',
  lois:         '#B0A8D8',
  cinema:       '#D4AF37',
  musique:      '#E84B8A',
  politique:    '#B24B4B',
  crimes:       '#8B4789',
  architecture: '#A0826D',
  internet:     '#5B8DBE',
  espace:       '#7B5EA7',
  psychologie:  '#8E44AD',
}

function getCatColor(categoryId) {
  return CATEGORY_COLORS[categoryId] || '#FF6B1A'
}

/** Aperçu de la QuestionScreen */
function QuestionPreview({ fact }) {
  const cat = CATEGORY_MAP[fact?.category]
  const color = getCatColor(fact?.category)

  const screenBg = `linear-gradient(135deg, ${color}45 0%, ${color}30 50%, ${color}15 100%)`
  const cardBg = `linear-gradient(135deg, ${color}35 0%, ${color}18 100%)`
  const options = fact?.options?.filter(Boolean).slice(0, 4) || []

  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden w-full"
      style={{ background: screenBg, minHeight: '380px', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div style={{ color: color, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            #{fact?.id || '?'} · 1 / 10
          </div>
          <div className="flex gap-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '9px' }}>⚙️</div>
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>✕</div>
          </div>
        </div>
        <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-0.5 rounded-full" style={{ width: '10%', background: color }} />
        </div>
      </div>

      {/* Category badge */}
      {cat && (
        <div className="mx-3 mb-1.5 rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0"
          style={{ background: 'rgba(0,0,0,0.35)', border: `1.5px solid ${color}80` }}>
          <span style={{ fontSize: '13px' }}>{cat.emoji}</span>
          <span style={{ color, fontSize: '11px', fontWeight: 900, letterSpacing: '0.03em' }}>{cat.label}</span>
        </div>
      )}

      {/* Question card */}
      <div className="mx-3 mb-2 rounded-2xl p-3 border shrink-0"
        style={{ background: cardBg, borderColor: color + '70', backdropFilter: 'blur(12px)' }}>
        <p style={{ color: 'white', fontSize: '12px', fontWeight: 700, lineHeight: 1.4 }}>
          {fact?.question || 'La question apparaîtra ici…'}
        </p>
      </div>

      {/* Answer buttons */}
      <div className="px-3 pb-2 mt-auto shrink-0">
        {options.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5">
            {options.map((opt, i) => (
              <div key={i} className="py-2.5 rounded-xl border text-center pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                  borderColor: color + '40',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                }}>
                {opt}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, i) => (
              <div key={i} className="py-2.5 rounded-xl border text-center"
                style={{ background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`, borderColor: color + '30', color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                {opt}
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-center mt-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-black border-2"
            style={{ borderColor: color, color, fontSize: '11px', background: 'rgba(0,0,0,0.4)' }}>
            20
          </div>
        </div>
      </div>
    </div>
  )
}

/** Aperçu de la RevelationScreen */
function RevelationPreview({ fact }) {
  const cat = CATEGORY_MAP[fact?.category]
  const color = getCatColor(fact?.category)

  const screenBg = `linear-gradient(135deg, ${color}45 0%, ${color}30 50%, ${color}15 100%)`
  const hasImage = !!fact?.image_url
  const correctAnswer = fact?.options?.[fact?.correct_index]

  return (
    <div
      className="relative flex flex-col rounded-2xl overflow-hidden w-full"
      style={{ background: screenBg, minHeight: '380px', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ color, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
              #{fact?.id || '?'} · 1 / 10
            </span>
            <span style={{ background: 'rgba(255,165,0,0.15)', color: '#FFA500', fontSize: '9px', fontWeight: 900, borderRadius: '9999px', padding: '1px 6px' }}>
              ⭐ 3
            </span>
          </div>
          {cat && (
            <span style={{ background: color + '20', color, fontSize: '9px', fontWeight: 700, borderRadius: '9999px', padding: '2px 8px' }}>
              {cat.emoji} {cat.label}
            </span>
          )}
        </div>
      </div>

      {/* Image ou placeholder */}
      <div className="mx-3 mb-2 rounded-2xl overflow-hidden border shrink-0 relative"
        style={{ borderColor: color + '60', aspectRatio: '16/6', background: hasImage ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.25)' }}>
        {hasImage ? (
          <>
            <img
              src={fact.image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { e.target.style.display = 'none' }}
            />
            <div style={{
              position: 'absolute', bottom: '4px', right: '6px',
              fontSize: '14px', fontWeight: 900, color: '#4CAF50',
              border: '2px solid #4CAF50', borderRadius: '4px',
              padding: '0 4px', background: 'rgba(76,175,80,0.1)',
              transform: 'rotate(-12deg)', backdropFilter: 'blur(4px)',
            }}>
              FOU
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <span style={{ fontSize: '18px', opacity: 0.25 }}>🖼️</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>Aucune image</span>
          </div>
        )}
      </div>

      {/* Question */}
      <div className="mx-3 mb-1.5 rounded-xl p-2 border shrink-0"
        style={{ background: color + '15', borderColor: color + '40' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>La question:</div>
        <div style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>
          {fact?.question || 'La question…'}
        </div>
      </div>

      {/* Bonne réponse */}
      {correctAnswer && (
        <div className="mx-3 mb-1.5 rounded-xl p-2 border border-green-500/40 shrink-0"
          style={{ background: 'rgba(76,175,80,0.1)' }}>
          <div style={{ color: '#4CAF50', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>✓ Bonne réponse:</div>
          <div style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>{correctAnswer}</div>
        </div>
      )}

      {/* Explication */}
      {fact?.explanation && (
        <div className="mx-3 mb-2 rounded-xl p-2 border shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}18 0%, ${color}06 100%)`, borderColor: color + '70' }}>
          <div className="flex items-center gap-1 mb-1">
            <span style={{ fontSize: '10px' }}>🧠</span>
            <span style={{ color: 'white', fontSize: '8px', fontWeight: 900, textTransform: 'uppercase' }}>Le saviez-vous ?</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px', lineHeight: 1.5 }}>
            {fact.explanation.length > 100 ? fact.explanation.slice(0, 100) + '…' : fact.explanation}
          </p>
        </div>
      )}

      {/* Bouton suivant */}
      <div className="px-3 pb-3 mt-auto shrink-0">
        <div className="w-full py-2 rounded-xl text-center font-black text-white pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, fontSize: '10px' }}>
          ⚡ Suivant
        </div>
      </div>
    </div>
  )
}

/** Composant principal — 2 onglets Question / Révélation */
export default function FactPreview({ fact }) {
  const [tab, setTab] = useState('question')

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* En-tête avec onglets */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">🎮 Aperçu en jeu</h3>
        <div className="flex rounded-lg overflow-hidden border border-slate-600">
          <button
            onClick={() => setTab('question')}
            className="px-3 py-1.5 text-xs font-bold transition-all"
            style={{
              background: tab === 'question' ? 'rgba(255,107,26,0.2)' : 'transparent',
              color: tab === 'question' ? '#FF6B1A' : 'rgba(255,255,255,0.4)',
            }}
          >
            🎯 Question
          </button>
          <button
            onClick={() => setTab('revelation')}
            className="px-3 py-1.5 text-xs font-bold transition-all border-l border-slate-600"
            style={{
              background: tab === 'revelation' ? 'rgba(255,107,26,0.2)' : 'transparent',
              color: tab === 'revelation' ? '#FF6B1A' : 'rgba(255,255,255,0.4)',
            }}
          >
            🧠 Révélation
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4">
        <div className="max-w-sm mx-auto">
          {tab === 'question'
            ? <QuestionPreview fact={fact} />
            : <RevelationPreview fact={fact} />
          }
        </div>
        <p className="text-center text-xs text-slate-600 mt-3">
          Synchronisé en temps réel avec le formulaire
        </p>
      </div>
    </div>
  )
}
