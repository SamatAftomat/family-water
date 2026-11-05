import { useState } from 'react'

export default function FamilyTab({
	userId,
	families,
	shareId,
	handleCreateFamily,
	handleInvite,
	familyLoading
}) {
	const [newFamilyName, setNewFamilyName] = useState('')
	const [inviteId, setInviteId] = useState('')
	const [selectedFamily, setSelectedFamily] = useState(null)
	const [copySuccess, setCopySuccess] = useState(false)

	const copyToClipboard = () => {
		navigator.clipboard
			.writeText(userId.toString())
			.then(() => {
				setCopySuccess(true)
				setTimeout(() => setCopySuccess(false), 2000)
			})
			.catch(() => {
				alert('Не удалось скопировать. Ваш ID: ' + userId)
			})
	}

	return (
		<section className="section-block page-block">
			<p className="eyebrow">ВМЕСТЕ ЛЕГЧЕ</p>

			{/* --- ВЕРНУЛИ БЛОК С ID --- */}
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

			{/* Мои группы */}
			<h2>Мои группы</h2>
			{families.length === 0 ? (
				<p className="empty-note">Ты пока не состоишь ни в одной группе.</p>
			) : (
				families.map(fam => (
					<div
						key={fam.id}
						className="family-card"
					>
						<div
							className="section-heading"
							style={{ marginBottom: '10px' }}
						>
							<h3 style={{ margin: 0, fontSize: '18px', color: '#173f70' }}>
								{fam.name}
							</h3>
							<button
								className="link-button"
								onClick={() => setSelectedFamily(fam)}
							>
								+ Пригласить
							</button>
						</div>

						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
							{fam.members
								.filter(m => m.status === 'accepted')
								.map(m => (
									<div
										key={m.id}
										style={{
											padding: '6px 12px',
											background: '#eef5fb',
											borderRadius: '20px',
											fontSize: '13px',
											fontWeight: '600',
											color: '#173f70'
										}}
									>
										{m.first_name} {m.role === 'owner' && '👑'}
									</div>
								))}
							{fam.members
								.filter(m => m.status === 'pending')
								.map(m => (
									<div
										key={m.id}
										style={{
											padding: '6px 12px',
											background: '#ffe0d3',
											borderRadius: '20px',
											fontSize: '13px',
											color: '#e65c00'
										}}
									>
										{m.first_name} (ждет...)
									</div>
								))}
						</div>
					</div>
				))
			)}

			{/* Создать новую группу */}
			<div
				style={{
					marginTop: '24px',
					padding: '16px',
					background: '#fff',
					borderRadius: '16px',
					boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
				}}
			>
				<h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>
					Создать новую семью
				</h3>
				<form
					onSubmit={e => {
						e.preventDefault()
						handleCreateFamily(newFamilyName)
						setNewFamilyName('')
					}}
					style={{ display: 'flex', gap: '8px' }}
				>
					<input
						type="text"
						value={newFamilyName}
						onChange={e => setNewFamilyName(e.target.value)}
						placeholder="Название (напр. Семья Ахметовых)"
						style={{
							flex: 1,
							padding: '12px',
							borderRadius: '12px',
							border: '1px solid #d4e1eb',
							fontSize: '14px'
						}}
					/>
					<button
						type="submit"
						disabled={familyLoading}
						style={{
							padding: '0 16px',
							background: '#173f70',
							color: '#fff',
							border: 'none',
							borderRadius: '12px',
							fontWeight: 'bold'
						}}
					>
						{familyLoading ? '...' : 'Создать'}
					</button>
				</form>
			</div>

			{/* Модалка приглашения */}
			{selectedFamily && (
				<div
					className="modal-backdrop"
					onClick={() => setSelectedFamily(null)}
				>
					<div
						className="family-request-card"
						onClick={e => e.stopPropagation()}
						style={{ width: '100%', maxWidth: '400px', margin: 'auto' }}
					>
						<h3 style={{ margin: '0 0 12px' }}>
							Пригласить в {selectedFamily.name}
						</h3>
						<form
							onSubmit={e => {
								e.preventDefault()
								handleInvite(selectedFamily.id, inviteId)
								setInviteId('')
								setSelectedFamily(null)
							}}
							style={{ display: 'flex', gap: '8px' }}
						>
							<input
								type="text"
								inputMode="numeric"
								value={inviteId}
								onChange={e => setInviteId(e.target.value.replace(/\D/g, ''))}
								placeholder="Telegram ID человека"
								style={{
									flex: 1,
									padding: '12px',
									borderRadius: '12px',
									border: '1px solid #d4e1eb'
								}}
							/>
							<button
								type="submit"
								style={{
									padding: '0 16px',
									background: '#0ba360',
									color: '#fff',
									border: 'none',
									borderRadius: '12px',
									fontWeight: 'bold'
								}}
							>
								Позвать
							</button>
						</form>
						<button
							onClick={() => setSelectedFamily(null)}
							style={{
								marginTop: '12px',
								width: '100%',
								padding: '10px',
								background: '#eef5fb',
								border: 'none',
								borderRadius: '12px'
							}}
						>
							Отмена
						</button>
					</div>
				</div>
			)}
		</section>
	)
}
