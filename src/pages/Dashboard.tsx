import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Stethoscope,
  FlaskConical,
  Pill,
  BedDouble,
  UserPlus,
  HeartPulse,
  ArrowRight,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Admitted: "bg-primary/10 text-primary",
};

const quickActions = [
  { label: "Register Patient", icon: <UserPlus size={18} />, path: "/patients/register" },
  { label: "Triage", icon: <HeartPulse size={18} />, path: "/consultations/new" },
  { label: "Lab Request", icon: <FlaskConical size={18} />, path: "/laboratory" },
  { label: "Dispense Drugs", icon: <Pill size={18} />, path: "/pharmacy" },
];

const departmentConfig: Record<string, { label: string; icon: React.ReactNode; path: string; color: string }> = {
  triage: { label: "Triage", icon: <HeartPulse size={18} />, path: "/consultations/new", color: "text-warning" },
  consultation: { label: "Consultation", icon: <Stethoscope size={18} />, path: "/consultations", color: "text-info" },
  laboratory: { label: "Laboratory", icon: <FlaskConical size={18} />, path: "/laboratory", color: "text-primary" },
  pharmacy: { label: "Pharmacy", icon: <Pill size={18} />, path: "/pharmacy", color: "text-success" },
  inpatient: { label: "Inpatient", icon: <BedDouble size={18} />, path: "/inpatient", color: "text-destructive" },
};

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [patientsRes, consultationsRes, labRes, inpatientRes] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("lab_results").select("id", { count: "exact", head: true }).eq("status", "Requested"),
        supabase.from("inpatient_records").select("id", { count: "exact", head: true }).eq("status", "Admitted"),
      ]);
      return {
        totalPatients: patientsRes.count ?? 0,
        pendingConsultations: consultationsRes.count ?? 0,
        pendingLabs: labRes.count ?? 0,
        admittedPatients: inpatientRes.count ?? 0,
      };
    },
  });

  // Queue counts per department
  const { data: queueCounts = {} } = useQuery({
    queryKey: ["dashboard-queue-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_queue")
        .select("department")
        .eq("status", "waiting");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((item: any) => {
        counts[item.department] = (counts[item.department] || 0) + 1;
      });
      return counts;
    },
    refetchInterval: 15000,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["dashboard-recent-patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name, date_of_birth, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const getAge = (dob: string) => {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  const totalQueued = Object.values(queueCounts).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's your hospital overview.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={stats?.totalPatients ?? 0}
          change="Registered"
          changeType="neutral"
          icon={<Users size={20} className="text-primary" />}
          iconClassName="bg-primary/10"
        />
        <StatCard
          title="Pending Consultations"
          value={stats?.pendingConsultations ?? 0}
          change="Awaiting"
          changeType="neutral"
          icon={<Stethoscope size={20} className="text-info" />}
          iconClassName="bg-info/10"
        />
        <StatCard
          title="Pending Lab Tests"
          value={stats?.pendingLabs ?? 0}
          change="Requested"
          changeType="neutral"
          icon={<FlaskConical size={20} className="text-warning" />}
          iconClassName="bg-warning/10"
        />
        <StatCard
          title="Admitted Patients"
          value={stats?.admittedPatients ?? 0}
          change="Inpatient"
          changeType="neutral"
          icon={<BedDouble size={20} className="text-success" />}
          iconClassName="bg-success/10"
        />
      </div>

      {/* Workflow Overview */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-semibold text-card-foreground">Patient Workflow</h2>
            <Badge variant="secondary" className="text-xs">{totalQueued} patients in queue</Badge>
          </div>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-5">
          {Object.entries(departmentConfig).map(([key, dept]) => {
            const count = (queueCounts as Record<string, number>)[key] || 0;
            return (
              <Link key={key} to={dept.path} className="bg-card p-4 hover:bg-muted/50 transition-colors flex flex-col items-center gap-2 text-center">
                <div className={`${dept.color}`}>{dept.icon}</div>
                <p className="text-xs font-medium text-card-foreground">{dept.label}</p>
                <p className="text-2xl font-bold text-card-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground">waiting</p>
              </Link>
            );
          })}
        </div>
        <div className="px-6 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Flow: Reception → Triage → Consultation → Lab / Pharmacy / Inpatient → Back to Consultation if needed
          </p>
        </div>
      </div>

      {/* Quick Actions + Recent */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display font-semibold text-card-foreground">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link key={action.path} to={action.path}>
                <Button
                  variant="outline"
                  className="h-auto w-full flex-col gap-2 py-4 hover:border-primary hover:text-primary transition-colors"
                >
                  {action.icon}
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display font-semibold text-card-foreground">Recent Patients</h2>
            <Link to="/patients">
              <Button variant="ghost" size="sm" className="text-primary">View All</Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            {patients.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No patients registered yet. <Link to="/patients/register" className="text-primary hover:underline">Register your first patient</Link>.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="text-sm font-medium text-card-foreground">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-muted-foreground">{p.patient_id} · {getAge(p.date_of_birth)}y</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[p.status] || ""}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-muted-foreground hidden md:table-cell">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
