import { useMemo, useState } from "react";
import { format, subWeeks, startOfWeek, eachWeekOfInterval } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Report } from "@/types";

const COLORS = ["#166534", "#1565C0", "#6A1B9A", "#E65100", "#827717", "#00695C", "#37474F", "#BF360C"];

const STATUS_COLORS: Record<string, string> = {
  reported: "#3B82F6",
  acknowledged: "#14B8A6",
  under_review: "#A855F7",
  ongoing: "#F97316",
  solved: "#22C55E",
};

interface AnalyticsChartsProps {
  reports: Report[];
}

type WeekRange = 4 | 8 | 12;

export function AnalyticsCharts({ reports }: AnalyticsChartsProps) {
  const [weekRange, setWeekRange] = useState<WeekRange>(8);

  const trendData = useMemo(() => {
    const now = new Date();
    const start = subWeeks(now, weekRange);
    const weeks = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });
    return weeks.map((weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = reports.filter((r) => r.reportedAt >= weekStart && r.reportedAt < weekEnd).length;
      return { week: format(weekStart, "MMM d"), count };
    });
  }, [reports, weekRange]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => { counts[r.category] = (counts[r.category] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [reports]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value,
      fill: STATUS_COLORS[name] ?? "#94A3B8",
    }));
  }, [reports]);

  const muniData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => { counts[r.municipality] = (counts[r.municipality] ?? 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name: name.length > 12 ? name.slice(0, 12) + "…" : name, count }));
  }, [reports]);

  if (reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No report data yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trend */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Report Trends</CardTitle>
          <div className="flex gap-1">
            {([4, 8, 12] as WeekRange[]).map((w) => (
              <Button
                key={w}
                variant={weekRange === w ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setWeekRange(w)}
              >
                {w}w
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#166534" strokeWidth={2} dot={{ r: 3 }} name="Reports" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="value" name="Reports" radius={[0, 3, 3, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* By municipality */}
      {muniData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Municipality</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={muniData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Reports" fill="#166534" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
