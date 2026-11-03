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
		return res
			.status(500)
			.json({ error: 'В Vercel не добавлены переменные окружения!' })
	}

	const supabase = createClient(supabaseUrl, supabaseKey)
	const now = new Date()
	const hour = (now.getUTCHours() + 3) % 24
	const today = now.toISOString().slice(0, 10)

	let messagePool = []
	let isThreat = false

	if (hour >= 8 && hour < 12) messagePool = morningMessages
	else if (hour >= 12 && hour < 19) messagePool = dayMessages
	else if (hour >= 19 && hour < 21) messagePool = eveningMessages
	else if (hour >= 21 && hour < 23) {
		messagePool = threatMessages
		isThreat = true
	} else return res.status(200).json({ msg: 'Сейчас ночь, бот молчит.' })

	const { data: users, error } = await supabase.from('users').select('*')
	if (error || !users || users.length === 0)
		return res.status(200).json({ msg: 'В базе нет пользователей' })

	let sentCount = 0
	let errors = []

	for (const user of users) {
		const { data: logs } = await supabase
			.from('water_logs')
			.select('amount_ml')
			.eq('user_id', user.id)
			.gte('logged_at', `${today}T00:00:00Z`)

		const totalDrunk = logs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0

		if (totalDrunk >= user.water_goal_ml) {
			errors.push(
				`Пользователь ${user.id}: норма выполнена, сообщение не отправлено.`
			)
			continue
		}

		let text = messagePool[Math.floor(Math.random() * messagePool.length)]
		if (isThreat) {
			const streak = user.streak_days || 0
			if (streak === 0) continue
			text = text.replace('{N}', streak)
		}

		// Отправляем и смотрим ОТВЕТ от Telegram
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
		} else {
			// Если ошибка — записываем её
			errors.push(`Ошибка для ID ${user.id}: ${tgResult.description}`)
		}
	}

	// Сайт покажет нам всё, что произошло
	res.status(200).json({
		ok: true,
		час_на_сервере: hour,
		всего_юзеров: users.length,
		успешно_отправлено: sentCount,
		ошибки: errors
	})
}
