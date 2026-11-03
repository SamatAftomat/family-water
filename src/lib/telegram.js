import { createClient } from '@supabase/supabase-js'
import { useEffect } from 'react'

// Чтение переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient = null

try {
	if (supabaseUrl && supabaseAnonKey) {
		supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
			auth: {
				autoRefreshToken: true,
				persistSession: true
			}
		})
	} else {
		console.warn(
			'⚠️ ВНИМАНИЕ: Переменные Supabase не найдены! Работаем в локальном режиме.'
		)
	}
} catch (error) {
	console.error('Ошибка при подключении к Supabase:', error)
}

export const supabase = supabaseClient

// Инициализация Telegram WebApp
export function useTelegramInit() {
	useEffect(() => {
		window.Telegram?.WebApp?.ready?.()
	}, [])
}

export function getTelegramUser() {
	// Безопасное получение пользователя (с фоллбэком для браузера)
	const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user

	if (tgUser) return tgUser

	// Если мы в браузере, возвращаем тестового пользователя
	return {
		id: 100000001,
		first_name: 'Тестовый',
		username: 'local_test_user'
	}
}
