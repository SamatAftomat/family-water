import { useState, useEffect } from 'react'
import { getTelegramUser, supabase } from '../lib/telegram'

export default function Onboarding({ onComplete }) {
	const tgUser = getTelegramUser()
	const [name, setName] = useState(tgUser.first_name || '')
	const [weight, setWeight] = useState('70')
	const [error, setError] = useState('')
	const [saving, setSaving] = useState(false)

	// Подтягиваем имя из Telegram автоматически
	useEffect(() => {
		setName(tgUser.first_name || '')
	}, [tgUser.first_name])

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
			localStorage.setItem('family-water-profile', JSON.stringify(profile))
			localStorage.setItem('family-water-onboarded', 'true')
			setSaving(false)
			onComplete()
		}
	}

	return (
		<div className="onboarding-page">
			<div className="onboarding-card">
				<h1>Добро пожаловать!</h1>
				<p className="onboarding-subtitle">
					Давай настроим твой профиль для трекинга воды
				</p>

				{error && <div className="onboarding-error">{error}</div>}

				{/* ID из Telegram */}
				<label className="onboarding-label">Твой Telegram ID</label>
				<input
					type="text"
					className="onboarding-input"
					value={tgUser.id}
					disabled
				/>
				<span className="onboarding-hint">
					ID нельзя изменить (он привязан к Telegram)
				</span>

				{/* Имя */}
				<label className="onboarding-label">Как тебя зовут?</label>
				<input
					type="text"
					className="onboarding-input"
					value={name}
					onChange={e => setName(e.target.value)}
					placeholder="Твое имя"
					disabled={saving}
				/>

				{/* Вес */}
				<label className="onboarding-label">Твой вес (кг)</label>
				<input
					type="number"
					className="onboarding-input"
					value={weight}
					onChange={e => setWeight(e.target.value)}
					placeholder="Например, 70"
					min="20"
					max="300"
					disabled={saving}
				/>
				<span className="onboarding-hint">
					Твоя норма воды:{' '}
					<strong>{weight ? Number(weight) * 30 : 0} мл</strong> в день
				</span>

				{/* Кнопка */}
				<button
					className="onboarding-btn"
					onClick={saveProfile}
					disabled={saving}
				>
					{saving ? 'Сохранение...' : 'Начать пить воду 💧'}
				</button>
			</div>
		</div>
	)
}
