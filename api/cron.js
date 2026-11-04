import { createClient } from '@supabase/supabase-js'
import {
	morningMessages,
	dayMessages,
	eveningMessages,
	threatMessages
} from './messages.js'

export default async function handler(req, res) {
	// 1. Проверка секретного ключа
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
	const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

	if (!botToken || !supabaseUrl || !supabaseKey) {
		return res.status(500).json({ error: 'В Vercel не добавлены переменные!' })
	}

	const supabase = createClient(supabaseUrl, supabaseKey)
	const now = new Date()

	// Переводим время в МСК (UTC+3)
	const hour = (now.getUTCHours() + 3) % 24
	const today = now.toISOString().slice(0, 10)

	// 2. Определяем время суток и выбираем пул сообщений
	let messagePool = []
	let isThreat = false

	if (hour >= 8 && hour < 12) messagePool = morningMessages
	else if (hour >= 12 && hour < 19) messagePool = dayMessages
	else if (hour >= 19 && hour < 21) messagePool = eveningMessages
	else if (hour >= 21 && hour < 23) {
		messagePool = threatMessages
		isThreat = true
	} else
		return res
			.status(200)
			.json({ msg: `Сейчас ночь (${hour} ч.), бот молчит.` })

	// 3. Получаем всех пользователей
	const { data: users, error } = await supabase.from('users').select('*')
	if (error || !users || users.length === 0) {
		return res.status(200).json({ msg: 'В базе нет пользователей' })
	}

	let sentCount = 0
	let skippedCount = 0
	let errors = []

	for (const user of users) {
		// 4. ЗАЩИТА ОТ СПАМА (проверяем, когда отправляли в последний раз)
		const lastNotified = user.last_notified_at
			? new Date(user.last_notified_at)
			: null
		if (lastNotified) {
			const diffInMs = now - lastNotified
			const diffInHours = diffInMs / (1000 * 60 * 60)
			if (diffInHours < 2) {
				skippedCount++
				continue // Пропускаем, если прошло меньше 2 часов
			}
		}

		// 5. ПРОВЕРКА ВЫПИТОЙ ВОДЫ
		const { data: logs } = await supabase
			.from('water_logs')
			.select('amount_ml')
			.eq('user_id', user.id)
			.gte('logged_at', `${today}T00:00:00Z`)

		const totalDrunk = logs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0

		if (totalDrunk >= user.water_goal_ml) {
			skippedCount++
			continue // Пропускаем, если норма выполнена
		}

		// 6. ФОРМИРУЕМ И ОТПРАВЛЯЕМ СООБЩЕНИЕ
		let text = messagePool[Math.floor(Math.random() * messagePool.length)]

		// Если это угроза стрика, подставляем количество дней
		if (isThreat) {
			const streak = user.streak_days || 0
			if (streak === 0) {
				skippedCount++
				continue // Если стрика нет, не пугаем
			}
			text = text.replace('{N}', streak)
		}

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
			// Записываем в базу время успешной отправки (для защиты от спама)
			await supabase
				.from('users')
				.update({ last_notified_at: now.toISOString() })
				.eq('id', user.id)
		} else {
			errors.push(`Ошибка Telegram для ${user.id}: ${tgResult.description}`)
		}
	}

	// 7. Отчет для cron-job.org
	res.status(200).json({
		ok: true,
		час_на_сервере_мск: hour,
		всего_юзеров: users.length,
		успешно_отправлено: sentCount,
		пропущено: skippedCount,
		ошибки: errors
	})
}
