import { supabase } from './telegram'

// ==========================================
// БАЗОВЫЕ ФУНКЦИИ ПРОФИЛЯ И ВОДЫ
// ==========================================

export async function getUserProfile(userId) {
	if (!supabase) return null
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

export async function getLast7DaysTotal(userId) {
	if (!supabase) return {}

	const sevenDaysAgo = new Date()
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

	const { data } = await supabase
		.from('water_logs')
		.select('amount_ml, logged_at')
		.eq('user_id', userId)
		.gte('logged_at', sevenDaysAgo.toISOString())

	const totals = {}
	;(data || []).forEach(log => {
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

export async function deleteLogFromDb(logId) {
	if (!supabase) return
	await supabase.from('water_logs').delete().eq('id', logId)
}

// ==========================================
// ЛОГИКА СЕМЬИ
// ==========================================

export async function sendFamilyRequest(requesterId, receiverId) {
	if (!supabase) return { error: 'Нет связи с базой' }
	if (requesterId === receiverId)
		return { error: 'Нельзя добавить самого себя' }

	const { data: target } = await supabase
		.from('users')
		.select('id')
		.eq('id', receiverId)
		.maybeSingle()
	if (!target)
		return {
			error:
				'Пользователь с таким ID не найден. Попроси его зайти в приложение!'
		}

	const { data: existing, error: searchError } = await supabase
		.from('family_links')
		.select('status')
		.or(
			`and(requester_id.eq.${requesterId},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${requesterId})`
		)
		.limit(1)

	if (searchError) return { error: 'Ошибка базы: ' + searchError.message }

	if (existing && existing.length > 0) {
		if (existing[0].status === 'accepted')
			return { error: 'Вы уже в одной семье' }
		if (existing[0].status === 'pending')
			return { error: 'Запрос уже отправлен' }
	}

	const { error } = await supabase.from('family_links').insert({
		requester_id: requesterId,
		receiver_id: receiverId
	})

	if (error) return { error: 'Ошибка БД: ' + error.message }

	const { data: sender } = await supabase
		.from('users')
		.select('first_name')
		.eq('id', requesterId)
		.single()
	const senderName = sender?.first_name || 'Кто-то'

	fetch('https://family-water.vercel.app/api/notify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ receiverId, senderName })
	}).catch(console.error)

	return { success: true }
}

export async function getFamilyData(userId, dateStr) {
	if (!supabase) return { members: [], incoming: [], outgoing: [] }

	const { data: links } = await supabase
		.from('family_links')
		.select('*')
		.or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)

	if (!links) return { members: [], incoming: [], outgoing: [] }

	const incoming = links.filter(
		l => l.receiver_id === userId && l.status === 'pending'
	)
	const outgoing = links.filter(
		l => l.requester_id === userId && l.status === 'pending'
	)
	const acceptedLinks = links.filter(l => l.status === 'accepted')

	const memberIds = acceptedLinks.map(l =>
		l.requester_id === userId ? l.receiver_id : l.requester_id
	)

	if (memberIds.length === 0) return { members: [], incoming, outgoing }

	const { data: profiles } = await supabase
		.from('users')
		.select('*')
		.in('id', memberIds)

	const { data: logs } = await supabase
		.from('water_logs')
		.select('user_id, amount_ml')
		.in('user_id', memberIds)
		.gte('logged_at', `${dateStr}T00:00:00Z`)

	const members = (profiles || []).map(p => {
		const drank = (logs || [])
			.filter(l => l.user_id === p.id)
			.reduce((sum, l) => sum + l.amount_ml, 0)
		return {
			...p,
			drank_today: drank,
			progress: Math.min(Math.round((drank / p.water_goal_ml) * 100), 100)
		}
	})

	return { members, incoming, outgoing }
}

export async function respondToRequest(linkId, status) {
	if (!supabase) return
	await supabase.from('family_links').update({ status }).eq('id', linkId)
}

// НОВАЯ ФУНКЦИЯ: Отвязать члена семьи
export async function removeFamilyLink(userId, memberId) {
	if (!supabase) return

	// Удаляем связь между двумя пользователями (в любую сторону)
	await supabase
		.from('family_links')
		.delete()
		.or(
			`and(requester_id.eq.${userId},receiver_id.eq.${memberId}),and(requester_id.eq.${memberId},receiver_id.eq.${userId})`
		)
}
