export default function QuestsTab({ quests, handleClaimQuest }) {
	if (!quests || !quests.personal)
		return <p className="empty-note">Загрузка заданий...</p>

	return (
		<section className="section-block page-block">
			<p className="eyebrow">ЗАРАБОТАЙ АЛМАЗЫ</p>
			<h2>Задания на день</h2>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '12px',
					marginTop: '16px'
				}}
			>
				{/* ЛИЧНЫЕ ЗАДАНИЯ */}
				{quests.personal.map(q => (
					<div
						key={q.id}
						className="quest-card"
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								marginBottom: '8px'
							}}
						>
							<div>
								<div className="quest-title">
									{q.icon} {q.title}
								</div>
								<div className="quest-desc">{q.description}</div>
							</div>
							<div className="quest-reward">+{q.reward} ✦</div>
						</div>
						<div className="quest-progress-bg">
							<div
								className="quest-progress-fill"
								style={{
									width: `${(q.progress / q.goal) * 100}%`,
									background: q.done ? '#0ba360' : '#1886ad'
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
								{q.progress} / {q.goal} {q.unit}
							</span>
							{q.done && (
								<span style={{ color: '#0ba360', fontWeight: 'bold' }}>
									Выполнено!
								</span>
							)}
						</div>
					</div>
				))}

				{/* СЕМЕЙНОЕ ЗАДАНИЕ */}
				<div
					className="quest-card"
					style={{ border: '2px solid #fdcb6e' }}
				>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							marginBottom: '8px'
						}}
					>
						<div>
							<div
								className="quest-title"
								style={{ color: '#c49b00' }}
							>
								{quests.family.icon} {quests.family.title}
							</div>
							<div className="quest-desc">{quests.family.description}</div>
						</div>
						<div
							className="quest-reward"
							style={{ background: '#fff0bf', color: '#c49b00' }}
						>
							+{quests.family.reward} ✦
						</div>
					</div>
					<div className="quest-progress-bg">
						<div
							className="quest-progress-fill"
							style={{
								width: `${(quests.family.progress / quests.family.goal) * 100}%`,
								background: quests.family.done ? '#0ba360' : '#fdcb6e'
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
							{quests.family.progress} / {quests.family.goal}{' '}
							{quests.family.unit}
						</span>
						{quests.family.done && (
							<span style={{ color: '#0ba360', fontWeight: 'bold' }}>
								Выполнено!
							</span>
						)}
					</div>
				</div>
			</div>
		</section>
	)
}
