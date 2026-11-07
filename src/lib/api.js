import { supabase } from './telegram'

// ==========================================
// БАЗОВЫЕ ФУНКЦИИ
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
		let rawDate = log.logged_at
		if (!rawDate.includes('Z') && !rawDate.includes('+')) {
			rawDate = rawDate.replace(' ', 'T') + 'Z'
		}
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

// ==========================================
// ДЕЙСТВИЯ ПОЛЬЗОВАТЕЛЯ
// ==========================================

async function callUserApi(action, payload = {}) {
	const initData = window.Telegram?.WebApp?.initData
	if (!initData) return { error: 'Откройте через Telegram' }

	const res = await fetch('/api/user-action', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ initData, action, payload })
	})
	const data = await res.json()
	return res.ok ? { success: true } : { error: data.error }
}

export async function addWaterToDb(userId, amount, profile) {
	const initData = window.Telegram?.WebApp?.initData
	if (!initData) throw new Error('Откройте приложение через Telegram')

	try {
		const response = await fetch('/api/add-water', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ initData, amount })
		})

		if (!response.ok) {
			const err = await response.json()
			throw new Error(err.error || 'Ошибка сервера')
		}
	} catch (error) {
		throw new Error(error.message || 'Ошибка соединения')
	}
}

export async function deleteLogFromDb(logId) {
	return callUserApi('delete_log', { logId })
}

export async function clearTodayLogs(startOfDayISO) {
	return callUserApi('clear_logs', { startOfDay: startOfDayISO })
}

export async function updateProfileDb(name, weight) {
	return callUserApi('update_profile', { name, weight })
}

// ==========================================
// СЕМЕЙНЫЕ ГРУППЫ
// ==========================================

export async function getMyFamilies(userId, dateStr) {
	if (!supabase) return []
	const { data: myMemberships } = await supabase
		.from('family_members')
		.select('family_id')
		.eq('user_id', userId)
		.eq('status', 'accepted')
	if (!myMemberships || myMemberships.length === 0) return []
	const familyIds = myMemberships.map(m => m.family_id)

	const { data: families } = await supabase
		.from('families')
		.select('*')
		.in('id', familyIds)
	const { data: allMembers } = await supabase
		.from('family_members')
		.select('*')
		.in('family_id', familyIds)
	const allUserIds = allMembers
		? [...new Set(allMembers.map(m => m.user_id))]
		: []
	const { data: profiles } = await supabase
		.from('users')
		.select('*')
		.in('id', allUserIds)

	const startOfDay = new Date(`${dateStr}T00:00:00+03:00`)
	const endOfDay = new Date(`${dateStr}T23:59:59.999+03:00`)
	const { data: logs } = await supabase
		.from('water_logs')
		.select('user_id, amount_ml')
		.in('user_id', allUserIds)
		.gte('logged_at', startOfDay.toISOString())
		.lte('logged_at', endOfDay.toISOString())

	return (families || []).map(fam => {
		const members = (allMembers || [])
			.filter(m => m.family_id === fam.id)
			.map(m => {
				const prof = (profiles || []).find(p => p.id === m.user_id)
				const drank = (logs || [])
					.filter(l => l.user_id === m.user_id)
					.reduce((sum, l) => sum + l.amount_ml, 0)
				return {
					...m,
					first_name: prof?.first_name || 'Пользователь',
					drank_today: drank,
					water_goal_ml: prof?.water_goal_ml || 2100,
					progress: Math.min(
						Math.round((drank / (prof?.water_goal_ml || 2100)) * 100),
						100
					)
				}
			})
		return { ...fam, members }
	})
}

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
	return invites.map(inv => ({
		...inv,
		familyName: families?.find(f => f.id === inv.family_id)?.name || 'Семья'
	}))
}

async function callFamilyApi(action, payload = {}) {
	const initData = window.Telegram?.WebApp?.initData
	if (!initData) return { error: 'Откройте через Telegram' }
	const res = await fetch('/api/family-action', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ initData, action, payload })
	})
	const data = await res.json()
	return res.ok ? { success: true } : { error: data.error }
}

export async function createFamily(userId, familyName) {
	return callFamilyApi('create', { name: familyName })
}
export async function inviteToFamily(familyId, userId, senderName, familyName) {
	return callFamilyApi('invite', { familyId, inviteeId: userId, familyName })
}
export async function acceptFamilyInvite(familyId, userId) {
	return callFamilyApi('accept', { familyId })
}
export async function deleteFamily(familyId) {
	return callFamilyApi('delete', { familyId })
}
export async function kickFromFamily(familyId, memberId) {
	return callFamilyApi('kick', { familyId, memberId })
}
export async function renameFamily(familyId, newName) {
	return callFamilyApi('rename', { familyId, newName })
}

// ==========================================
// УВЕДОМЛЕНИЯ И ЗАДАНИЯ (ТОЛЬКО ОДИН РАЗ)
// ==========================================

export function showToast(message, type = 'info') {
	window.dispatchEvent(
		new CustomEvent('app-toast', { detail: { message, type } })
	)
}

export async function getQuestProgress(userId, today, families) {
	if (!supabase) return null

	const { data: logs } = await supabase
		.from('water_logs')
		.select('amount_ml, logged_at')
		.eq('user_id', userId)
		.gte('logged_at', new Date(`${today}T00:00:00+03:00`).toISOString())

	const totalDrunk = (logs || []).reduce((sum, log) => sum + log.amount_ml, 0)
	const logCount = logs ? logs.length : 0

	const earlyLogs = (logs || []).filter(l => {
		let raw = l.logged_at
		if (!raw.includes('Z') && !raw.includes('+')) raw += 'Z'
		const h = new Date(raw).getUTCHours() + 3
		return h < 12
	})
	const earlyTotal = earlyLogs.reduce((sum, log) => sum + log.amount_ml, 0)
	const earlyBirdDone = earlyTotal >= 500

	const marathonDone = logCount >= 5

	let familyTotal = 0
	if (families && families.length > 0) {
		families.forEach(fam => {
			fam.members.forEach(m => {
				familyTotal += m.drank_today
			})
		})
	}
	const familyChestDone = familyTotal >= 10000

	return {
		earlyBird: {
			done: earlyBirdDone,
			progress: Math.min(earlyTotal, 500),
			goal: 500,
			reward: 5
		},
		marathon: {
			done: marathonDone,
			progress: Math.min(logCount, 5),
			goal: 5,
			reward: 3
		},
		familyChest: {
			done: familyChestDone,
			progress: Math.min(familyTotal, 10000),
			goal: 10000,
			reward: 15
		}
	}
}
