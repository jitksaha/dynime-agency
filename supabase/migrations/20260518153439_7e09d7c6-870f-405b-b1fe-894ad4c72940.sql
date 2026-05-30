
INSERT INTO public.site_settings (key, value) VALUES
  ('social_facebook',  '"https://www.facebook.com/thedynime"'),
  ('social_instagram', '"https://www.instagram.com/thedynime"'),
  ('social_linkedin',  '"https://www.linkedin.com/company/thedynime"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
