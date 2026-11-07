import { useEffect, useState } from 'react'
import { getUserAchievements } from '../../lib/api'
import shopData from '../../data/shop.json'
import achievementsData from '../../data/achievements.json'

export default function ProfileModal({ user, onClose }) {
	const [userAchs, setUserAchs] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (user) {
			getUserAchievements(user.user_id).then(achs => {
				setUserAchs(achs)
				setLoading(false)
			})
		}
	}, [user])

	if (!user) return null

	// Находим титул по ID
	const activeTitle = shopData.titles.find(t => t.id === user.active_title_id)
	const frameClass = user.active_frame_css || ''
	const getAvatarColor = name => {
		if (!name) return 0
		return (name.charCodeAt(0) + (name.length || 0)) % 6
	}

	return (
		<div
			className="modal-backdrop"
			onClick={onClose}
		>
			<div
				className="profile-modal"
				onClick={e => e.stopPropagation()}
			>
				<button
					className="modal-close"
					onClick={onClose}
				>
					×
				</button>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						marginBottom: '20px'
					}}
				>
					<div
						className={`family-avatar avatar-color-${getAvatarColor(user.first_name)} ${frameClass}`}
						style={{
							width: '80px',
							height: '80px',
							fontSize: '32px',
							marginBottom: '12px'
						}}
					>
						{user.first_name[0]}
					</div>
					<h2 style={{ margin: '0 0 4px', fontSize: '22px' }}>
						{user.first_name}
					</h2>
					{activeTitle && activeTitle.id !== 'title_default' && (
						<div
							className={`user-title ${activeTitle.cssClass}`}
							style={{ marginTop: '4px' }}
						>
							{activeTitle.icon} {activeTitle.title}
						</div>
					)}
				</div>

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: '10px',
						marginBottom: '20px'
					}}
				>
					<div
						style={{
							background: '#f8fafc',
							padding: '12px',
							borderRadius: '12px',
							textAlign: 'center'
						}}
					>
						<div
							style={{ fontSize: '20px', fontWeight: 'bold', color: '#173f70' }}
						>
							{user.drank_today} мл
						</div>
						<div style={{ fontSize: '12px', color: '#71869d' }}>
							Выпито сегодня
						</div>
					</div>
					<div
						style={{
							background: '#f8fafc',
							padding: '12px',
							borderRadius: '12px',
							textAlign: 'center'
						}}
					>
						<div
							style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65c00' }}
						>
							{user.streak_days} 🔥
						</div>
						<div style={{ fontSize: '12px', color: '#71869d' }}>
							Дней подряд
						</div>
					</div>
				</div>

				<h3
					style={{ fontSize: '16px', marginBottom: '12px', color: '#173f70' }}
				>
					🏆 Достижения
				</h3>
				{loading ? (
					<p style={{ color: '#71869d', fontSize: '14px' }}>
						Загрузка медалей...
					</p>
				) : userAchs.length === 0 ? (
					<p style={{ color: '#71869d', fontSize: '14px' }}>
						Пока нет достижений
					</p>
				) : (
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
						{userAchs.map(achId => {
							const ach = achievementsData.find(a => a.id === achId)
							if (!ach) return null
							return (
								<div
									key={achId}
									style={{
										background: '#fff0bf',
										padding: '6px 12px',
										borderRadius: '20px',
										fontSize: '13px',
										fontWeight: 'bold',
										color: '#c49b00',
										display: 'flex',
										alignItems: 'center',
										gap: '4px'
									}}
								>
									<span>{ach.icon}</span> {ach.title}
								</div>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
