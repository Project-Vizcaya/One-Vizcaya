import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnouncementsCard } from "@/components/announcements/AnnouncementsCard";
import { useAnnouncements } from "@/hooks/useAnnouncements";

export const Route = createFileRoute("/dashboard/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { announcements, loading } = useAnnouncements();

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold">📢 Announcements</h1>
        <p className="text-sm text-muted-foreground">Public announcements for all citizens</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <AnnouncementsCard announcements={announcements} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
