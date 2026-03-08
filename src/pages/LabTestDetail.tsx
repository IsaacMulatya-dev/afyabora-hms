import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, FlaskConical, Clock, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import SendToDialog from "@/components/SendToDialog";

const statusColors: Record<string, string> = {
  Requested: "bg-warning/10 text-warning",
  "Sample Collected": "bg-info/10 text-info",
  Processing: "bg-primary/10 text-primary",
  Completed: "bg-success/10 text-success",
  Cancelled: "bg-destructive/10 text-destructive",
};

const statusFlow = ["Requested", "Sample Collected", "Processing", "Completed"];

export default function LabTestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const [status, setStatus] = useState("");
  const [result, setResult] = useState("");
  const [referenceRange, setReferenceRange] = useState("");

  const { data: labTest, isLoading } = useQuery({
    queryKey: ["lab-test", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_results")
        .select(`
          *,
          patients!lab_results_patient_id_fkey (id, patient_id, first_name, last_name, date_of_birth, gender)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      setStatus(data.status);
      setResult(data.result ?? "");
      setReferenceRange(data.reference_range ?? "");
      return data;
    },
    enabled: !!id,
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const updates: any = { status, result: result || null, reference_range: referenceRange || null };
      if (status === "Completed" && labTest?.status !== "Completed") {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("lab_results").update(updates).eq("id", id!);
      if (error) throw error;

      // If completing, auto-send results back to consultation
      if (status === "Completed" && labTest?.status !== "Completed" && labTest?.consultation_id) {
        // Mark any lab queue items for this patient as completed
        await supabase
          .from("patient_queue")
          .update({ status: "completed" })
          .eq("patient_id", labTest.patient_id)
          .eq("department", "laboratory")
          .eq("status", "waiting");

        // Send patient back to consultation with lab results
        await supabase.from("patient_queue").insert({
          patient_id: labTest.patient_id,
          department: "consultation",
          status: "waiting",
          priority: "normal",
          sent_by: user?.id || null,
          sent_from: "laboratory",
          consultation_id: labTest.consultation_id,
          notes: `Lab results ready: ${labTest.test_name}. Result: ${result || "See details"}`,
        });

        toast.success("Lab test completed — results sent back to consultation");
      } else {
        toast.success("Lab test updated");
      }

      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["lab-test", id] });
      queryClient.invalidateQueries({ queryKey: ["lab-results"] });
      queryClient.invalidateQueries({ queryKey: ["patient-queue"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!labTest) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Lab test not found</div>;
  }

  const patient = labTest.patients as any;
  const currentStepIndex = statusFlow.indexOf(labTest.status);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/laboratory")}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Lab Test Details</h1>
            <p className="text-sm text-muted-foreground">{labTest.test_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setSendDialogOpen(true)}>
            <Send size={16} />
            Send To
          </Button>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>Edit / Enter Result</Button>
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

      {/* Sample Tracking Timeline */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-4">Sample Tracking</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {statusFlow.map((s, i) => {
            const isActive = i <= currentStepIndex;
            const isCurrent = s === labTest.status;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                  isCurrent ? statusColors[s] : isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  {isActive && i < currentStepIndex ? (
                    <CheckCircle2 size={14} />
                  ) : isCurrent ? (
                    <Clock size={14} />
                  ) : (
                    <FlaskConical size={14} />
                  )}
                  {s}
                </div>
                {i < statusFlow.length - 1 && (
                  <div className={`h-0.5 w-6 ${isActive && i < currentStepIndex ? "bg-success" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Patient Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-3">Patient</h2>
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
            <p className="text-muted-foreground">Gender</p>
            <p className="font-medium text-card-foreground">{patient?.gender || "—"}</p>
          </div>
        </div>
      </div>

      {/* Test Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-3">Test Information</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-muted-foreground">Test Name</p>
            <p className="font-medium text-card-foreground">{labTest.test_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Category</p>
            <p className="font-medium text-card-foreground">{labTest.test_category || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Sample Type</p>
            <p className="font-medium text-card-foreground">{labTest.sample_type || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Requested</p>
            <p className="font-medium text-card-foreground">{new Date(labTest.requested_at).toLocaleString()}</p>
          </div>
          {labTest.completed_at && (
            <div>
              <p className="text-muted-foreground">Completed</p>
              <p className="font-medium text-card-foreground">{new Date(labTest.completed_at).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Update */}
      {editing && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Update Status</h2>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Requested">Requested</SelectItem>
              <SelectItem value="Sample Collected">Sample Collected</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results Entry */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <h2 className="font-display font-semibold text-card-foreground">Results</h2>
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="result">Test Result</Label>
              <Textarea
                id="result"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="Enter the test result..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refRange">Reference Range</Label>
              <Input
                id="refRange"
                value={referenceRange}
                onChange={(e) => setReferenceRange(e.target.value)}
                placeholder="e.g. 4.0 - 11.0 x10⁹/L"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Result</p>
              <p className="font-medium text-card-foreground whitespace-pre-wrap">{labTest.result || "Pending"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reference Range</p>
              <p className="font-medium text-card-foreground">{labTest.reference_range || "—"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Send To Dialog */}
      {patient && (
        <SendToDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          currentDepartment="laboratory"
          consultationId={labTest.consultation_id}
        />
      )}
    </div>
  );
}
