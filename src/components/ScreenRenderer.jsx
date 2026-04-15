/**
 * ScreenRenderer — Rendu conditionnel des écrans de jeu.
 * Extrait de App.jsx pour réduire sa taille.
 * Aucune logique ici, juste du mapping screen → composant.
 */

import { useCallback } from 'react'
import { SCREENS } from '../constants/gameConfig'
import HomeScreen from '../screens/HomeScreen'
import WTFWeeklyTeaserScreen from '../screens/WTFWeeklyTeaserScreen'
import WTFWeeklyRevealScreen from '../screens/WTFWeeklyRevealScreen'
import ModeLaunchScreen from '../screens/ModeLaunchScreen'
import CategoryScreen from '../screens/CategoryScreen'
import QuestionScreen from '../screens/QuestionScreen'
import RevelationScreen from '../screens/RevelationScreen'
import ResultsScreen from '../screens/ResultsScreen'
import BlitzScreen from '../screens/BlitzScreen'
import BlitzLobbyScreen from '../screens/BlitzLobbyScreen'
import BlitzResultsScreen from '../screens/BlitzResultsScreen'
import FlashScreen from '../screens/FlashScreen'
import QuestScreen from '../screens/QuestScreen'
import MarathonScreen from '../screens/MarathonScreen'
import VraiOuFouScreen from '../screens/VraiOuFouScreen'
import { getCategoryById, getTitrePartiel } from '../data/factsService'

