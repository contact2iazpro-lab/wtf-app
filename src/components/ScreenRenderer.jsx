/**
 * ScreenRenderer — Rendu conditionnel des écrans de jeu.
 * Extrait de App.jsx pour réduire sa taille.
 * Aucune logique ici, juste du mapping screen → composant.
 */

import { SCREENS } from '../constants/gameConfig'
import HomeScreen from '../screens/HomeScreen'
import WTFWeeklyTeaserScreen from '../screens/WTFWeeklyTeaserScreen'
import WTFWeeklyRevealScreen from '../screens/WTFWeeklyRevealScreen'
import ModeLaunchScreen from '../screens/ModeLaunchScreen'
import DifficultyScreen from '../screens/DifficultyScreen'
import CategoryScreen from '../screens/CategoryScreen'
import QuestionScreen from '../screens/QuestionScreen'
import RevelationScreen from '../screens/RevelationScreen'
import ResultsScreen from '../screens/ResultsScreen'
import BlitzScreen from '../screens/BlitzScreen'
import BlitzLobbyScreen from '../screens/BlitzLobbyScreen'
import BlitzResultsScreen from '../screens/BlitzResultsScreen'
import DuelSetupScreen, { PLAYER_COLORS, PLAYER_EMOJIS } from '../screens/DuelSetupScreen'
import DuelPassScreen from '../screens/DuelPassScreen'
import DuelResultsScreen from '../screens/DuelResultsScreen'
import PuzzleDuJourScreen from '../screens/PuzzleDuJourScreen'
import RouteScreen from '../screens/RouteScreen'
import { getCategoryById, getTitrePartiel } from '../data/factsService'

