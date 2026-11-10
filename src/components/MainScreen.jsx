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
	buyItemApi,
	getClaimedAchievements,
	claimAchievementApi,
	updateAppearanceDb,
	adminGetPrices,
	getClaimedQuests,
	claimQuestApi
} from '../lib/api'
import { supabase } from '../lib/telegram'

import NavButton from './NavButton'
import TodayTab from './tabs/TodayTab'
import DiaryTab from './tabs/DiaryTab'
import AnalyticsTab from './tabs/AnalyticsTab'
import FamilyTab from './tabs/FamilyTab'
import QuestsTab from './tabs/QuestsTab'
import AdminTab from './tabs/AdminTab'
import RewardModal from './modals/RewardModal'
import SettingsModal from './modals/SettingsModal'
import InfoModal from './modals/InfoModal'
import ShopModal from './modals/ShopModal'
import ProfileModal from './modals/ProfileModal'
import TutorialModal from './modals/TutorialModal'

const todayKey = () => {
	const d = new Date()
	return d
		.toLocaleDateString('ru-RU', {
			timeZone: 'Europe/Moscow',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
		.split('.')
		.reverse()
		.join('-')
}

const getMoscowDate = () => {
	return new Date(
		new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' })
	)
}

const getWeekStart = () => {
	const d = getMoscowDate()
	const day = d.getDay() || 7
	d.setDate(d.getDate() - day + 1)
	return d
		.toLocaleDateString('ru-RU', {
			timeZone: 'Europe/Moscow',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
		.split('.')
		.reverse()
		.join('-')
}

const getMonthStart = () => {
	const d = getMoscowDate()
	d.setDate(1)
	return d
		.toLocaleDateString('ru-RU', {
			timeZone: 'Europe/Moscow',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
		.split('.')
		.reverse()
		.join('-')
}

const getCache = (key, fallback) => {
	try {
		const data = localStorage.getItem(`cache_${key}`)
		return data ? JSON.parse(data) : fallback
	} catch {
		return fallback
	}
}
const setCache = (key, data) => {
	try {
		localStorage.setItem(`cache_${key}`, JSON.stringify(data))
	} catch {}
}

function MainScreen() {
	const userId = Number(getTelegramUser().id)
	const isTelegram = !!window.Telegram?.WebApp?.initData
	const isAdmin = userId === 6556768668

	const [profile, setProfile] = useState(() => getCache('profile', null))
	const [logs, setLogs] = useState(() => getCache('logs', []))
	const [chartTotals, setChartTotals] = useState(() => getCache('chart', {}))
	const [ownedItems, setOwnedItems] = useState(() => getCache('inv', []))
	const [claimedAchs, setClaimedAchs] = useState(() => getCache('achs', []))
	const [claimedQuests, setClaimedQuests] = useState([])
	const [families, setFamilies] = useState(() => getCache('families', []))
	const [invites, setInvites] = useState(() => getCache('invites', []))
	const [quests, setQuests] = useState(null)
	const [userStats, setUserStats] = useState(() =>
		getCache('stats', {
			totalWater: 0,
			streak: 0,
			familyCount: 0,
			maxFamilyMembers: 0,
			titlesBought: 0
		})
	)

	const [isLoading, setIsLoading] = useState(!profile)

	const [tab, setTab] = useState('today')
	const [customAmount, setCustomAmount] = useState('')
	const [showCustom, setShowCustom] = useState(false)
	const [settings, setSettings] = useState(false)
	const [activeInfo, setActiveInfo] = useState(null)
	const [showShop, setShowShop] = useState(false)
	const [isDark, setIsDark] = useState(() => {
		const tg = window.Telegram?.WebApp
		if (tg && tg.colorScheme) return tg.colorScheme === 'dark'
		return localStorage.getItem('family-water-theme') === 'dark'
	})

	const [showTutorial, setShowTutorial] = useState(
		() => localStorage.getItem('tutorial_shown') !== 'true'
	)

	const [selectedMember, setSelectedMember] = useState(null)
	const [customPrices, setCustomPrices] = useState({})

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

	const [familyLoading, setFamilyLoading] = useState(false)
	const [toasts, setToasts] = useState([])

	const touchStart = useRef({ x: 0, y: 0 })
	const touchEnd = useRef({ x: 0, y: 0 })
	const minSwipeDistance = 60
	const tabsOrder = isAdmin
		? ['today', 'diary', 'analytics', 'family', 'quests', 'admin']
		: ['today', 'diary', 'analytics', 'family', 'quests']

	const today = todayKey()
	const weekStart = getWeekStart()
	const monthStart = getMonthStart()

	useEffect(() => {
		const tg = window.Telegram?.WebApp
		if (!tg) return

		const updateTheme = () => setIsDark(tg.colorScheme === 'dark')
		updateTheme()
		tg.onEvent('themeChanged', updateTheme)

		return () => tg.offEvent('themeChanged', updateTheme)
	}, [])

	useEffect(() => {
		const cleaned = localStorage.getItem('inventory_cleaned_v5')
		if (!cleaned) {
			localStorage.removeItem('applied_theme')
			localStorage.removeItem('applied_title')
			localStorage.removeItem('applied_frame')
			localStorage.setItem('inventory_cleaned_v5', 'true')
			setAppliedTheme('')
			setAppliedTitle(null)
			setAppliedFrame('')
		}
	}, [])

	const vibrate = (type = 'light') => {
		const tg = window.Telegram?.WebApp
		if (tg && tg.HapticFeedback) {
			if (type === 'success') tg.HapticFeedback.notificationOccurred('success')
			else if (type === 'warning')
				tg.HapticFeedback.notificationOccurred('warning')
			else if (type === 'selection') tg.HapticFeedback.selectionChanged()
			else tg.HapticFeedback.impactOccurred(type)
		}
	}

	const closeTutorial = () => {
		localStorage.setItem('tutorial_shown', 'true')
		setShowTutorial(false)
	}

	const applyItem = async item => {
		if (item.id.startsWith('theme_')) {
			setAppliedTheme(item.cssClass)
			localStorage.setItem('applied_theme', item.cssClass)
			if (item.themeMode === 'dark') setIsDark(true)
			else if (item.themeMode === 'light') setIsDark(false)
		} else if (item.id.startsWith('title_')) {
			if (item.id === 'title_default') {
				setAppliedTitle(null)
				localStorage.removeItem('applied_title')
				await updateAppearanceDb('title_default', appliedFrame)
			} else {
				setAppliedTitle(item)
				localStorage.setItem('applied_title', JSON.stringify(item))
				await updateAppearanceDb(item.id, appliedFrame)
			}
		} else if (item.id.startsWith('frame_')) {
			setAppliedFrame(item.cssClass)
			localStorage.setItem('applied_frame', item.cssClass)
			await updateAppearanceDb(
				appliedTitle?.id || 'title_default',
				item.cssClass
			)
		}
	}

	const handleBuyItem = async (item, priceOverride = null) => {
		const price = priceOverride !== null ? priceOverride : item.price || 0
		const skipDuplicates = priceOverride !== null

		const res = await buyItemApi(userId, item.id, price, skipDuplicates)
		if (res.error) {
			showToast(res.error, 'error')
			return false
		}

		vibrate('success')
		showToast(`Куплено: ${item.title}`, 'success')
		applyItem(item)

		if (!ownedItems.includes(item.id)) {
			const newInv = [...ownedItems, item.id]
			setOwnedItems(newInv)
			setCache('inv', newInv)
		}

		const updatedProfile = await getUserProfile(userId)
		setProfile(updatedProfile)
		setCache('profile', updatedProfile)
		return true
	}

	const handleClaimAch = async ach => {
		const res = await claimAchievementApi(userId, ach.id, ach.reward)
		if (res.error) {
			showToast(res.error, 'error')
		} else {
			vibrate('success')
			showToast(`Награда получена! +${ach.reward} ✦`, 'success')
			const newAchs = [...claimedAchs, ach.id]
			setClaimedAchs(newAchs)
			setCache('achs', newAchs)
			setProfile(prev => {
				const p = { ...prev, diamonds: (prev.diamonds || 0) + ach.reward }
				setCache('profile', p)
				return p
			})
		}
	}

	const handleClaimQuest = async (questId, reward, claimDate) => {
		const res = await claimQuestApi(questId, reward, claimDate)
		if (res.error) {
			showToast(res.error, 'error')
		} else {
			vibrate('success')
			showToast(`Награда получена! +${reward} ✦`, 'success')
			const newClaimed = [...claimedQuests, questId]
			setClaimedQuests(newClaimed)
			setProfile(prev => {
				const p = { ...prev, diamonds: (prev.diamonds || 0) + reward }
				setCache('profile', p)
				return p
			})
		}
	}

	const handleShareProgress = () => {
		vibrate('light')
		const text = `💧 Я уже выпил ${total} мл воды из ${goal} мл!\n🔥 Мой стрик: ${effectiveStreak} дней.\n\nПрисоединяйся к нашему семейному трекеру воды! 💪`
		const tg = window.Telegram?.WebApp
		if (tg && tg.openTelegramLink) {
			tg.openTelegramLink(
				`https://t.me/share/url?url=${encodeURIComponent(text)}`
			)
		} else {
			navigator.clipboard
				?.writeText(text)
				.then(() => showToast('Текст скопирован!', 'success'))
		}
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
		vibrate('selection')
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
		const [fams, invs] = await Promise.all([
			getMyFamilies(userId, today),
			getMyInvites(userId)
		])
		setFamilies(fams)
		setInvites(invs)
		setCache('families', fams)
		setCache('invites', invs)

		const q = await getQuestProgress(userId, today, fams)
		setQuests(q)
	}

	useEffect(() => {
		async function loadData() {
			try {
				const [dbProfile, dbLogs, totals7Days, inv, achs, fams, invs] =
					await Promise.all([
						getUserProfile(userId),
						getTodayLogs(userId, today),
						getLast7DaysTotal(userId),
						getInventory(userId),
						getClaimedAchievements(userId),
						getMyFamilies(userId, today),
						getMyInvites(userId)
					])

				const claimedToday = await getClaimedQuests(userId, today)
				const claimedWeek = await getClaimedQuests(userId, weekStart)
				const claimedMonth = await getClaimedQuests(userId, monthStart)
				const allClaimed = [
					...new Set([...claimedToday, ...claimedWeek, ...claimedMonth])
				]
				setClaimedQuests(allClaimed)

				const { data: allLogs } = await supabase
					.from('water_logs')
					.select('amount_ml')
					.eq('user_id', userId)
				const totalWater = (allLogs || []).reduce(
					(sum, l) => sum + l.amount_ml,
					0
				)

				const ownedFamiliesCount = fams.filter(
					f => f.owner_id === userId
				).length
				const maxMembers =
					fams.length > 0 ? Math.max(...fams.map(f => f.members.length)) : 0
				const titlesCount = inv.filter(i => i.startsWith('title_')).length

				const finalProfile = dbProfile ||
					JSON.parse(localStorage.getItem('family-water-profile')) || {
						first_name: 'Пользователь',
						weight_kg: 70,
						water_goal_ml: 2100
					}
				const finalStats = {
					totalWater,
					streak: finalProfile?.streak_days || 0,
					familyCount: ownedFamiliesCount,
					maxFamilyMembers: maxMembers,
					titlesBought: titlesCount
				}

				setProfile(finalProfile)
				setLogs(dbLogs)
				setChartTotals(totals7Days)
				setOwnedItems(inv)
				setClaimedAchs(achs)
				setFamilies(fams)
				setInvites(invs)
				setUserStats(finalStats)

				setCache('profile', finalProfile)
				setCache('logs', dbLogs)
				setCache('chart', totals7Days)
				setCache('inv', inv)
				setCache('achs', achs)
				setCache('families', fams)
				setCache('invites', invs)
				setCache('stats', finalStats)

				if (isAdmin) {
					const pricesRes = await adminGetPrices()
					if (pricesRes.prices) setCustomPrices(pricesRes.prices)
				}

				const q = await getQuestProgress(userId, today, fams)
				setQuests(q)
			} catch (err) {
				console.error('Ошибка загрузки:', err)
			} finally {
				setIsLoading(false)
			}
		}
		loadData()
	}, [userId, today, isAdmin])

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

	// МГНОВЕННОЕ ДОБАВЛЕНИЕ ВОДЫ (БЕЗ БЛОКИРОВКИ)
	async function addWater(amount) {
		const value = Number(amount)
		if (!Number.isFinite(value) || value <= 0) return
		if (value > 2000) {
			vibrate('warning')
			return showToast('Слишком много за один раз! Максимум 2000 мл.', 'error')
		}
		if (total + value > 5000) {
			vibrate('warning')
			return showToast('Вы превысили суточный лимит в 5000 мл!', 'error')
		}

		vibrate('light')

		// 1. МГНОВЕННО ОБНОВЛЯЕМ ИНТЕРФЕЙС (Оптимистичный UI)
		const tempId = `temp-${Date.now()}`
		const newLog = {
			id: tempId,
			amount: value,
			time: new Date().toLocaleTimeString('ru-RU', {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: 'Europe/Moscow'
			}),
			date: today
		}

		const newLogs = [newLog, ...logs]
		setLogs(newLogs)
		setCache('logs', newLogs)
		setCustomAmount('')
		setShowCustom(false)

		const wasComplete = total >= goal
		const isCompleteNow = total + value >= goal

		// Предупреждение о переизбытке (если выпил > 1.5 нормы, но до этого было меньше)
		if (total <= goal * 1.5 && total + value > goal * 1.5) {
			vibrate('warning')
			showToast(
				'⚠️ Вы выпили в 1.5 раза больше нормы! Не переусердствуйте.',
				'warning'
			)
		}

		if (!wasComplete && isCompleteNow) {
			vibrate('success')
			confetti({
				particleCount: 150,
				spread: 80,
				origin: { y: 0.6 },
				colors: ['#0ba360', '#3cba92', '#25b2c1', '#4facfe', '#ffffff']
			})
			setShowReward(true)
		}

		// 2. ОТПРАВЛЯЕМ НА СЕРВЕР В ФОНЕ
		try {
			await addWaterToDb(userId, value, profile)

			// Синхронизируем с сервером, чтобы обновить алмазы и стрик
			const updatedProfile = await getUserProfile(userId)
			const updatedLogs = await getTodayLogs(userId, today)
			const totals7Days = await getLast7DaysTotal(userId)

			setProfile(updatedProfile)
			setLogs(updatedLogs)
			setChartTotals(totals7Days)
			setCache('profile', updatedProfile)
			setCache('logs', updatedLogs)
			setCache('chart', totals7Days)
			localStorage.setItem(
				'family-water-profile',
				JSON.stringify(updatedProfile)
			)

			showToast(`+${value} мл добавлено! 💧`, 'success')

			const q = await getQuestProgress(userId, today, families)
			setQuests(q)
		} catch (err) {
			// Если ошибка — откатываем назад
			const prevLogs = logs.filter(l => l.id !== tempId)
			setLogs(prevLogs)
			setCache('logs', prevLogs)
			vibrate('warning')
			showToast(err.message, 'error')
		}
	}

	const handleClaimReward = () => {
		vibrate('success')
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
		vibrate('light')
		await deleteLogFromDb(id)
		const newLogs = logs.filter(log => log.id !== id)
		setLogs(newLogs)
		setCache('logs', newLogs)
		setChartTotals(await getLast7DaysTotal(userId))
		showToast('Запись удалена', 'info')
	}

	async function clearAllLogs() {
		if (!window.confirm('Ты уверен, что хочешь удалить все записи за сегодня?'))
			return
		vibrate('warning')
		const startOfDayISO = new Date(`${today}T00:00:00+03:00`).toISOString()
		await clearTodayLogs(startOfDayISO)
		setLogs([])
		setCache('logs', [])
		setChartTotals(await getLast7DaysTotal(userId))
		showToast('Все записи за сегодня удалены', 'info')
	}

	async function saveSettings(event) {
		event.preventDefault()
		const form = new FormData(event.currentTarget)
		const name = String(form.get('name') || '').trim()
		const weight = Number(form.get('weight'))
		if (!name || !weight || weight <= 0) {
			vibrate('warning')
			return showToast('Введите корректные данные', 'error')
		}

		vibrate('success')
		const updated = {
			...profile,
			first_name: name,
			weight_kg: weight,
			water_goal_ml: weight * 30
		}
		setProfile(updated)
		setCache('profile', updated)
		localStorage.setItem('family-water-profile', JSON.stringify(updated))
		setSettings(false)

		await updateProfileDb(name, weight)
		showToast('Профиль обновлен', 'success')
	}

	function shareId() {
		vibrate('light')
		const text = `Добавь меня в семейный трекер воды! Мой ID: ${userId}`
		const tg = window.Telegram?.WebApp
		if (tg && tg.openTelegramLink)
			tg.openTelegramLink(
				`https://t.me/share/url?url=${encodeURIComponent(text)}`
			)
		else
			navigator.clipboard
				?.writeText(text)
				.then(() => showToast(`ID скопирован!`, 'success'))
	}

	async function handleCreateFamily(name) {
		if (!name.trim()) return
		vibrate('light')
		setFamilyLoading(true)
		const res = await createFamily(userId, name)
		if (res.error) showToast(res.error, 'error')
		else {
			await loadFamilies()
			showToast('Группа создана!', 'success')
		}
		setFamilyLoading(false)
	}

	async function handleInvite(familyId, inviteeId, familyName) {
		if (!inviteeId) return
		vibrate('light')
		setFamilyLoading(true)
		const res = await inviteToFamily(
			familyId,
			Number(inviteeId),
			profile.first_name,
			familyName
		)
		if (res.error) showToast(res.error, 'error')
		else {
			showToast('Приглашение отправлено!', 'success')
			await loadFamilies()
		}
		setFamilyLoading(false)
	}

	async function handleAcceptInvite(familyId) {
		vibrate('success')
		setFamilyLoading(true)
		await acceptFamilyInvite(familyId, userId)
		await loadFamilies()
		showToast('Вы вступили в группу!', 'success')
		setFamilyLoading(false)
	}

	async function handleDeleteFamily(familyId) {
		vibrate('warning')
		setFamilyLoading(true)
		await deleteFamily(familyId)
		await loadFamilies()
		showToast('Группа удалена', 'info')
		setFamilyLoading(false)
	}

	async function handleKickMember(familyId, memberId) {
		vibrate('warning')
		setFamilyLoading(true)
		await kickFromFamily(familyId, memberId)
		await loadFamilies()
		showToast('Участник удален', 'info')
		setFamilyLoading(false)
	}

	async function handleRenameFamily(familyId, newName) {
		vibrate('light')
		setFamilyLoading(true)
		await renameFamily(familyId, newName)
		await loadFamilies()
		showToast('Название изменено', 'success')
		setFamilyLoading(false)
	}

	const weekData = useMemo(
		() =>
			Array.from({ length: 7 }, (_, index) => {
				const date = new Date()
				date.setDate(date.getDate() - (6 - index))
				const key = date
					.toLocaleDateString('ru-RU', {
						timeZone: 'Europe/Moscow',
						year: 'numeric',
						month: '2-digit',
						day: '2-digit'
					})
					.split('.')
					.reverse()
					.join('-')
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

	if (!isTelegram) {
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
				Доступ ограничен
			</div>
		)
	}

	if (isLoading && !profile) {
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

	if (profile?.is_banned) {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100vh',
					background: '#111',
					color: '#fff',
					padding: '20px',
					textAlign: 'center'
				}}
			>
				<div style={{ fontSize: '60px', marginBottom: '16px' }}>⛔</div>
				<h2 style={{ marginBottom: '12px', fontSize: '24px' }}>
					Доступ заблокирован
				</h2>
				<p
					style={{
						fontSize: '15px',
						color: '#888',
						marginBottom: '24px',
						maxWidth: '300px',
						lineHeight: '1.5'
					}}
				>
					Ваш аккаунт был заблокирован администратором за нарушение правил.
				</p>
				<a
					href="tg://user?id=6556768668"
					target="_blank"
					rel="noreferrer"
					style={{
						padding: '12px 24px',
						background: '#173f70',
						color: '#fff',
						textDecoration: 'none',
						borderRadius: '12px',
						fontWeight: 'bold'
					}}
				>
					Написать в поддержку
				</a>
			</div>
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
					onClick={() => {
						vibrate('light')
						setShowShop(true)
					}}
				>
					<span>✦</span>
					<strong>{profile?.diamonds || 0}</strong>
				</div>
				<div
					onClick={() => {
						vibrate('selection')
						setActiveInfo('streak')
					}}
				>
					<span>🔥</span>
					<strong>{effectiveStreak}</strong>
				</div>
				<div
					onClick={() => {
						vibrate('selection')
						setActiveInfo('progress')
					}}
				>
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
						showCustom={showCustom}
						setShowCustom={setShowCustom}
						customAmount={customAmount}
						setCustomAmount={setCustomAmount}
						removeLog={removeLog}
						goToTab={goToTab}
						invites={invites}
						onShareProgress={handleShareProgress}
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
						onMemberClick={m => setSelectedMember(m)}
					/>
				)}
				{tab === 'quests' && (
					<QuestsTab
						quests={quests}
						achievements={claimedAchs}
						handleClaimAch={handleClaimAch}
						userStats={userStats}
						claimedQuests={claimedQuests}
						handleClaimQuest={handleClaimQuest}
						questClaimDates={{
							personal: today,
							week: weekStart,
							month: monthStart
						}}
					/>
				)}
				{tab === 'admin' && isAdmin && <AdminTab />}
			</div>

			<nav
				className="bottom-nav"
				style={{ gridTemplateColumns: `repeat(${isAdmin ? 6 : 5}, 1fr)` }}
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
				{isAdmin && (
					<NavButton
						active={tab === 'admin'}
						icon="👑"
						label="Админ"
						onClick={() => goToTab('admin')}
					/>
				)}
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
				ownedItems={ownedItems}
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
				ownedItems={ownedItems}
				onBuyItem={handleBuyItem}
				customPrices={customPrices}
			/>

			<ProfileModal
				user={selectedMember}
				onClose={() => setSelectedMember(null)}
			/>

			<TutorialModal
				show={showTutorial}
				onClose={closeTutorial}
			/>
		</main>
	)
}

export default MainScreen
