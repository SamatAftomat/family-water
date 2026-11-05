export default function NavButton({ active, icon, label, onClick, badge }) {
	return (
		<button
			className={`nav-button ${active ? 'active' : ''}`}
			onClick={onClick}
			style={{ position: 'relative' }}
		>
			<span>{icon}</span>
			<small>{label}</small>
			{badge > 0 && <span className="nav-badge">{badge}</span>}
		</button>
	)
}