export default function ScreenRenderer({
  screen, gameMode, sessionType, currentFact, currentIndex, totalRounds,
  selectedDifficulty, selectedCategory, sessionScore, correctCount, hintsUsed,
  selectedAnswer, isCorrect, pointsEarned, coinsEarnedLastSession,
  sessionCorrectFacts, sessionFacts, sessionsToday, sessionIsPerfect,
  completedLevels, effectiveDailyFact, launchMode, blitzFacts, blitzResults,
  duelPlayers, duelCurrentPlayerIndex, duelContext, isChallengeMode,
  user, storage, streak, newlyEarnedBadges, flashEnergy,
  showHowToPlay, modeConfigs,
  // Handlers
  handleHomeNavigate, handleHome, handleSelectDifficulty, handleSelectCategory,
  handleSelectAnswer, handleOpenValidate, handleUseHint, handleTimeout,
  handleNext, handleDuelNextPlayer, handleDuelStart, handleDuelPassReady,
  handleDuelReplay, handleReplay, handleReplayHarder, handleBlitzReplay, handleBlitzStart,
  handleBlitzFinish, handleStartWTFSession, handleShare, handleShareDailyFact,
  handleSaveTempFacts, handleLaunchStart,
  // Setters
  setScreen, setShowSettings, setShowHowToPlay, setStorage,
  onBadgeSeen, onModeSeen, onResetSocialNotif,
  socialNotifCount, pendingChallengesCount, navigate,
}) {
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
          dailyQuestsRemaining={Math.max(0, 3 - (sessionsToday || 0))}
          newlyEarnedBadges={newlyEarnedBadges}
          onBadgeSeen={onBadgeSeen}
          flashEnergyRemaining={flashEnergy.remaining}
          onNavigate={handleHomeNavigate}
          onOpenSettings={() => setShowSettings(true)}
          playerAvatar={user?.user_metadata?.avatar_url || localStorage.getItem('wtf_player_avatar') || null}
          gamesPlayed={storage.gamesPlayed || 0}
          unlockedFactsCount={storage.unlockedFacts instanceof Set ? storage.unlockedFacts.size : Array.isArray(storage.unlockedFacts) ? storage.unlockedFacts.length : 0}
          blitzPlayed={(() => { try { return JSON.parse(localStorage.getItem('wtf_data') || '{}').statsByMode?.blitz?.gamesPlayed || 0 } catch { return 0 } })()}
          questsPlayed={(() => { try { return JSON.parse(localStorage.getItem('wtf_data') || '{}').questsPlayed || 0 } catch { return 0 } })()}
          onModeSeen={onModeSeen}
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
          onStart={handleStartWTFSession}
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

      {screen === SCREENS.DIFFICULTY && (
        <DifficultyScreen
          onSelectDifficulty={handleSelectDifficulty}
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
          key={`${gameMode}-${duelCurrentPlayerIndex}-${currentFact.id}`}
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
          difficulty={(gameMode === 'solo' || gameMode === 'explorer') ? selectedDifficulty : null}
          playerName={gameMode === 'duel' ? duelPlayers[duelCurrentPlayerIndex]?.name : null}
          playerColor={gameMode === 'duel' ? PLAYER_COLORS[duelCurrentPlayerIndex] : null}
          playerEmoji={gameMode === 'duel' ? PLAYER_EMOJIS[duelCurrentPlayerIndex] : null}
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
          onNext={gameMode === 'duel' && !duelContext?.isLastPlayer ? handleDuelNextPlayer : handleNext}
          onShare={handleShare}
          onQuit={handleHome}
          factIndex={currentIndex}
          totalFacts={totalRounds}
          duelContext={duelContext}
          gameMode={gameMode}
          sessionScore={gameMode === 'duel' ? 0 : sessionScore}
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
          ticketEarned={sessionIsPerfect}
          onReplay={handleReplay}
          onReplayHarder={handleReplayHarder}
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

      {screen === SCREENS.EXPLORER_RESULTS && (
        <ResultsScreen
          score={sessionScore}
          correctCount={correctCount}
          totalFacts={sessionFacts.length}
          coinsEarned={coinsEarnedLastSession}
          sessionType="explorer"
          difficulty={selectedDifficulty}
          ticketEarned={false}
          onReplay={handleReplay}
          onHome={handleHome}
          unlockedFactsThisSession={sessionCorrectFacts}
          allSessionFacts={sessionFacts}
          sessionsToday={sessionsToday}
          onSaveTempFacts={handleSaveTempFacts}
          onCollection={() => navigate('/collection')}
        />
      )}

      {screen === SCREENS.BLITZ_LOBBY && (
        <BlitzLobbyScreen
          onSelectCategory={handleBlitzStart}
          onBack={handleHome}
          bestBlitzTime={JSON.parse(localStorage.getItem('wtf_data') || '{}').bestBlitzTime || null}
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
          opponentId={duelContext?.pendingDuel?.opponentId}
        />
      )}

      {screen === SCREENS.DUEL_SETUP && (
        <>
          {showHowToPlay && gameMode === 'duel' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
              <div className="w-full rounded-3xl p-6 border" style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.1)', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="text-4xl text-center mb-4">🎮</div>
                <h2 className="text-xl font-black text-center mb-3" style={{ color: '#1a1a2e' }}>Multijoueur</h2>
                <div className="text-sm mb-5" style={{ color: '#333', lineHeight: '1.6' }}>
                  <p className="mb-3"><strong>👥 Tour par tour :</strong> Chaque joueur répond à ses questions à son tour.</p>
                  <p className="mb-3"><strong>🏆 Scoring :</strong> <strong>5 pts</strong> sans indice • <strong>3 pts</strong> avec 1 indice • <strong>2 pts</strong> avec 2 indices.</p>
                  <p><strong>🎯 Gagnant :</strong> Le joueur avec le plus de points à la fin !</p>
                </div>
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <input type="checkbox" id="hideHowToPlayDuel" onChange={(e) => { if (e.target.checked) localStorage.setItem('wtf_hide_howtoplay', 'true') }} className="w-4 h-4 cursor-pointer" />
                  <label htmlFor="hideHowToPlayDuel" className="text-xs cursor-pointer" style={{ color: '#666' }}>Ne plus afficher</label>
                </div>
                <button onClick={() => setShowHowToPlay(false)} className="w-full py-3 rounded-2xl font-black text-sm active:scale-95 transition-all" style={{ background: '#FF6B1A', color: 'white' }}>
                  C'est parti !
                </button>
              </div>
            </div>
          )}
          <DuelSetupScreen onStart={handleDuelStart} onBack={handleHome} />
        </>
      )}

      {screen === SCREENS.DUEL_PASS && (
        <DuelPassScreen
          playerName={duelPlayers[duelCurrentPlayerIndex]?.name ?? ''}
          playerColor={PLAYER_COLORS[duelCurrentPlayerIndex]}
          playerEmoji={PLAYER_EMOJIS[duelCurrentPlayerIndex]}
          questionIndex={currentIndex}
          totalQuestions={totalRounds}
          onReady={handleDuelPassReady}
        />
      )}

      {screen === SCREENS.DUEL_RESULTS && (
        <DuelResultsScreen
          players={duelPlayers}
          onReplay={handleDuelReplay}
          onHome={handleHome}
        />
      )}

      {screen === SCREENS.PUZZLE_DU_JOUR && (
        <PuzzleDuJourScreen onHome={handleHome} setStorage={setStorage} />
      )}

      {screen === SCREENS.ROUTE && (
        <RouteScreen onHome={handleHome} setStorage={setStorage} />
      )}
    </>
  )
}
