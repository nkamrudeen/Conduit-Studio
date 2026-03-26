import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { IDELayout } from './app/IDELayout'
import { CanvasPage } from './features/canvas/CanvasPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IDELayout />}>
        <Route index element={<Navigate to="/pipeline/ml" replace />} />
        <Route path="pipeline/:type" element={<CanvasPage />} />
      </Route>
    </Routes>
  )
}
