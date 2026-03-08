import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Zap, ArrowRight } from "lucide-react";

const priorityConfig: Record<string, { icon: React.ReactNode; class: string }> = {
  normal: { icon: <Clock size={12} />, class: "bg-muted text-muted-foreground" },
  urgent: { icon: <AlertTriangle size={12} />, class: "bg-warning/10 text-warning border-warning/30" },
  emergency: { icon: <Zap size={12} />, class: "bg-destructive/10 text-destructive border-destructive/30" },
};

interface PatientQueueProps {
  department: string;
  title?: string;
  onSelectPatient?: (queueItem: any) => void;
  showActions?: boolean;
}

export default function PatientQueue({ department, title, onSelectPatient, showActions = true }: PatientQueueProps) {
  const { data: queueItems = [], isLoading } = useQuery({
    queryKey: ["patient-queue", department],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_queue")
        .select(`
          id, department, status, priority, notes, sent_from, created_at, consultation_id,
          patients!patient_queue_patient_id_fkey (id, patient_id, first_name, last_name, date_of_birth, gender, phone)
        `)
        .eq("department", department)
        .eq("status", "waiting")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Loading queue...</div>;
  }

  const getAge = (dob: string) => {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  const getWaitTime = (createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  };

  // Sort: emergency first, then urgent, then normal
  const sorted = [...queueItems].sort((a, b) => {
    const order = { emergency: 0, urgent: 1, normal: 2 };
    return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2);
  });

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-semibold text-card-foreground">{title || "Patient Queue"}</h2>
          <Badge variant="secondary" className="text-xs">{sorted.length} waiting</Badge>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No patients waiting in this queue.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((item: any) => {
            const patient = item.patients;
            const pConfig = priorityConfig[item.priority] || priorityConfig.normal;
            return (
              <div key={item.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-card-foreground truncate">
                      {patient?.first_name} {patient?.last_name}
                    </p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pConfig.class}`}>
                      {pConfig.icon}
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {patient?.patient_id} · {patient?.date_of_birth ? getAge(patient.date_of_birth) + "y" : "—"} · {patient?.gender}
                    {item.sent_from && <> · From: <span className="capitalize font-medium">{item.sent_from}</span></>}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  <Clock size={12} className="inline mr-1" />
                  {getWaitTime(item.created_at)}
                </div>
                {showActions && onSelectPatient && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onSelectPatient(item)}>
                    Attend
                    <ArrowRight size={14} />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
