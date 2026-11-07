import shopData from '../../data/shop.json'

export default function SettingsModal({
	settings,
	setSettings,
	saveSettings,
	profile,
	userId,
	isDark,
	setIsDark,
	appliedTheme,
	applyItem,
	appliedTitle,
	appliedFrame
}) {
	if (!settings) return null

	return (
		<div
			className="modal-backdrop"
			onClick={() => setSettings(false)}
		>
			<div
				className="settings-modal"
				onClick={event => event.stopPropagation()}
				style={{ maxHeight: '85vh', overflowY: 'auto' }}
			>
				<button
					type="button"
					className="modal-close"
					onClick={() => setSettings(false)}
				>
					×
				</button>
				<p className="eyebrow">ПРОФИЛЬ И ИНВЕНТАРЬ</p>
				<h2>Настройки</h2>

				<form onSubmit={saveSettings}>
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
					<button
						className="primary-action"
						style={{ marginBottom: '24px' }}
					>
						Сохранить профиль
					</button>
				</form>

				{/* ИНВЕНТАРЬ */}
				<div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
					<h3
						style={{ fontSize: '16px', marginBottom: '12px', color: '#173f70' }}
					>
						🎒 Мой инвентарь
					</h3>

					<div
						style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
					>
						{/* ФОНЫ */}
						<div>
							<div
								style={{
									fontSize: '12px',
									color: '#71869d',
									marginBottom: '8px'
								}}
							>
								Фоны
							</div>
							<div
								style={{
									display: 'flex',
									gap: '8px',
									overflowX: 'auto',
									paddingBottom: '8px'
								}}
							>
								{shopData.themes.map(t => (
									<button
										key={t.id}
										onClick={() => applyItem(t)}
										style={{
											padding: '8px 12px',
											borderRadius: '10px',
											border:
												appliedTheme === t.cssClass
													? '2px solid #0ba360'
													: '1px solid #d4e1eb',
											background: '#fff',
											cursor: 'pointer',
											whiteSpace: 'nowrap',
											fontSize: '13px'
										}}
									>
										{t.icon} {t.title}
									</button>
								))}
							</div>
						</div>

						{/* ТИТУЛЫ */}
						<div>
							<div
								style={{
									fontSize: '12px',
									color: '#71869d',
									marginBottom: '8px'
								}}
							>
								Титулы
							</div>
							<div
								style={{
									display: 'flex',
									gap: '8px',
									overflowX: 'auto',
									paddingBottom: '8px'
								}}
							>
								{shopData.titles.map(t => (
									<button
										key={t.id}
										onClick={() => applyItem(t)}
										style={{
											padding: '8px 12px',
											borderRadius: '10px',
											border:
												appliedTitle?.id === t.id
													? '2px solid #0ba360'
													: '1px solid #d4e1eb',
											background: '#fff',
											cursor: 'pointer',
											whiteSpace: 'nowrap',
											fontSize: '13px'
										}}
									>
										{t.icon} {t.title}
									</button>
								))}
							</div>
						</div>

						{/* РАМКИ */}
						<div>
							<div
								style={{
									fontSize: '12px',
									color: '#71869d',
									marginBottom: '8px'
								}}
							>
								Рамки аватара
							</div>
							<div
								style={{
									display: 'flex',
									gap: '8px',
									overflowX: 'auto',
									paddingBottom: '8px'
								}}
							>
								{shopData.frames.map(t => (
									<button
										key={t.id}
										onClick={() => applyItem(t)}
										style={{
											padding: '8px 12px',
											borderRadius: '10px',
											border:
												appliedFrame === t.cssClass
													? '2px solid #0ba360'
													: '1px solid #d4e1eb',
											background: '#fff',
											cursor: 'pointer',
											whiteSpace: 'nowrap',
											fontSize: '13px'
										}}
									>
										{t.icon} {t.title}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
