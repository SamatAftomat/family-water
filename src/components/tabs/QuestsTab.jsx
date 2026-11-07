export default function QuestsTab({ quests, handleClaimQuest }) {
	if (!quests || !quests.personal)
		return <p className="empty-note">Загрузка заданий...</p>

	const formatVolume = ml => {
		if (ml >= 1000) return `${(ml / 1000).toFixed(1)} л`
		return `${ml} мл`
	}

	return (
		<section className="section-block page-block">
			<p className="eyebrow">ЗАРАБОТАЙ АЛМАЗЫ</p>
			<h2>Задания</h2>

			{/* ЛИЧНОЕ ЗАДАНИЕ (ТОЛЬКО 1) */}
			<div style={{ marginTop: '16px' }}>
				<h3 style={{ fontSize: '15px', color: '#1886ad', marginBottom: '8px' }}>
					📌 Личное (на сегодня)
				</h3>
				<div className="quest-card">
					{/* ДОБАВИЛИ alignItems: 'center' */}
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '12px'
						}}
					>
						<div>
							<div className="quest-title">
								{quests.personal.icon} {quests.personal.title}
							</div>
							<div className="quest-desc">{quests.personal.description}</div>
						</div>
						<div className="quest-reward">+{quests.personal.reward} ✦</div>
					</div>
					<div className="quest-progress-bg">
						<div
							className="quest-progress-fill"
							style={{
								width: `${(quests.personal.progress / quests.personal.goal) * 100}%`,
								background: quests.personal.done ? '#0ba360' : '#1886ad'
							}}
						/>
					</div>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							fontSize: '12px',
							color: '#71869d',
							marginTop: '6px'
						}}
					>
						<span>
							{quests.personal.progress} / {quests.personal.goal}{' '}
							{quests.personal.unit}
						</span>
						{quests.personal.done && (
							<span style={{ color: '#0ba360', fontWeight: 'bold' }}>
								Выполнено!
							</span>
						)}
					</div>
				</div>
			</div>

			{/* СЕМЕЙНЫЕ ЗАДАНИЯ */}
			{quests.family && quests.family.length > 0 ? (
				<div style={{ marginTop: '24px' }}>
					<h3
						style={{ fontSize: '15px', color: '#c49b00', marginBottom: '8px' }}
					>
						👨‍👩‍👧‍👦 Семейные
					</h3>
					<div
						style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
					>
						{quests.family.map(q => (
							<div
								key={q.id}
								className="quest-card"
								style={{ border: '2px solid #fdcb6e' }}
							>
								{/* ДОБАВИЛИ alignItems: 'center' */}
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										marginBottom: '12px'
									}}
								>
									<div>
										<div
											className="quest-title"
											style={{ color: '#c49b00' }}
										>
											{q.icon} {q.title}
										</div>
										<div className="quest-desc">{q.description}</div>
									</div>
									<div
										className="quest-reward"
										style={{ background: '#fff0bf', color: '#c49b00' }}
									>
										+{q.reward} ✦
									</div>
								</div>
								<div className="quest-progress-bg">
									<div
										className="quest-progress-fill"
										style={{
											width: `${(q.progress / q.goal) * 100}%`,
											background: q.done ? '#0ba360' : '#fdcb6e'
										}}
									/>
								</div>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										fontSize: '12px',
										color: '#71869d',
										marginTop: '6px'
									}}
								>
									<span>
										{formatVolume(q.progress)} / {formatVolume(q.goal)}
									</span>
									{q.done && (
										<span style={{ color: '#0ba360', fontWeight: 'bold' }}>
											Выполнено!
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			) : (
				<div
					style={{
						marginTop: '24px',
						textAlign: 'center',
						padding: '20px',
						background: '#f8fafc',
						borderRadius: '16px'
					}}
				>
					<div style={{ fontSize: '30px', marginBottom: '8px' }}>👨‍👩‍👧‍👦</div>
					<p style={{ fontSize: '13px', color: '#71869d' }}>
						Вступи в семью, чтобы открыть семейные задания!
					</p>
				</div>
			)}
		</section>
	)
}
