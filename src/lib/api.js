import { supabase } from './telegram'

export async function getUserProfile(userId) {
	if (!supabase) return null
	const { data } = await supabase
		.from('users')
		.select('*')
		.eq('id', userId)
		.single()
	return data
}

export async function getTodayLogs(userId, dateStr) {
	if (!supabase) return []
	const { data } = await supabase
		.from('water_logs')
		.select('*')
		.eq('user_id', userId)
		.gte('logged_at', `${dateStr}T00:00:00Z`)
		.lte('logged_at', `${dateStr}T23:59:59Z`)
		.order('logged_at', { ascending: false })

	return (data || []).map(log => ({
		id: log.id.toString(),
		amount: log.amount_ml,
		time: new Date(log.logged_at).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		}),
		date: dateStr
	}))
}

// ДОБАВЛЕНА ПРОВЕРКА: Создаем пользователя, если его нет
export async function addWaterToDb(userId, amount, profile) {
	if (!supabase) throw new Error('Нет подключения к базе')

	// 1. Убеждаемся, что пользователь есть в базе (на случай смены устройства)
	const { error: upsertError } = await supabase.from('users').upsert({
		id: userId,
		first_name: profile?.first_name || 'Пользователь',
		weight_kg: profile?.weight_kg || 70,
		water_goal_ml: profile?.water_goal_ml || 2100
	})

	if (upsertError) throw new Error('Ошибка профиля: ' + upsertError.message)

	// 2. Записываем воду
	const { error: rpcError } = await supabase.rpc('record_water_log', {
		p_user_id: userId,
		p_amount_ml: amount
	})

	if (rpcError) throw new Error(rpcError.message)
}
