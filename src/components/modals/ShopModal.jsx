import { useState } from 'react'
import { showToast } from '../../lib/api'

const CASES = [
	{
		id: 'case_fons',
		title: 'Кейс «Фоны»',
		icon: '📦',
		price: 20,
		color: '#74b9ff',
		desc: 'Шанс выбить редкий фон'
	},
	{
		id: 'case_titles',
		title: 'Кейс «Титулы»',
		icon: '🏷️',
		price: 30,
		color: '#a29bfe',
		desc: 'От обычных до эпических титулов'
	},
	{
		id: 'case_sounds',
		title: 'Кейс «Звуки»',
		icon: '🔊',
		price: 15,
		color: '#55efc4',
		desc: 'Приятные звуки для воды'
	},
	{
		id: 'case_mega',
		title: 'Мега-Кейс',
		icon: '💎',
		price: 100,
		color: '#fdcb6e',
		desc: '100% шанс на крутую вещь!'
	}
]

const PRIZES = [
	{ name: '5 алмазов', icon: '✦', rarity: 'Обычный', color: '#71869d' },
	{ name: '10 алмазов', icon: '✦', rarity: 'Обычный', color: '#71869d' },
	{ name: 'Золотая рамка', icon: '🖼️', rarity: 'Редкий', color: '#1886ad' },
	{ name: 'Свечение имени', icon: '✨', rarity: 'Редкий', color: '#1886ad' },
	{
		name: 'Космический фон',
		icon: '🌌',
		rarity: 'Эпический',
		color: '#a29bfe'
	},
	{ name: 'Звук «Дзынь»', icon: '🔔', rarity: 'Обычный', color: '#71869d' },
	{
		name: 'Титул «Аквамен»',
		icon: '🔱',
		rarity: 'Легендарный',
		color: '#fdcb6e'
	}
]

export default function ShopModal({ show, onClose, diamonds }) {
	const [activeTab, setActiveTab] = useState('items')
	const [spinning, setSpinning] = useState(false)
	const [wonPrize, setWonPrize] = useState(null)
	const [openedCase, setOpenedCase] = useState(null)

	if (!show) return null

	const items = [
		{
			id: 1,
			title: 'Космическая тема',
			icon: '🌌',
			price: 50,
			desc: 'Темный фон со звездами'
		},
		{
			id: 2,
			title: 'Океанская тема',
			icon: '🌊',
			price: 40,
			desc: 'Морской бриз'
		},
		{
			id: 3,
			title: 'Золотая рамка',
			icon: '🖼️',
			price: 30,
			desc: 'Выделись в семье'
		},
		{
			id: 4,
			title: 'Свечение имени',
			icon: '✨',
			price: 20,
			desc: 'Твое имя будет сиять'
		},
		{
			id: 5,
			title: 'Заморозка стрика',
			icon: '🧊',
			price: 25,
			desc: 'Спасает огонек'
		},
		{
			id: 6,
			title: 'Звук «Дзынь»',
			icon: '🔔',
			price: 15,
			desc: 'Приятный звук при нажатии'
		},
		{
			id: 7,
			title: 'Титул «Аквамен»',
			icon: '🔱',
			price: 35,
			desc: 'Прямая покупка титула'
		}
	]

	const openCase = c => {
		if (spinning) return
		setSpinning(true)
		setWonPrize(null)
		setOpenedCase(c)

		// Имитация рулетки (2 секунды)
		setTimeout(() => {
			const randomPrize = PRIZES[Math.floor(Math.random() * PRIZES.length)]
			setWonPrize(randomPrize)
			setSpinning(false)
			showToast(`Вы выбили: ${randomPrize.name}!`, 'success')
		}, 2000)
	}

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
						<p style={{ margin: 0, fontSize: '13px', color: '#71869d' }}>
							Трать алмазы с умом
						</p>
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

				{/* Табы */}
				<div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
					<button
						onClick={() => setActiveTab('items')}
						style={{
							flex: 1,
							padding: '10px',
							borderRadius: '12px',
							border: 'none',
							fontWeight: 'bold',
							background: activeTab === 'items' ? '#173f70' : '#eef5fb',
							color: activeTab === 'items' ? '#fff' : '#173f70',
							cursor: 'pointer',
							transition: 'all 0.2s'
						}}
					>
						Косметика
					</button>
					<button
						onClick={() => setActiveTab('cases')}
						style={{
							flex: 1,
							padding: '10px',
							borderRadius: '12px',
							border: 'none',
							fontWeight: 'bold',
							background: activeTab === 'cases' ? '#173f70' : '#eef5fb',
							color: activeTab === 'cases' ? '#fff' : '#173f70',
							cursor: 'pointer',
							transition: 'all 0.2s'
						}}
					>
						🎁 Кейсы
					</button>
				</div>

				{/* КОНТЕНТ КОСМЕТИКИ */}
				{activeTab === 'items' && (
					<div className="shop-grid">
						{items.map(item => (
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
									onClick={() => showToast('Покупки появятся скоро!', 'info')}
								>
									{item.price} ✦
								</button>
							</div>
						))}
					</div>
				)}

				{/* КОНТЕНТ КЕЙСОВ */}
				{activeTab === 'cases' && (
					<div
						style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
					>
						{CASES.map(c => (
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
									<div
										style={{
											fontSize: '12px',
											color: '#71869d',
											marginBottom: '4px'
										}}
									>
										{c.desc}
									</div>
								</div>
								<button
									onClick={() => openCase(c)}
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
									{c.price} ✦
								</button>
							</div>
						))}
					</div>
				)}

				{/* АНИМАЦИЯ РУЛЕТКИ */}
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

				{/* РЕЗУЛЬТАТ */}
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
						<h3 style={{ margin: '0 0 8px', color: wonPrize.color }}>
							{wonPrize.name}
						</h3>
						<p
							style={{ margin: '0 0 20px', fontSize: '14px', color: '#71869d' }}
						>
							Редкость: {wonPrize.rarity}
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
