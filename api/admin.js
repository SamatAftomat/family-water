import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const ADMIN_ID = 6556768668 // ТВОЙ TELEGRAM ID

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

	if (calculatedHash !== hash)
		return res.status(403).json({ error: 'Invalid initData' })

	const user = JSON.parse(params.get('user'))

	if (Number(user.id) !== ADMIN_ID) {
		return res
			.status(403)
			.json({ error: 'Доступ запрещен. Вы не администратор.' })
	}

	const supabase = createClient(supabaseUrl, supabaseKey)

	try {
		if (action === 'get_users') {
			const { data: users } = await supabase
				.from('users')
				.select('id, first_name, diamonds, streak_days, is_banned')
				.order('created_at', { ascending: false })
			const { count: familyCount } = await supabase
				.from('families')
				.select('*', { count: 'exact', head: true })
			const { data: logs } = await supabase
				.from('water_logs')
				.select('amount_ml')
			const totalWater = (logs || []).reduce((sum, l) => sum + l.amount_ml, 0)

			return res
				.status(200)
				.json({
					users: users || [],
					stats: {
						totalUsers: users?.length || 0,
						totalWater,
						totalFamilies: familyCount || 0
					}
				})
		}

		if (action === 'update_diamonds') {
			const { targetId, amount } = payload
			const { data: prof } = await supabase
				.from('users')
				.select('diamonds')
				.eq('id', targetId)
				.single()
			const newBalance = Math.max(0, (prof?.diamonds || 0) + Number(amount))
			await supabase
				.from('users')
				.update({ diamonds: newBalance })
				.eq('id', targetId)
			return res.status(200).json({ ok: true })
		}

		if (action === 'reset_streak') {
			await supabase
				.from('users')
				.update({ streak_days: 0 })
				.eq('id', payload.targetId)
			return res.status(200).json({ ok: true })
		}

		if (action === 'toggle_ban') {
			await supabase
				.from('users')
				.update({ is_banned: payload.isBanned })
				.eq('id', payload.targetId)
			return res.status(200).json({ ok: true })
		}

		if (action === 'give_item') {
			await supabase
				.from('inventory')
				.insert({ user_id: payload.targetId, item_id: payload.itemId })
			return res.status(200).json({ ok: true })
		}

		// ЗАБРАТЬ ПРЕДМЕТ
		if (action === 'remove_item') {
			const { error } = await supabase
				.from('inventory')
				.delete()
				.eq('user_id', payload.targetId)
				.eq('item_id', payload.itemId)
			if (error) throw error
			return res.status(200).json({ ok: true })
		}

		// ОЧИСТИТЬ ИНВЕНТАРЬ
		if (action === 'clear_inventory') {
			const { error } = await supabase
				.from('inventory')
				.delete()
				.eq('user_id', payload.targetId)
			if (error) throw error
			return res.status(200).json({ ok: true })
		}

		if (action === 'send_message') {
			await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: payload.targetId,
					text: `✉️ Сообщение от администратора:\n\n${payload.text}`
				})
			})
			return res.status(200).json({ ok: true })
		}

		if (action === 'update_prices') {
			await supabase
				.from('settings')
				.upsert({ id: 'shop_prices', value: payload.prices })
			return res.status(200).json({ ok: true })
		}

		if (action === 'get_prices') {
			const { data } = await supabase
				.from('settings')
				.select('value')
				.eq('id', 'shop_prices')
				.single()
			return res.status(200).json({ prices: data?.value || {} })
		}

		return res.status(400).json({ error: 'Unknown action' })
	} catch (err) {
		return res.status(400).json({ error: err.message })
	}
}
