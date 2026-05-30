UPDATE public.investment_plans SET
  name='Revenue Sharing',
  tagline='Small investors — $500–$5,000',
  description='Performance-based revenue sharing linked to Dynime''s business growth. Paid monthly or quarterly.',
  min_amount=500, max_amount=5000,
  roi_percent=12, profit_share_percent=0,
  lock_period_days=730, payout_frequency='monthly',
  risk_level='low', tier='revenue-sharing',
  highlights='["10–15% suggested annual return","Monthly or quarterly profit share","2–3 year cycle","No equity given — you keep flexibility","Renewable at end of cycle"]'::jsonb,
  sort_order=1, is_active=true
WHERE slug='starter';

UPDATE public.investment_plans SET
  name='Annual Profit Share',
  tagline='Medium investors — $500–$10,000',
  description='Yearly distribution from company net profit. Renewable each year.',
  min_amount=500, max_amount=10000,
  roi_percent=12, profit_share_percent=0,
  lock_period_days=365, payout_frequency='yearly',
  risk_level='moderate', tier='annual-profit-share',
  highlights='["8–15% suggested annual return","One distribution per year","Renewable yearly","No ownership dilution","Priority on next-year allocation"]'::jsonb,
  sort_order=2, is_active=true, is_featured=true
WHERE slug='growth';

UPDATE public.investment_plans SET
  name='Fixed Monthly Return',
  tagline='Recurring income — $1,000–$10,000',
  description='Target monthly payout tied to recurring SaaS and services revenue.',
  min_amount=1000, max_amount=10000,
  roi_percent=17, profit_share_percent=0,
  lock_period_days=1095, payout_frequency='monthly',
  risk_level='moderate', tier='fixed-monthly',
  highlights='["14–20% target annual return","Monthly payout target","1–3 year cycle","Principal returned at end of cycle","No equity given"]'::jsonb,
  sort_order=3, is_active=true
WHERE slug='profit-share';

INSERT INTO public.investment_plans
(slug, name, tagline, description, min_amount, max_amount, currency, roi_percent, profit_share_percent, lock_period_days, payout_frequency, risk_level, tier, capacity, withdrawal_policy, highlights, is_active, is_featured, sort_order)
VALUES
('equity-partnership','Equity Partnership','Strategic investors — $10,000+',
 'Limited equity partnership for strategic investors. Equity plus dividends, long-term growth.',
 10000, NULL, 'USD', 0, 0, 3650, 'yearly', 'high', 'equity-partnership', NULL,
 'Equity is permanent and only offered to a limited number of strategic partners. Subject to founder approval and signed shareholder agreement.',
 '["Equity + dividends","Long-term growth alignment","$5K → ~1% · $10K → ~2% · $25K → 4–5% · $50K → 8–10% max","Founders cap total early-stage equity at 10–12%","Permanent partnership, signed shareholder agreement"]'::jsonb,
 true, false, 4)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, tagline=EXCLUDED.tagline, description=EXCLUDED.description,
  min_amount=EXCLUDED.min_amount, max_amount=EXCLUDED.max_amount,
  roi_percent=EXCLUDED.roi_percent, profit_share_percent=EXCLUDED.profit_share_percent,
  lock_period_days=EXCLUDED.lock_period_days, payout_frequency=EXCLUDED.payout_frequency,
  risk_level=EXCLUDED.risk_level, tier=EXCLUDED.tier,
  withdrawal_policy=EXCLUDED.withdrawal_policy, highlights=EXCLUDED.highlights,
  sort_order=EXCLUDED.sort_order, is_active=true;

INSERT INTO public.invest_settings (key, value) VALUES
('fundraising', '{
  "goal_amount": 50000,
  "currency": "USD",
  "goal_title": "Raising $50,000 to scale Dynime",
  "goal_subtitle": "Hybrid structure — revenue sharing for the public, annual profit share for members, limited equity for strategic partners.",
  "goal_uses": ["Expand Dynime OS","Improve infrastructure","Scale marketing","Hire team members","Increase recurring SaaS revenue"],
  "investor_distribution": [
    {"label":"Small Investors","amount":15000},
    {"label":"Medium Investors","amount":20000},
    {"label":"Strategic Investors","amount":15000}
  ],
  "profit_allocation": [
    {"label":"Business Growth & Development","percent":60},
    {"label":"Operational Reserve","percent":20},
    {"label":"Investor Distribution","percent":20}
  ],
  "monthly_revenue_allocation": [
    {"label":"Product Development","percent":35},
    {"label":"Marketing","percent":20},
    {"label":"Operations","percent":20},
    {"label":"Investor Distribution","percent":15},
    {"label":"Emergency Reserve","percent":10}
  ],
  "equity_structure": [
    {"amount":5000,"equity":"1%"},
    {"amount":10000,"equity":"2%"},
    {"amount":25000,"equity":"4–5%"},
    {"amount":50000,"equity":"8–10% MAX"}
  ],
  "equity_cap_note": "Dynime caps total early-stage equity at 10–12% to protect ownership and long-term value.",
  "return_targets": [
    {"risk":"Low Risk","return":"8–10%"},
    {"risk":"Medium Risk","return":"10–15%"},
    {"risk":"High Growth","return":"15–20%"}
  ],
  "phases": [
    {"name":"Phase 1","items":["Launch revenue-sharing system","Build customer base","Focus on recurring revenue"]},
    {"name":"Phase 2","items":["Improve retention and scaling","Increase monthly recurring revenue","Build investor confidence"]},
    {"name":"Phase 3","items":["Raise larger strategic funding","Expand into bigger markets","Improve company valuation"]}
  ],
  "messaging_note": "We use \"performance-based revenue sharing linked to Dynime''s business growth\" — never \"guaranteed returns\"."
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;