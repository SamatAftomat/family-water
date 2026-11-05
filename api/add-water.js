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

	if (calculatedHash !== hash) {
		return res.status(403).json({ error: 'Недействительная подпись Telegram' })
	}

	const user = JSON.parse(params.get('user'))
	const supabase = createClient(supabaseUrl, supabaseKey)

	try {
		// ЗАЩИТА ОТ СПАМА (3 секунды)
		const { data: lastLog } = await supabase
			.from('water_logs')
			.select('logged_at')
			.eq('user_id', user.id)
			.order('logged_at', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (lastLog) {
			const lastTime = new Date(lastLog.logged_at).getTime()
			const now = new Date().getTime()
			if (now - lastTime < 3000) {
				throw new Error(
					'Не так быстро! Подождите пару секунд перед добавлением.'
				)
			}
		}

		// Запись воды
		const { error } = await supabase.rpc('record_water_log', {
			p_user_id: user.id,
			p_amount_ml: Number(amount)
		})

		if (error) throw error
		res.status(200).json({ ok: true })
	} catch (err) {
		res.status(400).json({ error: err.message })
	}
}
