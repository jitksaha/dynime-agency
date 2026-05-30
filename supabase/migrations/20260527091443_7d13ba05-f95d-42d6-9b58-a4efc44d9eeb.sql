
INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', '"Dynime Inc."'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO public.site_settings (key, value) VALUES
  ('registered_entities', '[
    {"label":"Main","name":"Dynime Inc.","country":"United States","license_number":"DYN-INC-00000000"},
    {"label":"UK","name":"Dynime UK Ltd.","country":"United Kingdom","license_number":"UK-00000000"},
    {"label":"BD","name":"Dynime BD Ltd.","country":"Bangladesh","license_number":"BD-00000000"}
  ]'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value) VALUES
  ('registered_entities_mask', '"true"'::jsonb)
ON CONFLICT (key) DO NOTHING;
