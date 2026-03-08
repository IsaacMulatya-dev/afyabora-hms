import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const WARDS = [
  "General Ward",
  "Male Ward",
  "Female Ward",
  "Pediatric Ward",
  "Maternity Ward",
  "Surgical Ward",
  "ICU",
  "HDU",
  "Emergency Ward",
  "Private Ward",
];

export default function NewAdmission() {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState("");
  const [consultationId, setConsultationId] = useState("");
  const [ward, setWard] = useState("");
  const [bedNumber, setBedNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-inpatient"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name")
        .eq("status", "Active")
        .order("first_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ["consultations-inpatient", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from("consultations")
        .select("id, consultation_date, diagnosis, status")
        .eq("patient_id", patientId)
        .order("consultation_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });

  // Check existing admissions for the selected ward to show occupancy
  const { data: wardBeds = [] } = useQuery({
    queryKey: ["ward-beds", ward],
    queryFn: async () => {
      if (!ward) return [];
      const { data, error } = await supabase
        .from("inpatient_records")
        .select("bed_number")
        .eq("ward", ward)
        .eq("status", "Admitted");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!ward,
  });

  const occupiedBeds = wardBeds.map((b: any) => b.bed_number);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !ward || !bedNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (occupiedBeds.includes(bedNumber)) {
      toast.error(`Bed ${bedNumber} in ${ward} is already occupied`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("inpatient_records").insert({
        patient_id: patientId,
        consultation_id: consultationId || null,
        ward,
        bed_number: bedNumber,
        status: "Admitted",
      });
      if (error) throw error;
      toast.success("Patient admitted successfully");
      navigate("/inpatient");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/inpatient")}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">New Admission</h1>
          <p className="text-sm text-muted-foreground">Admit a patient to a ward</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Patient Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patients.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linked Consultation (optional)</Label>
              <Select value={consultationId} onValueChange={setConsultationId} disabled={!patientId}>
                <SelectTrigger><SelectValue placeholder="Link consultation" /></SelectTrigger>
                <SelectContent>
                  {consultations.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {new Date(c.consultation_date).toLocaleDateString()} — {c.diagnosis || c.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Ward & Bed */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Ward & Bed Allocation</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Ward *</Label>
              <Select value={ward} onValueChange={setWard}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {WARDS.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bed Number *</Label>
              <Input
                placeholder="e.g. B-12"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
              />
            </div>
          </div>

          {ward && occupiedBeds.length > 0 && (
            <div className="rounded-lg bg-warning/5 border border-warning/20 p-3">
              <p className="text-xs font-medium text-warning mb-1">Occupied beds in {ward}:</p>
              <p className="text-sm text-muted-foreground">{occupiedBeds.join(", ")}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/inpatient")}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Admitting..." : "Admit Patient"}
          </Button>
        </div>
      </form>
    </div>
  );
}
