import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Plus, Receipt, CheckCircle2, Clock, AlertCircle, DollarSign } from "lucide-react";

const statusColors: Record<string, string> = {
  Unpaid: "bg-warning/10 text-warning",
  "Partially Paid": "bg-info/10 text-info",
  Paid: "bg-success/10 text-success",
  Cancelled: "bg-destructive/10 text-destructive",
};

const statusIcons: Record<string, React.ReactNode> = {
  Unpaid: <Clock size={12} />,
  "Partially Paid": <AlertCircle size={12} />,
  Paid: <CheckCircle2 size={12} />,
  Cancelled: <AlertCircle size={12} />,
};

export default function Billing() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [] } = useQuery({
    queryKey: ["billing", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("billing")
        .select(`
          id, invoice_number, total_amount, paid_amount, status, payment_method, created_at,
          patients!billing_patient_id_fkey (patient_id, first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (search.trim()) {
        const s = search.toLowerCase();
        return (data ?? []).filter((r: any) =>
          r.invoice_number?.toLowerCase().includes(s) ||
          r.patients?.first_name?.toLowerCase().includes(s) ||
          r.patients?.last_name?.toLowerCase().includes(s) ||
          r.patients?.patient_id?.toLowerCase().includes(s)
        );
      }
      return data ?? [];
    },
  });

  const totalRevenue = invoices.reduce((sum: number, i: any) => sum + Number(i.paid_amount || 0), 0);
  const totalOutstanding = invoices.reduce((sum: number, i: any) => {
    if (i.status === "Cancelled") return sum;
    return sum + (Number(i.total_amount || 0) - Number(i.paid_amount || 0));
  }, 0);
  const unpaidCount = invoices.filter((i: any) => i.status === "Unpaid" || i.status === "Partially Paid").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground">Generate invoices, process payments, and manage billing history</p>
        </div>
        <Link to="/billing/new">
          <Button className="gap-2">
            <Plus size={16} />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <DollarSign size={20} className="text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">KSh {totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Collected</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
            <Clock size={20} className="text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">KSh {totalOutstanding.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertCircle size={20} className="text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{unpaidCount}</p>
            <p className="text-xs text-muted-foreground">Pending Invoices</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-card flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Receipt size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-card-foreground">{invoices.length}</p>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or patient..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter size={16} className="mr-2 text-muted-foreground" />
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            <SelectItem value="Unpaid">Unpaid</SelectItem>
            <SelectItem value="Partially Paid">Partially Paid</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          {invoices.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              <Receipt size={32} className="mx-auto mb-3 text-muted-foreground/50" />
              {search || statusFilter !== "all"
                ? "No invoices match your filters."
                : "No invoices yet. Create your first invoice to get started."}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-card-foreground">{inv.invoice_number}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-card-foreground">
                        {inv.patients?.first_name} {inv.patients?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{inv.patients?.patient_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-card-foreground hidden md:table-cell">
                      KSh {Number(inv.total_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-card-foreground hidden md:table-cell">
                      KSh {Number(inv.paid_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[inv.status] || "bg-muted text-muted-foreground"}`}>
                        {statusIcons[inv.status]}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/billing/${inv.id}`}>
                        <Button variant="ghost" size="sm" className="text-primary">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
