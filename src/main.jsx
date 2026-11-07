import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary' // ИМПОРТ

const container = document.getElementById('root')
if (container) {
	createRoot(container).render(
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	)
}
