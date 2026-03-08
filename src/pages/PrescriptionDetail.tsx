import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Pill, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function PrescriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispensingNotes, setDispensingNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: prescription, isLoading } = useQuery({
    queryKey: ["prescription", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          patients!prescriptions_patient_id_fkey (patient_id, first_name, last_name, date_of_birth, gender, allergies)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleDispense = async () => {
    if (!user) return;
    setIsDispensing(true);
    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({
          dispensed: true,
          dispensed_at: new Date().toISOString(),
          dispensed_by: user.id,
          notes: dispensingNotes || prescription?.notes || null,
        })
        .eq("id", id!);
      if (error) throw error;
      toast.success("Medication dispensed successfully");
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["prescription", id] });
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDispensing(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!prescription) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Prescription not found</div>;
  }

  const patient = prescription.patients as any;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pharmacy")}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Prescription Details</h1>
            <p className="text-sm text-muted-foreground">{prescription.medication_name}</p>
          </div>
        </div>
        {!prescription.dispensed && (
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <CheckCircle2 size={16} />
                Dispense Medication
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Dispensing</DialogTitle>
                <DialogDescription>
                  You are about to dispense <strong>{prescription.medication_name}</strong> ({prescription.dosage}) to{" "}
                  <strong>{patient?.first_name} {patient?.last_name}</strong>.
                </DialogDescription>
              </DialogHeader>

              {patient?.allergies && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <AlertTriangle size={18} className="text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Patient Allergies</p>
                    <p className="text-sm text-muted-foreground">{patient.allergies}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Dispensing Notes (optional)</Label>
                <Textarea
                  value={dispensingNotes}
                  onChange={(e) => setDispensingNotes(e.target.value)}
                  placeholder="Any notes about this dispensing..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button onClick={handleDispense} disabled={isDispensing} className="gap-2">
                  <CheckCircle2 size={16} />
                  {isDispensing ? "Dispensing..." : "Confirm Dispense"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dispensing Status */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            prescription.dispensed ? "bg-success/10" : "bg-warning/10"
          }`}>
            {prescription.dispensed ? (
              <CheckCircle2 size={24} className="text-success" />
            ) : (
              <Clock size={24} className="text-warning" />
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-card-foreground">
              {prescription.dispensed ? "Dispensed" : "Awaiting Dispensing"}
            </p>
            <p className="text-sm text-muted-foreground">
              {prescription.dispensed && prescription.dispensed_at
                ? `Dispensed on ${new Date(prescription.dispensed_at).toLocaleString()}`
                : `Prescribed on ${new Date(prescription.created_at).toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>

      {/* Patient */}
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
        {patient?.allergies && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-destructive">Known Allergies</p>
              <p className="text-sm text-muted-foreground">{patient.allergies}</p>
            </div>
          </div>
        )}
      </div>

      {/* Medication Details */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-4">Medication Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-muted-foreground">Medication</p>
            <p className="font-medium text-card-foreground flex items-center gap-2">
              <Pill size={16} className="text-primary" />
              {prescription.medication_name}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Dosage</p>
            <p className="font-medium text-card-foreground">{prescription.dosage}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Frequency</p>
            <p className="font-medium text-card-foreground">{prescription.frequency}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium text-card-foreground">{prescription.duration || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Quantity</p>
            <p className="font-medium text-card-foreground">{prescription.quantity ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {prescription.notes && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-2">
          <h2 className="font-display font-semibold text-card-foreground">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{prescription.notes}</p>
        </div>
      )}
    </div>
  );
}
