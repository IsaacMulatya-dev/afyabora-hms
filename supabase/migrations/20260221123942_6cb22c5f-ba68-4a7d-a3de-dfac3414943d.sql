
-- Create patient_queue table for tracking patient workflow across departments
CREATE TABLE public.patient_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  consultation_id UUID REFERENCES public.consultations(id),
  department TEXT NOT NULL, -- 'triage', 'consultation', 'laboratory', 'pharmacy', 'inpatient'
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'urgent', 'emergency'
  notes TEXT,
  sent_by UUID,
  sent_from TEXT, -- which department sent the patient
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies - all authenticated staff can manage the queue
CREATE POLICY "Staff can view queue" ON public.patient_queue
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert queue" ON public.patient_queue
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update queue" ON public.patient_queue
  FOR UPDATE USING (true);

-- Index for fast lookups by department and status
CREATE INDEX idx_patient_queue_department_status ON public.patient_queue(department, status);
CREATE INDEX idx_patient_queue_patient_id ON public.patient_queue(patient_id);

-- Trigger for updated_at
CREATE TRIGGER update_patient_queue_updated_at
  BEFORE UPDATE ON public.patient_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
