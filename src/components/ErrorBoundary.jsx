import React from 'react'

class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error) {
		return { hasError: true }
	}

	componentDidCatch(error, errorInfo) {
		console.error('Поймана ошибка:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						alignItems: 'center',
						height: '100vh',
						background: '#eef5fb',
						padding: '20px',
						textAlign: 'center',
						fontFamily: 'Arial, sans-serif'
					}}
				>
					<div style={{ fontSize: '50px', marginBottom: '16px' }}>🤕</div>
					<h2 style={{ color: '#12355b', marginBottom: '12px' }}>
						Что-то пошло не так
					</h2>
					<p
						style={{ color: '#71869d', fontSize: '15px', marginBottom: '24px' }}
					>
						Произошла ошибка при загрузке приложения. Попробуйте перезайти.
					</p>
					<button
						onClick={() => window.location.reload()}
						style={{
							padding: '12px 24px',
							background: '#173f70',
							color: '#fff',
							border: 'none',
							borderRadius: '12px',
							fontWeight: 'bold',
							cursor: 'pointer'
						}}
					>
						Перезагрузить
					</button>
				</div>
			)
		}
		return this.props.children
	}
}

export default ErrorBoundary
