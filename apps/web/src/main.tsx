import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'

// Initialize node registry
import '@ai-ide/node-registry'

// HashRouter works without a server (Electron uses app:// or file://).
// BrowserRouter requires a real HTTP server to handle deep-link navigation.
const isElectron = window.location.protocol === 'file:' || window.location.protocol === 'app:'
const Router = isElectron ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
)
