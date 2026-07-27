import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnnouncementsTab } from './AnnouncementsTab'
import { ChatTab } from './ChatTab'

export function SocialPage() {
  return (
    <Tabs defaultValue="announcements" className="gap-0">
      <div className="border-b border-border px-4 pt-3 pb-3">
        <TabsList className="w-full">
          <TabsTrigger value="announcements" className="flex-1">
            Объявления
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex-1">
            Общение
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="announcements">
        <AnnouncementsTab />
      </TabsContent>
      <TabsContent value="chat">
        <ChatTab />
      </TabsContent>
    </Tabs>
  )
}
