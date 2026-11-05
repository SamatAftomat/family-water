import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).end()

	const { initData, amount } = req.body
	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	// ИСПОЛЬЗУЕМ СЕКРЕТНЫЙ КЛЮЧ, КОТОРЫЙ ОБХОДИТ ЗАЩИТУ
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!botToken || !supabaseUrl || !supabaseKey || !initData) {
		return res.status(500).json({ error: 'Server configuration error' })
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

	// 2. ЗАПИСЬ В БАЗУ (через серверный ключ)
	const supabase = createClient(supabaseUrl, supabaseKey)

	// Сначала убеждаемся, что юзер есть (upsert)
	await supabase.from('users').upsert({
		id: user.id,
		first_name: user.first_name || 'Пользователь'
	})

	// Вызываем функцию добавления воды
	const { error } = await supabase.rpc('record_water_log', {
		p_user_id: user.id,
		p_amount_ml: Number(amount)
	})

	if (error) return res.status(400).json({ error: error.message })

	res.status(200).json({ ok: true })
}
