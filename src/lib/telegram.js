import { createClient } from '@supabase/supabase-js'
import { useEffect } from 'react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
	supabaseUrl && supabaseAnonKey
		? createClient(supabaseUrl, supabaseAnonKey)
		: null

export function useTelegramInit() {
	useEffect(() => {
		window.Telegram?.WebApp?.ready?.()
	}, [])
}

export function getTelegramUser() {
	return (
		window.Telegram?.WebApp?.initDataUnsafe?.user ?? {
			id: 100000001,
			first_name: 'Тестовый',
			username: 'local_test_user'
		}
	)
}
