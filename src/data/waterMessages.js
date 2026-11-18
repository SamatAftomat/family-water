// Мотивационные — рано, выпито мало
const motivate = [
	'Пока рано радоваться — до нормы далеко. Но каждый стакан считает! 💧',
	'Мало пока что, но главное начать! Выпей ещё стаканчик 🥤',
	'До цели ещё далеко. Давай, ты сможешь! 💪',
	'100 мл — это капля в море. Времени ещё полно, выпей больше!',
	'Рано ещё отдыхать. Впереди много часов и ещё много воды! 🌊',
	'Цель пока не близка. Сделай глоток — и шаг ближе! ☕',
	'Пока маловато. Но ты на правильном пути — не останавливайся!'
]

// Подбадривающие — примерно половина или чуть меньше
const encourage = [
	'Почти половина! Осталось совсем чуть-чуть 🎯',
	'Неплохо идёт! Ещё немного — и цель рядом 🏁',
	'Идём в правильном направлении. Ещё пара стаканов — и готово!',
	'Близко! Не сдавайся на финишной прямой 💧',
	'Отличный темп, но мы ещё не там. Ещё немного!'
]

// Поздравительные — норма выполнена
const complete = [
	'🎉 Норма выполнена! Ты молодец! 🔥',
	'Цель достигнута! Отличная работа сегодня! 💎',
	'Вот это да! Ты выпил свою норму! Так держать! 🏆',
	'Миссия выполнена! Вода — твой лучший друг сегодня 💧',
	'Норма на сегодня — закрыта! Отличная самодисциплина! ✨',
	'Ура! Ты справился! Алмаз зачислен! 💎🔥'
]

// Супер-результат — перевыполнил норму
const superResult = [
	'Ого! Ты перевыполнил норму! Настоящий водный чемпион! 🏅',
	'Вау! Ты пьёшь как профессионал! 💪💧',
	'Перевыполнил! Ещё и запас сделал. Вода — это жизнь! 🌊'
]

const messages = { motivate, encourage, complete, superResult }

function getLastIndex(category) {
	try {
		const raw = localStorage.getItem('fw_last_msg')
		const map = raw ? JSON.parse(raw) : {}
		return map[category] ?? -1
	} catch {
		return -1
	}
}

function setLastIndex(category, index) {
	try {
		const raw = localStorage.getItem('fw_last_msg')
		const map = raw ? JSON.parse(raw) : {}
		map[category] = index
		localStorage.setItem('fw_last_msg', JSON.stringify(map))
	} catch {
		// ignore
	}
}

/**
 * Возвращает случайное сообщение из категории, не повторяя предыдущее.
 * @param {'motivate' | 'encourage' | 'complete' | 'superResult'} category
 */
export function pickMessage(category) {
	const list = messages[category]
	if (!list) return ''

	const last = getLastIndex(category)
	let idx

	if (list.length <= 1) {
		idx = 0
	} else if (list.length === 2) {
		idx = (last + 1) % list.length
	} else {
		do {
			idx = Math.floor(Math.random() * list.length)
		} while (idx === last)
	}

	setLastIndex(category, idx)
	return list[idx]
}
