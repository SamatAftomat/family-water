export default function QuestsTab({ quests, handleClaimQuest }) {
	if (!quests) return <p className="empty-note">Загрузка заданий...</p>

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
				{/* Ранняя пташка */}
				<div className="quest-card">
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							marginBottom: '8px'
						}}
					>
						<div>
							<div className="quest-title">Ранняя пташка</div>
							<div className="quest-desc">Выпей 500 мл до 12:00</div>
						</div>
						<div className="quest-reward">+{quests.earlyBird.reward} ✦</div>
					</div>
					<div className="quest-progress-bg">
						<div
							className="quest-progress-fill"
							style={{
								width: `${(quests.earlyBird.progress / quests.earlyBird.goal) * 100}%`,
								background: quests.earlyBird.done ? '#0ba360' : '#1886ad'
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
							{quests.earlyBird.progress} / {quests.earlyBird.goal} мл
						</span>
						{quests.earlyBird.done && (
							<span style={{ color: '#0ba360', fontWeight: 'bold' }}>
								Выполнено!
							</span>
						)}
					</div>
				</div>

				{/* Марафонец */}
				<div className="quest-card">
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							marginBottom: '8px'
						}}
					>
						<div>
							<div className="quest-title">Марафонец</div>
							<div className="quest-desc">Сделай 5 записей воды за день</div>
						</div>
						<div className="quest-reward">+{quests.marathon.reward} ✦</div>
					</div>
					<div className="quest-progress-bg">
						<div
							className="quest-progress-fill"
							style={{
								width: `${(quests.marathon.progress / quests.marathon.goal) * 100}%`,
								background: quests.marathon.done ? '#0ba360' : '#1886ad'
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
							{quests.marathon.progress} / {quests.marathon.goal} записей
						</span>
						{quests.marathon.done && (
							<span style={{ color: '#0ba360', fontWeight: 'bold' }}>
								Выполнено!
							</span>
						)}
					</div>
				</div>

				{/* Семейный сундук */}
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
								Семейный сундук 🎁
							</div>
							<div className="quest-desc">
								Вся семья должна выпить 10 литров
							</div>
						</div>
						<div
							className="quest-reward"
							style={{ background: '#fff0bf', color: '#c49b00' }}
						>
							+{quests.familyChest.reward} ✦
						</div>
					</div>
					<div className="quest-progress-bg">
						<div
							className="quest-progress-fill"
							style={{
								width: `${(quests.familyChest.progress / quests.familyChest.goal) * 100}%`,
								background: quests.familyChest.done ? '#0ba360' : '#fdcb6e'
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
							{quests.familyChest.progress} / {quests.familyChest.goal} мл
						</span>
						{quests.familyChest.done && (
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
