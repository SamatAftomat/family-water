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
	renameFamily
} from '../lib/api'
import { supabase } from '../lib/telegram'

import NavButton from './NavButton'
import TodayTab from './tabs/TodayTab'
import DiaryTab from './tabs/DiaryTab'
import AnalyticsTab from './tabs/AnalyticsTab'
import FamilyTab from './tabs/FamilyTab'
import RewardModal from './modals/RewardModal'
import SettingsModal from './modals/SettingsModal'
import InfoModal from './modals/InfoModal'

const todayKey = () => {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function MainScreen() {
	const userId = Number(getTelegramUser().id)

	const [profile, setProfile] = useState(null)
	const [logs, setLogs] = useState([])
	const [chartTotals, setChartTotals] = useState({})
	const [isLoading, setIsLoading] = useState(true)
	const [isAdding, setIsAdding] = useState(false)

	const [tab, setTab] = useState('today')
	const [customAmount, setCustomAmount] = useState('')
	const [showCustom, setShowCustom] = useState(false)
	const [settings, setSettings] = useState(false)
	const [activeInfo, setActiveInfo] = useState(null)
	const [isDark, setIsDark] = useState(
		() => localStorage.getItem('family-water-theme') === 'dark'
	)

	const [showReward, setShowReward] = useState(false)
	const [diamondPop, setDiamondPop] = useState(false)
	const diamondTargetRef = useRef(null)

	const [families, setFamilies] = useState([])
	const [invites, setInvites] = useState([])
	const [familyLoading, setFamilyLoading] = useState(false)

	const touchStart = useRef({ x: 0, y: 0 })
	const touchEnd = useRef({ x: 0, y: 0 })
	const minSwipeDistance = 60
	const tabsOrder = ['today', 'diary', 'analytics', 'family']

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
	}

	useEffect(() => {
		async function loadData() {
			try {
				const dbProfile = await getUserProfile(userId)
				const dbLogs = await getTodayLogs(userId, today)
				const totals7Days = await getLast7DaysTotal(userId)

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
		if (tab === 'family' && !isLoading) {
			loadFamilies()
			const interval = setInterval(() => {
				loadFamilies()
			}, 15000)
			return () => clearInterval(interval)
		}
	}, [tab, isLoading])

	useEffect(() => {
		localStorage.setItem('family-water-theme', isDark ? 'dark' : 'light')
	}, [isDark])

	async function addWater(amount) {
		const value = Number(amount)
		if (!Number.isFinite(value) || value <= 0) return
		if (value > 2000)
			return alert('Слишком много за один раз! Максимум 2000 мл.')
		if (total + value > 5000)
			return alert('Вы превысили суточный лимит в 5000 мл!')

		const wasComplete = total >= goal
		const isCompleteNow = total + value >= goal

		if (!wasComplete && isCompleteNow) {
			if (window.Telegram?.WebApp?.HapticFeedback)
				window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
			confetti({
				particleCount: 150,
				spread: 80,
				origin: { y: 0.6 },
				colors: ['#0ba360', '#3cba92', '#25b2c1', '#4facfe', '#ffffff']
			})
			setShowReward(true)
		}

		setIsAdding(true)
		try {
			await addWaterToDb(userId, value, profile)
			const updatedProfile = await getUserProfile(userId)
			const updatedLogs = await getTodayLogs(userId, today)
			const totals7Days = await getLast7DaysTotal(userId)

			setProfile(updatedProfile)
			setLogs(updatedLogs)
			setChartTotals(totals7Days)
			localStorage.setItem(
				'family-water-profile',
				JSON.stringify(updatedProfile)
			)
		} catch (err) {
			alert('Ошибка сохранения: ' + err.message)
		} finally {
			setIsAdding(false)
			setCustomAmount('')
			setShowCustom(false)
		}
	}

	const handleClaimReward = () => {
		setShowReward(false)
		const targetEl = diamondTargetRef.current
		if (!targetEl) return
		const targetRect = targetEl.getBoundingClientRect()

		const flyer = document.createElement('div')
		flyer.innerText = '✦'
		flyer.style.cssText = `position: fixed; color: #c49b00; font-size: 40px; z-index: 9999; pointer-events: none; transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1); text-shadow: 0 4px 10px rgba(196, 155, 0, 0.5); left: ${window.innerWidth / 2}px; top: ${window.innerHeight / 2}px; transform: translate(-50%, -50%) scale(1.5);`
		document.body.appendChild(flyer)

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				flyer.style.left = `${targetRect.left + targetRect.width / 2}px`
				flyer.style.top = `${targetRect.top + targetRect.height / 2}px`
				flyer.style.transform = 'translate(-50%, -50%) scale(0.5)'
			})
		})

		setTimeout(() => {
			flyer.remove()
			setDiamondPop(true)
			setTimeout(() => setDiamondPop(false), 300)
		}, 800)
	}

	async function removeLog(id) {
		if (!window.confirm('Удалить эту запись?')) return
		await deleteLogFromDb(id)
		setLogs(current => current.filter(log => log.id !== id))
		setChartTotals(await getLast7DaysTotal(userId))
	}

	async function clearAllLogs() {
		if (!window.confirm('Ты уверен, что хочешь удалить все записи за сегодня?'))
			return
		if (!supabase) return
		await supabase
			.from('water_logs')
			.delete()
			.eq('user_id', userId)
			.gte('logged_at', `${today}T00:00:00Z`)
		setLogs([])
		setChartTotals(await getLast7DaysTotal(userId))
	}

	function saveSettings(event) {
		event.preventDefault()
		const form = new FormData(event.currentTarget)
		const name = String(form.get('name') || '').trim()
		const weight = Number(form.get('weight'))
		if (!name || !weight || weight <= 0) return
		const updated = {
			...profile,
			first_name: name,
			weight_kg: weight,
			water_goal_ml: weight * 30
		}
		setProfile(updated)
		localStorage.setItem('family-water-profile', JSON.stringify(updated))
		if (supabase)
			supabase
				.from('users')
				.update({
					first_name: name,
					weight_kg: weight,
					water_goal_ml: weight * 30
				})
				.eq('id', userId)
				.then()
		setSettings(false)
	}

	function shareId() {
		const text = `Добавь меня в семейный трекер воды! Мой ID: ${userId}`
		const tg = window.Telegram?.WebApp
		if (tg && tg.openTelegramLink)
			tg.openTelegramLink(
				`https://t.me/share/url?url=${encodeURIComponent(text)}`
			)
		else
			navigator.clipboard
				?.writeText(text)
				.then(() => alert(`ID скопирован: ${userId}`))
	}

	async function handleCreateFamily(name) {
		if (!name.trim()) return
		setFamilyLoading(true)
		const res = await createFamily(userId, name)
		if (res.error) alert(res.error)
		else await loadFamilies()
		setFamilyLoading(false)
	}

	async function handleInvite(familyId, inviteeId, familyName) {
		if (!inviteeId) return
		setFamilyLoading(true)
		const res = await inviteToFamily(
			familyId,
			Number(inviteeId),
			profile.first_name,
			familyName
		)
		if (res.error) alert(res.error)
		else {
			alert('Приглашение отправлено!')
			await loadFamilies()
		}
		setFamilyLoading(false)
	}

	async function handleAcceptInvite(familyId) {
		setFamilyLoading(true)
		await acceptFamilyInvite(familyId, userId)
		await loadFamilies()
		setFamilyLoading(false)
	}

	// НОВЫЕ ОБРАБОТЧИКИ
	async function handleDeleteFamily(familyId) {
		setFamilyLoading(true)
		await deleteFamily(familyId)
		await loadFamilies()
		setFamilyLoading(false)
	}

	async function handleKickMember(familyId, memberId) {
		setFamilyLoading(true)
		await kickFromFamily(familyId, memberId)
		await loadFamilies()
		setFamilyLoading(false)
	}

	async function handleRenameFamily(familyId, newName) {
		setFamilyLoading(true)
		await renameFamily(familyId, newName)
		await loadFamilies()
		setFamilyLoading(false)
	}

	const weekData = useMemo(
		() =>
			Array.from({ length: 7 }, (_, index) => {
				const date = new Date()
				date.setDate(date.getDate() - (6 - index))
				const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
				return {
					key,
					label: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
					total: key === today ? total : chartTotals[key] || 0
				}
			}),
		[logs, today, total, chartTotals]
	)

	const weekTotal = weekData.reduce((sum, day) => sum + day.total, 0)
	const weekAverage = Math.round(weekTotal / 7)

	if (isLoading)
		return (
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					background: isDark ? '#0f172a' : '#eef5fb',
					color: isDark ? '#fff' : '#12355b',
					fontSize: '18px',
					fontWeight: 'bold'
				}}
			>
				Загрузка данных... 💧
			</div>
		)

	return (
		<main className={`water-app ${isDark ? 'dark-theme' : ''}`}>
			<header className="water-header app-topbar">
				<div className="header-text">
					<p className="eyebrow">СЕМЕЙНЫЙ ТРЕКЕР</p>
					<h1>Ассаляму алейкум, {profile?.first_name}</h1>
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
					onClick={() => setActiveInfo('diamonds')}
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
					/>
				)}
			</div>

			<nav className="bottom-nav">
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
			/>
			<InfoModal
				activeInfo={activeInfo}
				setActiveInfo={setActiveInfo}
				goal={goal}
				total={total}
			/>
		</main>
	)
}

export default MainScreen
