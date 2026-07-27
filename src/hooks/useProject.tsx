import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMyMemberships } from '@/lib/supabase/queries'
import type { Project, ProjectMember } from '@/lib/supabase/types'
import { useAuth } from './useAuth'

type MembershipWithProject = ProjectMember & { project: Project }

interface ProjectContextValue {
  memberships: MembershipWithProject[]
  approvedMemberships: MembershipWithProject[]
  pendingMemberships: MembershipWithProject[]
  isLoading: boolean
  currentProject: Project | null
  currentMembership: MembershipWithProject | null
  switchProject: (projectId: string) => void
  refetchMemberships: () => Promise<unknown>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

function storageKey(userId: string) {
  return `homebase:currentProject:${userId}`
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['memberships', user?.id],
    queryFn: () => fetchMyMemberships(user!.id) as Promise<MembershipWithProject[]>,
    enabled: !!user,
    refetchInterval: 15_000,
  })

  const memberships = useMemo(() => data ?? [], [data])
  const approvedMemberships = useMemo(() => memberships.filter((m) => m.status === 'approved'), [memberships])
  const pendingMemberships = useMemo(() => memberships.filter((m) => m.status === 'pending'), [memberships])

  useEffect(() => {
    if (!user || approvedMemberships.length === 0) return
    const stored = localStorage.getItem(storageKey(user.id))
    const stillValid = stored && approvedMemberships.some((m) => m.project_id === stored)
    if (stillValid) {
      setCurrentProjectId(stored)
    } else {
      setCurrentProjectId(approvedMemberships[0].project_id)
    }
  }, [user, approvedMemberships])

  function switchProject(projectId: string) {
    if (!user) return
    localStorage.setItem(storageKey(user.id), projectId)
    setCurrentProjectId(projectId)
  }

  const currentMembership = approvedMemberships.find((m) => m.project_id === currentProjectId) ?? null
  const currentProject = currentMembership?.project ?? null

  return (
    <ProjectContext.Provider
      value={{
        memberships,
        approvedMemberships,
        pendingMemberships,
        isLoading,
        currentProject,
        currentMembership,
        switchProject,
        refetchMemberships: refetch,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject должен использоваться внутри ProjectProvider')
  return ctx
}
