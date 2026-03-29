import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { IDELayout } from './app/IDELayout'
import { CanvasPage } from './features/canvas/CanvasPage'
import { SamplesPage } from './features/samples/SamplesPage'
import { PluginsPage } from './features/plugins/PluginsPage'
import { HelpPage } from './features/help/HelpPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IDELayout />}>
        <Route index element={<Navigate to="/pipeline/ml" replace />} />
        <Route path="pipeline/:type" element={<CanvasPage />} />
        <Route path="samples" element={<SamplesPage />} />
        <Route path="plugins" element={<PluginsPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
    </Routes>
  )
}
