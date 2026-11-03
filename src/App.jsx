import { useEffect, useState } from 'react'
import { useTelegramInit } from './lib/telegram'
import Onboarding from './components/Onboarding'
import MainScreen from './components/MainScreen'

function App() {
  useTelegramInit()

  const [showOnboarding, setShowOnboarding] = useState(
    localStorage.getItem('family-water-onboarded') !== 'true'
  )

  useEffect(() => {
    setShowOnboarding(localStorage.getItem('family-water-onboarded') !== 'true')
  }, [])

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }
  return <MainScreen />
}

export default App
