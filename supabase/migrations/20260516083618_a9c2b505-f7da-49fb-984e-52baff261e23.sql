
ALTER TABLE public.invest_leads ADD COLUMN IF NOT EXISTS target_slug text;

INSERT INTO public.invest_settings (key, value)
VALUES (
  'targets',
  '{"items":[
    {"slug":"dynime-technologies","name":"Dynime Technologies","description":"Our flagship digital agency: web, eCommerce, marketing & consulting services.","roi_multiplier":1.0,"profit_share_multiplier":1.0,"enabled":true},
    {"slug":"dynime-os","name":"Dynime OS","description":"Our SaaS business management platform for agencies and SMBs.","roi_multiplier":1.15,"profit_share_multiplier":1.2,"enabled":true},
    {"slug":"upcoming-product","name":"Upcoming Product (Market Research)","description":"Early-stage product backed by ongoing market research. Higher upside, longer horizon.","roi_multiplier":1.35,"profit_share_multiplier":1.5,"enabled":true}
  ]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
