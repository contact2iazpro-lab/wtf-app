import { useState, useCallback } from 'react'

const FLAGS = {
  welcome: 'wtf_ob_welcome',
  firstFact: 'wtf_ob_first_fact',
  homeSpots: 'wtf_ob_home_spots',
  vofDone: 'wtf_ob_vof_done',
  quickieIntro: 'wtf_ob_quickie_intro',
  collection: 'wtf_ob_collection',
  questIntro: 'wtf_ob_quest_intro',
  streakIntro: 'wtf_ob_streak_intro',
  rouletteIntro: 'wtf_ob_roulette_intro',
  dropIntro: 'wtf_ob_drop_intro',
}

function getFlag(key) {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}

function setFlag(key) {
  try { localStorage.setItem(key, '1') } catch { /* ignore */ }
}

export function useOnboarding() {
  const [completed, setCompleted] = useState(() => ({
    welcome: getFlag(FLAGS.welcome),
    firstFact: getFlag(FLAGS.firstFact),
    homeSpots: getFlag(FLAGS.homeSpots),
    vofDone: getFlag(FLAGS.vofDone),
    quickieIntro: getFlag(FLAGS.quickieIntro),
    collection: getFlag(FLAGS.collection),
    questIntro: getFlag(FLAGS.questIntro),
    streakIntro: getFlag(FLAGS.streakIntro),
    rouletteIntro: getFlag(FLAGS.rouletteIntro),
    dropIntro: getFlag(FLAGS.dropIntro),
  }))

  const complete = useCallback((step) => {
    if (!FLAGS[step]) return
    setFlag(FLAGS[step])
    setCompleted(prev => ({ ...prev, [step]: true }))
  }, [])

  // Le tunnel initial doit-il s'afficher ? (Welcome + Hook Fact)
  const needsTunnel = !completed.welcome || !completed.firstFact

  // Les spotlights Home doivent-ils s'afficher ?
  const needsHomeSpotlights = completed.firstFact && !completed.homeSpots

  return { completed, complete, needsTunnel, needsHomeSpotlights }
}
