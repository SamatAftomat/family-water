import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).end()

	const { initData, action, payload } = req.body
	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!botToken || !supabaseUrl || !supabaseKey || !initData) {
		return res.status(500).json({ error: 'Ошибка конфигурации' })
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
		return res.status(403).json({ error: 'Invalid initData' })
	}

	const user = JSON.parse(params.get('user'))
	const supabase = createClient(supabaseUrl, supabaseKey)

	try {
		if (action === 'delete_log') {
			const { error } = await supabase
				.from('water_logs')
				.delete()
				.eq('id', payload.logId)
				.eq('user_id', user.id)
			if (error) throw error
			return res.status(200).json({ ok: true })
		}

		if (action === 'clear_logs') {
			const { error } = await supabase
				.from('water_logs')
				.delete()
				.eq('user_id', user.id)
				.gte('logged_at', payload.startOfDay)
			if (error) throw error
			return res.status(200).json({ ok: true })
		}

		if (action === 'update_profile') {
			const { error } = await supabase.from('users').upsert({
				id: user.id,
				first_name: payload.name,
				weight_kg: payload.weight,
				water_goal_ml: payload.weight * 30
			})
			if (error) throw error
			return res.status(200).json({ ok: true })
		}

		if (action === 'buy_item') {
			const { itemId, price } = payload
			const { data: profile } = await supabase
				.from('users')
				.select('diamonds')
				.eq('id', user.id)
				.single()
			if (!profile) throw new Error('Профиль не найден')
			if (profile.diamonds < price) throw new Error('Недостаточно алмазов!')

			if (price > 0) {
				await supabase
					.from('users')
					.update({ diamonds: profile.diamonds - price })
					.eq('id', user.id)
			}
			const { error: insertError } = await supabase
				.from('inventory')
				.insert({ user_id: user.id, item_id: itemId })
			if (insertError && insertError.code !== '23505')
				throw new Error('Ошибка инвентаря')
			return res.status(200).json({ ok: true })
		}

		// ВЫДАЧА НАГРАДЫ ЗА ДОСТИЖЕНИЕ
		if (action === 'claim_achievement') {
			const { achId, reward } = payload

			// Проверяем, не забрал ли уже
			const { data: existing } = await supabase
				.from('user_achievements')
				.select('id')
				.eq('user_id', user.id)
				.eq('ach_id', achId)
				.maybeSingle()
			if (existing) throw new Error('Награда уже получена')

			// Записываем достижение
			await supabase
				.from('user_achievements')
				.insert({ user_id: user.id, ach_id: achId })

			// Начисляем алмазы
			const { data: profile } = await supabase
				.from('users')
				.select('diamonds')
				.eq('id', user.id)
				.single()
			await supabase
				.from('users')
				.update({ diamonds: profile.diamonds + reward })
				.eq('id', user.id)

			return res.status(200).json({ ok: true })
		}

		return res.status(400).json({ error: 'Unknown action' })
	} catch (err) {
		return res.status(400).json({ error: err.message })
	}
}
