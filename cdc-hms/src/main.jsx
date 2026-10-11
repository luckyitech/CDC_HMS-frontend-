import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// ui.css first: its tokens act like a component layer that utilities override.
import './styles/ui.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)