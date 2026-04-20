import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { audio } from '../utils/audio'

export const UNLOCK_CATEGORY_PRICE = 200

const getCategoryIcon = (id) => `/assets/categories/${id}.png`

// Débloque une catégorie : débite 200 coins (local + Supabase) et persiste
// l'id dans `wtf_data.unlockedCategories` + `flags.unlockedCategories`.
// Retourne true si l'op a réussi, false sinon (coins insuffisants).
export function unlockCategoryNow(catId, { applyCurrencyDelta, mergeFlags, currentCoins }) {
  if (!catId) return false
  if (currentCoins < UNLOCK_CATEGORY_PRICE) return false

  applyCurrencyDelta?.({ coins: -UNLOCK_CATEGORY_PRICE }, 'unlock_category')?.catch?.(e =>
    console.warn('[UnlockCategory] applyCurrencyDelta failed:', e?.message || e)
  )

  let nextUnlocked = []
  try {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const list = wd.unlockedCategories || []
    if (!list.includes(catId)) list.push(catId)
    wd.unlockedCategories = list
    wd.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wd))
    nextUnlocked = list
    window.dispatchEvent(new Event('wtf_storage_sync'))
  } catch { /* ignore */ }

  if (nextUnlocked.length > 0) {
    mergeFlags?.({ unlockedCategories: nextUnlocked }).catch(e =>
      console.warn('[UnlockCategory] mergeFlags failed:', e?.message || e)
    )
  }

  audio.play('correct')
  return true
}

export default function UnlockCategoryModal({ target, onClose, onConfirmed }) {
  const { coins, applyCurrencyDelta, mergeFlags } = usePlayerProfile()

  if (!target) return null

  const catColor = target.color || '#6B7280'
  const canAfford = coins >= UNLOCK_CATEGORY_PRICE

  const handleConfirm = () => {
    const ok = unlockCategoryNow(target.id, { applyCurrencyDelta, mergeFlags, currentCoins: coins })
    if (ok) {
      onConfirmed?.(target.id)
      onClose?.()
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'Nunito, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 340,
          background: 'linear-gradient(160deg, #1a0a2e, #0a0a3e)',
          border: `2px solid ${catColor}`,
          borderRadius: 20, padding: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          boxShadow: `0 0 40px ${catColor}66`,
        }}
      >
        <img
          src={getCategoryIcon(target.id)}
          alt={target.label}
          style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'contain' }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div style={{ fontSize: 18, fontWeight: 900, color: 'white', textAlign: 'center' }}>
          Débloquer {target.label} ?
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.4 }}>
          Tu pourras jouer à cette catégorie en Quickie. Aucun f*ct n'est débloqué : c'est à toi de les découvrir en jouant.
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: 12,
          background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
        }}>
          <img src="/assets/ui/icon-coins.png" style={{ width: 20, height: 20 }} alt="" onError={(e) => { e.target.style.display = 'none' }} />
          <span style={{ fontSize: 22, fontWeight: 900, color: '#FFD700' }}>{UNLOCK_CATEGORY_PRICE}</span>
        </div>
        <div style={{ fontSize: 12, color: canAfford ? 'rgba(255,255,255,0.5)' : '#EF4444', fontWeight: 700 }}>
          Tu as {coins} coins {!canAfford && '— pas assez !'}
        </div>
        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: 'rgba(255,255,255,0.1)', color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              fontWeight: 800, fontSize: 14, cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canAfford}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: canAfford ? `linear-gradient(135deg, ${catColor}, ${catColor}cc)` : 'rgba(255,255,255,0.08)',
              color: canAfford ? 'white' : 'rgba(255,255,255,0.3)',
              border: 'none',
              fontWeight: 900, fontSize: 14,
              cursor: canAfford ? 'pointer' : 'not-allowed',
              fontFamily: 'Nunito, sans-serif',
              boxShadow: canAfford ? `0 4px 16px ${catColor}66` : 'none',
            }}
          >
            Débloquer
          </button>
        </div>
      </div>
    </div>
  )
}
