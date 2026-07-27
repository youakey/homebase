import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Loader2, Copy, Check, PlusCircle, LogIn, ArrowLeft } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { createProject, joinProject } from '@/lib/supabase/queries'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type View = 'choice' | 'create' | 'join' | 'created'

export function OnboardingPage() {
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('choice')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const project = await createProject(name)
      setCreatedCode(project.invite_code)
      setView('created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось создать проект')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await joinProject(code)
      toast.success('Заявка отправлена, ждите подтверждения')
      await queryClient.invalidateQueries({ queryKey: ['memberships', user?.id] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось вступить в проект')
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(createdCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-glow flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        {view === 'choice' && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="font-heading text-2xl">Добро пожаловать!</CardTitle>
              <CardDescription>Создайте проект для своей квартиры или вступите в существующий</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button className="h-16 justify-start gap-3 rounded-2xl text-base" onClick={() => setView('create')}>
                <PlusCircle className="size-5" />
                Создать проект
              </Button>
              <Button
                variant="outline"
                className="h-16 justify-start gap-3 rounded-2xl text-base"
                onClick={() => setView('join')}
              >
                <LogIn className="size-5" />
                Вступить в проект
              </Button>
              <Button variant="ghost" className="mt-2 text-muted-foreground" onClick={() => signOut()}>
                Выйти из аккаунта
              </Button>
            </CardContent>
          </>
        )}

        {view === 'create' && (
          <>
            <CardHeader>
              <button
                onClick={() => setView('choice')}
                className="mb-1 flex items-center gap-1 text-sm text-muted-foreground"
              >
                <ArrowLeft className="size-4" /> Назад
              </button>
              <CardTitle className="font-heading text-2xl">Новый проект</CardTitle>
              <CardDescription>Придумайте название — например, адрес квартиры</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="project-name">Название</Label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Квартира на Ленина"
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-11">
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Создать
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {view === 'join' && (
          <>
            <CardHeader>
              <button
                onClick={() => setView('choice')}
                className="mb-1 flex items-center gap-1 text-sm text-muted-foreground"
              >
                <ArrowLeft className="size-4" /> Назад
              </button>
              <CardTitle className="font-heading text-2xl">Вступить в проект</CardTitle>
              <CardDescription>Введите код приглашения, который вам дали соседи</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="invite-code">Код приглашения</Label>
                  <Input
                    id="invite-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="AB3K9F"
                    required
                    autoFocus
                    className="text-center font-mono text-lg tracking-widest uppercase"
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-11">
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Отправить заявку
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {view === 'created' && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="font-heading text-2xl">Проект создан 🎉</CardTitle>
              <CardDescription>Передайте этот код соседям, чтобы они могли присоединиться</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 rounded-xl border border-flame-500/40 bg-muted px-6 py-4 font-mono text-3xl tracking-widest text-flame-400">
                {createdCode}
              </div>
              <Button variant="outline" onClick={copyCode} className="gap-2">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Скопировано' : 'Скопировать код'}
              </Button>
              <Button
                className="h-11 w-full"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['memberships', user?.id] })}
              >
                Продолжить
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
