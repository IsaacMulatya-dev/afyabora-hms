import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { User, Shield, Building2, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  lab_technician: "Lab Technician",
  pharmacist: "Pharmacist",
  receptionist: "Receptionist",
  billing_clerk: "Billing Clerk",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive",
  doctor: "bg-primary/10 text-primary",
  nurse: "bg-info/10 text-info",
  lab_technician: "bg-warning/10 text-warning",
  pharmacist: "bg-success/10 text-success",
  receptionist: "bg-accent/10 text-accent",
  billing_clerk: "bg-muted text-muted-foreground",
};

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Current user profile
  const { data: profile } = useQuery({
    queryKey: ["settings-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Current user role
  const { data: currentUserRole } = useQuery({
    queryKey: ["settings-user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data?.role as AppRole;
    },
    enabled: !!user,
  });

  const isAdmin = currentUserRole === "admin";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, roles, and system preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User size={16} className="mr-1.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield size={16} className="mr-1.5" /> User Roles
          </TabsTrigger>
          <TabsTrigger value="hospital">
            <Building2 size={16} className="mr-1.5" /> Hospital
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab profile={profile} userId={user?.id} email={user?.email} />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab isAdmin={isAdmin} currentUserId={user?.id} />
        </TabsContent>

        <TabsContent value="hospital">
          <HospitalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Profile Tab ─── */
function ProfileTab({
  profile,
  userId,
  email,
}: {
  profile: any;
  userId?: string;
  email?: string;
}) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setDepartment(profile.department || "");
    setInitialized(true);
  }

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone, department })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your Profile</CardTitle>
        <CardDescription>Update your personal information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate();
          }}
          className="grid gap-4 max-w-lg"
        >
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email ?? ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 700 000 000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. General Medicine" />
          </div>
          <Button type="submit" disabled={updateProfile.isPending} className="w-fit">
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Roles Tab ─── */
function RolesTab({ isAdmin, currentUserId }: { isAdmin: boolean; currentUserId?: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; name: string; currentRole: AppRole } | null>(null);
  const [newRole, setNewRole] = useState<AppRole | "">("");

  const { data: users = [] } = useQuery({
    queryKey: ["settings-all-users", search],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, department, phone")
        .order("full_name");

      if (search) {
        query = query.ilike("full_name", `%${search}%`);
      }

      const { data: profiles, error } = await query.limit(50);
      if (error) throw error;

      // Fetch roles for all users
      const userIds = (profiles ?? []).map((p) => p.user_id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap: Record<string, AppRole> = {};
      (roles ?? []).forEach((r) => {
        roleMap[r.user_id] = r.role as AppRole;
      });

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap[p.user_id] || ("receptionist" as AppRole),
      }));
    },
    enabled: true,
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if role record exists
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-all-users"] });
      queryClient.invalidateQueries({ queryKey: ["settings-user-role"] });
      setChangeRoleOpen(false);
      setSelectedUser(null);
      toast.success("Role updated successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">User Role Management</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Manage user roles and permissions."
                : "View staff roles. Admin access required to modify."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{u.department || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={ROLE_COLORS[u.role]}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={u.user_id === currentUserId}
                          onClick={() => {
                            setSelectedUser({ userId: u.user_id, name: u.full_name, currentRole: u.role });
                            setNewRole(u.role);
                            setChangeRoleOpen(true);
                          }}
                        >
                          Change Role
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Change Role Dialog */}
        <Dialog open={changeRoleOpen} onOpenChange={setChangeRoleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Update the role for <strong>{selectedUser?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Current Role</Label>
                <Badge variant="secondary" className={selectedUser ? ROLE_COLORS[selectedUser.currentRole] : ""}>
                  {selectedUser ? ROLE_LABELS[selectedUser.currentRole] : ""}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>New Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChangeRoleOpen(false)}>Cancel</Button>
              <Button
                disabled={!newRole || newRole === selectedUser?.currentRole || updateRole.isPending}
                onClick={() => {
                  if (selectedUser && newRole) {
                    updateRole.mutate({ userId: selectedUser.userId, role: newRole as AppRole });
                  }
                }}
              >
                {updateRole.isPending ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ─── Hospital Tab ─── */
function HospitalTab() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hospital Information</CardTitle>
          <CardDescription>General hospital details and configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Hospital Name</Label>
            <Input value="AfyaBora Hospital" disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input value="admin@afyabora.hospital" disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value="+254 700 000 000" disabled className="bg-muted" />
          </div>
          <p className="text-xs text-muted-foreground">
            Contact your system administrator to update hospital details.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Configuration</CardTitle>
          <CardDescription>Operational preferences and defaults.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value="KES (Kenyan Shilling)" disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value="Africa/Nairobi (EAT, UTC+3)" disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Patient ID Format</Label>
            <Input value="P-XXXXX (auto-generated)" disabled className="bg-muted" />
          </div>
          <p className="text-xs text-muted-foreground">
            System configurations are managed at the infrastructure level.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
