import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import PatientQueue from "@/components/PatientQueue";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Pending: "bg-warning/10 text-warning",
  "In Progress": "bg-info/10 text-info",
  Completed: "bg-success/10 text-success",
  Cancelled: "bg-destructive/10 text-destructive",
};

export default function Consultations() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: consultations = [] } = useQuery({
    queryKey: ["consultations", search],
    queryFn: async () => {
      let query = supabase
        .from("consultations")
        .select(`
          id, status, consultation_date, diagnosis, triage_notes,
          patients!consultations_patient_id_fkey (patient_id, first_name, last_name)
        `)
        .order("consultation_date", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      if (search.trim()) {
        const s = search.toLowerCase();
        return (data ?? []).filter((c: any) =>
          c.patients?.first_name?.toLowerCase().includes(s) ||
          c.patients?.last_name?.toLowerCase().includes(s) ||
          c.patients?.patient_id?.toLowerCase().includes(s) ||
          c.diagnosis?.toLowerCase().includes(s)
        );
      }
      return data ?? [];
    },
  });

  const handleAttendPatient = async (queueItem: any) => {
    if (!user) return;
    const patient = queueItem.patients;
    try {
      // Create consultation for this patient
      const { data, error } = await supabase.from("consultations").insert({
        patient_id: patient.id,
        doctor_id: user.id,
        triage_notes: queueItem.notes || null,
        status: "In Progress",
      }).select("id").single();

      if (error) throw error;

      // Mark queue item as in_progress
      await supabase.from("patient_queue").update({ status: "in_progress" }).eq("id", queueItem.id);

      // Update consultation_id on queue item
      if (data) {
        await supabase.from("patient_queue").update({ consultation_id: data.id }).eq("id", queueItem.id);
        toast.success(`Started consultation for ${patient.first_name} ${patient.last_name}`);
        navigate(`/consultations/${data.id}`);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Consultations</h1>
          <p className="text-sm text-muted-foreground">Manage doctor consultations, triage, and clinical notes</p>
        </div>
        <Link to="/consultations/new">
          <Button className="gap-2">
            <Plus size={16} />
            New Consultation
          </Button>
        </Link>
      </div>

      {/* Queue */}
      <PatientQueue
        department="consultation"
        title="Patients Waiting for Consultation"
        onSelectPatient={handleAttendPatient}
      />

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name, ID, or diagnosis..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter size={16} />
          Filter
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          {consultations.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {search ? "No consultations found matching your search." : (
                <>No consultations yet. <Link to="/consultations/new" className="text-primary hover:underline">Start a new consultation</Link>.</>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Diagnosis</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-card-foreground">
                        {c.patients?.first_name} {c.patients?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.patients?.patient_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">
                      {c.diagnosis || <span className="italic">Pending</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[c.status] || ""}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                      {new Date(c.consultation_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/consultations/${c.id}`}>
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
