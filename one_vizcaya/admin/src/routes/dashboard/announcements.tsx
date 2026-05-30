import { createFileRoute } from '@tanstack/react-router'
import { useAuthContext } from '@/lib/authContext'
import { AnnouncementsPanel } from '@/components/AnnouncementsPanel'

export const Route = createFileRoute('/dashboard/announcements')({ component: AnnouncementsPage })

function AnnouncementsPage() {
  const { user } = useAuthContext()
  return <AnnouncementsPanel user={user!} />
}
