import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/ui'
import Dashboard from './pages/Dashboard'
import AllTools from './pages/AllTools'
import Collections from './pages/Collections'
import Settings from './pages/Settings'
import ToolPage from './pages/ToolPage'
import NotFound from './pages/NotFound'
import { useTranslation } from 'react-i18next'
const WorkspacePage = lazy(() => import('./workspace/WorkspacePage'))

function ErrorScreen() {
  const { t } = useTranslation()
  return (
    <main className="fatal-error">
      <h1>{t('common.errorTitle')}</h1>
      <p>{t('common.errorBody')}</p>
      <button className="button button-primary" onClick={() => window.location.reload()}>
        {t('common.reload')}
      </button>
    </main>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error', error.message, info.componentStack)
  }
  render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children
  }
}
export default function App() {
  const { t } = useTranslation()
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tools" element={<AllTools />} />
            <Route
              path="workspace"
              element={
                <Suspense fallback={<p role="status">{t('common.loadingWorkspace')}</p>}>
                  <WorkspacePage />
                </Suspense>
              }
            />
            <Route path="category/:category" element={<AllTools />} />
            <Route path="tools/:id" element={<ToolPage />} />
            <Route path="favorites" element={<Collections kind="favorites" />} />
            <Route path="recent" element={<Collections kind="recent" />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ToastProvider>
    </ErrorBoundary>
  )
}
