export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).end()

	const { receiverId, senderName, type, groupName } = req.body
	const botToken = process.env.TELEGRAM_BOT_TOKEN

	if (!botToken) return res.status(500).json({ error: 'No token' })

	let text = ''

	if (type === 'family') {
		// Уведомление о группе
		text = `👨‍👩‍👧‍👦 <b>${senderName}</b> приглашает тебя в семейную группу «<b>${groupName}</b>»!\n\nОткрой приложение и перейди во вкладку «Семья», чтобы принять приглашение.`
	} else {
		// Старое уведомление (в друзья)
		text = `🔔 <b>${senderName}</b> хочет добавить вас в семейный трекер воды!\n\nОткройте приложение и перейдите во вкладку «Семья», чтобы принять или отклонить запрос.`
	}

	await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			chat_id: receiverId,
			text,
			parse_mode: 'HTML'
		})
	})

	res.status(200).json({ ok: true })
}
