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

	if (calculatedHash !== hash)
		return res.status(403).json({ error: 'Invalid initData' })

	const user = JSON.parse(params.get('user'))
	const supabase = createClient(supabaseUrl, supabaseKey)

	try {
		// Проверка на бан
		const { data: profile } = await supabase
			.from('users')
			.select('is_banned')
			.eq('id', user.id)
			.single()
		if (profile?.is_banned) throw new Error('Вы заблокированы администратором.')

		// УБЕЖДАЕМСЯ, ЧТО ПОЛЬЗОВАТЕЛЬ ЕСТЬ, НЕ ТРОГАЯ ЕГО ВЕС И НОРМУ
		const { data: existingUser } = await supabase
			.from('users')
			.select('id')
			.eq('id', user.id)
			.maybeSingle()
		if (!existingUser) {
			await supabase.from('users').insert({
				id: user.id,
				first_name: user.first_name || 'Пользователь',
				weight_kg: 70,
				water_goal_ml: 2100
			})
		} else {
			await supabase
				.from('users')
				.update({ first_name: user.first_name || 'Пользователь' })
				.eq('id', user.id)
		}

		// ЗАПИСЬ ВОДЫ (без защиты от спама по времени, только лимиты в БД)
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
