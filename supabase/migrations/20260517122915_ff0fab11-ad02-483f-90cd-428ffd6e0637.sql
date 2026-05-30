UPDATE public.employees
SET    designation       = 'Head of Product',
       employee_code     = 'DTLE001021',
       team_member_key   = 'cms-mp80hobj-0mp90',
       updated_at        = now()
WHERE  id = 'f6602fbc-4df7-4cd2-8893-3bff5a960b45';

-- Make sure the id-card assignment still points to this team key
UPDATE public.id_card_assignments
SET    subject_name  = 'Jit Kumar Saha',
       subject_email = 'mail.dynime@gmail.com'
WHERE  card_id = 'DTLE001021';