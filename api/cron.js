import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
	const { searchParams } = new URL(req.url, `https://${req.headers.host}`)
	const secret = searchParams.get('key')

	if (secret !== 'water_secret_2024') {
		return res.status(401).json({ error: 'Unauthorized' })
	}

	const botToken = process.env.TELEGRAM_BOT_TOKEN
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

	const supabase = createClient(supabaseUrl, supabaseKey)
	const { data: users } = await supabase.from('users').select('*')

	if (!users || users.length === 0)
		return res.status(200).json({ msg: 'No users' })

	let sentCount = 0
	for (const user of users) {
		await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: user.id,
				text: '💧 ТЕСТ: Это сообщение отправлено АВТОМАТИЧЕСКИ через cron-job.org! (Проверка работы)'
			})
		})
		sentCount++
	}

	res.status(200).json({ ok: true, отправлено: sentCount })
}
