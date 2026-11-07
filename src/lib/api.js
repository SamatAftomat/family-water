import { supabase } from './telegram'
import questsData from '../data/quests.json'

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
// ДЕЙСТВИЯ ПОЛЬЗОВАТЕЛЯ (ЧЕРЕЗ API)
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

export async function updateAppearanceDb(activeTitleId, activeFrameCss) {
	return callUserApi('update_appearance', { activeTitleId, activeFrameCss })
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
		.select(
			'id, first_name, water_goal_ml, active_title_id, active_frame_css, streak_days'
		)
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
					),
					active_title_id: prof?.active_title_id || 'title_default',
					active_frame_css: prof?.active_frame_css || '',
					streak_days: prof?.streak_days || 0
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
// УВЕДОМЛЕНИЯ
// ==========================================

export function showToast(message, type = 'info') {
	window.dispatchEvent(
		new CustomEvent('app-toast', { detail: { message, type } })
	)
}

// ==========================================
// ИНВЕНТАРЬ И ПОКУПКИ
// ==========================================

export async function getInventory(userId) {
	if (!supabase) return []
	const { data } = await supabase
		.from('inventory')
		.select('item_id')
		.eq('user_id', userId)
	const defaultItems = ['theme_default', 'title_default', 'frame_default']
	const owned = data ? data.map(i => i.item_id) : []
	return [...new Set([...defaultItems, ...owned])]
}

export async function buyItemApi(
	userId,
	itemId,
	price,
	skipDuplicateCheck = false
) {
	return callUserApi('buy_item', { itemId, price })
}

// ==========================================
// ДОСТИЖЕНИЯ
// ==========================================

export async function getClaimedAchievements(userId) {
	if (!supabase) return []
	const { data } = await supabase
		.from('user_achievements')
		.select('ach_id')
		.eq('user_id', userId)
	return data ? data.map(a => a.ach_id) : []
}

export async function claimAchievementApi(userId, achId, reward) {
	return callUserApi('claim_achievement', { achId, reward })
}

export async function getUserAchievements(userId) {
	if (!supabase) return []
	const { data } = await supabase
		.from('user_achievements')
		.select('ach_id')
		.eq('user_id', userId)
	return data ? data.map(a => a.ach_id) : []
}

// ==========================================
// ЗАДАНИЯ
// ==========================================

