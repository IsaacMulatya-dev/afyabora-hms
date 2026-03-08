import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function PatientRegistration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendToTriage, setSendToTriage] = useState(true);
  const [priority, setPriority] = useState("normal");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      // Insert patient
      const { data: patient, error } = await supabase
        .from("patients")
        .insert({
          patient_id: "TEMP",
          first_name: formData.get("firstName") as string,
          last_name: formData.get("lastName") as string,
          date_of_birth: formData.get("dob") as string,
          gender: formData.get("gender") as string,
          phone: formData.get("phone") as string,
          id_number: (formData.get("idNumber") as string) || null,
          address: (formData.get("address") as string) || null,
          city: (formData.get("city") as string) || null,
          email: (formData.get("email") as string) || null,
          emergency_contact_name: (formData.get("emergencyName") as string) || null,
          emergency_contact_phone: (formData.get("emergencyPhone") as string) || null,
          emergency_contact_relationship: (formData.get("relationship") as string) || null,
          blood_group: (formData.get("bloodGroup") as string) || null,
          insurance_provider: (formData.get("insurance") as string) || null,
          allergies: (formData.get("allergies") as string) || null,
          created_by: user.id,
        })
        .select("id, patient_id, first_name, last_name")
        .single();

      if (error) throw error;

      // Send to triage queue
      if (sendToTriage && patient) {
        await supabase.from("patient_queue").insert({
          patient_id: patient.id,
          department: "triage",
          status: "waiting",
          priority,
          sent_by: user.id,
          sent_from: "reception",
        });
      }

      toast.success("Patient registered successfully", {
        description: `${patient.first_name} ${patient.last_name} (${patient.patient_id})${sendToTriage ? " — sent to Triage" : ""}`,
      });
      navigate("/patients");
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
          <h1 className="text-2xl font-bold font-display text-foreground">Register New Patient</h1>
          <p className="text-sm text-muted-foreground">Fill in the patient's details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Info */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Personal Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" name="firstName" placeholder="Enter first name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" name="lastName" placeholder="Enter last name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input id="dob" name="dob" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select name="gender" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID / Passport Number</Label>
              <Input id="idNumber" name="idNumber" placeholder="Enter ID number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" name="phone" type="tel" placeholder="e.g. +254 712 345 678" required />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Address & Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" placeholder="Street address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City / Town</Label>
              <Input id="city" name="city" placeholder="Enter city" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="patient@email.com" />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Emergency Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergencyName">Contact Name</Label>
              <Input id="emergencyName" name="emergencyName" placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Contact Phone</Label>
              <Input id="emergencyPhone" name="emergencyPhone" type="tel" placeholder="Phone number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Select name="relationship">
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Sibling">Sibling</SelectItem>
                  <SelectItem value="Child">Child</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Medical */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Medical Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select name="bloodGroup">
                <SelectTrigger>
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="insurance">Insurance Provider</Label>
              <Input id="insurance" name="insurance" placeholder="e.g. NHIF, AAR" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="allergies">Known Allergies</Label>
              <Textarea id="allergies" name="allergies" placeholder="List any known allergies..." rows={3} />
            </div>
          </div>
        </div>

        {/* Workflow */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-card-foreground">Workflow</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Send to Triage after registration</Label>
              <Select value={sendToTriage ? "yes" : "no"} onValueChange={(v) => setSendToTriage(v === "yes")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes — Send to Triage</SelectItem>
                  <SelectItem value="no">No — Register only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sendToTriage && (
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
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save size={16} />
            {isSubmitting ? "Registering..." : "Register Patient"}
          </Button>
        </div>
      </form>
    </div>
  );
}
