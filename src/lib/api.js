import { supabase } from './telegram'

export async function getUserProfile(userId) {
	if (!supabase) return null
	// Используем maybeSingle, чтобы не было ошибки, если юзера еще нет
	const { data } = await supabase
		.from('users')
		.select('*')
		.eq('id', userId)
		.maybeSingle()
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

// НОВАЯ ФУНКЦИЯ: Загрузка логов за 7 дней для графика
export async function getLast7DaysTotal(userId) {
	if (!supabase) return {}

	const sevenDaysAgo = new Date()
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

	const { data } = await supabase
		.from('water_logs')
		.select('amount_ml, logged_at')
		.eq('user_id', userId)
		.gte('logged_at', sevenDaysAgo.toISOString())

	// Группируем по датам
	const totals = {}
	;(data || []).forEach(log => {
		// Берем только дату YYYY-MM-DD из timestamp
		const date = new Date(log.logged_at).toISOString().slice(0, 10)
		totals[date] = (totals[date] || 0) + log.amount_ml
	})

	return totals
}

export async function addWaterToDb(userId, amount, profile) {
	if (!supabase) throw new Error('Нет подключения к базе')

	const { error: upsertError } = await supabase.from('users').upsert({
		id: userId,
		first_name: profile?.first_name || 'Пользователь',
		weight_kg: profile?.weight_kg || 70,
		water_goal_ml: profile?.water_goal_ml || 2100
	})

	if (upsertError) throw new Error('Ошибка профиля: ' + upsertError.message)

	const { error: rpcError } = await supabase.rpc('record_water_log', {
		p_user_id: userId,
		p_amount_ml: amount
	})

	if (rpcError) throw new Error(rpcError.message)
}

// НОВАЯ ФУНКЦИЯ: Удаление записи из базы
export async function deleteLogFromDb(logId) {
	if (!supabase) return
	await supabase.from('water_logs').delete().eq('id', logId)
}
