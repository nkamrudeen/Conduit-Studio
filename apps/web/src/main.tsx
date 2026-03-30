import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'

// Initialize node registry
import '@ai-ide/node-registry'

// HashRouter works without a real server for deep-link navigation.
// Detect Electron via user agent (covers file://, app://, and the new
// local http static server which all include 'Electron' in the UA).
const isElectron = navigator.userAgent.includes('Electron')
const Router = isElectron ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
)
