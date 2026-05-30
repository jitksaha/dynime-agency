-- Wipe & reseed plans
DELETE FROM public.investment_plans;
INSERT INTO public.investment_plans
  (slug, name, tagline, description, min_amount, max_amount, currency, roi_percent, profit_share_percent, lock_period_days, payout_frequency, risk_level, tier, capacity, allocated, withdrawal_policy, policy_text, highlights, is_active, is_featured, sort_order)
VALUES
  ('starter','Starter','Small investors $500–$5,000','Monthly returns of 2.5–3% plus a +1% bonus every 6 months. Principal returned after 24 months.', 500, 5000, 'USD', 30, 0, 730, 'monthly', 'low', 'standard', 250000, 0, '24-month lock-in. Principal returned at end of cycle.', 'Tier 1 — Small Investors. Monthly Return 2.5–3%. Biannual bonus +1%. Annual ROI 30–36%. Principal returned after 24 months.',
   '["Monthly payouts to your bank","+1% biannual bonus","30–36% annual ROI","Principal returned after 24 months","Renew or upgrade for next cycle"]'::jsonb,
   true, false, 1),

  ('growth','Growth','Medium investors $5,001–$25,000','Monthly returns of 3.5–5% plus a +1% bonus every 6 months. Principal returned after 24 months.', 5001, 25000, 'USD', 50, 0, 730, 'monthly', 'moderate', 'premium', 1000000, 0, '24-month lock-in. Principal returned at end of cycle.', 'Tier 2 — Medium Investors. Monthly Return 3.5–5%. Biannual bonus +1%. Annual ROI 42–60%. Principal returned after 24 months.',
   '["Higher monthly payouts (3.5–5%)","+1% biannual bonus","42–60% annual ROI","Principal returned after 24 months","Priority allocation"]'::jsonb,
   true, true, 2),

  ('profit-share','Profit Share Partnership','Partner on every sale ($1,000–$25,000)','Earn a share of revenue per industry: Web 30%, Marketing 20%, Consulting 10%. Quarterly bonus +5% every 12 months. Principal returned after 12 months.', 1000, 25000, 'USD', 25, 30, 365, 'quarterly', 'moderate', 'partner', 500000, 0, '12-month cycle. Principal returned at end of cycle.', 'Tier 3 — Profit Share Partnership. Web 30% / Marketing 20% / Consulting 10%. Quarterly bonus +5% every 12 months. Principal returned after 12 months.',
   '["Profit share on every sale","Web 30% · Marketing 20% · Consulting 10%","Quarterly +5% bonus every 12 months","Shorter 12-month principal return","Statements added to your dashboard"]'::jsonb,
   true, false, 3);

-- Reseed invest_settings
DELETE FROM public.invest_settings;
INSERT INTO public.invest_settings (key, value) VALUES
('hero', '{"eyebrow":"Dynime Technologies Limited","title":"Invest in the next chapter of Dynime Technologies","subtitle":"Back a profitable, remote-first digital studio shipping web, eCommerce, marketing and SaaS products to clients across 25+ countries. Transparent tiers. Real monthly payouts. Principal returned at end of cycle.","primary_cta":"View plans","secondary_cta":"Open investor portal","trust_line":"Registered company · Bank-verified payouts · Signed agreement on every investment"}'::jsonb),

('stats', '{"items":[
  {"label":"Active client base","value":"3 continents","sub":"USA · Europe · Asia"},
  {"label":"Avg. monthly return","value":"2.5–5%","sub":"depending on tier"},
  {"label":"Principal return","value":"12–24 months","sub":"end of cycle"},
  {"label":"Payout cadence","value":"Monthly","sub":"+ biannual bonus"}
]}'::jsonb),

('benefits', '{"items":[
  {"icon":"trending-up","title":"Real monthly payouts","body":"Returns wired to your bank every month, with bonuses every 6 months."},
  {"icon":"shield","title":"Signed agreement","body":"Every investment is backed by a signed agreement generated from your investor portal."},
  {"icon":"file-text","title":"Transparent statements","body":"Track every payout, bonus and the projected principal-return date in your dashboard."},
  {"icon":"users","title":"Profit-share option","body":"Choose Tier 3 to earn a share of revenue on every web, marketing and consulting sale."},
  {"icon":"gift","title":"Renew or upgrade","body":"At end of cycle, roll your principal into a higher tier without restarting paperwork."},
  {"icon":"vote","title":"Investor portal","body":"Sign agreements, request withdrawals and download statements — all from one place."}
]}'::jsonb),

('faq', '{"items":[
  {"q":"Who is Dynime Technologies Limited?","a":"A registered digital agency providing web development, eCommerce, digital marketing, business consulting and global company formation, with clients across the USA, Europe and Asia."},
  {"q":"How do payouts work?","a":"Returns are paid to your bank account at the end of each month. Biannual bonuses are added every 6 months. 100% of the principal is returned at the end of the 24-month cycle (12 months for the Profit Share Partnership)."},
  {"q":"What is the Profit Share Partnership?","a":"You partner on revenue: 30% on every web project, 20% on marketing retainers and 10% on consulting. We add your share to your sheet for each sale and pay out quarterly, with a +5% bonus every 12 months."},
  {"q":"How is my investment protected?","a":"Every investment is backed by a signed agreement generated from your investor portal, settled into our company bank account and tracked in your dashboard with itemised statements."},
  {"q":"Can I cancel or withdraw early?","a":"Withdrawals before the end of the cycle are reviewed case by case from the investor portal. Approved withdrawals are paid to your bank within 7–10 business days."},
  {"q":"Where is my agreement stored?","a":"Inside your investor portal under Agreements. You can re-download the signed PDF at any time."}
]}'::jsonb),

('policy', '{"html":"<p>Capital is invested via bank transfer to the Dynime Technologies Limited company account. Returns and the original principal are paid back to your verified bank account at the end of each period. We reserve the right to cancel any partnership at any time if it conflicts with our terms and conditions, including those related to partnership agreements and capital gain systems.</p>"}'::jsonb),

('calculator', '{"default_amount":10000,"default_duration_months":24,"default_plan_slug":"growth","platform_fee_percent":0,"compounding_options":["none","monthly","quarterly"]}'::jsonb),

('rules', '{"min_withdrawal":100,"withdrawal_fee_percent":0,"supported_currencies":["USD","EUR","GBP","BDT"],"support_email":"investors@dynime.com","kyc_required":true}'::jsonb),

('portal', '{"url":"/investor-portal","label":"Investor Portal","description":"Sign agreements, view statements, request withdrawals."}'::jsonb);
