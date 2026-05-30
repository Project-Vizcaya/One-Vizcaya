import { createFileRoute } from '@tanstack/react-router'
import { useAuthContext } from '../../lib/authContext'
import { useToastContext } from '../../lib/toastContext'
import { AnnouncementsPanel } from '../../components/AnnouncementsPanel'

export const Route = createFileRoute('/dashboard/announcements')({
  component: AnnouncementsPage,
})

function AnnouncementsPage() {
  const { user } = useAuthContext()
  const addToast = useToastContext()
  return <AnnouncementsPanel user={user!} onToast={addToast} />
}
