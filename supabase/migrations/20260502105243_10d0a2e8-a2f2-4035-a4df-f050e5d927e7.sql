ALTER TABLE public.contact_info DROP CONSTRAINT contact_info_type_check;
ALTER TABLE public.contact_info ADD CONSTRAINT contact_info_type_check
  CHECK (type = ANY (ARRAY['email'::text, 'phone'::text, 'address'::text, 'social'::text, 'whatsapp'::text]));

INSERT INTO public.contact_info (type, label, value, sort_order, is_active)
VALUES ('whatsapp', 'WhatsApp', '+8801886960503', 3, true);

UPDATE public.contact_info SET sort_order = 4 WHERE id = 'a20e03b5-d6fa-4ce8-85de-4976246e65e1';
UPDATE public.contact_info SET sort_order = 5 WHERE id = 'b2475e40-d145-4945-87f9-a0040b12e0e0';
UPDATE public.contact_info SET sort_order = 6 WHERE id = '8e53dfe8-f6e5-4ad6-9f4d-ac0579cbd9ee';