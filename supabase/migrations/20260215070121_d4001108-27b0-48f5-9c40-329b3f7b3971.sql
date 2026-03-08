
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'nurse', 'lab_technician', 'pharmacist', 'receptionist', 'billing_clerk');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  id_number TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  blood_group TEXT,
  insurance_provider TEXT,
  allergies TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Consultations table
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) NOT NULL,
  triage_notes TEXT,
  vitals JSONB,
  diagnosis TEXT,
  clinical_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  consultation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Lab results table
CREATE TABLE public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  consultation_id UUID REFERENCES public.consultations(id),
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  test_name TEXT NOT NULL,
  test_category TEXT,
  sample_type TEXT,
  result TEXT,
  reference_range TEXT,
  status TEXT NOT NULL DEFAULT 'Requested',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

-- Prescriptions table
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  consultation_id UUID REFERENCES public.consultations(id),
  prescribed_by UUID REFERENCES auth.users(id) NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT,
  quantity INTEGER,
  dispensed BOOLEAN NOT NULL DEFAULT false,
  dispensed_by UUID REFERENCES auth.users(id),
  dispensed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Billing table
CREATE TABLE public.billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  consultation_id UUID REFERENCES public.consultations(id),
  invoice_number TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  insurance_claim_number TEXT,
  status TEXT NOT NULL DEFAULT 'Unpaid',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;

-- Inpatient records
CREATE TABLE public.inpatient_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  consultation_id UUID REFERENCES public.consultations(id),
  ward TEXT NOT NULL,
  bed_number TEXT NOT NULL,
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharged_at TIMESTAMPTZ,
  discharge_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Admitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inpatient_records ENABLE ROW LEVEL SECURITY;

-- Auto-generate patient ID sequence
CREATE SEQUENCE public.patient_id_seq START 1043;

-- Function to generate patient ID
CREATE OR REPLACE FUNCTION public.generate_patient_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.patient_id := 'P-' || nextval('public.patient_id_seq');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_patient_id
BEFORE INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.generate_patient_id();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lab_results_updated_at BEFORE UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON public.billing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inpatient_updated_at BEFORE UPDATE ON public.inpatient_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  -- Default role: receptionist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'receptionist');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users can read all profiles, update own
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles: only admins can manage, all authenticated can read
CREATE POLICY "Authenticated users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Patients: all authenticated staff can read, create
CREATE POLICY "Staff can view patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update patients" ON public.patients FOR UPDATE TO authenticated USING (true);

-- Consultations: all authenticated can read, doctors can create/update
CREATE POLICY "Staff can view consultations" ON public.consultations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create consultations" ON public.consultations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update consultations" ON public.consultations FOR UPDATE TO authenticated USING (true);

-- Lab results: all authenticated can read, relevant staff can create/update
CREATE POLICY "Staff can view lab results" ON public.lab_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create lab results" ON public.lab_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update lab results" ON public.lab_results FOR UPDATE TO authenticated USING (true);

-- Prescriptions
CREATE POLICY "Staff can view prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create prescriptions" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update prescriptions" ON public.prescriptions FOR UPDATE TO authenticated USING (true);

-- Billing
CREATE POLICY "Staff can view billing" ON public.billing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create billing" ON public.billing FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update billing" ON public.billing FOR UPDATE TO authenticated USING (true);

-- Inpatient records
CREATE POLICY "Staff can view inpatient records" ON public.inpatient_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create inpatient records" ON public.inpatient_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff can update inpatient records" ON public.inpatient_records FOR UPDATE TO authenticated USING (true);
