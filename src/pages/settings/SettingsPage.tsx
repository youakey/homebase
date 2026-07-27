import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { Copy, Check, Loader2, LogOut, Camera, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { fetchProjectMembers, fetchPendingMembers, respondMembership } from '@/lib/supabase/queries'
import { fetchPendingDutySwaps } from '@/lib/supabase/cleaning'
import { updateFullName, uploadAvatar } from '@/lib/supabase/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export function SettingsPage() {
  const { user, profile, signOut } = useAuth()
  const { currentProject, currentMembership, approvedMemberships, switchProject } = useProject()
  const projectId = currentProject!.id
  const isOwner = currentMembership?.role === 'owner'
  const queryClient = useQueryClient()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: members } = useQuery({
    queryKey: ['project-members-all', projectId],
    queryFn: () => fetchProjectMembers(projectId),
  })
  const approvedMembers = members?.filter((m) => m.status === 'approved') ?? []

  const { data: pendingMembers } = useQuery({
    queryKey: ['pending-members', projectId],
    queryFn: () => fetchPendingMembers(projectId),
    enabled: isOwner,
    refetchInterval: isOwner ? 15_000 : false,
  })

  const { data: dutySwaps } = useQuery({
    queryKey: ['duty-swaps', projectId],
    queryFn: () => fetchPendingDutySwaps(projectId),
    refetchInterval: 20_000,
  })
  const incomingSwaps = dutySwaps?.filter((s) => s.target_id === user?.id) ?? []

  const nameMutation = useMutation({
    mutationFn: (name: string) => updateFullName(user!.id, name),
    onMutate: () => setSavingName(true),
    onSuccess: () => {
      toast.success('Имя обновлено')
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось обновить имя'),
    onSettled: () => setSavingName(false),
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(user!.id, file),
    onMutate: () => setUploadingAvatar(true),
    onSuccess: () => {
      toast.success('Аватар обновлён')
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось загрузить аватар'),
    onSettled: () => setUploadingAvatar(false),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => respondMembership(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-members', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-members-all', projectId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Не удалось обработать заявку'),
  })

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || fullName === profile?.full_name) return
    nameMutation.mutate(fullName.trim())
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) avatarMutation.mutate(file)
    e.target.value = ''
  }

  function copyInviteCode() {
    if (!currentProject) return
    navigator.clipboard.writeText(currentProject.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Настройки</h1>

      {incomingSwaps.length > 0 && (
        <Link
          to="/cleaning"
          className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm"
        >
          <ArrowLeftRight className="size-4 shrink-0 text-primary" />
          Входящие предложения обмена дежурством: {incomingSwaps.length} — открыть раздел «Уборка»
        </Link>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Профиль</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted"
              disabled={uploadingAvatar}
            >
              <Avatar className="size-16">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-lg">{initials(profile?.full_name ?? '?')}</AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                {uploadingAvatar ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : (
                  <Camera className="size-5 text-white" />
                )}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <form onSubmit={handleNameSubmit} className="flex flex-1 items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="full-name" className="text-xs text-muted-foreground">
                  Имя
                </Label>
                <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9" />
              </div>
              <Button type="submit" size="sm" className="h-9" disabled={savingName || fullName === profile?.full_name}>
                {savingName ? <Loader2 className="size-4 animate-spin" /> : 'Сохранить'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Проект «{currentProject?.name}»</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Код приглашения</Label>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-lg border bg-muted px-4 py-2 font-mono text-xl tracking-widest">
                {currentProject?.invite_code}
              </span>
              <Button variant="outline" size="icon" className="size-9" onClick={copyInviteCode}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">Участники ({approvedMembers.length})</Label>
            <div className="flex flex-col gap-2">
              {approvedMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarImage src={m.profile.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{initials(m.profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{m.profile.full_name}</span>
                  {m.role === 'owner' && <span className="text-xs text-muted-foreground">(владелец)</span>}
                </div>
              ))}
            </div>
          </div>

          {approvedMemberships.length > 1 && (
            <>
              <Separator />
              <div>
                <Label className="mb-2 block text-xs text-muted-foreground">Переключить проект</Label>
                <div className="flex flex-col gap-1.5">
                  {approvedMemberships.map((m) => (
                    <button
                      key={m.project_id}
                      onClick={() => switchProject(m.project_id)}
                      className={`min-h-10 rounded-lg border px-3 py-2 text-left text-sm ${
                        m.project_id === projectId ? 'border-primary bg-primary/5 font-medium' : ''
                      }`}
                    >
                      {m.project.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Заявки на вступление {pendingMembers?.length ? `(${pendingMembers.length})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!pendingMembers?.length ? (
              <p className="text-sm text-muted-foreground">Нет новых заявок</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pendingMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={m.profile.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">{initials(m.profile.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{m.profile.full_name}</span>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => respondMutation.mutate({ id: m.id, status: 'approved' })}
                      >
                        Принять
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => respondMutation.mutate({ id: m.id, status: 'rejected' })}
                      >
                        Отклонить
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="gap-2" onClick={() => signOut()}>
        <LogOut className="size-4" />
        Выйти из аккаунта
      </Button>
    </div>
  )
}
