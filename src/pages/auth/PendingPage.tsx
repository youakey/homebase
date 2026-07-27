import { Clock3 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function PendingPage() {
  const { signOut } = useAuth()
  const { pendingMemberships } = useProject()
  const project = pendingMemberships[0]?.project

  return (
    <div className="bg-glow flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-muted">
            <Clock3 className="size-6 text-muted-foreground" />
          </div>
          <CardTitle className="font-heading text-2xl">Заявка отправлена</CardTitle>
          <CardDescription>
            {project ? (
              <>
                Ждите подтверждения от владельца проекта «{project.name}». Как только вас примут,
                приложение откроется автоматически.
              </>
            ) : (
              'Ждите подтверждения от владельца проекта.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => signOut()}>
            Выйти из аккаунта
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
