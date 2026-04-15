import { useState, useEffect } from 'react'

const BASE_HEIGHT = 667 // iPhone SE référence
const BASE_WIDTH  = 375 // iPhone SE référence

export const useScale = () => {
  const compute = () => {
    const scaleH = window.innerHeight / BASE_HEIGHT
    const scaleW = window.innerWidth  / BASE_WIDTH
    // Cap à 1 : design mobile-first 375×667, jamais scaler au-delà sur desktop
    // (les valeurs ZONE_HEIGHTS non-wrapées dans S() créent sinon de l'overflow).
    return Math.min(scaleH, scaleW, 1)
  }
  const [scale, setScale] = useState(compute)

  useEffect(() => {
    const handleResize = () => setScale(compute())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return scale
}
