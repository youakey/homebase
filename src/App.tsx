import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ProjectProvider, useProject } from '@/hooks/useProject'
import { AuthPage } from '@/pages/auth/AuthPage'
import { OnboardingPage } from '@/pages/auth/OnboardingPage'
import { PendingPage } from '@/pages/auth/PendingPage'
import { AppLayout } from '@/components/AppLayout'
import { FullScreenSpinner } from '@/components/FullScreenSpinner'
import { MenuPage } from '@/pages/menu/MenuPage'
import { CleaningPage } from '@/pages/cleaning/CleaningPage'
import { SocialPage } from '@/pages/social/SocialPage'
import { StatsPage } from '@/pages/stats/StatsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

function Gate() {
  const { loading, user } = useAuth()

  if (loading) return <FullScreenSpinner />
  if (!user) return <AuthPage />

  return (
    <ProjectProvider>
      <ProjectGate />
    </ProjectProvider>
  )
}

function ProjectGate() {
  const { isLoading, approvedMemberships, pendingMemberships, currentProject } = useProject()

  if (isLoading) return <FullScreenSpinner />
  if (approvedMemberships.length === 0) {
    if (pendingMemberships.length > 0) return <PendingPage />
    return <OnboardingPage />
  }
  // currentProject is set a tick later by an effect in ProjectProvider (reads localStorage) —
  // guard against rendering pages that assume it's non-null in that gap.
  if (!currentProject) return <FullScreenSpinner />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/menu" replace />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="cleaning" element={<CleaningPage />} />
        <Route path="social" element={<SocialPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter basename="/homebase">
      <Gate />
    </BrowserRouter>
  )
}

export default App
