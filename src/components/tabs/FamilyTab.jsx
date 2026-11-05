import { useState } from 'react'

export default function FamilyTab({
	userId,
	families,
	shareId,
	handleCreateFamily,
	handleInvite,
	handleRespond,
	familyLoading
}) {
	const [newFamilyName, setNewFamilyName] = useState('')
	const [inviteId, setInviteId] = useState('')
	const [selectedFamily, setSelectedFamily] = useState(null)

	return (
		<section className="section-block page-block">
			<p className="eyebrow">ВМЕСТЕ ЛЕГЧЕ</p>

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

						{/* Список участников группы */}
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
						Создать
					</button>
				</form>
			</div>

			{/* Форма приглашения (появляется при клике на "+ Пригласить") */}
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
