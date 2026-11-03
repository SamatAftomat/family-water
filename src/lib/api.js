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

export async function addWaterToDb(userId, amount) {
	if (!supabase) throw new Error('Нет подключения к базе')
	const { error } = await supabase.rpc('record_water_log', {
		p_user_id: userId,
		p_amount_ml: amount
	})
	if (error) throw new Error(error.message)
}
