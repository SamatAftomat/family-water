import { createClient } from '@supabase/supabase-js'
import { useEffect } from 'react'

// Чтение переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  }
})

// Иницирование Telegram WebApp
export function useTelegramInit() {
  useEffect(() => {
    // Telegram WebApp инициализируется автоматически при открытии Mini App
    // user.id, first_name, username передаются через initDataUnsafe.user
    window.Telegram?.WebApp?.ready?.()
  }, [])
}

export function getTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? {
    id: 100000001,
    first_name: 'Тестовый пользователь',
    username: 'local_test_user',
  }
}
