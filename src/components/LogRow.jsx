export default function LogRow({ log, onRemove }) {
	return (
		<div className="log-row">
			<span className="log-icon">💧</span>
			<div>
				<strong>{log.amount} мл</strong>
				<small>{log.time}</small>
			</div>
			<button
				className="remove-log"
				onClick={() => onRemove(log.id)}
				aria-label="Удалить запись"
			>
				×
			</button>
		</div>
	)
}
