/**
 * useGoBack — Hook pour retourner à la page précédente
 *
 * Au lieu de navigate('/'), utilise navigate(-1) pour revenir à la page précédente
 * plutôt que retourner à l'accueil.
 */

import { useNavigate } from 'react-router-dom'
import { useCallback } from 'react'

export function useGoBack() {
  const navigate = useNavigate()
  return useCallback(() => navigate(-1), [navigate])
}