export default function ScreenRenderer({
  screen, gameMode, sessionType, currentFact, currentIndex, totalRounds,
  selectedDifficulty, selectedCategory, sessionScore, correctCount, hintsUsed,
  selectedAnswer, isCorrect, pointsEarned, coinsEarnedLastSession,
  sessionCorrectFacts, sessionFacts, sessionsToday, sessionIsPerfect,
  completedLevels, effectiveDailyFact, launchMode, blitzFacts, blitzResults,
  isChallengeMode,
  pendingDuel, lastCreatedDuel, lastCreatedDuelError, clearLastCreatedDuel, clearPendingDuel,
  user, storage, streak, newlyEarnedBadges, snackEnergy,
  showHowToPlay, modeConfigs,
  // Handlers
  handleHomeNavigate, handleHome, handleSelectDifficulty, handleSelectCategory,
  handleSelectAnswer, handleOpenValidate, handleUseHint, handleTimeout,
  handleNext, handleReplay, handleBlitzReplay, handleBlitzStart,
  handleBlitzFinish, handleStartFlashSession, handleShare, handleShareDailyFact,
  handleSaveTempFacts, handleLaunchStart,
  // Setters
  setScreen, setShowSettings, setShowHowToPlay, setStorage,
  onBadgeSeen, onResetSocialNotif,
  socialNotifCount, pendingChallengesCount, navigate,
}) {
  // Handler stable pour BlitzResultsScreen — évite que son useEffect cleanup
  // ne wipe lastCreatedDuel sur chaque re-render (fresh closure trap).
  const handleClearAutoChallenge = useCallback(() => {
    clearLastCreatedDuel?.()
    clearPendingDuel?.()
  }, [clearLastCreatedDuel, clearPendingDuel])

  return (
    <>
      {screen === SCREENS.HOME && (
        <HomeScreen
          dailyFactUnlocked={(() => {
            if (!effectiveDailyFact) return false
            const u = storage.unlockedFacts
            if (u instanceof Set) return u.has(effectiveDailyFact.id)
            if (Array.isArray(u)) return u.includes(effectiveDailyFact.id)
            return false
          })()}
          currentStreak={streak}
          newlyEarnedBadges={newlyEarnedBadges}
          onBadgeSeen={onBadgeSeen}
          snackEnergyRemaining={snackEnergy.remaining}
          onNavigate={handleHomeNavigate}
          onOpenSettings={() => setShowSettings(true)}
          playerAvatar={user?.user_metadata?.avatar_url || localStorage.getItem('wtf_player_avatar') || null}
          socialNotifCount={socialNotifCount}
          onResetSocialNotif={onResetSocialNotif}
          pendingChallengesCount={pendingChallengesCount}
        />
      )}

      {screen === SCREENS.WTF_TEASER && (
        <WTFWeeklyTeaserScreen
          fact={effectiveDailyFact}
          titrePartiel={getTitrePartiel(effectiveDailyFact)}
          streak={streak}
          onStart={handleStartFlashSession}
          onBack={() => setScreen(SCREENS.HOME)}
        />
      )}

      {screen === SCREENS.WTF_REVEAL && (
        <WTFWeeklyRevealScreen
          fact={effectiveDailyFact}
          sessionScore={sessionScore}
          correctCount={correctCount}
          totalFacts={sessionFacts.length}
          coinsEarned={coinsEarnedLastSession}
          streak={streak}
          onHome={handleHome}
          onShare={handleShareDailyFact}
        />
      )}

      {screen === SCREENS.MODE_LAUNCH && launchMode && (
        <ModeLaunchScreen
          {...modeConfigs[launchMode]}
          onStart={handleLaunchStart}
          onBack={() => setScreen(SCREENS.HOME)}
        />
      )}

      {screen === SCREENS.CATEGORY && (
        <CategoryScreen
          onSelectCategory={handleSelectCategory}
          onBack={() => setScreen(SCREENS.HOME)}
          selectedDifficulty={selectedDifficulty}
          unlockedFacts={storage.unlockedFacts}
          gameMode={gameMode}
          sessionType={sessionType}
        />
      )}

      {screen === SCREENS.QUESTION && currentFact && (
        <QuestionScreen
          key={`${gameMode}-${currentFact.id}`}
          fact={currentFact}
          factIndex={currentIndex}
          totalFacts={totalRounds}
          hintsUsed={hintsUsed}
          onSelectAnswer={handleSelectAnswer}
          onOpenValidate={handleOpenValidate}
          onUseHint={handleUseHint}
          onTimeout={handleTimeout}
          onQuit={handleHome}
          category={selectedCategory}
          gameMode={gameMode}
          difficulty={(gameMode === 'solo' || gameMode === 'snack') ? selectedDifficulty : null}
          sessionType={sessionType}
        />
      )}

      {screen === SCREENS.REVELATION && currentFact && (
        <RevelationScreen
          fact={currentFact}
          isCorrect={isCorrect}
          selectedAnswer={selectedAnswer}
          pointsEarned={pointsEarned}
          hintsUsed={hintsUsed}
          onNext={handleNext}
          onShare={handleShare}
          onQuit={handleHome}
          factIndex={currentIndex}
          totalFacts={totalRounds}
          gameMode={gameMode}
          sessionScore={sessionScore}
          sessionType={sessionType}
        />
      )}

      {screen === SCREENS.RESULTS && (
        <ResultsScreen
          score={sessionScore}
          correctCount={correctCount}
          totalFacts={totalRounds}
          coinsEarned={coinsEarnedLastSession}
          sessionType={sessionType}
          difficulty={selectedDifficulty}
          onReplay={handleReplay}
          onHome={handleHome}
          completedCategoryLevels={completedLevels}
          categoryId={selectedCategory}
          unlockedFactsThisSession={sessionCorrectFacts}
          allSessionFacts={sessionFacts}
          sessionsToday={sessionsToday}
          onSaveTempFacts={handleSaveTempFacts}
          onCollection={() => navigate('/collection')}
        />
      )}

      {/* EXPLORER_RESULTS legacy screen removed in 1e */}

      {screen === SCREENS.BLITZ_LOBBY && (
        <BlitzLobbyScreen
          onSelectCategory={handleBlitzStart}
          onBack={handleHome}
          bestBlitzTime={JSON.parse(localStorage.getItem('wtf_data') || '{}').bestBlitzTime || null}
          opponentId={isChallengeMode ? pendingDuel?.opponentId : null}
        />
      )}

      {screen === SCREENS.BLITZ && blitzFacts.length > 0 && (
        <BlitzScreen
          facts={blitzFacts}
          category={selectedCategory}
          onFinish={handleBlitzFinish}
          onQuit={handleHome}
          onUseHint={handleUseHint}
        />
      )}

      {screen === SCREENS.BLITZ_RESULTS && blitzResults && (
        <BlitzResultsScreen
          finalTime={blitzResults.finalTime}
          correctCount={blitzResults.correctCount}
          totalAnswered={blitzResults.totalAnswered}
          penalties={blitzResults.penalties}
          bestTime={blitzResults.bestTime}
          isNewRecord={blitzResults.isNewRecord}
          categoryId={selectedCategory}
          categoryLabel={getCategoryById(selectedCategory)?.label || ''}
          questionCount={blitzResults.totalAnswered}
          user={user}
          isChallengeMode={isChallengeMode}
          onHome={handleHome}
          onReplay={handleBlitzReplay}
          opponentId={pendingDuel?.opponentId}
          autoChallenge={lastCreatedDuel}
          challengeError={lastCreatedDuelError}
          onClearAutoChallenge={handleClearAutoChallenge}
        />
      )}

      {screen === SCREENS.FLASH && (
        <FlashScreen onHome={handleHome} setStorage={setStorage} />
      )}

      {screen === SCREENS.QUEST && (
        <QuestScreen onHome={handleHome} setStorage={setStorage} />
      )}

      {screen === SCREENS.MARATHON && (
        <MarathonScreen onHome={handleHome} />
      )}

      {screen === SCREENS.VRAI_OU_FOU && (
        <VraiOuFouScreen onHome={handleHome} />
      )}
    </>
  )
}
