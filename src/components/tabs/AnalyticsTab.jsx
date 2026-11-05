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
					<span className="chart-line-label">{goal}</span>
				</div>

				<div className="chart-grid">
					{weekData.map(day => (
						<div
							className="chart-day"
							key={day.key}
						>
							<div className="chart-bar-wrap">
								<div
									className="chart-bar"
									style={{
										height: `${Math.min((day.total / goal) * 100, 96)}%`,
										background:
											day.total >= goal
												? 'linear-gradient(#0ba360, #3cba92)'
												: 'linear-gradient(#25b2c1, #2575c5)'
									}}
									title={`${day.total} мл`}
								/>
							</div>
							<span className="chart-day-label">{day.label}</span>
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
		</section>
	)
}
