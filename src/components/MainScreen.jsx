async function addWater(amount) {
	const value = Number(amount)

	if (!Number.isFinite(value) || value <= 0) return
	if (value > 2000) return alert('Слишком много за один раз! Максимум 2000 мл.')
	if (total + value > 5000)
		return alert('Вы превысили суточный лимит в 5000 мл!')

	setIsAdding(true)

	try {
		// Передаем profile третьим аргументом!
		await addWaterToDb(userId, value, profile)

		const updatedProfile = await getUserProfile(userId)
		const updatedLogs = await getTodayLogs(userId, today)

		setProfile(updatedProfile)
		setLogs(updatedLogs)

		localStorage.setItem('family-water-profile', JSON.stringify(updatedProfile))
		localStorage.setItem('family-water-logs', JSON.stringify(updatedLogs))
	} catch (err) {
		alert('Ошибка сохранения: ' + err.message)
	} finally {
		setIsAdding(false)
		setCustomAmount('')
		setShowCustom(false)
	}
}
