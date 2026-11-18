export default function AnalyticsTab({
	weekData,
	goal,
	weekTotal,
	weekAverage
}) {
	return (
		<section className="section-block page-block">
			<p className="eyebrow">ПОСЛЕДНИЕ 7 ДНЕЙ</p>
			<h2>Аналитика</h2>

			<div className="chart-container">
				<div className="chart-line">
					<span className="chart-line-label">Цель {goal} мл</span>
				</div>

				<div className="chart-grid">
					{weekData.map(day => (
						<div
							className="chart-day"
							key={day.key}
						>
							<div className="chart-bar-wrap">
								<span className="chart-value">{day.total ? `${day.total}` : '—'}</span>
								<div
									className="chart-bar"
									style={{
										height: `${Math.max(day.total ? 6 : 0, Math.min((day.total / goal) * 100, 100))}%`,
										background:
											day.total >= goal
												? 'linear-gradient(#0ba360, #3cba92)'
												: 'linear-gradient(#25b2c1, #2575c5)'
									}}
									title={`${day.total} мл`}
								/>
							</div>
							<span className="chart-day-label">{day.label}</span>
							{day.total >= goal && <span className="chart-goal-mark">Цель</span>}
						</div>
					))}
				</div>
			</div>

			<div className="analytics-summary">
				<span>
					Выпито за неделю{' '}
					<strong>
						{weekTotal >= 1000
							? (weekTotal / 1000).toFixed(1) + ' л'
							: weekTotal + ' мл'}
					</strong>
				</span>
				<span>
					Среднее за день <strong>{weekAverage} мл</strong>
				</span>
			</div>
			<p className="analytics-hint">Пунктирная линия показывает дневную цель. Зелёные столбцы — дни, когда цель выполнена.</p>
		</section>
	)
}
