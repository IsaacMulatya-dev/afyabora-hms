import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Receipt, CheckCircle2, Clock, AlertCircle, DollarSign } from "lucide-react";
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

const statusColors: Record<string, string> = {
  Unpaid: "bg-warning/10 text-warning",
  "Partially Paid": "bg-info/10 text-info",
  Paid: "bg-success/10 text-success",
  Cancelled: "bg-destructive/10 text-destructive",
};

export default function BillingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["billing", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing")
        .select(`
          *,
          patients!billing_patient_id_fkey (patient_id, first_name, last_name, phone, insurance_provider)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    const newPaid = Number(invoice!.paid_amount) + amount;
    const total = Number(invoice!.total_amount);
    const newStatus = newPaid >= total ? "Paid" : "Partially Paid";

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("billing")
        .update({
          paid_amount: newPaid,
          status: newStatus,
          payment_method: paymentMethod || invoice!.payment_method,
        })
        .eq("id", id!);
      if (error) throw error;
      toast.success(`Payment of KSh ${amount.toLocaleString()} recorded`);
      setPaymentOpen(false);
      setPaymentAmount("");
      queryClient.invalidateQueries({ queryKey: ["billing", id] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    try {
      const { error } = await supabase
        .from("billing")
        .update({ status: "Cancelled" })
        .eq("id", id!);
      if (error) throw error;
      toast.success("Invoice cancelled");
      queryClient.invalidateQueries({ queryKey: ["billing", id] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  if (!invoice) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Invoice not found</div>;
  }

  const patient = invoice.patients as any;
  const lineItems = (Array.isArray(invoice.items) ? invoice.items : []) as Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
  const canPay = invoice.status !== "Paid" && invoice.status !== "Cancelled";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/billing")}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">{invoice.invoice_number}</h1>
            <p className="text-sm text-muted-foreground">Invoice Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canPay && (
            <>
              <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <DollarSign size={16} />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Outstanding balance: <strong>KSh {balance.toLocaleString()}</strong>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Payment Amount (KSh) *</Label>
                      <Input
                        type="number"
                        min={0}
                        max={balance}
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={`Max: ${balance.toLocaleString()}`}
                      />
                    </div>
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
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                    <Button onClick={handlePayment} disabled={isProcessing}>
                      {isProcessing ? "Processing..." : "Confirm Payment"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="text-destructive" onClick={handleCancel}>
                Cancel Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${statusColors[invoice.status] || "bg-muted"}`}>
            {invoice.status === "Paid" ? <CheckCircle2 size={24} /> :
             invoice.status === "Cancelled" ? <AlertCircle size={24} /> :
             <Clock size={24} />}
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-card-foreground">{invoice.status}</p>
            <p className="text-sm text-muted-foreground">
              Created on {new Date(invoice.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
          <p className="text-xl font-bold text-card-foreground">KSh {Number(invoice.total_amount).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Paid</p>
          <p className="text-xl font-bold text-success">KSh {Number(invoice.paid_amount).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
          <p className="text-xs text-muted-foreground mb-1">Balance</p>
          <p className={`text-xl font-bold ${balance > 0 ? "text-warning" : "text-success"}`}>
            KSh {balance.toLocaleString()}
          </p>
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
            <p className="text-muted-foreground">Insurance</p>
            <p className="font-medium text-card-foreground">{patient?.insurance_provider || "None"}</p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-4">Invoice Items</h2>
        {lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left text-xs font-semibold text-muted-foreground">Description</th>
                  <th className="py-2 text-right text-xs font-semibold text-muted-foreground">Qty</th>
                  <th className="py-2 text-right text-xs font-semibold text-muted-foreground">Unit Price</th>
                  <th className="py-2 text-right text-xs font-semibold text-muted-foreground">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-3 text-card-foreground">{item.description}</td>
                    <td className="py-3 text-right text-muted-foreground">{item.quantity}</td>
                    <td className="py-3 text-right text-muted-foreground">KSh {Number(item.unit_price).toLocaleString()}</td>
                    <td className="py-3 text-right font-medium text-card-foreground">
                      KSh {(item.quantity * item.unit_price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={3} className="py-3 text-right font-semibold text-card-foreground">Total</td>
                  <td className="py-3 text-right font-bold text-card-foreground">
                    KSh {Number(invoice.total_amount).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Payment Info */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display font-semibold text-card-foreground mb-3">Payment Information</h2>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-muted-foreground">Payment Method</p>
            <p className="font-medium text-card-foreground">{invoice.payment_method || "Not specified"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Insurance Claim #</p>
            <p className="font-medium text-card-foreground">{invoice.insurance_claim_number || "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
