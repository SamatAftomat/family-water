import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).end()

	const { message } = req.body
	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!botToken || !supabaseUrl || !supabaseKey) {
		return res.status(500).json({ error: 'Server configuration error' })
	}

	if (!message || !message.text) return res.status(200).json({ ok: true })

	const chatId = message.chat.id
	const firstName = message.from.first_name || 'Пользователь'
	const text = message.text.trim()
	const supabase = createClient(supabaseUrl, supabaseKey)

	// 1. ОБРАБОТКА КОМАНДЫ /start
	if (text === '/start') {
		const welcomeText = `Привет, ${firstName}! Я бот для напоминания о воде. 💧\n\nТвой Telegram ID: <code>${chatId}</code>\n\n<b>Теперь ты можешь записывать воду прямо здесь, не открывая приложение!</b>\nПросто напиши мне число, например: <code>+400</code> или <code>300</code>.\n\nА еще я буду присылать напоминания, если ты забудешь попить.`

		await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: welcomeText,
				parse_mode: 'HTML'
			})
		})
		return res.status(200).json({ ok: true })
	}

	// 2. ПОИСК ЧИСЛА В СООБЩЕНИИ (например: "+400", "400", "400 мл", "выпил 400")
	const numbers = text.match(/\d+/g)

	if (!numbers) {
		// Если чисел нет, бот вежливо подсказывает
		await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: `Я не вижу здесь числа 🤔\nЧтобы записать воду, просто напиши мне <b>+200</b> или <b>300</b> мл.`,
				parse_mode: 'HTML'
			})
		})
		return res.status(200).json({ ok: true })
	}

	const amount = parseInt(numbers[0], 10)

	// 3. ВАЛИДАЦИЯ ЧИСЛА
	if (amount > 2000) {
		await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: `⚠️ Ого, ${amount} мл — это слишком много за один раз! Максимум можно записать 2000 мл. Попробуй еще раз.`
			})
		})
		return res.status(200).json({ ok: true })
	}

	if (amount <= 0) return res.status(200).json({ ok: true })

	// 4. ЗАПИСЬ ВОДЫ В БАЗУ
	try {
		// Убеждаемся, что пользователь есть в базе
		const { data: existingUser } = await supabase
			.from('users')
			.select('id, water_goal_ml')
			.eq('id', chatId)
			.maybeSingle()

		if (!existingUser) {
			await supabase.from('users').insert({
				id: chatId,
				first_name: firstName,
				weight_kg: 70,
				water_goal_ml: 2100
			})
		} else {
			await supabase
				.from('users')
				.update({ first_name: firstName })
				.eq('id', chatId)
		}

		// Вызываем функцию добавления воды (она сама проверит спам и начислит алмазы)
		const { error: rpcError } = await supabase.rpc('record_water_log', {
			p_user_id: chatId,
			p_amount_ml: amount
		})

		if (rpcError) {
			// Если сработала защита от спама (2 секунды)
			throw new Error(rpcError.message)
		}

		// Получаем обновленную статистику для ответа
		const today = new Date(
			new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' })
		)
			.toISOString()
			.slice(0, 10)
		const { data: todayLogs } = await supabase
			.from('water_logs')
			.select('amount_ml')
			.eq('user_id', chatId)
			.gte('logged_at', `${today}T00:00:00+03:00`)

		const totalDrunk = (todayLogs || []).reduce(
			(sum, l) => sum + l.amount_ml,
			0
		)
		const goal = existingUser?.water_goal_ml || 2100
		const percent = Math.min(Math.round((totalDrunk / goal) * 100), 100)

		// Отправляем красивый ответ
		const successText = `✅ <b>Записано ${amount} мл!</b>\n\n📊 Сегодня выпито: <b>${totalDrunk} / ${goal} мл</b> (${percent}%)\n${goal - totalDrunk > 0 ? `Осталось: ${goal - totalDrunk} мл` : '🎉 Норма выполнена!'}`

		await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: successText,
				parse_mode: 'HTML'
			})
		})
	} catch (err) {
		// Если ошибка (например, "Слишком часто!")
		await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text: `❌ Не удалось записать: ${err.message}`
			})
		})
	}

	res.status(200).json({ ok: true })
}
