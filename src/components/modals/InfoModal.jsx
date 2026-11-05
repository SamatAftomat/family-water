export default function InfoModal({ activeInfo, setActiveInfo, goal, total }) {
	if (!activeInfo) return null

	return (
		<div
			className="modal-backdrop"
			onClick={() => setActiveInfo(null)}
		>
			<div
				className="info-modal"
				onClick={event => event.stopPropagation()}
			>
				<button
					type="button"
					className="modal-close"
					onClick={() => setActiveInfo(null)}
				>
					×
				</button>
				{activeInfo === 'diamonds' && (
					<>
						<h2 style={{ color: '#c49b00' }}>✦ Алмазы</h2>
						<p>
							Алмазы — это внутренняя валюта приложения. В будущем на них можно
							будет покупать косметику: красивые фоны для профиля, уникальные
							цвета имени и иконки.
						</p>
						<p>
							<strong>Как заработать:</strong> выполняй свою дневную норму воды.
							За каждый день, когда норма достигнута, начисляется 1 алмаз.
						</p>
					</>
				)}
				{activeInfo === 'streak' && (
					<>
						<h2 style={{ color: '#e65c00' }}>🔥 Дни подряд (Streak)</h2>
						<p>
							Streak — это серия дней подряд, в которые ты выполнял норму воды.
						</p>
						<p>
							<strong>Зачем это нужно:</strong> чем длиннее твоя серия, тем
							больше бонусных алмазов ты получаешь. Но если пропустишь день —
							серия сгорит и начнется заново!
						</p>
					</>
				)}
				{activeInfo === 'progress' && (
					<>
						<h2 style={{ color: '#1886ad' }}>◉ Прогресс дня</h2>
						<p>
							Этот процент показывает, насколько ты приблизился к своей
							ежедневной цели.
						</p>
						<p>
							<strong>Твой расчет:</strong> Твоя норма — {goal} мл. Выпито
							сегодня: {total} мл.
						</p>
					</>
				)}
			</div>
		</div>
	)
}
