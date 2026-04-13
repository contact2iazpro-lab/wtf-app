/**
 * CategorySelectorModal — Modal personnalisé pour sélectionner une catégorie de défi
 */

import { CATEGORIES } from '../data/facts'
import { audio } from '../utils/audio'

const S = (px) => `calc(${px}px * var(--scale))`

export default function CategorySelectorModal({ onSelect, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#FAFAF8', borderRadius: 20, padding: '24px 20px',
          maxWidth: 380, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          fontFamily: 'Nunito, sans-serif',
          maxHeight: '80vh', overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚔️</div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', textAlign: 'center', margin: '0 0 16px' }}>
          Choisir la catégorie
        </h3>

        {/* Option "Toutes catégories" (aléatoire) */}
        <button
          onClick={() => {
            audio.play('click')
            onSelect('all')
          }}
          style={{
            width: '100%', padding: '12px 14px', marginBottom: 10,
            borderRadius: 12, border: '2px solid #FF6B1A',
            background: '#FF6B1A', color: 'white', fontWeight: 900, fontSize: 14,
            cursor: 'pointer', transition: 'all 0.2s',
            fontFamily: 'Nunito, sans-serif',
          }}
          onMouseOver={e => { e.target.style.background = '#E55A0A'; e.target.style.transform = 'scale(1.02)' }}
          onMouseOut={e => { e.target.style.background = '#FF6B1A'; e.target.style.transform = 'scale(1)' }}
        >
          🌍 Toutes catégories (aléatoire)
        </button>

        {/* Grille de catégories */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                audio.play('click')
                onSelect(cat.id)
              }}
              style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)',
                cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Nunito, sans-serif',
                fontSize: 12, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.3,
              }}
              onMouseOver={e => {
                e.target.style.background = cat.color + '20'
                e.target.style.borderColor = cat.color + '50'
                e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={e => {
                e.target.style.background = 'rgba(0,0,0,0.04)'
                e.target.style.borderColor = 'rgba(0,0,0,0.1)'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              <span style={{ fontSize: 16, display: 'block', marginBottom: 2 }}>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Bouton Annuler */}
        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '10px 0',
            background: 'transparent', border: '1px solid #D1D5DB', borderRadius: 12,
            color: '#6B7280', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif', transition: 'all 0.2s',
          }}
          onMouseOver={e => { e.target.style.background = 'rgba(0,0,0,0.05)' }}
          onMouseOut={e => { e.target.style.background = 'transparent' }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
