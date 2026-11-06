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
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Используем серверный ключ

	if (!botToken || !supabaseUrl || !supabaseKey) {
		return res.status(500).json({ error: 'В Vercel не добавлены переменные!' })
	}

	const supabase = createClient(supabaseUrl, supabaseKey)
	const now = new Date()

	// Время по МСК
	const moscowTime = new Date(now.getTime() + 3 * 60 * 60 * 1000)
	const hour = moscowTime.getUTCHours()

	const today = moscowTime.toISOString().slice(0, 10)
	const startOfDay = new Date(`${today}T00:00:00+03:00`).toISOString()
	const endOfDay = new Date(`${today}T23:59:59.999+03:00`).toISOString()

	// НОВЫЕ ГРАНИЦЫ ВРЕМЕНИ
	let messagePool = []
	let isThreat = false

	if (hour >= 7 && hour < 11)
		messagePool = morningMessages // Утро (7:00 - 10:59)
	else if (hour >= 11 && hour < 17)
		messagePool = dayMessages // День (11:00 - 16:59)
	else if (hour >= 17 && hour < 21)
		messagePool = eveningMessages // Вечер (17:00 - 20:59)
	else if (hour >= 21 && hour < 23) {
		messagePool = threatMessages
		isThreat = true
	} // Угрозы (21:00 - 22:59)
	else
		return res
			.status(200)
			.json({ msg: `Сейчас ночь (${hour} ч.), бот молчит.` })

	// Получаем всех пользователей
	const { data: users, error } = await supabase.from('users').select('*')
	if (error || !users || users.length === 0)
		return res.status(200).json({ msg: 'В базе нет пользователей' })

	let sentCount = 0
	let skippedCount = 0
	let errors = []

	for (const user of users) {
		// Защита от спама (если отправляли меньше 1.5 часов назад — пропускаем)
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

		// Проверка выпитой воды
		const { data: logs } = await supabase
			.from('water_logs')
			.select('amount_ml')
			.eq('user_id', user.id)
			.gte('logged_at', startOfDay)
			.lte('logged_at', endOfDay)

		const totalDrunk = logs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0

		if (totalDrunk >= user.water_goal_ml) {
			skippedCount++
			continue
		}

		// ФОРМИРУЕМ СООБЩЕНИЕ
		let text = messagePool[Math.floor(Math.random() * messagePool.length)]

		if (isThreat) {
			const streak = user.streak_days || 0
			if (streak > 0) {
				// Если стрик есть, подставляем цифру и пугаем
				text = text.replace('{N}', streak)
			} else {
				// Если стрика нет, отправляем обычное вечернее сообщение (без угроз)
				text =
					eveningMessages[Math.floor(Math.random() * eveningMessages.length)]
			}
		}

		// ОТПРАВЛЯЕМ
		const tgResponse = await fetch(
			`https://api.telegram.org/bot${botToken}/sendMessage`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chat_id: user.id, text })
			}
		)

		const tgResult = await tgResponse.json()

		if (tgResult.ok) {
			sentCount++
			await supabase
				.from('users')
				.update({ last_notified_at: now.toISOString() })
				.eq('id', user.id)
		} else {
			errors.push(`Ошибка Telegram для ${user.id}: ${tgResult.description}`)
		}
	}

	res.status(200).json({
		ok: true,
		час_на_сервере_мск: hour,
		всего_юзеров: users.length,
		успешно_отправлено: sentCount,
		пропущено: skippedCount,
		ошибки: errors
	})
}
