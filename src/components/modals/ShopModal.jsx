import { useState } from 'react'
import { showToast } from '../../lib/api'
import shopData from '../../data/shop.json'

export default function ShopModal({
	show,
	onClose,
	diamonds,
	onApplyItem,
	ownedItems,
	onBuyItem,
	customPrices = {}
}) {
	const [activeTab, setActiveTab] = useState('themes')
	const [spinning, setSpinning] = useState(false)
	const [wonPrize, setWonPrize] = useState(null)
	const [openedCase, setOpenedCase] = useState(null)
	const [isProcessing, setIsProcessing] = useState(false)

	if (!show) return null

	const getPrice = item => {
		return customPrices[item.id] !== undefined
			? customPrices[item.id]
			: item.price
	}

	const handleBuy = async item => {
		const price = getPrice(item)
		if (isProcessing) return
		if (diamonds < price) return showToast('Недостаточно алмазов!', 'error')

		setIsProcessing(true)
		const success = await onBuyItem(item, price)
		setIsProcessing(false)
	}

	const openCase = c => {
		const price = getPrice(c)
		if (spinning) return
		if (diamonds < price) return showToast('Недостаточно алмазов!', 'error')

		setSpinning(true)
		setWonPrize(null)
		setOpenedCase(c)

		setTimeout(async () => {
			const randomId = c.pool[Math.floor(Math.random() * c.pool.length)]
			let foundItem =
				shopData.themes.find(t => t.id === randomId) ||
				shopData.titles.find(t => t.id === randomId) ||
				shopData.frames.find(f => f.id === randomId)

			const success = await onBuyItem(foundItem, price)

			if (success) {
				setWonPrize(foundItem)
			}
			setSpinning(false)
		}, 2000)
	}

	const availableThemes = shopData.themes
		.filter(t => !ownedItems.includes(t.id))
		.map(i => ({ ...i, price: getPrice(i) }))
	const availableTitles = shopData.titles
		.filter(t => !ownedItems.includes(t.id) && t.id !== 'title_default')
		.map(i => ({ ...i, price: getPrice(i) }))
	const availableFrames = shopData.frames
		.filter(f => !ownedItems.includes(f.id))
		.map(i => ({ ...i, price: getPrice(i) }))

	return (
		<div
			className="modal-backdrop"
			onClick={onClose}
		>
			<div
				className="shop-modal"
				onClick={e => e.stopPropagation()}
			>
				<button
					className="modal-close"
					onClick={onClose}
				>
					×
				</button>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
						marginBottom: '20px'
					}}
				>
					<div style={{ fontSize: '32px' }}>🛍️</div>
					<div>
						<h2 style={{ margin: 0 }}>Магазин</h2>
					</div>
					<div
						style={{
							marginLeft: 'auto',
							background: '#fff0bf',
							padding: '8px 12px',
							borderRadius: '12px',
							fontWeight: 'bold',
							color: '#c49b00',
							display: 'flex',
							alignItems: 'center',
							gap: '4px'
						}}
					>
						<span>✦</span> {diamonds}
					</div>
				</div>
				<div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
					<button
						onClick={() => setActiveTab('themes')}
						className={`shop-tab ${activeTab === 'themes' ? 'active' : ''}`}
					>
						Фоны
					</button>
					<button
						onClick={() => setActiveTab('style')}
						className={`shop-tab ${activeTab === 'style' ? 'active' : ''}`}
					>
						Стиль
					</button>
					<button
						onClick={() => setActiveTab('cases')}
						className={`shop-tab ${activeTab === 'cases' ? 'active' : ''}`}
					>
						Кейсы
					</button>
				</div>
				{activeTab === 'themes' && (
					<div className="shop-grid">
						{availableThemes.length === 0 ? (
							<p className="empty-note">Все фоны куплены!</p>
						) : (
							availableThemes.map(item => (
								<div
									key={item.id}
									className="shop-item"
								>
									<div className="shop-icon">{item.icon}</div>
									<div className="shop-info">
										<div className="shop-title">{item.title}</div>
										<div className="shop-desc">{item.desc}</div>
									</div>
									<button
										className="shop-buy-btn"
										onClick={() => handleBuy(item)}
										disabled={isProcessing}
									>
										{item.price > 0 ? `${item.price} ✦` : 'Купить'}
									</button>
								</div>
							))
						)}
					</div>
				)}
				{activeTab === 'style' && (
					<div
						style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
					>
						<div>
							<h3
								style={{
									fontSize: '14px',
									color: '#71869d',
									marginBottom: '8px'
								}}
							>
								Титулы
							</h3>
							<div className="shop-grid">
								{availableTitles.length === 0 ? (
									<p className="empty-note">Все титулы куплены!</p>
								) : (
									availableTitles.map(item => (
										<div
											key={item.id}
											className="shop-item"
										>
											<div className="shop-icon">{item.icon}</div>
											<div className="shop-info">
												<div className="shop-title">{item.title}</div>
											</div>
											<button
												className="shop-buy-btn"
												onClick={() => handleBuy(item)}
												disabled={isProcessing}
											>
												{item.price > 0 ? `${item.price} ✦` : 'Купить'}
											</button>
										</div>
									))
								)}
							</div>
						</div>
						<div>
							<h3
								style={{
									fontSize: '14px',
									color: '#71869d',
									marginBottom: '8px'
								}}
							>
								Рамки
							</h3>
							<div className="shop-grid">
								{availableFrames.length === 0 ? (
									<p className="empty-note">Все рамки куплены!</p>
								) : (
									availableFrames.map(item => (
										<div
											key={item.id}
											className="shop-item"
										>
											<div className="shop-icon">{item.icon}</div>
											<div className="shop-info">
												<div className="shop-title">{item.title}</div>
											</div>
											<button
												className="shop-buy-btn"
												onClick={() => handleBuy(item)}
												disabled={isProcessing}
											>
												{item.price > 0 ? `${item.price} ✦` : 'Купить'}
											</button>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				)}
				{activeTab === 'cases' && (
					<div
						style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
					>
						{shopData.cases.map(c => {
							const price = getPrice(c)
							return (
								<div
									key={c.id}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '12px',
										background: '#f8fafc',
										padding: '16px',
										borderRadius: '16px',
										border: `1px solid ${c.color}40`
									}}
								>
									<div
										style={{
											fontSize: '32px',
											background: '#fff',
											width: '60px',
											height: '60px',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											borderRadius: '16px',
											boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
										}}
									>
										{c.icon}
									</div>
									<div style={{ flex: 1 }}>
										<div
											style={{
												fontWeight: '800',
												color: '#173f70',
												fontSize: '16px'
											}}
										>
											{c.title}
										</div>
										<div style={{ fontSize: '12px', color: '#71869d' }}>
											{c.desc}
										</div>
									</div>
									<button
										onClick={() => openCase(c)}
										disabled={spinning || isProcessing}
										style={{
											background: c.color,
											color: '#fff',
											border: 'none',
											padding: '10px 16px',
											borderRadius: '12px',
											fontWeight: 'bold',
											cursor: 'pointer',
											flexShrink: 0
										}}
									>
										{price > 0 ? `${price} ✦` : 'Открыть'}
									</button>
								</div>
							)
						})}
					</div>
				)}
				{spinning && (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background: 'rgba(255,255,255,0.95)',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							borderRadius: '24px',
							zIndex: 10
						}}
					>
						<div className="case-spinner">
							<div className="case-spinner-inner">{openedCase.icon}</div>
						</div>
						<p
							style={{
								marginTop: '20px',
								fontWeight: 'bold',
								color: '#173f70',
								fontSize: '18px'
							}}
						>
							Открываем...
						</p>
					</div>
				)}
				{wonPrize && !spinning && (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background: 'rgba(255,255,255,0.95)',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							borderRadius: '24px',
							zIndex: 10,
							animation: 'popIn 0.3s ease'
						}}
					>
						<div style={{ fontSize: '60px', marginBottom: '10px' }}>
							{wonPrize.icon}
						</div>
						<h3 style={{ margin: '0 0 8px', color: '#173f70' }}>
							{wonPrize.title}
						</h3>
						<p
							style={{
								margin: '0 0 20px',
								fontSize: '14px',
								color: '#0ba360',
								fontWeight: 'bold'
							}}
						>
							Уже применено!
						</p>
						<button
							className="primary-action"
							onClick={() => setWonPrize(null)}
							style={{ maxWidth: '200px' }}
						>
							Забрать
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
