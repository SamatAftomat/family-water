export async function getQuestProgress(userId, today, families) {
	if (!supabase) return null

	// 1. ЛОГИ ЗА СЕГОДНЯ (для личного задания)
	const { data: logs } = await supabase
		.from('water_logs')
		.select('amount_ml, logged_at')
		.eq('user_id', userId)
		.gte('logged_at', new Date(`${today}T00:00:00+03:00`).toISOString())

	const safeLogs = logs || []
	const totalDrunk = safeLogs.reduce((sum, log) => sum + log.amount_ml, 0)
	const logCount = safeLogs.length
	const waterGoal = 2100

	// 2. ВЫБИРАЕМ 1 ПЕРСОНАЛЬНОЕ ЗАДАНИЕ НА ДЕНЬ (ротация по дню года)
	const dayOfYear = Math.floor(
		(Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
	)
	const personalQuestDef =
		questsData.personalQuests[dayOfYear % questsData.personalQuests.length]

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
	} else if (personalQuestDef.type === 'complete_goal') {
		pProgress = totalDrunk
		pDone = pProgress >= waterGoal
	}

	const personalQuest = {
		...personalQuestDef,
		progress: Math.min(pProgress, personalQuestDef.goal),
		done: pDone
	}

	// 3. СЕМЕЙНЫЕ ЗАДАНИЯ (только если есть семья)
	let familyQuests = []

	if (families && families.length > 0) {
		// Собираем ID всех принятых участников
		const allMemberIds = []
		families.forEach(fam => {
			fam.members
				.filter(m => m.status === 'accepted')
				.forEach(m => {
					if (!allMemberIds.includes(m.user_id)) allMemberIds.push(m.user_id)
				})
		})

		// Начало недели (понедельник) и месяца
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

		// Запрашиваем логи для недели и месяца
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

		familyQuests = questsData.familyQuests.map(q => {
			let progress = 0
			if (q.period === 'week') progress = weekTotal
			if (q.period === 'month') progress = monthTotal

			return {
				...q,
				progress: Math.min(progress, q.goal),
				done: progress >= q.goal
			}
		})
	}

	return {
		personal: personalQuest,
		family: familyQuests
	}
}
