import { useEffect, useMemo, useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import { getTelegramUser } from '../lib/telegram'
import {
	getUserProfile,
	getTodayLogs,
	addWaterToDb,
	deleteLogFromDb,
	getLast7DaysTotal,
	createFamily,
	getMyFamilies,
	inviteToFamily,
	acceptFamilyInvite,
	getMyInvites,
	deleteFamily,
	kickFromFamily,
	renameFamily,
	clearTodayLogs,
	updateProfileDb,
	showToast,
	getQuestProgress,
	getInventory,
	buyItemApi
} from '../lib/api'
import { supabase } from '../lib/telegram'

import NavButton from './NavButton'
import TodayTab from './tabs/TodayTab'
import DiaryTab from './tabs/DiaryTab'
import AnalyticsTab from './tabs/AnalyticsTab'
import FamilyTab from './tabs/FamilyTab'
import QuestsTab from './tabs/QuestsTab'
import RewardModal from './modals/RewardModal'
import SettingsModal from './modals/SettingsModal'
import InfoModal from './modals/InfoModal'
import ShopModal from './modals/ShopModal'

const todayKey = () => {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function MainScreen() {
	const userId = Number(getTelegramUser().id)
	const isTelegram = !!window.Telegram?.WebApp?.initData

	const [profile, setProfile] = useState(null)
	const [logs, setLogs] = useState([])
	const [chartTotals, setChartTotals] = useState({})
	const [quests, setQuests] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isAdding, setIsAdding] = useState(false)

	const [tab, setTab] = useState('today')
	const [customAmount, setCustomAmount] = useState('')
	const [showCustom, setShowCustom] = useState(false)
	const [settings, setSettings] = useState(false)
	const [activeInfo, setActiveInfo] = useState(null)
	const [showShop, setShowShop] = useState(false)
	const [isDark, setIsDark] = useState(
		() => localStorage.getItem('family-water-theme') === 'dark'
	)

	// ИНВЕНТАРЬ И ПРИМЕНЕННЫЕ ВЕЩИ
	const [ownedItems, setOwnedItems] = useState([])
	const [appliedTheme, setAppliedTheme] = useState(
		() => localStorage.getItem('applied_theme') || ''
	)
	const [appliedTitle, setAppliedTitle] = useState(() => {
		const saved = localStorage.getItem('applied_title')
		return saved ? JSON.parse(saved) : null
	})
	const [appliedFrame, setAppliedFrame] = useState(
		() => localStorage.getItem('applied_frame') || ''
	)

	const [showReward, setShowReward] = useState(false)
	const [diamondPop, setDiamondPop] = useState(false)
	const diamondTargetRef = useRef(null)

	const [families, setFamilies] = useState([])
	const [invites, setInvites] = useState([])
	const [familyLoading, setFamilyLoading] = useState(false)

	const [toasts, setToasts] = useState([])

	const touchStart = useRef({ x: 0, y: 0 })
	const touchEnd = useRef({ x: 0, y: 0 })
	const minSwipeDistance = 60
	const tabsOrder = ['today', 'diary', 'analytics', 'family', 'quests']

	// ПРИМЕНЕНИЕ ПРЕДМЕТА (С ЛОГИКОЙ ТЕМ)
	const applyItem = item => {
		if (item.id.startsWith('theme_')) {
			setAppliedTheme(item.cssClass)
			localStorage.setItem('applied_theme', item.cssClass)

			if (item.themeMode === 'dark') setIsDark(true)
			else if (item.themeMode === 'light') setIsDark(false)
			// Если 'universal', то мы не трогаем текущий режим
		} else if (item.id.startsWith('title_')) {
			if (item.id === 'title_default') {
				setAppliedTitle(null)
				localStorage.removeItem('applied_title')
			} else {
				setAppliedTitle(item)
				localStorage.setItem('applied_title', JSON.stringify(item))
			}
		} else if (item.id.startsWith('frame_')) {
			setAppliedFrame(item.cssClass)
			localStorage.setItem('applied_frame', item.cssClass)
		}
	}

	// РЕАЛЬНАЯ ПОКУПКА
	const handleBuyItem = async (item, isCase = false) => {
		const price = isCase ? item.price || 0 : item.price || 0

		const res = await buyItemApi(userId, item.id, price)
		if (res.error) {
			showToast(res.error, 'error')
			return
		}

		// Если куплено успешно
		showToast(`Куплено: ${item.title}`, 'success')
		applyItem(item) // Сразу применяем
		setOwnedItems(prev => [...prev, item.id])

		// Обновляем профиль, чтобы обновить счетчик алмазов
		const updatedProfile = await getUserProfile(userId)
		setProfile(updatedProfile)
	}

	useEffect(() => {
		const handleToast = e => {
			const { message, type } = e.detail
			const id = Date.now()
			setToasts(prev => [...prev, { id, message, type }])
			setTimeout(() => {
				setToasts(prev => prev.filter(t => t.id !== id))
			}, 3000)
		}
		window.addEventListener('app-toast', handleToast)
		return () => window.removeEventListener('app-toast', handleToast)
	}, [])

	const animateSlide = direction => {
		const container = document.querySelector('.swipe-container')
		if (!container) return
		const translateFrom = direction === 'left' ? 40 : -40
		container.animate(
			[
				{ opacity: 0, transform: `translateX(${translateFrom}px)` },
				{ opacity: 1, transform: 'translateX(0)' }
			],
			{
				duration: 280,
				easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
				fill: 'both'
			}
		)
	}

	const goToTab = (newTab, direction = 'fade') => {
		if (newTab === tab) return
		setTab(newTab)
		if (direction !== 'fade') {
			requestAnimationFrame(() => animateSlide(direction))
		} else {
			requestAnimationFrame(() => {
				const container = document.querySelector('.swipe-container')
				if (!container) return
				container.animate(
					[
						{ opacity: 0, transform: 'scale(0.98)' },
						{ opacity: 1, transform: 'scale(1)' }
					],
					{ duration: 200, easing: 'ease-out', fill: 'both' }
				)
			})
		}
	}

	useEffect(() => {
		const handleStart = e => {
			touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
			touchEnd.current = { x: 0, y: 0 }
		}
		const handleMove = e => {
			touchEnd.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
		}
		const handleEnd = () => {
			if (!touchStart.current.x || !touchEnd.current.x) return
			const deltaX = touchStart.current.x - touchEnd.current.x
			const deltaY = touchStart.current.y - touchEnd.current.y
			if (Math.abs(deltaX) < minSwipeDistance) return
			if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return

			const currentIndex = tabsOrder.indexOf(tab)
			if (deltaX > 0 && currentIndex < tabsOrder.length - 1)
				goToTab(tabsOrder[currentIndex + 1], 'left')
			else if (deltaX < 0 && currentIndex > 0)
				goToTab(tabsOrder[currentIndex - 1], 'right')
		}

		window.addEventListener('touchstart', handleStart, { passive: true })
		window.addEventListener('touchmove', handleMove, { passive: true })
		window.addEventListener('touchend', handleEnd, { passive: true })
		return () => {
			window.removeEventListener('touchstart', handleStart)
			window.removeEventListener('touchmove', handleMove)
			window.removeEventListener('touchend', handleEnd)
		}
	}, [tab])

	const today = todayKey()
	const total = logs.reduce((sum, log) => sum + log.amount, 0)
	const goal = Number(profile?.water_goal_ml || 2100)
	const progress = Math.min(Math.round((total / goal) * 100), 100)

	const effectiveStreak = useMemo(() => {
		if (!profile?.goal_reached_date) return 0
		const yesterday = new Date()
		yesterday.setDate(yesterday.getDate() - 1)
		const yesterdayStr = yesterday.toISOString().slice(0, 10)
		if (
			profile.goal_reached_date === today ||
			profile.goal_reached_date === yesterdayStr
		)
			return profile.streak_days || 0
		return 0
	}, [profile, today])

	const loadFamilies = async () => {
		const fams = await getMyFamilies(userId, today)
		const invs = await getMyInvites(userId)
		setFamilies(fams)
		setInvites(invs)
		const q = await getQuestProgress(userId, today, fams)
		setQuests(q)
	}

	useEffect(() => {
		async function loadData() {
			try {
				const dbProfile = await getUserProfile(userId)
				const dbLogs = await getTodayLogs(userId, today)
				const totals7Days = await getLast7DaysTotal(userId)
				const inv = await getInventory(userId) // Загружаем инвентарь

				if (dbProfile) setProfile(dbProfile)
				else
					setProfile(
						JSON.parse(localStorage.getItem('family-water-profile')) || {
							first_name: 'Пользователь',
							weight_kg: 70,
							water_goal_ml: 2100
						}
					)

				setLogs(dbLogs)
				setChartTotals(totals7Days)
				setOwnedItems(inv)
				await loadFamilies()
			} catch (err) {
				console.error('Ошибка загрузки:', err)
			} finally {
				setIsLoading(false)
			}
		}
		loadData()
	}, [userId, today])

	useEffect(() => {
		if ((tab === 'family' || tab === 'quests') && !isLoading) {
			loadFamilies()
			const channel = supabase
				.channel('family-updates')
				.on(
					'postgres_changes',
					{ event: '*', schema: 'public', table: 'water_logs' },
					() => loadFamilies()
				)
				.on(
					'postgres_changes',
					{ event: '*', schema: 'public', table: 'family_members' },
					() => loadFamilies()
				)
				.subscribe()
			return () => {
				supabase.removeChannel(channel)
			}
		}
	}, [tab, isLoading])

	useEffect(() => {
		localStorage.setItem('family-water-theme', isDark ? 'dark' : 'light')
	}, [isDark])

	// ... (ОСТАЛЬНЫЕ ФУНКЦИИ: addWater, removeLog, clearAllLogs, saveSettings, shareId, handleCreateFamily и т.д. ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ) ...

	// (Для экономии места я пропустил их в этом блоке, НО В ФАЙЛЕ ОНИ ДОЛЖНЫ БЫТЬ, возьми их из прошлой версии)

	if (!isTelegram) {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					background: isDark ? '#0f172a' : '#eef5fb',
					color: isDark ? '#fff' : '#12355b',
					padding: '20px',
					textAlign: 'center'
				}}
			>
				<div style={{ fontSize: '50px', marginBottom: '16px' }}>🔒</div>
				<h2 style={{ marginBottom: '12px', fontSize: '22px' }}>
					Доступ ограничен
				</h2>
			</div>
		)
	}

	if (isLoading) {
		return (
			<main
				className={`water-app ${isDark ? 'dark-theme' : ''}`}
				style={{ padding: '24px 18px' }}
			>
				<div
					className="skeleton skeleton-text"
					style={{ width: '40%', height: '14px', marginBottom: '20px' }}
				></div>
				<div
					className="skeleton skeleton-text"
					style={{ width: '70%', height: '30px', marginBottom: '30px' }}
				></div>
				<div className="skeleton skeleton-card"></div>
			</main>
		)
	}

	return (
		<main className={`water-app ${isDark ? 'dark-theme' : ''} ${appliedTheme}`}>
			<div className="toast-container">
				{toasts.map(t => (
					<div
						key={t.id}
						className={`toast ${t.type}`}
					>
						{t.message}
					</div>
				))}
			</div>

			<header className="water-header app-topbar">
				<div className="header-text">
					<p className="eyebrow">СЕМЕЙНЫЙ ТРЕКЕР</p>
					<h1>Ассаляму алейкум, {profile?.first_name}</h1>
					{appliedTitle && appliedTitle.id !== 'title_default' && (
						<div className={`user-title ${appliedTitle.cssClass}`}>
							{appliedTitle.icon} {appliedTitle.title}
						</div>
					)}
				</div>
				<button
					className="icon-button"
					onClick={() => setSettings(true)}
					aria-label="Настройки"
				>
					⚙
				</button>
			</header>

			<section className="compact-stats">
				<div
					ref={diamondTargetRef}
					className={diamondPop ? 'pop-anim' : ''}
					onClick={() => setShowShop(true)}
				>
					<span>✦</span>
					<strong>{profile?.diamonds || 0}</strong>
				</div>
				<div onClick={() => setActiveInfo('streak')}>
					<span>🔥</span>
					<strong>{effectiveStreak}</strong>
				</div>
				<div onClick={() => setActiveInfo('progress')}>
					<span>◉</span>
					<strong>{progress}%</strong>
				</div>
			</section>

			<div className="swipe-container">
				{/* ТАБЫ (TodayTab, DiaryTab, AnalyticsTab, FamilyTab, QuestsTab) ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ */}
				{tab === 'today' && (
					<TodayTab
						total={total}
						goal={goal}
						progress={progress}
						logs={logs}
						addWater={addWater}
						isAdding={isAdding}
						showCustom={showCustom}
						setShowCustom={setShowCustom}
						customAmount={customAmount}
						setCustomAmount={setCustomAmount}
						removeLog={removeLog}
						goToTab={goToTab}
						invites={invites}
					/>
				)}
				{tab === 'diary' && (
					<DiaryTab
						logs={logs}
						today={today}
						removeLog={removeLog}
						clearAllLogs={clearAllLogs}
					/>
				)}
				{tab === 'analytics' && (
					<AnalyticsTab
						weekData={weekData}
						goal={goal}
						weekTotal={weekTotal}
						weekAverage={weekAverage}
					/>
				)}
				{tab === 'family' && (
					<FamilyTab
						userId={userId}
						families={families}
						invites={invites}
						shareId={shareId}
						handleCreateFamily={handleCreateFamily}
						handleInvite={handleInvite}
						handleAcceptInvite={handleAcceptInvite}
						handleDeleteFamily={handleDeleteFamily}
						handleKickMember={handleKickMember}
						handleRenameFamily={handleRenameFamily}
						familyLoading={familyLoading}
						appliedFrame={appliedFrame}
						appliedTitle={appliedTitle}
					/>
				)}
				{tab === 'quests' && (
					<QuestsTab
						quests={quests}
						handleClaimQuest={handleClaimQuest}
					/>
				)}
			</div>

			<nav
				className="bottom-nav"
				style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
			>
				<NavButton
					active={tab === 'today'}
					icon="⌂"
					label="Сегодня"
					onClick={() => goToTab('today')}
				/>
				<NavButton
					active={tab === 'diary'}
					icon="☷"
					label="Дневник"
					onClick={() => goToTab('diary')}
				/>
				<NavButton
					active={tab === 'analytics'}
					icon="▥"
					label="Аналитика"
					onClick={() => goToTab('analytics')}
				/>
				<NavButton
					active={tab === 'family'}
					icon="♧"
					label="Семья"
					onClick={() => goToTab('family')}
					badge={invites.length}
				/>
				<NavButton
					active={tab === 'quests'}
					icon="🎯"
					label="Задания"
					onClick={() => goToTab('quests')}
				/>
			</nav>

			<RewardModal
				showReward={showReward}
				handleClaimReward={handleClaimReward}
			/>

			<SettingsModal
				settings={settings}
				setSettings={setSettings}
				saveSettings={saveSettings}
				profile={profile}
				userId={userId}
				isDark={isDark}
				setIsDark={setIsDark}
				appliedTheme={appliedTheme}
				applyItem={applyItem}
				appliedTitle={appliedTitle}
				appliedFrame={appliedFrame}
				ownedItems={ownedItems} // ПЕРЕДАЕМ ИНВЕНТАРЬ
			/>

			<InfoModal
				activeInfo={activeInfo}
				setActiveInfo={setActiveInfo}
				goal={goal}
				total={total}
			/>

			<ShopModal
				show={showShop}
				onClose={() => setShowShop(false)}
				diamonds={profile?.diamonds || 0}
				onApplyItem={applyItem}
				ownedItems={ownedItems} // ПЕРЕДАЕМ ИНВЕНТАРЬ
				onBuyItem={handleBuyItem} // ПЕРЕДАЕМ ФУНКЦИЮ ПОКУПКИ
			/>
		</main>
	)
}

export default MainScreen
