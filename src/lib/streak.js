// Strick = серия дней подряд, в которые выполнена дневная норма.
// Поле goal_reached_date пишется только при выполнении нормы,
// поэтому живость стрика проверяем по нему, а не по last_water_date.

export function shiftDate(dateStr, days) {
	const d = new Date(`${dateStr}T00:00:00Z`)
	d.setUTCDate(d.getUTCDate() + days)
	return d.toISOString().slice(0, 10)
}

export function getEffectiveStreak(profile, today) {
	const reached = profile?.goal_reached_date
	if (!reached || !today) return 0
	if (reached === today || reached === shiftDate(today, -1)) {
		return profile.streak_days || 0
	}
	return 0
}
