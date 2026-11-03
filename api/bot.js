import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).end()

	const { message } = req.body
	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

	if (message && message.text === '/start') {
		const chatId = message.chat.id
		const firstName = message.from.first_name || 'Пользователь'

		// 1. АВТОМАТИЧЕСКИ ДОБАВЛЯЕМ В БАЗУ (если его там нет)
		if (supabaseUrl && supabaseKey) {
			const supabase = createClient(supabaseUrl, supabaseKey)

			// Проверяем, есть ли уже такой пользователь
			const { data: existingUser } = await supabase
				.from('users')
				.select('id')
				.eq('id', chatId)
				.maybeSingle()

			if (!existingUser) {
				// Если нет — создаем с дефолтными настройками
				await supabase.from('users').insert({
					id: chatId,
					first_name: firstName,
					weight_kg: 70,
					water_goal_ml: 2100
				})
			}
		}

		// 2. Отправляем приветствие
		const text =
			'Привет! Я бот для напоминания о воде. 💧\nТвой Telegram ID: ' +
			chatId +
			'\n\nТеперь я буду присылать тебе напоминания, если ты не будешь пить воду вовремя!'

		await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chat_id: chatId, text })
		})
	}

	res.status(200).json({ ok: true })
}
