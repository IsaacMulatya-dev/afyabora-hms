import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Send } from "lucide-react";
import { toast } from "sonner";
import PatientQueue from "@/components/PatientQueue";
import SendToDialog from "@/components/SendToDialog";

export default function NewConsultation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [triageNotes, setTriageNotes] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [status, setStatus] = useState("Pending");
  const [selectedQueueItem, setSelectedQueueItem] = useState<any>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [savedPatientForSend, setSavedPatientForSend] = useState<any>(null);

  // Vitals
  const [temperature, setTemperature] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name")
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const handleAttendFromQueue = (queueItem: any) => {
    const patient = queueItem.patients;
    setPatientId(patient.id);
    setSelectedQueueItem(queueItem);
    setTriageNotes(queueItem.notes || "");
    // Mark as in_progress
    supabase.from("patient_queue").update({ status: "in_progress" }).eq("id", queueItem.id);
    queryClient.invalidateQueries({ queryKey: ["patient-queue"] });
    toast.info(`Now attending ${patient.first_name} ${patient.last_name}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !user) {
      toast.error("Please select a patient");
      return;
    }

    setIsSubmitting(true);
    try {
      const vitals = {
        temperature: temperature || null,
        blood_pressure: bloodPressure || null,
        heart_rate: heartRate || null,
        respiratory_rate: respiratoryRate || null,
        oxygen_saturation: oxygenSaturation || null,
        weight: weight || null,
        height: height || null,
      };

      const { data, error } = await supabase.from("consultations").insert({
        patient_id: patientId,
        doctor_id: user.id,
        triage_notes: triageNotes || null,
        vitals,
        clinical_notes: clinicalNotes || null,
        diagnosis: diagnosis || null,
        status,
      }).select("id").single();

      if (error) throw error;

      // Mark triage queue item as completed
      if (selectedQueueItem) {
        await supabase.from("patient_queue").update({
          status: "completed",
          consultation_id: data?.id,
        }).eq("id", selectedQueueItem.id);
      }

      // Auto-send to consultation department
      if (data) {
        await supabase.from("patient_queue").insert({
          patient_id: patientId,
          department: "consultation",
          status: "waiting",
          priority: selectedQueueItem?.priority || "normal",
          sent_by: user.id,
          sent_from: "triage",
          consultation_id: data.id,
          notes: `Vitals recorded. ${triageNotes ? "Triage: " + triageNotes : ""}`.trim(),
        });
      }

      toast.success("Triage completed — patient sent to Consultation");
      queryClient.invalidateQueries({ queryKey: ["patient-queue"] });
      navigate("/consultations");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Triage & New Consultation</h1>
          <p className="text-sm text-muted-foreground">Record triage vitals, then send patient to consultation</p>
        </div>
      </div>

      {/* Triage Queue */}
      <PatientQueue
        department="triage"
        title="Patients Waiting for Triage"
        onSelectPatient={handleAttendFromQueue}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Patient</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Select Patient *</Label>
              <Select value={patientId} onValueChange={setPatientId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a patient (or select from queue above)" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {patients.length === 0 && (
                <p className="text-xs text-muted-foreground">No patients found. Register a patient first.</p>
              )}
            </div>
          </div>
        </div>

        {/* Triage */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Triage Notes</h2>
          <div className="space-y-2">
            <Label htmlFor="triageNotes">Chief Complaint & Triage Assessment</Label>
            <Textarea
              id="triageNotes"
              value={triageNotes}
              onChange={(e) => setTriageNotes(e.target.value)}
              placeholder="Describe the patient's chief complaint, symptoms, and triage category..."
              rows={4}
            />
          </div>
        </div>

        {/* Vitals */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Vitals</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input id="temperature" type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="36.5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bloodPressure">Blood Pressure (mmHg)</Label>
              <Input id="bloodPressure" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} placeholder="120/80" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
              <Input id="heartRate" type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="72" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="respiratoryRate">Respiratory Rate (/min)</Label>
              <Input id="respiratoryRate" type="number" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} placeholder="16" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oxygenSaturation">SpO₂ (%)</Label>
              <Input id="oxygenSaturation" type="number" value={oxygenSaturation} onChange={(e) => setOxygenSaturation(e.target.value)} placeholder="98" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" />
            </div>
          </div>
        </div>

        {/* Clinical Notes (optional at triage) */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Clinical Notes (Optional)</h2>
          <div className="space-y-2">
            <Label htmlFor="clinicalNotes">Examination Findings & Notes</Label>
            <Textarea
              id="clinicalNotes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Document physical examination findings, history, and clinical observations..."
              rows={5}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Send size={16} />
            {isSubmitting ? "Saving..." : "Save & Send to Consultation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
