import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Users,
  Receipt,
  Stethoscope,
  FlaskConical,
  BedDouble,
  Pill,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = [
  "hsl(174, 62%, 38%)",
  "hsl(199, 80%, 50%)",
  "hsl(38, 92%, 50%)",
  "hsl(152, 60%, 42%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 50%, 50%)",
];

const monthlyChartConfig: ChartConfig = {
  patients: { label: "Patients", color: "hsl(174, 62%, 38%)" },
  consultations: { label: "Consultations", color: "hsl(199, 80%, 50%)" },
};

const revenueChartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "hsl(152, 60%, 42%)" },
  collected: { label: "Collected", color: "hsl(174, 62%, 38%)" },
};

export default function Reports() {
  // Summary stats
  const { data: stats } = useQuery({
    queryKey: ["reports-stats"],
    queryFn: async () => {
      const [patients, consultations, labs, prescriptions, billing, inpatient] =
        await Promise.all([
          supabase.from("patients").select("id", { count: "exact", head: true }),
          supabase.from("consultations").select("id", { count: "exact", head: true }),
          supabase.from("lab_results").select("id", { count: "exact", head: true }),
          supabase.from("prescriptions").select("id", { count: "exact", head: true }),
          supabase.from("billing").select("total_amount, paid_amount"),
          supabase.from("inpatient_records").select("id", { count: "exact", head: true }),
        ]);

      const totalRevenue = (billing.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
      const totalCollected = (billing.data ?? []).reduce((s, r) => s + Number(r.paid_amount), 0);

      return {
        totalPatients: patients.count ?? 0,
        totalConsultations: consultations.count ?? 0,
        totalLabTests: labs.count ?? 0,
        totalPrescriptions: prescriptions.count ?? 0,
        totalRevenue,
        totalCollected,
        totalInpatient: inpatient.count ?? 0,
      };
    },
  });

  // Monthly registration/consultation trends (last 6 months)
  const { data: monthlyData = [] } = useQuery({
    queryKey: ["reports-monthly"],
    queryFn: async () => {
      const months: { label: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({
          label: format(d, "MMM"),
          start: startOfMonth(d).toISOString(),
          end: endOfMonth(d).toISOString(),
        });
      }

      const results = await Promise.all(
        months.map(async (m) => {
          const [pRes, cRes] = await Promise.all([
            supabase
              .from("patients")
              .select("id", { count: "exact", head: true })
              .gte("created_at", m.start)
              .lte("created_at", m.end),
            supabase
              .from("consultations")
              .select("id", { count: "exact", head: true })
              .gte("created_at", m.start)
              .lte("created_at", m.end),
          ]);
          return {
            month: m.label,
            patients: pRes.count ?? 0,
            consultations: cRes.count ?? 0,
          };
        })
      );
      return results;
    },
  });

  // Revenue by month (last 6 months)
  const { data: revenueData = [] } = useQuery({
    queryKey: ["reports-revenue"],
    queryFn: async () => {
      const months: { label: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        months.push({
          label: format(d, "MMM"),
          start: startOfMonth(d).toISOString(),
          end: endOfMonth(d).toISOString(),
        });
      }

      const results = await Promise.all(
        months.map(async (m) => {
          const { data } = await supabase
            .from("billing")
            .select("total_amount, paid_amount")
            .gte("created_at", m.start)
            .lte("created_at", m.end);
          return {
            month: m.label,
            revenue: (data ?? []).reduce((s, r) => s + Number(r.total_amount), 0),
            collected: (data ?? []).reduce((s, r) => s + Number(r.paid_amount), 0),
          };
        })
      );
      return results;
    },
  });

  // Consultation status distribution
  const { data: consultationStatusData = [] } = useQuery({
    queryKey: ["reports-consultation-status"],
    queryFn: async () => {
      const { data } = await supabase.from("consultations").select("status");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((c) => {
        counts[c.status] = (counts[c.status] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  // Lab test category distribution
  const { data: labCategoryData = [] } = useQuery({
    queryKey: ["reports-lab-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("lab_results").select("test_category");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((l) => {
        const cat = l.test_category || "Uncategorized";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  // Ward occupancy
  const { data: wardData = [] } = useQuery({
    queryKey: ["reports-ward-occupancy"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inpatient_records")
        .select("ward, status");
      const wards: Record<string, { admitted: number; discharged: number }> = {};
      (data ?? []).forEach((r) => {
        if (!wards[r.ward]) wards[r.ward] = { admitted: 0, discharged: 0 };
        if (r.status === "Admitted") wards[r.ward].admitted++;
        else wards[r.ward].discharged++;
      });
      return Object.entries(wards).map(([ward, counts]) => ({
        ward,
        ...counts,
      }));
    },
  });

  const collectionRate =
    stats && stats.totalRevenue > 0
      ? ((stats.totalCollected / stats.totalRevenue) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hospital performance metrics and trends.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={stats?.totalPatients ?? 0}
          icon={<Users size={20} className="text-primary" />}
          iconClassName="bg-primary/10"
        />
        <StatCard
          title="Total Consultations"
          value={stats?.totalConsultations ?? 0}
          icon={<Stethoscope size={20} className="text-info" />}
          iconClassName="bg-info/10"
        />
        <StatCard
          title="Total Revenue"
          value={`KES ${(stats?.totalRevenue ?? 0).toLocaleString()}`}
          change={`${collectionRate}% collected`}
          changeType={Number(collectionRate) >= 70 ? "positive" : "negative"}
          icon={<Receipt size={20} className="text-success" />}
          iconClassName="bg-success/10"
        />
        <StatCard
          title="Inpatient Records"
          value={stats?.totalInpatient ?? 0}
          icon={<BedDouble size={20} className="text-warning" />}
          iconClassName="bg-warning/10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Patient & Consultation Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No data available yet.</p>
                ) : (
                  <ChartContainer config={monthlyChartConfig} className="h-[280px] w-full">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="patients" fill="var(--color-patients)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="consultations" fill="var(--color-consultations)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Consultation Status Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consultation Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {consultationStatusData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No consultations recorded yet.</p>
                ) : (
                  <div className="flex items-center justify-center h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={consultationStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {consultationStatusData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Billed"
              value={`KES ${(stats?.totalRevenue ?? 0).toLocaleString()}`}
              icon={<TrendingUp size={20} className="text-primary" />}
              iconClassName="bg-primary/10"
            />
            <StatCard
              title="Total Collected"
              value={`KES ${(stats?.totalCollected ?? 0).toLocaleString()}`}
              icon={<Receipt size={20} className="text-success" />}
              iconClassName="bg-success/10"
            />
            <StatCard
              title="Outstanding"
              value={`KES ${((stats?.totalRevenue ?? 0) - (stats?.totalCollected ?? 0)).toLocaleString()}`}
              icon={<TrendingDown size={20} className="text-destructive" />}
              iconClassName="bg-destructive/10"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly Revenue vs Collection</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No billing data available yet.</p>
              ) : (
                <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="collected" stroke="var(--color-collected)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Lab Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lab Test Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {labCategoryData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No lab tests recorded yet.</p>
                ) : (
                  <div className="flex items-center justify-center h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={labCategoryData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {labCategoryData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ward Occupancy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ward Occupancy</CardTitle>
              </CardHeader>
              <CardContent>
                {wardData.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No inpatient records yet.</p>
                ) : (
                  <ChartContainer
                    config={{
                      admitted: { label: "Admitted", color: "hsl(199, 80%, 50%)" },
                      discharged: { label: "Discharged", color: "hsl(152, 60%, 42%)" },
                    }}
                    className="h-[280px] w-full"
                  >
                    <BarChart data={wardData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="ward" className="text-xs" />
                      <YAxis className="text-xs" allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="admitted" fill="var(--color-admitted)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="discharged" fill="var(--color-discharged)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Lab Tests"
              value={stats?.totalLabTests ?? 0}
              icon={<FlaskConical size={20} className="text-warning" />}
              iconClassName="bg-warning/10"
            />
            <StatCard
              title="Prescriptions"
              value={stats?.totalPrescriptions ?? 0}
              icon={<Pill size={20} className="text-info" />}
              iconClassName="bg-info/10"
            />
            <StatCard
              title="Inpatient Records"
              value={stats?.totalInpatient ?? 0}
              icon={<BedDouble size={20} className="text-success" />}
              iconClassName="bg-success/10"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
