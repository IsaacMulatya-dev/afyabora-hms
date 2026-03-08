import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Filter } from "lucide-react";

const statusColors: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Admitted: "bg-info/10 text-info",
  Discharged: "bg-muted text-muted-foreground",
};

export default function Patients() {
  const [search, setSearch] = useState("");

  const { data: patients = [] } = useQuery({
    queryKey: ["patients", search],
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select("id, patient_id, first_name, last_name, date_of_birth, gender, phone, status, created_at")
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,patient_id.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getAge = (dob: string) => {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Patients</h1>
          <p className="text-sm text-muted-foreground">Manage patient records and registrations</p>
        </div>
        <Link to="/patients/register">
          <Button className="gap-2">
            <UserPlus size={16} />
            Register Patient
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search patients by name, ID..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter size={16} />
          Filter
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          {patients.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {search ? "No patients found matching your search." : (
                <>No patients registered yet. <Link to="/patients/register" className="text-primary hover:underline">Register your first patient</Link>.</>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Gender</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Registered</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-card-foreground">{patient.first_name} {patient.last_name}</p>
                      <p className="text-xs text-muted-foreground">{patient.patient_id} · {getAge(patient.date_of_birth)}y</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">{patient.gender}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{patient.phone}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">{new Date(patient.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[patient.status] || ""}`}>
                        {patient.status}
                      </span>
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
