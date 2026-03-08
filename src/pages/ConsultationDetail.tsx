import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Thermometer, Heart, Wind, Droplets, Weight, Ruler, Send } from "lucide-react";
import { toast } from "sonner";
import SendToDialog from "@/components/SendToDialog";

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [status, setStatus] = useState("");

  const { data: consultation, isLoading } = useQuery({
    queryKey: ["consultation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          *,
          patients!consultations_patient_id_fkey (id, patient_id, first_name, last_name, date_of_birth, gender, phone)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      setClinicalNotes(data.clinical_notes ?? "");
      setDiagnosis(data.diagnosis ?? "");
      setStatus(data.status);
      return data;
    },
    enabled: !!id,
  });

  // Find the active queue item for this consultation
  const { data: queueItem } = useQuery({
    queryKey: ["queue-item-consultation", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_queue")
        .select("id")
        .eq("consultation_id", id!)
        .in("status", ["waiting", "in_progress"])
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("consultations")
        .update({ clinical_notes: clinicalNotes, diagnosis, status })
        .eq("id", id!);
      if (error) throw error;
      toast.success("Consultation updated");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["consultation", id] });
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!consultation) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Consultation not found</div>;
  }

  const vitals = (consultation.vitals as Record<string, string | null>) ?? {};
  const patient = consultation.patients as any;

  const getAge = (dob: string) => {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  const vitalItems = [
    { label: "Temperature", value: vitals.temperature, unit: "°C", icon: <Thermometer size={16} /> },
    { label: "Blood Pressure", value: vitals.blood_pressure, unit: "mmHg", icon: <Droplets size={16} /> },
    { label: "Heart Rate", value: vitals.heart_rate, unit: "bpm", icon: <Heart size={16} /> },
    { label: "Respiratory Rate", value: vitals.respiratory_rate, unit: "/min", icon: <Wind size={16} /> },
    { label: "SpO₂", value: vitals.oxygen_saturation, unit: "%", icon: <Droplets size={16} /> },
    { label: "Weight", value: vitals.weight, unit: "kg", icon: <Weight size={16} /> },
    { label: "Height", value: vitals.height, unit: "cm", icon: <Ruler size={16} /> },
  ];

  const statusColors: Record<string, string> = {
    Pending: "bg-warning/10 text-warning",
    "In Progress": "bg-info/10 text-info",
    Completed: "bg-success/10 text-success",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/consultations")}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Consultation Details</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(consultation.consultation_date).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setSendDialogOpen(true)}>
            <Send size={16} />
            Send To
          </Button>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
                <Save size={16} />
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Patient Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-3">Patient Information</h2>
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium text-card-foreground">{patient?.first_name} {patient?.last_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Patient ID</p>
            <p className="font-medium text-card-foreground">{patient?.patient_id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Age / Gender</p>
            <p className="font-medium text-card-foreground">{patient?.date_of_birth ? getAge(patient.date_of_birth) + "y" : "—"} · {patient?.gender}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-3">Status</h2>
        {editing ? (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[consultation.status] || ""}`}>
            {consultation.status}
          </span>
        )}
      </div>

      {/* Vitals */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-4">Vitals</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vitalItems.map((v) => (
            <div key={v.label} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {v.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{v.label}</p>
                <p className="text-sm font-medium text-card-foreground">
                  {v.value ? `${v.value} ${v.unit}` : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Triage Notes */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-2">
        <h2 className="font-display font-semibold text-card-foreground">Triage Notes</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {consultation.triage_notes || "No triage notes recorded."}
        </p>
      </div>

      {/* Clinical Notes */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-2">
        <h2 className="font-display font-semibold text-card-foreground">Clinical Notes</h2>
        {editing ? (
          <Textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            placeholder="Examination findings and clinical observations..."
            rows={5}
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {consultation.clinical_notes || "No clinical notes recorded."}
          </p>
        )}
      </div>

      {/* Diagnosis */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-2">
        <h2 className="font-display font-semibold text-card-foreground">Diagnosis</h2>
        {editing ? (
          <Textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Diagnosis or differential diagnoses..."
            rows={3}
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {consultation.diagnosis || "No diagnosis recorded yet."}
          </p>
        )}
      </div>

      {/* Send To Dialog */}
      {patient && (
        <SendToDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          currentDepartment="consultation"
          queueItemId={queueItem?.id}
          consultationId={id}
        />
      )}
    </div>
  );
}
