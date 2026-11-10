export default function TutorialModal({ show, onClose }) {
	if (!show) return null

	return (
		<div
			className="modal-backdrop"
			onClick={onClose}
		>
			<div
				className="tutorial-modal"
				onClick={e => e.stopPropagation()}
			>
				<div className="tutorial-icon">💧</div>
				<h2>Добро пожаловать!</h2>
				<p>Давай посмотрим, как работает трекер:</p>

				<div className="tutorial-step">
					<div className="tutorial-step-num">1</div>
					<div>
						<strong>Добавляй воду</strong>
						<p>
							Нажимай на кнопки <b>+100</b>, <b>+200</b> или пиши боту{' '}
							<b>+400</b> в чат, чтобы записать выпитое.
						</p>
					</div>
				</div>

				<div className="tutorial-step">
					<div className="tutorial-step-num">2</div>
					<div>
						<strong>Следи за семьей</strong>
						<p>
							Во вкладке «Семья» ты можешь создать группу и видеть, сколько пьют
							твои близкие.
						</p>
					</div>
				</div>

				<div className="tutorial-step">
					<div className="tutorial-step-num">3</div>
					<div>
						<strong>Зарабатывай алмазы</strong>
						<p>
							Выполняй норму, собирай достижения и трать алмазы в магазине на
							крутые фоны и титулы!
						</p>
					</div>
				</div>

				<button
					className="primary-action"
					onClick={onClose}
					style={{ marginTop: '20px' }}
				>
					Понятно, поехали! 🚀
				</button>
			</div>
		</div>
	)
}
