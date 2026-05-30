INSERT INTO public.form_templates (slug, name, description, fields, is_active)
VALUES (
  'services-lead',
  'Services Lead Capture',
  'Lead capture form on the /services page',
  '[
    {"name":"name","label":"Full name","type":"text","required":true},
    {"name":"email","label":"Email","type":"email","required":true},
    {"name":"budget","label":"Budget","type":"select","required":true},
    {"name":"service","label":"Service","type":"select","required":true},
    {"name":"message","label":"Project notes","type":"textarea","required":false}
  ]'::jsonb,
  true
)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      fields = EXCLUDED.fields,
      is_active = true,
      updated_at = now();