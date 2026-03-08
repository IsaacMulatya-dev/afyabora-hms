import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function NewInvoice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patientId, setPatientId] = useState("");
  const [consultationId, setConsultationId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [insuranceClaim, setInsuranceClaim] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-billing"],
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
    queryKey: ["consultations-billing", patientId],
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

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || items.some((i) => !i.description || i.unit_price <= 0)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("billing").insert({
        invoice_number: invoiceNumber,
        patient_id: patientId,
        consultation_id: consultationId || null,
        total_amount: totalAmount,
        paid_amount: 0,
        status: "Unpaid",
        payment_method: paymentMethod || null,
        insurance_claim_number: insuranceClaim || null,
        items: items as any,
        created_by: user?.id || null,
      });
      if (error) throw error;
      toast.success("Invoice created successfully");
      navigate("/billing");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/billing")}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">New Invoice</h1>
          <p className="text-sm text-muted-foreground">Create a new billing invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient & Consultation */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Patient & Consultation</h2>
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
              <Label>Consultation (optional)</Label>
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

        {/* Line Items */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-card-foreground">Invoice Items</h2>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addItem}>
              <Plus size={14} /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_80px_120px_40px] items-end">
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                  <Input
                    placeholder="Service / item description"
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1">
                  {index === 0 && <Label className="text-xs text-muted-foreground">Unit Price</Label>}
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-card-foreground">KSh {totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Payment Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Insurance Claim # (optional)</Label>
              <Input
                placeholder="CLM-XXXXXX"
                value={insuranceClaim}
                onChange={(e) => setInsuranceClaim(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/billing")}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}
