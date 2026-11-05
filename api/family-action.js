import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).end()

	const { initData, action, payload } = req.body
	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

	if (!botToken || !supabaseUrl || !supabaseKey || !initData) {
		return res.status(500).json({ error: 'Server configuration error' })
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
		if (action === 'create') {
			const { data: family, error } = await supabase
				.from('families')
				.insert({ name: payload.name, owner_id: user.id })
				.select()
				.single()
			if (error) throw error
			await supabase
				.from('family_members')
				.insert({
					family_id: family.id,
					user_id: user.id,
					role: 'owner',
					status: 'accepted'
				})
			return res.status(200).json({ ok: true })
		}

		if (action === 'invite') {
			const { familyId, inviteeId, familyName } = payload

			// ПРОВЕРКА: Существует ли такой пользователь в базе?
			const { data: targetUser } = await supabase
				.from('users')
				.select('id')
				.eq('id', inviteeId)
				.maybeSingle()
			if (!targetUser)
				throw new Error(
					'Пользователь с таким ID не найден. Попросите его зайти в приложение!'
				)

			const { data: existing } = await supabase
				.from('family_members')
				.select('status')
				.eq('family_id', familyId)
				.eq('user_id', inviteeId)
				.maybeSingle()
			if (existing)
				throw new Error('Этот человек уже в группе или ждет подтверждения')

			const { error } = await supabase
				.from('family_members')
				.insert({
					family_id: familyId,
					user_id: inviteeId,
					role: 'member',
					status: 'pending'
				})
			if (error) throw error

			fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat_id: inviteeId,
					text: `👨‍👩‍👧‍👦 <b>${user.first_name}</b> приглашает тебя в семейную группу «<b>${familyName}</b>»!\n\nОткрой приложение и перейди во вкладку «Семья», чтобы принять приглашение.`,
					parse_mode: 'HTML'
				})
			}).catch(console.error)

			return res.status(200).json({ ok: true })
		}

		if (action === 'accept') {
			const { error } = await supabase
				.from('family_members')
				.update({ status: 'accepted' })
				.eq('family_id', payload.familyId)
				.eq('user_id', user.id)
				.eq('status', 'pending') // Обновляем только если статус pending
			if (error) throw error
			return res.status(200).json({ ok: true })
		}

		if (action === 'delete') {
			await supabase
				.from('family_members')
				.delete()
				.eq('family_id', payload.familyId)
			const { error } = await supabase
				.from('families')
				.delete()
				.eq('id', payload.familyId)
			if (error) throw error
			return res.status(200).json({ ok: true })
		}

		if (action === 'kick') {
			const { error } = await supabase
				.from('family_members')
				.delete()
				.eq('family_id', payload.familyId)
				.eq('user_id', payload.memberId)
			if (error) throw error
			return res.status(200).json({ ok: true })
		}

		if (action === 'rename') {
			const { error } = await supabase
				.from('families')
				.update({ name: payload.newName })
				.eq('id', payload.familyId)
			if (error) throw error
			return res.status(200).json({ ok: true })
		}

		return res.status(400).json({ error: 'Unknown action' })
	} catch (err) {
		return res.status(400).json({ error: err.message })
	}
}
