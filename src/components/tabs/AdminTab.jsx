import { useState, useEffect } from 'react'
import {
	adminGetUsers,
	adminUpdateDiamonds,
	adminResetStreak,
	adminToggleBan,
	adminGiveItem,
	adminSendMessage,
	adminGetPrices,
	adminUpdatePrices
} from '../../lib/api'
import shopData from '../../data/shop.json'
import { showToast } from '../../lib/api'

export default function AdminTab() {
	const [users, setUsers] = useState([])
	const [stats, setStats] = useState({
		totalUsers: 0,
		totalWater: 0,
		totalFamilies: 0
	})
	const [loading, setLoading] = useState(true)
	const [activeTab, setActiveTab] = useState('users')
	const [prices, setPrices] = useState({})

	const loadData = async () => {
		setLoading(true)
		const res = await adminGetUsers()
		if (res.error) showToast(res.error, 'error')
		else {
			setUsers(res.users)
			setStats(res.stats)
		}
		const p = await adminGetPrices()
		if (p.prices) setPrices(p.prices)
		setLoading(false)
	}

	useEffect(() => {
		loadData()
	}, [])

	const handleDiamonds = async (id, amount) => {
		await adminUpdateDiamonds(id, amount)
		showToast('Алмазы обновлены', 'success')
		loadData()
	}

	const handleResetStreak = async id => {
		if (!window.confirm('Сбросить стрик?')) return
		await adminResetStreak(id)
		showToast('Стрик сброшен', 'info')
		loadData()
	}

	const handleToggleBan = async (id, currentStatus) => {
		await adminToggleBan(id, !currentStatus)
		showToast(
			!currentStatus ? 'Пользователь забанен' : 'Пользователь разбанен',
			'info'
		)
		loadData()
	}

	const handleGiveItem = async id => {
		const itemId = prompt(
			'Введите ID предмета (например: theme_space, title_aqua, frame_gold):'
		)
		if (!itemId) return
		await adminGiveItem(id, itemId)
		showToast('Предмет выдан', 'success')
	}

	const handleSendMessage = async id => {
		const text = prompt('Введите сообщение для пользователя:')
		if (!text) return
		await adminSendMessage(id, text)
		showToast('Сообщение отправлено', 'success')
	}

	const handlePriceChange = (itemId, newPrice) => {
		setPrices(prev => ({ ...prev, [itemId]: Number(newPrice) }))
	}

	const savePrices = async () => {
		await adminUpdatePrices(prices)
		showToast('Цены сохранены', 'success')
	}

	if (loading) return <p className="empty-note">Загрузка данных...</p>

	return (
		<section className="section-block page-block">
			<p className="eyebrow">ТОЛЬКО ДЛЯ АДМИНА</p>
			<h2>Пульт управления</h2>

			<div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
				<button
					onClick={() => setActiveTab('users')}
					className={`shop-tab ${activeTab === 'users' ? 'active' : ''}`}
				>
					Пользователи
				</button>
				<button
					onClick={() => setActiveTab('prices')}
					className={`shop-tab ${activeTab === 'prices' ? 'active' : ''}`}
				>
					Цены
				</button>
			</div>

			{activeTab === 'users' && (
				<>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 1fr',
							gap: '8px',
							marginBottom: '20px'
						}}
					>
						<div
							className="stat-card stat-card-diamond"
							style={{ padding: '10px' }}
						>
							<div className="stat-icon">👥</div>
							<div className="stat-label">Юзеров</div>
							<strong>{stats.totalUsers}</strong>
						</div>
						<div
							className="stat-card stat-card-progress"
							style={{ padding: '10px' }}
						>
							<div className="stat-icon">💧</div>
							<div className="stat-label">Выпито</div>
							<strong>{(stats.totalWater / 1000).toFixed(1)} л</strong>
						</div>
						<div
							className="stat-card stat-card-streak"
							style={{ padding: '10px' }}
						>
							<div className="stat-icon">👨‍👩‍👧</div>
							<div className="stat-label">Семей</div>
							<strong>{stats.totalFamilies}</strong>
						</div>
					</div>

					<div
						style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
					>
						{users.map(u => (
							<div
								key={u.id}
								className="family-card"
								style={{ opacity: u.is_banned ? 0.5 : 1 }}
							>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										marginBottom: '10px'
									}}
								>
									<div>
										<strong style={{ fontSize: '16px' }}>{u.first_name}</strong>
										<div style={{ fontSize: '12px', color: '#71869d' }}>
											ID: {u.id} {u.is_banned && '⛔ ЗАБАНЕН'}
										</div>
									</div>
									<div style={{ textAlign: 'right' }}>
										<div style={{ color: '#c49b00', fontWeight: 'bold' }}>
											✦ {u.diamonds}
										</div>
										<div style={{ color: '#e65c00', fontSize: '12px' }}>
											🔥 {u.streak_days}
										</div>
									</div>
								</div>

								<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
									<button
										onClick={() => handleDiamonds(u.id, 100)}
										className="shop-buy-btn"
										style={{ flex: 1, padding: '8px' }}
									>
										+100 ✦
									</button>
									<button
										onClick={() => handleDiamonds(u.id, -100)}
										className="shop-buy-btn"
										style={{ flex: 1, padding: '8px' }}
									>
										-100 ✦
									</button>
									<button
										onClick={() => handleResetStreak(u.id)}
										className="shop-buy-btn"
										style={{
											flex: 1,
											padding: '8px',
											background: '#ff7675',
											color: '#fff'
										}}
									>
										Сброс стрика
									</button>
								</div>
								<div
									style={{
										display: 'flex',
										flexWrap: 'wrap',
										gap: '6px',
										marginTop: '6px'
									}}
								>
									<button
										onClick={() => handleGiveItem(u.id)}
										className="shop-buy-btn"
										style={{
											flex: 1,
											padding: '8px',
											background: '#a29bfe',
											color: '#fff'
										}}
									>
										Выдать предмет
									</button>
									<button
										onClick={() => handleSendMessage(u.id)}
										className="shop-buy-btn"
										style={{
											flex: 1,
											padding: '8px',
											background: '#55efc4',
											color: '#173f70'
										}}
									>
										Написать
									</button>
									<button
										onClick={() => handleToggleBan(u.id, u.is_banned)}
										className="shop-buy-btn"
										style={{
											flex: 1,
											padding: '8px',
											background: u.is_banned ? '#0ba360' : '#c17575',
											color: '#fff'
										}}
									>
										{u.is_banned ? 'Разбанить' : 'Забанить'}
									</button>
								</div>
							</div>
						))}
					</div>
				</>
			)}

			{activeTab === 'prices' && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
					<p style={{ fontSize: '14px', color: '#71869d' }}>
						Введите новые цены (0 - бесплатно). Изменения вступят в силу после
						сохранения.
					</p>
					{[
						...shopData.themes,
						...shopData.titles,
						...shopData.frames,
						...shopData.cases
					].map(item => (
						<div
							key={item.id}
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: '10px',
								background: '#f8fafc',
								borderRadius: '12px'
							}}
						>
							<div>{item.title}</div>
							<input
								type="number"
								value={
									prices[item.id] !== undefined ? prices[item.id] : item.price
								}
								onChange={e => handlePriceChange(item.id, e.target.value)}
								style={{
									width: '80px',
									padding: '8px',
									borderRadius: '8px',
									border: '1px solid #d4e1eb',
									textAlign: 'center'
								}}
							/>
						</div>
					))}
					<button
						onClick={savePrices}
						className="primary-action"
						style={{ marginTop: '16px' }}
					>
						Сохранить цены
					</button>
				</div>
			)}
		</section>
	)
}
