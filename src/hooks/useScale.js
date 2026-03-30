import { useState, useEffect } from 'react'

const BASE_HEIGHT = 667 // iPhone SE référence
const BASE_WIDTH  = 375 // iPhone SE référence

export const useScale = () => {
  const [scale, setScale] = useState(() => {
    const scaleH = window.innerHeight / BASE_HEIGHT
    const scaleW = window.innerWidth  / BASE_WIDTH
    return Math.min(scaleH, scaleW)
  })

  useEffect(() => {
    const handleResize = () => {
      const scaleH = window.innerHeight / BASE_HEIGHT
      const scaleW = window.innerWidth  / BASE_WIDTH
      setScale(Math.min(scaleH, scaleW))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return scale
}
