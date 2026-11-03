import { useEffect, useState } from 'react'
import { useTelegramInit, getTelegramUser } from './lib/telegram'
import { getUserProfile } from './lib/api'
import Onboarding from './components/Onboarding'
import MainScreen from './components/MainScreen'

function App() {
  useTelegramInit()
  const [isReady, setIsReady] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      // 1. Если в памяти уже есть отметка — пускаем сразу
      if (localStorage.getItem('family-water-onboarded') === 'true') {
        setShowOnboarding(false)
        setIsReady(true)
        return
      }

      // 2. Если памяти нет, проверяем в базе (вдруг это новое устройство)
      const userId = Number(getTelegramUser().id)
      const dbProfile = await getUserProfile(userId)
      
      if (dbProfile) {
        localStorage.setItem('family-water-onboarded', 'true')
        localStorage.setItem('family-water-profile', JSON.stringify(dbProfile))
        setShowOnboarding(false)
      } else {
        setShowOnboarding(true)
      }
      setIsReady(true)
    }
    checkAuth()
  }, [])

  if (!isReady) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Загрузка... 💧</div>

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }
  return <MainScreen />
}

export default App