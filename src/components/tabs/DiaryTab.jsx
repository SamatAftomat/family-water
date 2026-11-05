import LogRow from '../LogRow'

export default function DiaryTab({ logs, today, removeLog, clearAllLogs }) {
	return (
		<section className="section-block page-block">
			<div className="section-heading">
				<h2>Дневник воды</h2>
				{logs.length > 0 && (
					<button
						className="clear-all-btn"
						onClick={clearAllLogs}
					>
						Очистить всё
					</button>
				)}
			</div>
			<span
				className="date-label"
				style={{ display: 'block', marginBottom: '16px', marginTop: '-4px' }}
			>
				Сегодня {today}
			</span>
			{logs.length === 0 ? (
				<p className="empty-note">Записей пока нет.</p>
			) : (
				<div className="log-list">
					{logs.map(log => (
						<LogRow
							key={log.id}
							log={log}
							onRemove={removeLog}
						/>
					))}
				</div>
			)}
		</section>
	)
}
