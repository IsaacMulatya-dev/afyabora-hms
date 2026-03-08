import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BedDouble, LogOut, ArrowRightLeft, Clock, CheckCircle2 } from "lucide-react";
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

const WARDS = [
  "General Ward", "Male Ward", "Female Ward", "Pediatric Ward",
  "Maternity Ward", "Surgical Ward", "ICU", "HDU", "Emergency Ward", "Private Ward",
];

const statusColors: Record<string, string> = {
  Admitted: "bg-info/10 text-info",
  Discharged: "bg-success/10 text-success",
  Transferred: "bg-warning/10 text-warning",
};

export default function InpatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [transferWard, setTransferWard] = useState("");
  const [transferBed, setTransferBed] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: record, isLoading } = useQuery({
    queryKey: ["inpatient-record", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inpatient_records")
        .select(`
          *,
          patients!inpatient_records_patient_id_fkey (patient_id, first_name, last_name, date_of_birth, gender, blood_group, allergies, phone)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["inpatient-record", id] });
    queryClient.invalidateQueries({ queryKey: ["inpatient"] });
  };

  const handleDischarge = async () => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("inpatient_records")
        .update({
          status: "Discharged",
          discharged_at: new Date().toISOString(),
          discharge_notes: dischargeNotes || null,
        })
        .eq("id", id!);
      if (error) throw error;
      toast.success("Patient discharged successfully");
      setDischargeOpen(false);
      invalidateAll();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferWard || !transferBed) {
      toast.error("Please specify ward and bed");
      return;
    }
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("inpatient_records")
        .update({
          ward: transferWard,
          bed_number: transferBed,
        })
        .eq("id", id!);
      if (error) throw error;
      toast.success(`Patient transferred to ${transferWard}, Bed ${transferBed}`);
      setTransferOpen(false);
      setTransferWard("");
      setTransferBed("");
      invalidateAll();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!record) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Record not found</div>;
  }

  const patient = record.patients as any;
  const isAdmitted = record.status === "Admitted";
  const stayDays = Math.ceil(
    (new Date(record.discharged_at || Date.now()).getTime() - new Date(record.admitted_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inpatient")}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Inpatient Record</h1>
            <p className="text-sm text-muted-foreground">{patient?.first_name} {patient?.last_name}</p>
          </div>
        </div>
        {isAdmitted && (
          <div className="flex gap-2">
            {/* Transfer Dialog */}
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowRightLeft size={16} />
                  Transfer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Patient</DialogTitle>
                  <DialogDescription>
                    Transfer <strong>{patient?.first_name} {patient?.last_name}</strong> from {record.ward}, Bed {record.bed_number}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>New Ward *</Label>
                    <Select value={transferWard} onValueChange={setTransferWard}>
                      <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                      <SelectContent>
                        {WARDS.map((w) => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>New Bed Number *</Label>
                    <Input
                      placeholder="e.g. B-05"
                      value={transferBed}
                      onChange={(e) => setTransferBed(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
                  <Button onClick={handleTransfer} disabled={isProcessing}>
                    {isProcessing ? "Transferring..." : "Confirm Transfer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Discharge Dialog */}
            <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <LogOut size={16} />
                  Discharge
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Discharge Patient</DialogTitle>
                  <DialogDescription>
                    Discharge <strong>{patient?.first_name} {patient?.last_name}</strong> from {record.ward}, Bed {record.bed_number}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label>Discharge Notes</Label>
                  <Textarea
                    value={dischargeNotes}
                    onChange={(e) => setDischargeNotes(e.target.value)}
                    placeholder="Discharge summary, instructions, follow-up..."
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDischargeOpen(false)}>Cancel</Button>
                  <Button onClick={handleDischarge} disabled={isProcessing}>
                    {isProcessing ? "Discharging..." : "Confirm Discharge"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${statusColors[record.status] || "bg-muted"}`}>
            {record.status === "Admitted" ? <BedDouble size={24} /> :
             record.status === "Discharged" ? <CheckCircle2 size={24} /> :
             <ArrowRightLeft size={24} />}
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-card-foreground">{record.status}</p>
            <p className="text-sm text-muted-foreground">
              {isAdmitted
                ? `Admitted ${stayDays} day${stayDays !== 1 ? "s" : ""} ago`
                : `Stay duration: ${stayDays} day${stayDays !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </div>

      {/* Admission Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display font-semibold text-card-foreground mb-3">Ward & Bed</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ward</span>
              <span className="font-medium text-card-foreground">{record.ward}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bed Number</span>
              <span className="font-medium text-card-foreground">{record.bed_number}</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="font-display font-semibold text-card-foreground mb-3">Timeline</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-info/10">
                <Clock size={12} className="text-info" />
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">Admitted</p>
                <p className="text-xs text-muted-foreground">{new Date(record.admitted_at).toLocaleString()}</p>
              </div>
            </div>
            {record.discharged_at && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-success/10">
                  <LogOut size={12} className="text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-card-foreground">Discharged</p>
                  <p className="text-xs text-muted-foreground">{new Date(record.discharged_at).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-3">Patient Information</h2>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
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
          <div>
            <p className="text-muted-foreground">Date of Birth</p>
            <p className="font-medium text-card-foreground">{patient?.date_of_birth || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Blood Group</p>
            <p className="font-medium text-card-foreground">{patient?.blood_group || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium text-card-foreground">{patient?.phone || "—"}</p>
          </div>
        </div>
        {patient?.allergies && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <div>
              <p className="text-xs font-medium text-destructive">Known Allergies</p>
              <p className="text-sm text-muted-foreground">{patient.allergies}</p>
            </div>
          </div>
        )}
      </div>

      {/* Discharge Notes */}
      {record.discharge_notes && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-2">
          <h2 className="font-display font-semibold text-card-foreground">Discharge Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record.discharge_notes}</p>
        </div>
      )}
    </div>
  );
}
