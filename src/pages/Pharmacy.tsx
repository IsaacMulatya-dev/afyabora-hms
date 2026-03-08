import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Pill, CheckCircle2, Clock } from "lucide-react";
import PatientQueue from "@/components/PatientQueue";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  dispensed: "bg-success/10 text-success",
};

export default function Pharmacy() {
  const [search, setSearch] = useState("");
  const [dispensedFilter, setDispensedFilter] = useState("all");

  const { data: prescriptions = [] } = useQuery({
    queryKey: ["prescriptions", search, dispensedFilter],
    queryFn: async () => {
      let query = supabase
        .from("prescriptions")
        .select(`
          id, medication_name, dosage, frequency, duration, quantity, dispensed, dispensed_at, notes, created_at,
          patients!prescriptions_patient_id_fkey (patient_id, first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (dispensedFilter === "pending") {
        query = query.eq("dispensed", false);
      } else if (dispensedFilter === "dispensed") {
        query = query.eq("dispensed", true);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (search.trim()) {
        const s = search.toLowerCase();
        return (data ?? []).filter((r: any) =>
          r.medication_name?.toLowerCase().includes(s) ||
          r.patients?.first_name?.toLowerCase().includes(s) ||
          r.patients?.last_name?.toLowerCase().includes(s) ||
          r.patients?.patient_id?.toLowerCase().includes(s)
        );
      }
      return data ?? [];
    },
  });

  const pendingCount = prescriptions.filter((p: any) => !p.dispensed).length;
  const dispensedCount = prescriptions.filter((p: any) => p.dispensed).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Pharmacy</h1>
          <p className="text-sm text-muted-foreground">View prescriptions, dispense medications, and track dispensing history</p>
        </div>
      </div>

      {/* Queue */}
      <PatientQueue
        department="pharmacy"
        title="Patients Sent to Pharmacy"
        showActions={false}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <Clock size={20} className="text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending Dispensing</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <CheckCircle2 size={20} className="text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{dispensedCount}</p>
            <p className="text-xs text-muted-foreground">Dispensed</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Pill size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{prescriptions.length}</p>
            <p className="text-xs text-muted-foreground">Total Prescriptions</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by medication or patient..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={dispensedFilter} onValueChange={setDispensedFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter size={16} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prescriptions</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="dispensed">Dispensed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          {prescriptions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              <Pill size={32} className="mx-auto mb-3 text-muted-foreground/50" />
              {search || dispensedFilter !== "all"
                ? "No prescriptions match your filters."
                : "No prescriptions yet. Prescriptions appear here after being added in consultations."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medication</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Dosage</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-card-foreground">
                        {p.patients?.first_name} {p.patients?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.patients?.patient_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-card-foreground">{p.medication_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">
                      {p.dosage} · {p.frequency}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{p.quantity ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.dispensed ? statusColors.dispensed : statusColors.pending
                      }`}>
                        {p.dispensed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {p.dispensed ? "Dispensed" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/pharmacy/${p.id}`}>
                        <Button variant="ghost" size="sm" className="text-primary">
                          {p.dispensed ? "View" : "Dispense"}
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
