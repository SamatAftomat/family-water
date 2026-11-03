import { useState, useEffect } from 'react'
import { getTelegramUser, supabase } from '../lib/telegram'

export default function Onboarding({ onComplete }) {
	const tgUser = getTelegramUser()
	const [name, setName] = useState(tgUser.first_name || '')
	const [weight, setWeight] = useState('70')
	const [error, setError] = useState('')
	const [saving, setSaving] = useState(false)

	const saveProfile = async () => {
		const weightNum = Number(weight)
		if (!name.trim()) return setError('Пожалуйста, введите имя')
		if (weightNum < 20 || weightNum > 300)
			return setError('Введите реалистичный вес (от 20 до 300 кг)')

		setSaving(true)
		setError('')

		const profile = {
			id: Number(tgUser.id),
			username: tgUser.username || null,
			first_name: name.trim(),
			weight_kg: weightNum,
			water_goal_ml: weightNum * 30,
			diamonds: 0,
			streak_days: 0
		}

		try {
			if (supabase) {
				const { error } = await supabase.from('users').upsert(profile)
				if (error)
					console.warn(
						'Supabase недоступен, включён локальный режим:',
						error.message
					)
			}
		} catch (e) {
			console.warn('Ошибка запроса:', e)
		} finally {
			// Сохраняем локально в любом случае
			localStorage.setItem('family-water-profile', JSON.stringify(profile))
			localStorage.setItem('family-water-onboarded', 'true')
			setSaving(false)
			onComplete()
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-water-blue to-water-dark flex flex-col items-center justify-center p-6 text-white font-sans">
			<div className="w-full max-w-md bg-white/10 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/20">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold mb-2">Добро пожаловать!</h1>
					<p className="text-blue-100 text-sm">
						Давай настроим твой профиль для трекинга воды
					</p>
				</div>

				{error && (
					<div className="bg-red-500/80 text-white p-3 rounded-xl mb-4 text-sm text-center">
						{error}
					</div>
				)}

				<div className="space-y-5">
					{/* ID из Telegram (только для чтения) */}
					<div>
						<label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
							Твой Telegram ID
						</label>
						<div className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-gray-300 font-mono">
							{tgUser.id}{' '}
							<span className="text-xs ml-2 opacity-60">(не изменяется)</span>
						</div>
					</div>

					{/* Имя */}
					<div>
						<label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
							Как тебя зовут?
						</label>
						<input
							type="text"
							value={name}
							onChange={e => setName(e.target.value)}
							className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
							placeholder="Твое имя"
							disabled={saving}
						/>
					</div>

					{/* Вес */}
					<div>
						<label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-2">
							Твой вес (кг)
						</label>
						<input
							type="number"
							value={weight}
							onChange={e => setWeight(e.target.value)}
							className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
							placeholder="Например, 70"
							min="20"
							max="300"
							disabled={saving}
						/>
						<p className="text-xs text-blue-100 mt-2 ml-1">
							Твоя норма воды:{' '}
							<strong className="text-white">
								{weight ? Number(weight) * 30 : 0} мл
							</strong>{' '}
							в день
						</p>
					</div>
				</div>

				<button
					onClick={saveProfile}
					disabled={saving}
					className="w-full mt-8 py-4 bg-[#173f70] text-white rounded-xl font-bold text-lg hover:bg-[#122f55] active:scale-95 transition-all disabled:opacity-50 shadow-lg"
				>
					{saving ? 'Сохранение...' : 'Начать пить воду 💧'}
				</button>
			</div>
		</div>
	)
}
