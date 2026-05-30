INSERT INTO public.site_settings (key, value) VALUES
('social_facebook', '"https://facebook.com/thedynime"'::jsonb),
('social_instagram', '"https://instagram.com/thedynime"'::jsonb),
('social_linkedin', '"https://linkedin.com/company/thedynime"'::jsonb),
('social_whatsapp', '""'::jsonb),
('social_youtube', '""'::jsonb),
('social_tiktok', '""'::jsonb),
('social_twitter', '""'::jsonb),
('social_threads', '""'::jsonb),
('social_pinterest', '""'::jsonb),
('social_github', '""'::jsonb),
('social_dribbble', '""'::jsonb),
('social_behance', '""'::jsonb),
('social_telegram', '""'::jsonb),
('social_discord', '""'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;