import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, Stethoscope, FlaskConical, Pill, BedDouble, HeartPulse } from "lucide-react";

const departments = [
  { value: "triage", label: "Triage", icon: <HeartPulse size={16} /> },
  { value: "consultation", label: "Consultation", icon: <Stethoscope size={16} /> },
  { value: "laboratory", label: "Laboratory", icon: <FlaskConical size={16} /> },
  { value: "pharmacy", label: "Pharmacy", icon: <Pill size={16} /> },
  { value: "inpatient", label: "Inpatient / Ward", icon: <BedDouble size={16} /> },
];

interface SendToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  currentDepartment: string;
  queueItemId?: string;
  consultationId?: string | null;
}

export default function SendToDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  currentDepartment,
  queueItemId,
  consultationId,
}: SendToDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [targetDept, setTargetDept] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [isSending, setIsSending] = useState(false);

  const availableDepts = departments.filter((d) => d.value !== currentDepartment);

  const handleSend = async () => {
    if (!targetDept) {
      toast.error("Please select a department");
      return;
    }

    setIsSending(true);
    try {
      // Mark current queue item as completed
      if (queueItemId) {
        await supabase
          .from("patient_queue")
          .update({ status: "completed" })
          .eq("id", queueItemId);
      }

      // Create new queue entry for target department
      const { error } = await supabase.from("patient_queue").insert({
        patient_id: patientId,
        department: targetDept,
        status: "waiting",
        priority,
        notes: notes || null,
        sent_by: user?.id || null,
        sent_from: currentDepartment,
        consultation_id: consultationId || null,
      });

      if (error) throw error;

      toast.success(`Patient sent to ${departments.find((d) => d.value === targetDept)?.label}`, {
        description: patientName,
      });

      queryClient.invalidateQueries({ queryKey: ["patient-queue"] });
      onOpenChange(false);
      setTargetDept("");
      setNotes("");
      setPriority("normal");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Send Patient</DialogTitle>
          <DialogDescription>
            Send <span className="font-medium text-foreground">{patientName}</span> to another department.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Send to Department *</Label>
            <Select value={targetDept} onValueChange={setTargetDept}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {availableDepts.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    <span className="flex items-center gap-2">
                      {d.icon}
                      {d.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for the receiving department..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
            <Send size={16} />
            {isSending ? "Sending..." : "Send Patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
