import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function FactMobilePickerPage() {
  const navigate = useNavigate()
  const [factId, setFactId] = useState('')

  const open = (e) => {
    e?.preventDefault?.()
    const id = parseInt(factId, 10)
    if (!id || id < 1) return
    navigate(`/facts-mobile/${id}`)
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-xl font-black text-white mb-1">📱 Fact Mobile</h1>
        <p className="text-sm text-slate-400">
          Éditeur mobile — un fact à la fois, champs inline.
        </p>
      </div>

      <form onSubmit={open} className="space-y-3 rounded-2xl bg-slate-800 border border-slate-700 p-4">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
          ID du fact
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={factId}
          onChange={e => setFactId(e.target.value)}
          placeholder="ex. 42"
          className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-base outline-none focus:border-orange-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={!factId}
          className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40"
          style={{ background: '#FF6B1A' }}
        >
          Ouvrir l'éditeur mobile
        </button>
      </form>

      <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-4 text-sm text-slate-400 leading-relaxed">
        <span className="font-bold text-slate-300">Astuce :</span> depuis l'onglet{' '}
        <Link to="/facts" className="text-orange-400 underline">Facts</Link>, clique sur{' '}
        <span className="inline-block px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-xs">📱</span>{' '}
        à côté du bouton Éditer pour ouvrir direct.
      </div>
    </div>
  )
}
