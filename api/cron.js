import { createClient } from '@supabase/supabase-js'
import {
	morningMessages,
	dayMessages,
	eveningMessages,
	threatMessages
} from './messages.js'

export default async function handler(req, res) {
	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

	if (!botToken || !supabaseUrl || !supabaseKey) {
		return res.status(500).json({ error: 'Missing env variables' })
	}

	const supabase = createClient(supabaseUrl, supabaseKey)

	// Получаем текущее время (по UTC)
	const now = new Date()
	// Переводим в МСК (UTC+3). Если у тебя другой часовой пояс, измени цифру 3.
	const hour = (now.getUTCHours() + 3) % 24
	const today = now.toISOString().slice(0, 10)

	// Определяем тип сообщения по времени
	let messagePool = []
	let isThreat = false

	if (hour >= 8 && hour < 12) messagePool = morningMessages
	else if (hour >= 12 && hour < 19) messagePool = dayMessages
	else if (hour >= 19 && hour < 21) messagePool = eveningMessages
	else if (hour >= 21 && hour < 23) {
		messagePool = threatMessages
		isThreat = true
	} else return res.status(200).json({ msg: 'Night time, sleep well' })

	// Получаем всех пользователей
	const { data: users, error } = await supabase.from('users').select('*')
	if (error || !users) return res.status(200).json({ msg: 'No users' })

	let sentCount = 0

	for (const user of users) {
		// Считаем, сколько выпито сегодня
		const { data: logs } = await supabase
			.from('water_logs')
			.select('amount_ml')
			.eq('user_id', user.id)
			.gte('logged_at', `${today}T00:00:00Z`)

		const totalDrunk = logs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0

		// Если норма выполнена — сегодня не спамим
		if (totalDrunk >= user.water_goal_ml) continue

		// Выбираем случайное сообщение
		let text = messagePool[Math.floor(Math.random() * messagePool.length)]

		// Если это угроза стрика, подставляем количество дней
		if (isThreat) {
			const streak = user.streak_days || 0
			if (streak === 0) continue // Если стрика нет, не пугаем
			text = text.replace('{N}', streak)
		}

		// Отправляем сообщение
		await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chat_id: user.id, text })
		})
		sentCount++
	}

	res.status(200).json({ ok: true, processed: users.length, sent: sentCount })
}
