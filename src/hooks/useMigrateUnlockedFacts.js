import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * useMigrateUnlockedFacts — One-shot migration localStorage → Supabase
 *
 * Exécuté au premier mount si :
 * 1. L'utilisateur est connecté
 * 2. La migration n'a pas été faite (flag localStorage)
 * 3. L'utilisateur a des facts dans localStorage
 */
export function useMigrateUnlockedFacts() {
  const { user, isConnected } = useAuth()

  useEffect(() => {
    if (!isConnected || !user?.id) return

    const migrate = async () => {
      const migrationKey = `wtf_migration_unlocked_facts_${user.id}`
      if (localStorage.getItem(migrationKey)) {
        // Déjà migré
        return
      }

      try {
        const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
        const unlockedFacts = wtfData.unlockedFacts || []

        if (unlockedFacts.length === 0) {
          // Rien à migrer
          localStorage.setItem(migrationKey, 'true')
          return
        }

        console.log('[useMigrateUnlockedFacts] Migrating', unlockedFacts.length, 'facts')

        // Appeler le RPC pour ajouter les facts à Supabase
        const { error } = await supabase.rpc('add_unlocked_facts', {
          fact_ids: unlockedFacts,
        })

        if (error) {
          console.error('[useMigrateUnlockedFacts] Migration error:', error)
          return
        }

        // Marquer comme migré
        localStorage.setItem(migrationKey, 'true')
        console.log('[useMigrateUnlockedFacts] Migration completed')
      } catch (e) {
        console.error('[useMigrateUnlockedFacts] Error:', e)
      }
    }

    migrate()
  }, [user?.id, isConnected])
}
