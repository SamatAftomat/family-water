export default function SettingsModal({
	settings,
	setSettings,
	saveSettings,
	profile,
	userId,
	isDark,
	setIsDark
}) {
	if (!settings) return null

	return (
		<div
			className="modal-backdrop"
			onClick={() => setSettings(false)}
		>
			<form
				className="settings-modal"
				onSubmit={saveSettings}
				onClick={event => event.stopPropagation()}
			>
				<button
					type="button"
					className="modal-close"
					onClick={() => setSettings(false)}
				>
					×
				</button>
				<p className="eyebrow">ПРОФИЛЬ</p>
				<h2>Настройки</h2>
				<label>
					Имя
					<input
						name="name"
						defaultValue={profile?.first_name}
					/>
				</label>
				<label>
					Вес, кг
					<input
						name="weight"
						type="number"
						min="1"
						defaultValue={profile?.weight_kg}
					/>
				</label>
				<label>
					Telegram ID
					<input
						value={userId}
						disabled
					/>
				</label>
				<label
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						cursor: 'pointer',
						marginTop: '16px'
					}}
				>
					<span>Тёмная тема</span>
					<input
						type="checkbox"
						checked={isDark}
						onChange={e => setIsDark(e.target.checked)}
						style={{ width: '24px', height: '24px' }}
					/>
				</label>
				<button className="primary-action">Сохранить</button>
			</form>
		</div>
	)
}
