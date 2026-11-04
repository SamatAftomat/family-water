import { useEffect, useMemo, useState } from 'react'
import { getTelegramUser } from '../lib/telegram'
import {
	getUserProfile,
	getTodayLogs,
	addWaterToDb,
	deleteLogFromDb,
	getLast7DaysTotal,
	sendFamilyRequest,
	getFamilyData,
	respondToRequest
} from '../lib/api'
import { supabase } from '../lib/telegram'

const todayKey = () => new Date().toISOString().slice(0, 10)

function MainScreen() {
	const userId = Number(getTelegramUser().id)

	const [profile, setProfile] = useState(null)
	const [logs, setLogs] = useState([])
	const [chartTotals, setChartTotals] = useState({})
	const [isLoading, setIsLoading] = useState(true)
	const [isAdding, setIsAdding] = useState(false)

	const [tab, setTab] = useState('today')
	const [customAmount, setCustomAmount] = useState('')
	const [showCustom, setShowCustom] = useState(false)
	const [settings, setSettings] = useState(false)
	const [activeInfo, setActiveInfo] = useState(null)
	const [isDark, setIsDark] = useState(
		() => localStorage.getItem('family-water-theme') === 'dark'
	)

	// Стейты для семьи
	const [familyData, setFamilyData] = useState({
		members: [],
		incoming: [],
		outgoing: []
	})
	const [inputId, setInputId] = useState('')
	const [familyMsg, setFamilyMsg] = useState('')
	const [familyLoading, setFamilyLoading] = useState(false)

	const today = todayKey()
	const total = logs.reduce((sum, log) => sum + log.amount, 0)
	const goal = Number(profile?.water_goal_ml || 2100)
	const progress = Math.min(Math.round((total / goal) * 100), 100)

	const effectiveStreak = useMemo(() => {
		if (!profile?.goal_reached_date) return 0
		const yesterday = new Date()
		yesterday.setDate(yesterday.getDate() - 1)
		const yesterdayStr = yesterday.toISOString().slice(0, 10)
		if (
			profile.goal_reached_date === today ||
			profile.goal_reached_date === yesterdayStr
		) {
			return profile.streak_days || 0
		}
		return 0
	}, [profile, today])

	// Загружаем данные семьи (вынесено отдельно, чтобы можно было обновлять)
	const loadFamily = async () => {
		const fData = await getFamilyData(userId, today)
		setFamilyData(fData)
	}

	// Главная загрузка при старте
	useEffect(() => {
		async function loadData() {
			try {
				const dbProfile = await getUserProfile(userId)
				const dbLogs = await getTodayLogs(userId, today)
				const totals7Days = await getLast7DaysTotal(userId)

				if (dbProfile) setProfile(dbProfile)
				else
					setProfile(
						JSON.parse(localStorage.getItem('family-water-profile')) || {
							first_name: 'Пользователь',
							weight_kg: 70,
							water_goal_ml: 2100
						}
					)

				setLogs(dbLogs)
				setChartTotals(totals7Days)
				await loadFamily()
			} catch (err) {
				console.error('Ошибка загрузки:', err)
			} finally {
				setIsLoading(false)
			}
		}
		loadData()
	}, [userId, today])

	// Автообновление семьи каждые 15 секунд
	useEffect(() => {
		if (tab === 'family' && !isLoading) {
			loadFamily() // Загружаем сразу при входе

			const interval = setInterval(() => {
				loadFamily() // И потом каждые 15 секунд
			}, 15000)

			return () => clearInterval(interval) // Очищаем таймер при уходе с вкладки
		}
	}, [tab, isLoading])

	useEffect(() => {
		localStorage.setItem('family-water-theme', isDark ? 'dark' : 'light')
	}, [isDark])

	async function addWater(amount) {
		const value = Number(amount)
		if (!Number.isFinite(value) || value <= 0) return
		if (value > 2000)
			return alert('Слишком много за один раз! Максимум 2000 мл.')
		if (total + value > 5000)
			return alert('Вы превысили суточный лимит в 5000 мл!')

		setIsAdding(true)
		try {
			await addWaterToDb(userId, value, profile)
			const updatedProfile = await getUserProfile(userId)
			const updatedLogs = await getTodayLogs(userId, today)
			const totals7Days = await getLast7DaysTotal(userId)

			setProfile(updatedProfile)
			setLogs(updatedLogs)
			setChartTotals(totals7Days)
			localStorage.setItem(
				'family-water-profile',
				JSON.stringify(updatedProfile)
			)
		} catch (err) {
			alert('Ошибка сохранения: ' + err.message)
		} finally {
			setIsAdding(false)
			setCustomAmount('')
			setShowCustom(false)
		}
	}

	async function removeLog(id) {
		if (!window.confirm('Удалить эту запись?')) return
		await deleteLogFromDb(id)
		setLogs(current => current.filter(log => log.id !== id))
		const totals7Days = await getLast7DaysTotal(userId)
		setChartTotals(totals7Days)
	}

	async function clearAllLogs() {
		if (!window.confirm('Ты уверен, что хочешь удалить все записи за сегодня?'))
			return
		if (!supabase) return
		await supabase
			.from('water_logs')
			.delete()
			.eq('user_id', userId)
			.gte('logged_at', `${today}T00:00:00Z`)
		setLogs([])
		const totals7Days = await getLast7DaysTotal(userId)
		setChartTotals(totals7Days)
	}

	function saveSettings(event) {
		event.preventDefault()
		const form = new FormData(event.currentTarget)
		const name = String(form.get('name') || '').trim()
		const weight = Number(form.get('weight'))
		if (!name || !weight || weight <= 0) return

		const updated = {
			...profile,
			first_name: name,
			weight_kg: weight,
			water_goal_ml: weight * 30
		}
		setProfile(updated)
		localStorage.setItem('family-water-profile', JSON.stringify(updated))

		if (supabase) {
			supabase
				.from('users')
				.update({
					first_name: name,
					weight_kg: weight,
					water_goal_ml: weight * 30
				})
				.eq('id', userId)
				.then()
		}
		setSettings(false)
	}

	function shareId() {
		const text = `Добавь меня в семейный трекер воды! Мой ID: ${userId}`
		const tg = window.Telegram?.WebApp
		if (tg && tg.openTelegramLink) {
			tg.openTelegramLink(
				`https://t.me/share/url?url=${encodeURIComponent(text)}`
			)
		} else {
			navigator.clipboard
				?.writeText(text)
				.then(() => alert(`ID скопирован: ${userId}`))
		}
	}

	async function handleAddFamily(e) {
		e.preventDefault()
		if (!inputId.trim()) return
		setFamilyLoading(true)
		setFamilyMsg('')

		const res = await sendFamilyRequest(userId, Number(inputId))

		if (res.error) setFamilyMsg(`❌ ${res.error}`)
		else {
			setFamilyMsg('✅ Запрос отправлен!')
			setInputId('')
			await loadFamily()
		}
		setFamilyLoading(false)
	}

	async function handleRespond(linkId, status) {
		setFamilyLoading(true)
		await respondToRequest(linkId, status)
		await loadFamily()
		setFamilyLoading(false)
	}

	const weekData = useMemo(
		() =>
			Array.from({ length: 7 }, (_, index) => {
				const date = new Date()
				date.setDate(date.getDate() - (6 - index))
				const key = date.toISOString().slice(0, 10)
				return {
					key,
					label: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
					total: key === today ? total : chartTotals[key] || 0
				}
			}),
		[logs, today, total, chartTotals]
	)

	if (isLoading) {
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					background: isDark ? '#0f172a' : '#eef5fb',
					color: isDark ? '#fff' : '#12355b',
					fontSize: '18px',
					fontWeight: 'bold'
				}}
			>
				Загрузка данных... 💧
			</div>
		)
	}

	return (
		<main className={`water-app ${isDark ? 'dark-theme' : ''}`}>
			<header className="water-header app-topbar">
				<div className="header-text">
					<p className="eyebrow">СЕМЕЙНЫЙ ТРЕКЕР</p>
					<h1>Ассаляму алейкум, {profile?.first_name}</h1>
				</div>
				<button
					className="icon-button"
					onClick={() => setSettings(true)}
					aria-label="Настройки"
				>
					⚙
				</button>
			</header>

			<section className="compact-stats">
				<div onClick={() => setActiveInfo('diamonds')}>
					<span>✦</span>
					<strong>{profile?.diamonds || 0}</strong>
				</div>
				<div onClick={() => setActiveInfo('streak')}>
					<span>🔥</span>
					<strong>{effectiveStreak}</strong>
				</div>
				<div onClick={() => setActiveInfo('progress')}>
					<span>◉</span>
					<strong>{progress}%</strong>
				</div>
			</section>

			{tab === 'today' && (
				<>
					<section className="progress-card">
						<div className="progress-ring">
							<svg viewBox="0 0 120 120">
								<defs>
									<linearGradient
										id="ringGradient"
										x1="0%"
										y1="0%"
										x2="100%"
										y2="100%"
									>
										<stop
											offset="0%"
											stopColor="#ffffff"
											stopOpacity="1"
										/>
										<stop
											offset="100%"
											stopColor="#a0e0ff"
											stopOpacity="0.9"
										/>
									</linearGradient>
								</defs>
								<circle
									className="ring-track"
									cx="60"
									cy="60"
									r="50"
									pathLength="100"
								/>
								<circle
									className="ring-value"
									cx="60"
									cy="60"
									r="50"
									pathLength="100"
									stroke="url(#ringGradient)"
									style={{ strokeDasharray: `${progress} 100` }}
								/>
							</svg>
							<div className="ring-center">
								<strong>{total}</strong>
								<small>из {goal} мл</small>
							</div>
						</div>
						<div className="progress-copy">
							<span>Выпито сегодня</span>
							<strong>{total} мл</strong>
							<small>
								{goal - total > 0
									? `Осталось ${goal - total} мл`
									: 'Норма выполнена!'}
							</small>
						</div>
						<div className="water-actions">
							<button
								className="water-button water-button-blue"
								onClick={() => addWater(100)}
								disabled={isAdding}
							>
								+100
							</button>
							<button
								className="water-button water-button-cyan"
								onClick={() => addWater(200)}
								disabled={isAdding}
							>
								+200
							</button>
							<button
								className="water-button water-button-green"
								onClick={() => addWater(300)}
								disabled={isAdding}
							>
								+300
							</button>
						</div>
						<button
							className="custom-water"
							onClick={() => setShowCustom(value => !value)}
						>
							{showCustom ? '✕ Скрыть' : '＋ Другое количество'}
						</button>
						{showCustom && (
							<div className="custom-form">
								<input
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									value={customAmount}
									onChange={event =>
										setCustomAmount(event.target.value.replace(/\D/g, ''))
									}
									autoFocus
								/>
								<button
									onClick={() => addWater(customAmount)}
									disabled={isAdding}
								>
									Добавить
								</button>
							</div>
						)}
					</section>

					<section className="section-block">
						<div className="section-heading">
							<h2>Последние записи</h2>
							<button
								className="link-button"
								onClick={() => setTab('diary')}
							>
								Все записи
							</button>
						</div>
						{logs.length === 0 ? (
							<p className="empty-note">
								Добавь первый стакан воды за сегодня.
							</p>
						) : (
							<div className="log-list">
								{logs.slice(0, 4).map(log => (
									<LogRow
										key={log.id}
										log={log}
										onRemove={removeLog}
									/>
								))}
							</div>
						)}
					</section>
				</>
			)}

			{tab === 'diary' && (
				<section className="section-block page-block">
					<div className="section-heading">
						<h2>Дневник воды</h2>
						{logs.length > 0 && (
							<button
								className="clear-all-btn"
								onClick={clearAllLogs}
							>
								Очистить всё
							</button>
						)}
					</div>
					<span
						className="date-label"
						style={{
							display: 'block',
							marginBottom: '16px',
							marginTop: '-4px'
						}}
					>
						Сегодня {today}
					</span>
					{logs.length === 0 ? (
						<p className="empty-note">Записей пока нет.</p>
					) : (
						<div className="log-list">
							{logs.map(log => (
								<LogRow
									key={log.id}
									log={log}
									onRemove={removeLog}
								/>
							))}
						</div>
					)}
				</section>
			)}

			{tab === 'analytics' && (
				<section className="section-block page-block">
					<p className="eyebrow">ПОСЛЕДНИЕ 7 ДНЕЙ</p>
					<h2>Аналитика</h2>
					<div className="chart">
						{weekData.map(day => (
							<div
								className="chart-column"
								key={day.key}
							>
								<div className="bar-container">
									<div
										className="bar"
										style={{
											height: `${Math.max(8, Math.min((day.total / goal) * 100, 100))}%`
										}}
										title={`${day.total} мл`}
									/>
								</div>
								<small>{day.label}</small>
							</div>
						))}
					</div>
					<div className="analytics-summary">
						<span>
							Среднее за день{' '}
							<strong>
								{Math.round(
									weekData.reduce((sum, day) => sum + day.total, 0) / 7
								)}{' '}
								мл
							</strong>
						</span>
						<span>
							Цель <strong>{goal} мл</strong>
						</span>
					</div>
				</section>
			)}

			{tab === 'family' && (
				<section className="section-block page-block">
					<p className="eyebrow">ВМЕСТЕ ЛЕГЧЕ</p>
					<div className="section-heading">
						<h2>Моя семья</h2>
						<span className="family-count">{familyData.members.length}</span>
					</div>

					<button
						className="primary-action"
						onClick={shareId}
						style={{ marginBottom: '20px', marginTop: '8px' }}
					>
						↗ Поделиться моим ID
					</button>

					{familyMsg && (
						<p
							style={{
								color: familyMsg.includes('❌') ? '#c17575' : '#0ba360',
								fontSize: '14px',
								marginBottom: '16px',
								fontWeight: 'bold',
								wordBreak: 'break-word'
							}}
						>
							{familyMsg}
						</p>
					)}

					{familyData.incoming.length > 0 && (
						<div className="family-request-card">
							<h3
								style={{
									margin: '0 0 10px',
									fontSize: '16px',
									color: '#173f70'
								}}
							>
								Запросы в семью
							</h3>
							{familyData.incoming.map(req => (
								<div key={req.id}>
									<span
										style={{
											fontSize: '14px',
											color: '#4a607a',
											wordBreak: 'break-word'
										}}
									>
										Пользователь ID: {req.requester_id}
									</span>
									<div className="request-buttons">
										<button
											className="btn-accept"
											onClick={() => handleRespond(req.id, 'accepted')}
											disabled={familyLoading}
										>
											Принять
										</button>
										<button
											className="btn-reject"
											onClick={() => handleRespond(req.id, 'rejected')}
											disabled={familyLoading}
										>
											Отклонить
										</button>
									</div>
								</div>
							))}
						</div>
					)}

					{familyData.outgoing.length > 0 && (
						<p
							style={{
								fontSize: '13px',
								color: '#71869d',
								marginBottom: '16px'
							}}
						>
							Отправлено запросов: {familyData.outgoing.length} (ждем ответа)
						</p>
					)}

					<div className="family-list">
						{familyData.members.length === 0 ? (
							<p className="empty-note">Ты пока никого не добавил.</p>
						) : (
							familyData.members.map(member => (
								<div
									key={member.id}
									className="family-card"
								>
									<div className="family-card-header">
										<div className="family-avatar">{member.first_name[0]}</div>
										<div className="family-info">
											<strong>{member.first_name}</strong>
											<p>
												{member.drank_today} / {member.water_goal_ml} мл
											</p>
										</div>
										<span
											style={{
												fontSize: '15px',
												fontWeight: 'bold',
												color: member.progress >= 100 ? '#0ba360' : '#1886ad',
												flexShrink: 0
											}}
										>
											{member.progress}%
										</span>
									</div>
									<div className="family-progress-bar">
										<div
											className="family-progress-fill"
											style={{
												width: `${member.progress}%`,
												background:
													member.progress >= 100 ? '#0ba360' : '#1886ad'
											}}
										/>
									</div>
								</div>
							))
						)}
					</div>

					<form
						onSubmit={handleAddFamily}
						className="family-form"
					>
						<input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							value={inputId}
							onChange={e => setInputId(e.target.value.replace(/\D/g, ''))}
							placeholder="Вставь Telegram ID"
						/>
						<button
							type="submit"
							disabled={familyLoading}
						>
							{familyLoading ? '...' : 'Добавить'}
						</button>
					</form>
				</section>
			)}

			<nav className="bottom-nav">
				<NavButton
					active={tab === 'today'}
					icon="⌂"
					label="Сегодня"
					onClick={() => setTab('today')}
				/>
				<NavButton
					active={tab === 'diary'}
					icon="☷"
					label="Дневник"
					onClick={() => setTab('diary')}
				/>
				<NavButton
					active={tab === 'analytics'}
					icon="▥"
					label="Аналитика"
					onClick={() => setTab('analytics')}
				/>
				<NavButton
					active={tab === 'family'}
					icon="♧"
					label="Семья"
					onClick={() => setTab('family')}
				/>
			</nav>

			{settings && (
				<div
					className="modal-backdrop"
					onClick={() => setSettings(false)}
				>
					<form
						className="settings-modal"
						onSubmit={saveSettings}
						onClick={event => event.stopPropagation()}
					>
						<button
							type="button"
							className="modal-close"
							onClick={() => setSettings(false)}
						>
							×
						</button>
						<p className="eyebrow">ПРОФИЛЬ</p>
						<h2>Настройки</h2>
						<label>
							Имя
							<input
								name="name"
								defaultValue={profile?.first_name}
							/>
						</label>
						<label>
							Вес, кг
							<input
								name="weight"
								type="number"
								min="1"
								defaultValue={profile?.weight_kg}
							/>
						</label>
						<label>
							Telegram ID
							<input
								value={userId}
								disabled
							/>
						</label>
						<label
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'space-between',
								cursor: 'pointer',
								marginTop: '16px'
							}}
						>
							<span>Тёмная тема</span>
							<input
								type="checkbox"
								checked={isDark}
								onChange={e => setIsDark(e.target.checked)}
								style={{ width: '24px', height: '24px' }}
							/>
						</label>
						<button className="primary-action">Сохранить</button>
					</form>
				</div>
			)}

			{activeInfo && (
				<div
					className="modal-backdrop"
					onClick={() => setActiveInfo(null)}
				>
					<div
						className="info-modal"
						onClick={event => event.stopPropagation()}
					>
						<button
							type="button"
							className="modal-close"
							onClick={() => setActiveInfo(null)}
						>
							×
						</button>
						{activeInfo === 'diamonds' && (
							<>
								<h2 style={{ color: '#c49b00' }}>✦ Алмазы</h2>
								<p>
									Алмазы — это внутренняя валюта приложения. В будущем на них
									можно будет покупать косметику: красивые фоны для профиля,
									уникальные цвета имени и иконки.
								</p>
								<p>
									<strong>Как заработать:</strong> выполняй свою дневную норму
									воды. За каждый день, когда норма достигнута, начисляется 1
									алмаз.
								</p>
							</>
						)}
						{activeInfo === 'streak' && (
							<>
								<h2 style={{ color: '#e65c00' }}>🔥 Дни подряд (Streak)</h2>
								<p>
									Streak — это серия дней подряд, в которые ты выполнял норму
									воды.
								</p>
								<p>
									<strong>Зачем это нужно:</strong> чем длиннее твоя серия, тем
									больше бонусных алмазов ты получаешь. Но если пропустишь день
									— серия сгорит и начнется заново!
								</p>
							</>
						)}
						{activeInfo === 'progress' && (
							<>
								<h2 style={{ color: '#1886ad' }}>◉ Прогресс дня</h2>
								<p>
									Этот процент показывает, насколько ты приблизился к своей
									ежедневной цели.
								</p>
								<p>
									<strong>Твой расчет:</strong> Твоя норма — {goal} мл. Выпито
									сегодня: {total} мл.
								</p>
							</>
						)}
					</div>
				</div>
			)}
		</main>
	)
}

function LogRow({ log, onRemove }) {
	return (
		<div className="log-row">
			<span className="log-icon">💧</span>
			<div>
				<strong>{log.amount} мл</strong>
				<small>{log.time}</small>
			</div>
			<button
				className="remove-log"
				onClick={() => onRemove(log.id)}
				aria-label="Удалить запись"
			>
				×
			</button>
		</div>
	)
}

function NavButton({ active, icon, label, onClick }) {
	return (
		<button
			className={`nav-button ${active ? 'active' : ''}`}
			onClick={onClick}
		>
			<span>{icon}</span>
			<small>{label}</small>
		</button>
	)
}

export default MainScreen
