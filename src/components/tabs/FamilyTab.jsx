export default function FamilyTab({
	familyData,
	shareId,
	familyMsg,
	handleRespond,
	familyLoading,
	handleRemoveFamily,
	handleAddFamily,
	inputId,
	setInputId
}) {
	return (
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
						style={{ margin: '0 0 10px', fontSize: '16px', color: '#173f70' }}
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
				<p style={{ fontSize: '13px', color: '#71869d', marginBottom: '16px' }}>
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
								<button
									className="btn-unlink"
									onClick={() => handleRemoveFamily(member.id)}
									title="Отвязать"
								>
									✕
								</button>
							</div>
							<div className="family-progress-bar">
								<div
									className="family-progress-fill"
									style={{
										width: `${member.progress}%`,
										background: member.progress >= 100 ? '#0ba360' : '#1886ad'
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
	)
}
