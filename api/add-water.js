import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).end()

	const { initData, amount } = req.body
	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!botToken || !supabaseUrl || !supabaseKey || !initData) {
		return res.status(500).json({ error: 'Ошибка конфигурации сервера' })
	}

	// 1. ПРОВЕРКА ПОДПИСИ TELEGRAM
	const params = new URLSearchParams(initData)
	const hash = params.get('hash')
	params.delete('hash')
	const dataCheckString = Array.from(params.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join('\n')
	const secretKey = crypto
		.createHmac('sha256', 'WebAppData')
		.update(botToken)
		.digest()
	const calculatedHash = crypto
		.createHmac('sha256', secretKey)
		.update(dataCheckString)
		.digest('hex')

	if (calculatedHash !== hash) {
		return res.status(403).json({ error: 'Недействительная подпись Telegram' })
	}

	const user = JSON.parse(params.get('user'))
	const supabase = createClient(supabaseUrl, supabaseKey)

	try {
		// 2. ЗАЩИТА ОТ СПАМА (ПРОВЕРКА ПРОШЛОЙ ЗАПИСИ)
		const { data: lastLog } = await supabase
			.from('water_logs')
			.select('logged_at')
			.eq('user_id', user.id)
			.order('logged_at', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (lastLog) {
			let rawDate = lastLog.logged_at
			if (!rawDate.includes('Z') && !rawDate.includes('+')) {
				rawDate = rawDate.replace(' ', 'T') + 'Z'
			}
			const lastTime = new Date(rawDate).getTime()

			// Если прошло меньше 2000 миллисекунд (2 секунды) — блокируем
			if (Date.now() - lastTime < 2000) {
				return res
					.status(429)
					.json({
						error: 'Слишком часто! Подождите пару секунд перед добавлением.'
					})
			}
		}

		// 3. УБЕЖДАЕМСЯ, ЧТО ПОЛЬЗОВАТЕЛЬ ЕСТЬ В БАЗЕ (upsert)
		await supabase.from('users').upsert({
			id: user.id,
			first_name: user.first_name || 'Пользователь',
			weight_kg: 70,
			water_goal_ml: 2100
		})

		// 4. ЗАПИСЬ ВОДЫ
		const { error } = await supabase.rpc('record_water_log', {
			p_user_id: user.id,
			p_amount_ml: Number(amount)
		})

		if (error) throw new Error(error.message)

		res.status(200).json({ ok: true })
	} catch (err) {
		res.status(400).json({ error: err.message })
	}
}
