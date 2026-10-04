import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)

if (import.meta.env.DEV) import('./game/store').then((m) => (window.__game = m.useGame))
