import LogRow from '../LogRow'

export default function TodayTab({
	total,
	goal,
	progress,
	logs,
	addWater,
	isAdding,
	showCustom,
	setShowCustom,
	customAmount,
	setCustomAmount,
	removeLog,
	goToTab,
	invites,
	onShareProgress,
	streak
}) {
	return (
		<>
			{/* БАННЕР ПРИГЛАШЕНИЯ */}
			{invites && invites.length > 0 && (
				<div
					onClick={() => goToTab('family')}
					style={{
						background: '#fff3e0',
						border: '1px solid #ffe0b2',
						padding: '16px',
						borderRadius: '16px',
						marginBottom: '16px',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between'
					}}
				>
					<div>
						<div
							style={{ fontWeight: 'bold', color: '#e65c00', fontSize: '15px' }}
						>
							Вас приглашают в семью! 💌
						</div>
						<div
							style={{ fontSize: '13px', color: '#d84315', marginTop: '4px' }}
						>
							Нажмите, чтобы посмотреть
						</div>
					</div>
					<div style={{ fontSize: '24px' }}>👉</div>
				</div>
			)}

			<section className="progress-card">
				<div className="progress-ring">
					<svg viewBox="0 0 120 120">
						<defs>
							<linearGradient
								id="ringGradient"
								x1="0%"
								y1="0%"
								x2="100%"
								y2="100%"
							>
								<stop
									offset="0%"
									stopColor="#ffffff"
									stopOpacity="1"
								/>
								<stop
									offset="100%"
									stopColor="#a0e0ff"
									stopOpacity="0.9"
								/>
							</linearGradient>
						</defs>
						<circle
							className="ring-track"
							cx="60"
							cy="60"
							r="50"
							pathLength="100"
						/>
						{/* ДОБАВИЛИ КЛАСС ring-complete, ЕСЛИ НОРМА ВЫПОЛНЕНА */}
						<circle
							className={`ring-value ${progress >= 100 ? 'ring-complete' : ''}`}
							cx="60"
							cy="60"
							r="50"
							pathLength="100"
							stroke="url(#ringGradient)"
							style={{ strokeDasharray: `${progress} 100` }}
						/>
					</svg>
					<div className="ring-center">
						<strong>{total}</strong>
						<small>из {goal} мл</small>
					</div>
				</div>
				<div className="progress-copy">
					<span>Выпито сегодня</span>
					<strong>{total} мл</strong>
					<small>
						{goal - total > 0
							? `Осталось ${goal - total} мл`
							: 'Норма выполнена!'}
					</small>
				</div>
				<div className="water-actions">
					<button
						className="water-button water-button-blue"
						onClick={() => addWater(100)}
						disabled={isAdding}
					>
						+100
					</button>
					<button
						className="water-button water-button-cyan"
						onClick={() => addWater(200)}
						disabled={isAdding}
					>
						+200
					</button>
					<button
						className="water-button water-button-green"
						onClick={() => addWater(300)}
						disabled={isAdding}
					>
						+300
					</button>
				</div>
				<button
					className="custom-water"
					onClick={() => setShowCustom(!showCustom)}
				>
					{showCustom ? '✕ Скрыть' : '＋ Другое количество'}
				</button>
				{showCustom && (
					<div className="custom-form">
						<input
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							value={customAmount}
							onChange={e => setCustomAmount(e.target.value.replace(/\D/g, ''))}
							autoFocus
						/>
						<button
							onClick={() => addWater(customAmount)}
							disabled={isAdding}
						>
							Добавить
						</button>
					</div>
				)}

				{/* КНОПКА ПОДЕЛИТЬСЯ */}
				<button
					onClick={onShareProgress}
					style={{
						width: '100%',
						marginTop: '12px',
						padding: '12px',
						background: 'transparent',
						border: '1px solid rgba(255,255,255,0.4)',
						borderRadius: '14px',
						color: '#fff',
						fontWeight: 'bold',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '8px'
					}}
				>
					<span>📤</span> Поделиться прогрессом
				</button>
			</section>

			<section className="section-block">
				<div className="section-heading">
					<h2>Последние записи</h2>
					<button
						className="link-button"
						onClick={() => goToTab('diary')}
					>
						Все записи
					</button>
				</div>
				{logs.length === 0 ? (
					<p className="empty-note">Добавь первый стакан воды за сегодня.</p>
				) : (
					<div className="log-list">
						{logs.slice(0, 4).map(log => (
							<LogRow
								key={log.id}
								log={log}
								onRemove={removeLog}
							/>
						))}
					</div>
				)}
			</section>
		</>
	)
}
