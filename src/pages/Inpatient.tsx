import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus, BedDouble, CheckCircle2, Clock, LogOut, Users } from "lucide-react";
import PatientQueue from "@/components/PatientQueue";

const statusColors: Record<string, string> = {
  Admitted: "bg-info/10 text-info",
  Discharged: "bg-success/10 text-success",
  Transferred: "bg-warning/10 text-warning",
};

const statusIcons: Record<string, React.ReactNode> = {
  Admitted: <BedDouble size={12} />,
  Discharged: <LogOut size={12} />,
  Transferred: <Clock size={12} />,
};

export default function Inpatient() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: records = [] } = useQuery({
    queryKey: ["inpatient", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("inpatient_records")
        .select(`
          id, ward, bed_number, status, admitted_at, discharged_at, discharge_notes,
          patients!inpatient_records_patient_id_fkey (patient_id, first_name, last_name)
        `)
        .order("admitted_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (search.trim()) {
        const s = search.toLowerCase();
        return (data ?? []).filter((r: any) =>
          r.ward?.toLowerCase().includes(s) ||
          r.bed_number?.toLowerCase().includes(s) ||
          r.patients?.first_name?.toLowerCase().includes(s) ||
          r.patients?.last_name?.toLowerCase().includes(s) ||
          r.patients?.patient_id?.toLowerCase().includes(s)
        );
      }
      return data ?? [];
    },
  });

  const admittedCount = records.filter((r: any) => r.status === "Admitted").length;
  const dischargedCount = records.filter((r: any) => r.status === "Discharged").length;

  // Ward occupancy summary
  const wardMap = new Map<string, number>();
  records.filter((r: any) => r.status === "Admitted").forEach((r: any) => {
    wardMap.set(r.ward, (wardMap.get(r.ward) || 0) + 1);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Inpatient</h1>
          <p className="text-sm text-muted-foreground">Manage bed allocation, admissions, discharges, and ward transfers</p>
        </div>
        <Link to="/inpatient/admit">
          <Button className="gap-2">
            <Plus size={16} />
            New Admission
          </Button>
        </Link>
      </div>

      {/* Queue */}
      <PatientQueue
        department="inpatient"
        title="Patients Sent to Inpatient"
        showActions={false}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
            <BedDouble size={20} className="text-info" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{admittedCount}</p>
            <p className="text-xs text-muted-foreground">Currently Admitted</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <CheckCircle2 size={20} className="text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{dischargedCount}</p>
            <p className="text-xs text-muted-foreground">Discharged</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{records.length}</p>
            <p className="text-xs text-muted-foreground">Total Records</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ward Occupancy</p>
          {wardMap.size === 0 ? (
            <p className="text-sm text-muted-foreground">No active admissions</p>
          ) : (
            <div className="space-y-1">
              {Array.from(wardMap.entries()).map(([ward, count]) => (
                <div key={ward} className="flex items-center justify-between text-sm">
                  <span className="text-card-foreground">{ward}</span>
                  <span className="font-medium text-card-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient, ward, or bed..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter size={16} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Records</SelectItem>
            <SelectItem value="Admitted">Admitted</SelectItem>
            <SelectItem value="Discharged">Discharged</SelectItem>
            <SelectItem value="Transferred">Transferred</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          {records.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              <BedDouble size={32} className="mx-auto mb-3 text-muted-foreground/50" />
              {search || statusFilter !== "all"
                ? "No records match your filters."
                : "No inpatient records yet. Admit a patient to get started."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ward</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Bed</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Admitted</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Discharged</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-card-foreground">
                        {r.patients?.first_name} {r.patients?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.patients?.patient_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-card-foreground">{r.ward}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{r.bed_number}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[r.status] || "bg-muted text-muted-foreground"}`}>
                        {statusIcons[r.status]}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                      {new Date(r.admitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                      {r.discharged_at ? new Date(r.discharged_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/inpatient/${r.id}`}>
                        <Button variant="ghost" size="sm" className="text-primary">
                          {r.status === "Admitted" ? "Manage" : "View"}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
