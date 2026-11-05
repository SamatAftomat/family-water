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

	const startOfDay = new Date(`${dateStr}T00:00:00+03:00`)
	const endOfDay = new Date(`${dateStr}T23:59:59.999+03:00`)

	const { data } = await supabase
		.from('water_logs')
		.select('*')
		.eq('user_id', userId)
		.gte('logged_at', startOfDay.toISOString())
		.lte('logged_at', endOfDay.toISOString())
		.order('logged_at', { ascending: false })

	return (data || []).map(log => {
		// Берем строку из базы
		let rawDate = log.logged_at

		// Если в ней нет указания на часовой пояс, добавляем 'Z' (означает UTC)
		if (!rawDate.includes('Z') && !rawDate.includes('+')) {
			rawDate = rawDate.replace(' ', 'T') + 'Z'
		}

		// Теперь браузер точно знает, что это UTC, и корректно переведет в МСК
		const mskTime = new Date(rawDate).toLocaleTimeString('ru-RU', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'Europe/Moscow'
		})

		return {
			id: log.id.toString(),
			amount: log.amount_ml,
			time: mskTime,
			date: dateStr
		}
	})
}

export async function getLast7DaysTotal(userId) {
	if (!supabase) return {}
	const sevenDaysAgo = new Date()
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
	sevenDaysAgo.setHours(0, 0, 0, 0)

	const { data } = await supabase
		.from('water_logs')
		.select('amount_ml, logged_at')
		.eq('user_id', userId)
		.gte('logged_at', sevenDaysAgo.toISOString())

	const totals = {}
	;(data || []).forEach(log => {
		const d = new Date(log.logged_at)
		const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
		totals[localDate] = (totals[localDate] || 0) + log.amount_ml
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
// СЕМЕЙНЫЕ ГРУППЫ
// ==========================================

// Создать новую группу
export async function createFamily(userId, familyName) {
	if (!supabase) return { error: 'Нет связи с базой' }

	const { data: family, error } = await supabase
		.from('families')
		.insert({
			name: familyName,
			owner_id: userId
		})
		.select()
		.single()

	if (error) return { error: error.message }

	await supabase.from('family_members').insert({
		family_id: family.id,
		user_id: userId,
		role: 'owner',
		status: 'accepted'
	})

	return { success: true, familyId: family.id }
}

// Получить мои группы и участников (с прогрессом воды)
export async function getMyFamilies(userId, dateStr) {
	if (!supabase) return []

	// 1. Ищем все группы, где я состою (принят)
	const { data: myMemberships } = await supabase
		.from('family_members')
		.select('family_id')
		.eq('user_id', userId)
		.eq('status', 'accepted')

	if (!myMemberships || myMemberships.length === 0) return []
	const familyIds = myMemberships.map(m => m.family_id)

	// 2. Загружаем сами группы
	const { data: families } = await supabase
		.from('families')
		.select('*')
		.in('id', familyIds)

	// 3. Загружаем всех участников
	const { data: allMembers } = await supabase
		.from('family_members')
		.select('*')
		.in('family_id', familyIds)

	const allUserIds = allMembers
		? [...new Set(allMembers.map(m => m.user_id))]
		: []

	// 4. Загружаем профили (имена, цели)
	const { data: profiles } = await supabase
		.from('users')
		.select('*')
		.in('id', allUserIds)

	// 5. Загружаем воду за сегодня для всех участников
	const startOfDay = new Date(`${dateStr}T00:00:00`)
	const endOfDay = new Date(`${dateStr}T23:59:59.999`)

	const { data: logs } = await supabase
		.from('water_logs')
		.select('user_id, amount_ml')
		.in('user_id', allUserIds)
		.gte('logged_at', startOfDay.toISOString())
		.lte('logged_at', endOfDay.toISOString())

	// 6. Собираем всё воедино
	return (families || []).map(fam => {
		const members = (allMembers || [])
			.filter(m => m.family_id === fam.id)
			.map(m => {
				const prof = (profiles || []).find(p => p.id === m.user_id)

				const drank = (logs || [])
					.filter(l => l.user_id === m.user_id)
					.reduce((sum, l) => sum + l.amount_ml, 0)
				const goal = prof?.water_goal_ml || 2100
				const progress = Math.min(Math.round((drank / goal) * 100), 100)

				return {
					...m,
					first_name: prof?.first_name || 'Пользователь',
					drank_today: drank,
					water_goal_ml: goal,
					progress
				}
			})
		return {
			...fam,
			members
		}
	})
}

// Пригласить человека в группу (с уведомлением)
export async function inviteToFamily(familyId, userId, senderName, familyName) {
	if (!supabase) return { error: 'Нет связи с базой' }

	const { data: existing } = await supabase
		.from('family_members')
		.select('status')
		.eq('family_id', familyId)
		.eq('user_id', userId)
		.maybeSingle()

	if (existing)
		return { error: 'Этот человек уже в группе или ждет подтверждения' }

	const { error } = await supabase.from('family_members').insert({
		family_id: familyId,
		user_id: userId,
		role: 'member',
		status: 'pending'
	})

	if (error) return { error: error.message }

	fetch('https://family-water.vercel.app/api/notify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			receiverId: userId,
			senderName,
			type: 'family',
			groupName: familyName
		})
	}).catch(console.error)

	return { success: true }
}

// Принять приглашение
export async function acceptFamilyInvite(familyId, userId) {
	if (!supabase) return { error: 'Нет связи с базой' }
	const { error } = await supabase
		.from('family_members')
		.update({ status: 'accepted' })
		.eq('family_id', familyId)
		.eq('user_id', userId)

	if (error) return { error: error.message }
	return { success: true }
}

// Получить входящие приглашения
export async function getMyInvites(userId) {
	if (!supabase) return []

	const { data: invites } = await supabase
		.from('family_members')
		.select('*')
		.eq('user_id', userId)
		.eq('status', 'pending')

	if (!invites || invites.length === 0) return []

	const familyIds = invites.map(i => i.family_id)
	const { data: families } = await supabase
		.from('families')
		.select('*')
		.in('id', familyIds)

	return invites.map(inv => {
		const fam = families?.find(f => f.id === inv.family_id)
		return { ...inv, familyName: fam?.name || 'Семья' }
	})
}

// Удалить группу
export async function deleteFamily(familyId) {
	if (!supabase) return
	await supabase.from('family_members').delete().eq('family_id', familyId)
	const { error } = await supabase.from('families').delete().eq('id', familyId)
	return { error: error?.message }
}

// Выгнать участника
export async function kickFromFamily(familyId, memberId) {
	if (!supabase) return
	const { error } = await supabase
		.from('family_members')
		.delete()
		.eq('family_id', familyId)
		.eq('user_id', memberId)
	return { error: error?.message }
}

// Переименовать группу
export async function renameFamily(familyId, newName) {
	if (!supabase) return
	const { error } = await supabase
		.from('families')
		.update({ name: newName })
		.eq('id', familyId)
	return { error: error?.message }
}
