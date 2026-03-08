import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const testCategories = [
  "Hematology",
  "Biochemistry",
  "Microbiology",
  "Serology",
  "Urinalysis",
  "Parasitology",
  "Histopathology",
  "Immunology",
  "Other",
];

const sampleTypes = [
  "Blood",
  "Urine",
  "Stool",
  "Sputum",
  "Swab",
  "CSF",
  "Tissue",
  "Other",
];

export default function NewLabTest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [patientId, setPatientId] = useState("");
  const [consultationId, setConsultationId] = useState("");
  const [testName, setTestName] = useState("");
  const [testCategory, setTestCategory] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [notes, setNotes] = useState("");

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

  const { data: consultations = [] } = useQuery({
    queryKey: ["consultations-for-patient", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from("consultations")
        .select("id, consultation_date, status, diagnosis")
        .eq("patient_id", patientId)
        .order("consultation_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !testName || !user) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("lab_results").insert({
        patient_id: patientId,
        consultation_id: consultationId || null,
        test_name: testName,
        test_category: testCategory || null,
        sample_type: sampleType || null,
        reference_range: referenceRange || null,
        requested_by: user.id,
        status: "Requested",
      });

      if (error) throw error;
      toast.success("Lab test requested successfully");
      navigate("/laboratory");
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
          <h1 className="text-2xl font-bold font-display text-foreground">New Lab Test Request</h1>
          <p className="text-sm text-muted-foreground">Request a laboratory test for a patient</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient & Consultation */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Patient & Consultation</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Select Patient *</Label>
              <Select value={patientId} onValueChange={(v) => { setPatientId(v); setConsultationId(""); }} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.patient_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {patientId && consultations.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Link to Consultation (optional)</Label>
                <Select value={consultationId} onValueChange={setConsultationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select consultation" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultations.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {new Date(c.consultation_date).toLocaleDateString()} — {c.diagnosis || c.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Test Details */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Test Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="testName">Test Name *</Label>
              <Input
                id="testName"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Complete Blood Count, Malaria RDT, Urinalysis..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Test Category</Label>
              <Select value={testCategory} onValueChange={setTestCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {testCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sample Type</Label>
              <Select value={sampleType} onValueChange={setSampleType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sample type" />
                </SelectTrigger>
                <SelectContent>
                  {sampleTypes.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="referenceRange">Reference Range</Label>
              <Input
                id="referenceRange"
                value={referenceRange}
                onChange={(e) => setReferenceRange(e.target.value)}
                placeholder="e.g. 4.0-11.0 x10⁹/L"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save size={16} />
            {isSubmitting ? "Submitting..." : "Request Test"}
          </Button>
        </div>
      </form>
    </div>
  );
}
