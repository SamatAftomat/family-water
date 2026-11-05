import { useState } from 'react'

export default function FamilyTab({
	userId,
	families,
	invites,
	shareId,
	handleCreateFamily,
	handleInvite,
	handleAcceptInvite,
	handleDeleteFamily,
	handleKickMember,
	handleRenameFamily,
	familyLoading
}) {
	const [newFamilyName, setNewFamilyName] = useState('')
	const [inviteId, setInviteId] = useState('')
	const [selectedFamily, setSelectedFamily] = useState(null) // Для приглашения
	const [settingsFamily, setSettingsFamily] = useState(null) // Для настроек группы
	const [copySuccess, setCopySuccess] = useState(false)

	const copyToClipboard = () => {
		navigator.clipboard
			.writeText(userId.toString())
			.then(() => {
				setCopySuccess(true)
				setTimeout(() => setCopySuccess(false), 2000)
			})
			.catch(() => alert('Ваш ID: ' + userId))
	}

	return (
		<section className="section-block page-block">
			<p className="eyebrow">ВМЕСТЕ ЛЕГЧЕ</p>

			{/* ВХОДЯЩИЕ ПРИГЛАШЕНИЯ */}
			{invites && invites.length > 0 && (
				<div
					style={{
						background: '#fff3e0',
						padding: '16px',
						borderRadius: '16px',
						marginBottom: '20px',
						border: '1px solid #ffe0b2'
					}}
				>
					<h3
						style={{ margin: '0 0 12px', fontSize: '16px', color: '#e65c00' }}
					>
						У вас есть приглашения!
					</h3>
					{invites.map(inv => (
						<div
							key={inv.id}
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '10px'
							}}
						>
							<span style={{ fontSize: '14px', fontWeight: 'bold' }}>
								{inv.familyName}
							</span>
							<button
								onClick={() => handleAcceptInvite(inv.family_id)}
								disabled={familyLoading}
								style={{
									background: '#0ba360',
									color: '#fff',
									border: 'none',
									padding: '8px 16px',
									borderRadius: '8px',
									fontWeight: 'bold'
								}}
							>
								Принять
							</button>
						</div>
					))}
				</div>
			)}

			{/* МОЙ ID */}
			<div
				style={{
					background: 'rgba(23, 63, 112, 0.05)',
					padding: '16px',
					borderRadius: '16px',
					marginBottom: '20px',
					display: 'flex',
					flexDirection: 'column',
					gap: '12px'
				}}
			>
				<div style={{ fontSize: '13px', color: '#71869d' }}>
					Твой Telegram ID:
				</div>
				<div
					style={{
						fontSize: '24px',
						fontWeight: '800',
						color: '#173f70',
						letterSpacing: '2px',
						textAlign: 'center'
					}}
				>
					{userId}
				</div>
				<button
					onClick={copyToClipboard}
					style={{
						background: copySuccess ? '#0ba360' : '#173f70',
						color: '#fff',
						border: 'none',
						padding: '12px',
						borderRadius: '12px',
						fontWeight: 'bold',
						cursor: 'pointer',
						transition: 'background 0.2s'
					}}
				>
					{copySuccess ? '✅ Скопировано!' : '📋 Скопировать ID'}
				</button>
				<button
					onClick={shareId}
					style={{
						background: 'transparent',
						color: '#1886ad',
						border: '1px solid #1886ad',
						padding: '12px',
						borderRadius: '12px',
						fontWeight: 'bold',
						cursor: 'pointer'
					}}
				>
					↗ Отправить в Telegram
				</button>
			</div>

			{/* МОИ ГРУППЫ */}
			<h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Мои группы</h2>
			{families.length === 0 ? (
				<p className="empty-note">Ты пока не состоишь ни в одной группе.</p>
			) : (
				families.map(fam => (
					<div
						key={fam.id}
						className="family-card"
						style={{ marginBottom: '16px' }}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: '12px'
							}}
						>
							<h3 style={{ margin: 0, fontSize: '18px', color: '#173f70' }}>
								{fam.name}
							</h3>
							<div style={{ display: 'flex', gap: '8px' }}>
								<button
									onClick={() => setSelectedFamily(fam)}
									style={{
										background: '#0ba360',
										color: '#fff',
										border: 'none',
										padding: '6px 12px',
										borderRadius: '8px',
										fontSize: '13px',
										fontWeight: 'bold'
									}}
								>
									+ Пригласить
								</button>
								<button
									onClick={() => setSettingsFamily(fam)}
									style={{
										background: '#eef5fb',
										color: '#173f70',
										border: 'none',
										padding: '6px 10px',
										borderRadius: '8px',
										fontSize: '16px'
									}}
								>
									⚙
								</button>
							</div>
						</div>

						{/* СТАТИСТИКА УЧАСТНИКОВ С ВОДОЙ */}
						<div
							style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
						>
							{fam.members.map(m => {
								if (m.status !== 'accepted' && m.user_id !== userId) return null

								return (
									<div
										key={m.id}
										style={{
											display: 'flex',
											flexDirection: 'column',
											gap: '8px',
											padding: '10px',
											background: '#f8fafc',
											borderRadius: '12px'
										}}
									>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '10px'
											}}
										>
											<div
												style={{
													width: '36px',
													height: '36px',
													background: '#5a80d8',
													color: '#fff',
													borderRadius: '50%',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													fontWeight: 'bold'
												}}
											>
												{m.first_name[0]}
											</div>
											<div style={{ flex: 1 }}>
												<div
													style={{
														fontWeight: '700',
														fontSize: '14px',
														color: '#173f70'
													}}
												>
													{m.first_name} {m.role === 'owner' && '👑'}{' '}
													{m.user_id === userId && '(Вы)'}
												</div>
												<div style={{ fontSize: '12px', color: '#71869d' }}>
													{m.drank_today} / {m.water_goal_ml} мл
												</div>
											</div>
											<span
												style={{
													fontSize: '14px',
													fontWeight: 'bold',
													color: m.progress >= 100 ? '#0ba360' : '#1886ad'
												}}
											>
												{m.progress}%
											</span>
										</div>
										{/* Полоска прогресса */}
										<div
											style={{
												width: '100%',
												height: '6px',
												background: '#e2e8f0',
												borderRadius: '3px',
												overflow: 'hidden'
											}}
										>
											<div
												style={{
													width: `${m.progress}%`,
													height: '100%',
													background: m.progress >= 100 ? '#0ba360' : '#1886ad',
													transition: 'width 0.3s'
												}}
											/>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				))
			)}

			{/* КОМПАКТНАЯ КНОПКА СОЗДАНИЯ */}
			<button
				onClick={() => {
					const name = prompt('Введите название новой семьи:')
					if (name && name.trim()) handleCreateFamily(name)
				}}
				disabled={familyLoading}
				style={{
					width: '100%',
					padding: '16px',
					background: '#173f70',
					color: '#fff',
					border: 'none',
					borderRadius: '16px',
					fontWeight: 'bold',
					fontSize: '16px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: '8px'
				}}
			>
				<span style={{ fontSize: '20px' }}>+</span> Создать новую семью
			</button>

			{/* МОДАЛКА ПРИГЛАШЕНИЯ */}
			{selectedFamily && (
				<div
					className="modal-backdrop"
					onClick={() => setSelectedFamily(null)}
				>
					<div
						className="family-request-card"
						onClick={e => e.stopPropagation()}
						style={{
							width: '100%',
							maxWidth: '400px',
							margin: 'auto',
							padding: '24px'
						}}
					>
						<h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>
							Пригласить в «{selectedFamily.name}»
						</h3>
						<form
							onSubmit={e => {
								e.preventDefault()
								handleInvite(selectedFamily.id, inviteId, selectedFamily.name)
								setInviteId('')
								setSelectedFamily(null)
							}}
						>
							<input
								type="text"
								inputMode="numeric"
								value={inviteId}
								onChange={e => setInviteId(e.target.value.replace(/\D/g, ''))}
								placeholder="Вставьте Telegram ID"
								style={{
									width: '100%',
									padding: '14px',
									borderRadius: '12px',
									border: '1px solid #d4e1eb',
									fontSize: '16px',
									marginBottom: '12px',
									boxSizing: 'border-box'
								}}
							/>
							<button
								type="submit"
								style={{
									width: '100%',
									padding: '14px',
									background: '#0ba360',
									color: '#fff',
									border: 'none',
									borderRadius: '12px',
									fontWeight: 'bold',
									fontSize: '16px'
								}}
							>
								Позвать
							</button>
						</form>
						<button
							onClick={() => setSelectedFamily(null)}
							style={{
								width: '100%',
								marginTop: '12px',
								padding: '14px',
								background: '#eef5fb',
								border: 'none',
								borderRadius: '12px',
								fontWeight: 'bold',
								color: '#173f70'
							}}
						>
							Отмена
						</button>
					</div>
				</div>
			)}

			{/* МОДАЛКА НАСТРОЕК ГРУППЫ */}
			{settingsFamily && (
				<div
					className="modal-backdrop"
					onClick={() => setSettingsFamily(null)}
				>
					<div
						className="family-request-card"
						onClick={e => e.stopPropagation()}
						style={{
							width: '100%',
							maxWidth: '400px',
							margin: 'auto',
							padding: '24px'
						}}
					>
						<h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>
							Настройки: {settingsFamily.name}
						</h3>

						<button
							onClick={() => {
								const newName = prompt(
									'Новое название группы:',
									settingsFamily.name
								)
								if (newName && newName.trim()) {
									handleRenameFamily(settingsFamily.id, newName)
									setSettingsFamily(null)
								}
							}}
							style={{
								width: '100%',
								padding: '12px',
								background: '#eef5fb',
								border: 'none',
								borderRadius: '12px',
								fontWeight: 'bold',
								marginBottom: '8px',
								color: '#173f70'
							}}
						>
							✏️ Переименовать
						</button>

						{settingsFamily.members
							.filter(m => m.user_id !== userId)
							.map(m => (
								<button
									key={m.id}
									onClick={() => {
										if (window.confirm(`Выгнать ${m.first_name}?`)) {
											handleKickMember(settingsFamily.id, m.user_id)
											setSettingsFamily(null)
										}
									}}
									style={{
										width: '100%',
										padding: '12px',
										background: '#ffe0d3',
										border: 'none',
										borderRadius: '12px',
										fontWeight: 'bold',
										marginBottom: '8px',
										color: '#c17575'
									}}
								>
									🚪 Выгнать {m.first_name}
								</button>
							))}

						{settingsFamily.owner_id === userId && (
							<button
								onClick={() => {
									if (window.confirm('Удалить группу навсегда?')) {
										handleDeleteFamily(settingsFamily.id)
										setSettingsFamily(null)
									}
								}}
								style={{
									width: '100%',
									padding: '12px',
									background: '#c17575',
									border: 'none',
									borderRadius: '12px',
									fontWeight: 'bold',
									marginBottom: '8px',
									color: '#fff'
								}}
							>
								🗑️ Удалить группу
							</button>
						)}

						<button
							onClick={() => setSettingsFamily(null)}
							style={{
								width: '100%',
								marginTop: '8px',
								padding: '14px',
								background: '#eef5fb',
								border: 'none',
								borderRadius: '12px',
								fontWeight: 'bold',
								color: '#173f70'
							}}
						>
							Закрыть
						</button>
					</div>
				</div>
			)}
		</section>
	)
}
