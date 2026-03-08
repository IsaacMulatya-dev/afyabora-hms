import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Filter, FlaskConical } from "lucide-react";
import PatientQueue from "@/components/PatientQueue";

const statusColors: Record<string, string> = {
  Requested: "bg-warning/10 text-warning",
  "Sample Collected": "bg-info/10 text-info",
  Processing: "bg-primary/10 text-primary",
  Completed: "bg-success/10 text-success",
  Cancelled: "bg-destructive/10 text-destructive",
};

export default function Laboratory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: labResults = [] } = useQuery({
    queryKey: ["lab-results", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("lab_results")
        .select(`
          id, test_name, test_category, sample_type, status, result, reference_range,
          requested_at, completed_at,
          patients!lab_results_patient_id_fkey (patient_id, first_name, last_name)
        `)
        .order("requested_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (search.trim()) {
        const s = search.toLowerCase();
        return (data ?? []).filter((r: any) =>
          r.test_name?.toLowerCase().includes(s) ||
          r.patients?.first_name?.toLowerCase().includes(s) ||
          r.patients?.last_name?.toLowerCase().includes(s) ||
          r.patients?.patient_id?.toLowerCase().includes(s)
        );
      }
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Laboratory</h1>
          <p className="text-sm text-muted-foreground">Request tests, track samples, and enter results</p>
        </div>
        <Link to="/laboratory/new">
          <Button className="gap-2">
            <Plus size={16} />
            New Test Request
          </Button>
        </Link>
      </div>

      {/* Queue */}
      <PatientQueue
        department="laboratory"
        title="Patients Sent to Lab"
        showActions={false}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by test name or patient..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter size={16} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Requested">Requested</SelectItem>
            <SelectItem value="Sample Collected">Sample Collected</SelectItem>
            <SelectItem value="Processing">Processing</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          {labResults.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              <FlaskConical size={32} className="mx-auto mb-3 text-muted-foreground/50" />
              {search || statusFilter !== "all" ? "No lab results match your filters." : (
                <>No lab tests yet. <Link to="/laboratory/new" className="text-primary hover:underline">Request a new test</Link>.</>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Sample</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {labResults.map((r: any) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-card-foreground">
                        {r.patients?.first_name} {r.patients?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.patients?.patient_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-card-foreground font-medium">{r.test_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{r.test_category || "—"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{r.sample_type || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[r.status] || ""}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                      {new Date(r.requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/laboratory/${r.id}`}>
                        <Button variant="ghost" size="sm" className="text-primary">View</Button>
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
