export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).end()

	const { message } = req.body
	const botToken = process.env.TELEGRAM_BOT_TOKEN

	if (message && message.text === '/start') {
		const chatId = message.chat.id
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