export async function getQuestProgress(userId, today, families) {
	if (!supabase) return null

	const { data: logs } = await supabase
		.from('water_logs')
		.select('amount_ml, logged_at')
		.eq('user_id', userId)
		.gte('logged_at', new Date(`${today}T00:00:00+03:00`).toISOString())

	const safeLogs = logs || []
	const totalDrunk = safeLogs.reduce((sum, log) => sum + log.amount_ml, 0)
	const logCount = safeLogs.length
	const waterGoal = 2100

	const todayDate = new Date(today)
	const dateSeed =
		todayDate.getFullYear() * 10000 +
		(todayDate.getMonth() + 1) * 100 +
		todayDate.getDate()
	const personalQuestDef =
		questsData.personalQuests[dateSeed % questsData.personalQuests.length]

	let pProgress = 0
	let pDone = false

	if (personalQuestDef.type === 'early_ml') {
		const earlyLogs = safeLogs.filter(l => {
			let raw = l.logged_at
			if (!raw.includes('Z') && !raw.includes('+')) raw += 'Z'
			return new Date(raw).getUTCHours() + 3 < 12
		})
		pProgress = earlyLogs.reduce((sum, l) => sum + l.amount_ml, 0)
		pDone = pProgress >= personalQuestDef.goal
	} else if (personalQuestDef.type === 'log_count') {
		pProgress = logCount
		pDone = pProgress >= personalQuestDef.goal
	} else if (personalQuestDef.type === 'late_ml') {
		const lateLogs = safeLogs.filter(l => {
			let raw = l.logged_at
			if (!raw.includes('Z') && !raw.includes('+')) raw += 'Z'
			return new Date(raw).getUTCHours() + 3 >= 21
		})
		pProgress = lateLogs.reduce((sum, l) => sum + l.amount_ml, 0)
		pDone = pProgress >= personalQuestDef.goal
	} else if (personalQuestDef.type === 'exact_200_logs') {
		pProgress = safeLogs.filter(l => l.amount_ml === 200).length
		pDone = pProgress >= personalQuestDef.goal
	} else if (personalQuestDef.type === 'single_log_400') {
		pProgress = safeLogs.some(l => l.amount_ml >= 400) ? 1 : 0
		pDone = pProgress >= personalQuestDef.goal
	} else if (
		personalQuestDef.type === 'complete_goal' ||
		personalQuestDef.type === 'total_ml'
	) {
		pProgress = totalDrunk
		pDone =
			pProgress >=
			(personalQuestDef.type === 'complete_goal'
				? waterGoal
				: personalQuestDef.goal)
	}

	const personalQuest = {
		...personalQuestDef,
		progress: Math.min(pProgress, personalQuestDef.goal),
		done: pDone
	}

	let familyQuests = []

	if (families && families.length > 0) {
		const allMemberIds = []
		families.forEach(fam => {
			fam.members
				.filter(m => m.status === 'accepted')
				.forEach(m => {
					if (!allMemberIds.includes(m.user_id)) allMemberIds.push(m.user_id)
				})
		})

		const now = new Date()
		const dayOfWeek = now.getDay() || 7
		const startOfWeek = new Date(now)
		startOfWeek.setDate(now.getDate() - dayOfWeek + 1)
		startOfWeek.setHours(0, 0, 0, 0)

		const startOfMonth = new Date(
			now.getFullYear(),
			now.getMonth(),
			1,
			0,
			0,
			0,
			0
		)

		const { data: weekLogs } = await supabase
			.from('water_logs')
			.select('amount_ml')
			.in('user_id', allMemberIds)
			.gte('logged_at', startOfWeek.toISOString())
		const { data: monthLogs } = await supabase
			.from('water_logs')
			.select('amount_ml')
			.in('user_id', allMemberIds)
			.gte('logged_at', startOfMonth.toISOString())

		const weekTotal = (weekLogs || []).reduce((sum, l) => sum + l.amount_ml, 0)
		const monthTotal = (monthLogs || []).reduce(
			(sum, l) => sum + l.amount_ml,
			0
		)

		const weeklyQuests = questsData.familyQuests
			.filter(q => q.period === 'week')
			.sort((a, b) => a.goal - b.goal)
		const monthlyQuests = questsData.familyQuests
			.filter(q => q.period === 'month')
			.sort((a, b) => a.goal - b.goal)

		let activeWeekly = weeklyQuests.find(q => weekTotal < q.goal)
		if (!activeWeekly) activeWeekly = weeklyQuests[weeklyQuests.length - 1]

		let activeMonthly = monthlyQuests.find(q => monthTotal < q.goal)
		if (!activeMonthly) activeMonthly = monthlyQuests[monthlyQuests.length - 1]

		if (activeWeekly) {
			familyQuests.push({
				...activeWeekly,
				progress: Math.min(weekTotal, activeWeekly.goal),
				done: weekTotal >= activeWeekly.goal
			})
		}

		if (activeMonthly) {
			familyQuests.push({
				...activeMonthly,
				progress: Math.min(monthTotal, activeMonthly.goal),
				done: monthTotal >= activeMonthly.goal
			})
		}

		const syncQuest = questsData.familyQuests.find(
			q => q.type === 'family_all_goal'
		)
		if (syncQuest) {
			let allDone = true
			families.forEach(fam => {
				fam.members
					.filter(m => m.status === 'accepted')
					.forEach(m => {
						if (m.progress < 100) allDone = false
					})
			})
			familyQuests.push({
				...syncQuest,
				progress: allDone ? 1 : 0,
				done: allDone
			})
		}
	}

	return { personal: personalQuest, family: familyQuests }
}

// ==========================================
// АДМИН-ПАНЕЛЬ
// ==========================================

async function callAdminApi(action, payload = {}) {
	const initData = window.Telegram?.WebApp?.initData
	if (!initData) return { error: 'Открыто вне Telegram' }
	const res = await fetch('/api/admin', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ initData, action, payload })
	})
	const data = await res.json()
	return res.ok ? data : { error: data.error }
}

export async function adminGetUsers() {
	return callAdminApi('get_users')
}
export async function adminUpdateDiamonds(targetId, amount) {
	return callAdminApi('update_diamonds', { targetId, amount })
}
export async function adminResetStreak(targetId) {
	return callAdminApi('reset_streak', { targetId })
}
export async function adminToggleBan(targetId, isBanned) {
	return callAdminApi('toggle_ban', { targetId, isBanned })
}
export async function adminGiveItem(targetId, itemId) {
	return callAdminApi('give_item', { targetId, itemId })
}
export async function adminSendMessage(targetId, text) {
	return callAdminApi('send_message', { targetId, text })
}
export async function adminGetPrices() {
	return callAdminApi('get_prices')
}
export async function adminUpdatePrices(prices) {
	return callAdminApi('update_prices', { prices })
}
export async function adminRemoveItem(targetId, itemId) {
	return callAdminApi('remove_item', { targetId, itemId })
}
export async function adminClearInventory(targetId) {
	return callAdminApi('clear_inventory', { targetId })
}
