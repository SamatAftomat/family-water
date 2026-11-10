import { createClient } from '@supabase/supabase-js'
import {
	morningMessages,
	dayMessages,
	eveningMessages,
	threatMessages
} from './messages.js'

export default async function handler(req, res) {
	const { searchParams } = new URL(
		req.url,
		`https://${req.headers.host || 'localhost'}`
	)
	const secret = searchParams.get('key')

	if (secret !== 'water_secret_2024') {
		return res.status(401).json({ error: 'Unauthorized: Неверный ключ' })
	}

	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!botToken || !supabaseUrl || !supabaseKey) {
		return res.status(500).json({ error: 'В Vercel не добавлены переменные!' })
	}

	const supabase = createClient(supabaseUrl, supabaseKey)
	const now = new Date()

	const moscowTime = new Date(now.getTime() + 3 * 60 * 60 * 1000)
	const hour = moscowTime.getUTCHours()

	const today = moscowTime.toISOString().slice(0, 10)
	const startOfDay = new Date(`${today}T00:00:00+03:00`).toISOString()
	const endOfDay = new Date(`${today}T23:59:59.999+03:00`).toISOString()

	let isThreat = false
	if (hour >= 21 && hour < 23) isThreat = true

	if (hour < 7 || hour >= 23)
		return res.status(200).json({ msg: 'Ночь, бот молчит' })

	const { data: users, error } = await supabase.from('users').select('*')
	if (error || !users || users.length === 0)
		return res.status(200).json({ msg: 'В базе нет пользователей' })

	let sentCount = 0
	let skippedCount = 0

	for (const user of users) {
		const lastNotified = user.last_notified_at
			? new Date(user.last_notified_at)
			: null
		if (lastNotified) {
			const diffInHours = (now - lastNotified) / (1000 * 60 * 60)
			if (diffInHours < 1.5) {
				skippedCount++
				continue
			}
		}

		const { data: logs } = await supabase
			.from('water_logs')
			.select('amount_ml')
			.eq('user_id', user.id)
			.gte('logged_at', startOfDay)
			.lte('logged_at', endOfDay)

		const totalDrunk = logs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0
		const goal = user.water_goal_ml || 2100

		if (totalDrunk >= goal) {
			skippedCount++
			continue
		}

		// УМНЫЕ НАПОМИНАНИЯ
		let text = ''
		const progress = totalDrunk / goal

		if (isThreat) {
			const streak = user.streak_days || 0
			if (streak > 0) {
				text = `⚠️ Твой стрик ${streak} дней под угрозой! Выпей еще ${goal - totalDrunk} мл до конца дня!`
			} else {
				text = `⏰ Осталось совсем мало времени! Успей выпить ${goal - totalDrunk} мл воды.`
			}
		} else if (progress === 0) {
			// Если еще ничего не пил
			if (hour < 12)
				text = `☀️ Доброе утро! Начни день со стакана воды. Твоя цель: ${goal} мл.`
			else if (hour < 18)
				text = `💧 Ты еще не пил воду сегодня! Самое время начать. Цель: ${goal} мл.`
			else
				text = `😱 Ты не выпил ни капли за день! Срочно выпей хотя бы стакан воды.`
		} else if (progress < 0.5) {
			// Выпил меньше половины
			if (hour < 18)
				text = `💧 Ты выпил ${totalDrunk} из ${goal} мл. Продолжай в том же духе!`
			else
				text = `🌆 Вечер уже близко. Ты выпил только ${totalDrunk} мл. Осталось ${goal - totalDrunk} мл!`
		} else if (progress < 0.9) {
			// Выпил больше половины
			text = `💪 Отличный прогресс! Ты выпил ${totalDrunk} мл. Осталось совсем немного: ${goal - totalDrunk} мл!`
		} else {
			// Почти у цели
			text = `🔥 Ты почти у цели! Осталось выпить всего ${goal - totalDrunk} мл. Сделай последний рывок!`
		}

		if (text) {
			await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chat_id: user.id, text })
			})
			sentCount++
			await supabase
				.from('users')
				.update({ last_notified_at: now.toISOString() })
				.eq('id', user.id)
		}
	}

	res.status(200).json({ ok: true, sent: sentCount, skipped: skippedCount })
}
