import { useState } from 'react'
import achievementsData from '../../data/achievements.json'

export default function QuestsTab({
	quests,
	achievements = [],
	handleClaimAch,
	userStats = {},
	claimedQuests = [],
	handleClaimQuest,
	questClaimDates
}) {
	const [activeTab, setActiveTab] = useState('quests')

	if (!quests || !quests.personal)
		return <p className="empty-note">Загрузка...</p>

	const formatVolume = ml =>
		ml >= 1000 ? `${(ml / 1000).toFixed(1)} л` : `${ml} мл`

	return (
		<section className="section-block page-block">
			<div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
				<button
					onClick={() => setActiveTab('quests')}
					className={`shop-tab ${activeTab === 'quests' ? 'active' : ''}`}
				>
					Квесты
				</button>
				<button
					onClick={() => setActiveTab('achievements')}
					className={`shop-tab ${activeTab === 'achievements' ? 'active' : ''}`}
				>
					🏆 Достижения
				</button>
			</div>

			{activeTab === 'quests' && (
				<>
					<p className="eyebrow">ЗАРАБОТАЙ АЛМАЗЫ</p>
					<h2>Задания</h2>

					<div style={{ marginTop: '16px' }}>
						<h3
							style={{
								fontSize: '15px',
								color: '#1886ad',
								marginBottom: '8px'
							}}
						>
							📌 Личное (на сегодня)
						</h3>
						<div className="quest-card">
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
									<div className="quest-desc">
										{quests.personal.description}
									</div>
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
									alignItems: 'center',
									fontSize: '12px',
									color: '#71869d',
									marginTop: '6px'
								}}
							>
								<span>
									{quests.personal.progress} / {quests.personal.goal}{' '}
									{quests.personal.unit}
								</span>
								{quests.personal.done &&
									!claimedQuests.includes(quests.personal.id) && (
										<button
											onClick={() =>
												handleClaimQuest(
													quests.personal.id,
													quests.personal.reward,
													questClaimDates.personal
												)
											}
											style={{
												background: '#0ba360',
												color: '#fff',
												border: 'none',
												padding: '6px 14px',
												borderRadius: '8px',
												fontWeight: 'bold',
												cursor: 'pointer'
											}}
										>
											Забрать
										</button>
									)}
								{claimedQuests.includes(quests.personal.id) && (
									<span style={{ color: '#0ba360', fontWeight: 'bold' }}>
										✓ Получено
									</span>
								)}
							</div>
						</div>
					</div>

					{quests.family && quests.family.length > 0 && (
						<div style={{ marginTop: '24px' }}>
							<h3
								style={{
									fontSize: '15px',
									color: '#c49b00',
									marginBottom: '8px'
								}}
							>
								👨‍👩‍👧‍👦 Семейные
							</h3>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '12px'
								}}
							>
								{quests.family.map(q => {
									const isClaimed = claimedQuests.includes(q.id)
									const claimDate =
										q.period === 'week'
											? questClaimDates.week
											: questClaimDates.month

									return (
										<div
											key={q.id}
											className="quest-card"
											style={{ border: '2px solid #fdcb6e' }}
										>
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
													alignItems: 'center',
													fontSize: '12px',
													color: '#71869d',
													marginTop: '6px'
												}}
											>
												<span>
													{formatVolume(q.progress)} / {formatVolume(q.goal)}
												</span>
												{q.done && !isClaimed && (
													<button
														onClick={() =>
															handleClaimQuest(q.id, q.reward, claimDate)
														}
														style={{
															background: '#0ba360',
															color: '#fff',
															border: 'none',
															padding: '6px 14px',
															borderRadius: '8px',
															fontWeight: 'bold',
															cursor: 'pointer'
														}}
													>
														Забрать
													</button>
												)}
												{isClaimed && (
													<span
														style={{ color: '#0ba360', fontWeight: 'bold' }}
													>
														✓ Получено
													</span>
												)}
											</div>
										</div>
									)
								})}
							</div>
						</div>
					)}
				</>
			)}

			{activeTab === 'achievements' && (
				<>
					<p className="eyebrow">ТВОИ УСПЕХИ</p>
					<h2>Достижения</h2>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '12px',
							marginTop: '16px'
						}}
					>
						{achievementsData.map(ach => {
							const isClaimed = achievements.includes(ach.id)

							let progress = 0
							if (ach.type === 'total_water')
								progress = userStats?.totalWater || 0
							if (ach.type === 'streak') progress = userStats?.streak || 0
							if (ach.type === 'family_count')
								progress = userStats?.familyCount || 0
							if (ach.type === 'family_members')
								progress = userStats?.maxFamilyMembers || 0
							if (ach.type === 'title_bought')
								progress = userStats?.titlesBought || 0

							const isDone = progress >= ach.goal
							const percent = Math.min(
								Math.round((progress / ach.goal) * 100),
								100
							)

							return (
								<div
									key={ach.id}
									className="quest-card"
									style={{
										opacity: isClaimed ? 0.6 : 1,
										border:
											isDone && !isClaimed
												? '2px solid #ffd700'
												: '1px solid #e2e8f0'
									}}
								>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											alignItems: 'center',
											marginBottom: '12px'
										}}
									>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '10px'
											}}
										>
											<div style={{ fontSize: '28px' }}>{ach.icon}</div>
											<div>
												<div className="quest-title">{ach.title}</div>
												<div className="quest-desc">{ach.desc}</div>
											</div>
										</div>
										<div
											className="quest-reward"
											style={{
												background: isClaimed ? '#e2e8f0' : '#fff0bf',
												color: isClaimed ? '#71869d' : '#c49b00'
											}}
										>
											{isClaimed ? 'Получено' : `+${ach.reward} ✦`}
										</div>
									</div>
									<div className="quest-progress-bg">
										<div
											className="quest-progress-fill"
											style={{
												width: `${percent}%`,
												background: isClaimed
													? '#0ba360'
													: isDone
														? '#ffd700'
														: '#1886ad'
											}}
										/>
									</div>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
											fontSize: '12px',
											color: '#71869d',
											marginTop: '6px',
											alignItems: 'center'
										}}
									>
										<span>
											{ach.type === 'total_water'
												? formatVolume(progress)
												: progress}{' '}
											/{' '}
											{ach.type === 'total_water'
												? formatVolume(ach.goal)
												: ach.goal}
										</span>
										{!isClaimed && isDone && (
											<button
												onClick={() => handleClaimAch(ach)}
												style={{
													background: '#0ba360',
													color: '#fff',
													border: 'none',
													padding: '4px 12px',
													borderRadius: '8px',
													fontWeight: 'bold',
													cursor: 'pointer'
												}}
											>
												Забрать
											</button>
										)}
										{isClaimed && (
											<span style={{ color: '#0ba360', fontWeight: 'bold' }}>
												✓ Получено
											</span>
										)}
									</div>
								</div>
							)
						})}
					</div>
				</>
			)}
		</section>
	)
}
