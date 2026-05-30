
-- Deactivate all existing careers; new list will be re-activated below
UPDATE public.careers SET is_active = false, is_featured = false;

-- Upsert the new 20 positions
INSERT INTO public.careers (slug, title, department, employment_type, location, experience_level, vacancies, is_active, is_featured, sort_order, description, apply_url, responsibilities, requirements)
VALUES
  ('growth-revenue-lead', 'Growth & Revenue Lead', 'Leadership & Operations', 'Full-time', 'Remote', 'Senior', 1, true, true, 1,
    'Own top-line growth across marketing, sales and partnerships. Build and execute the revenue strategy, set targets, and lead cross-functional teams to hit them.',
    '/careers/growth-revenue-lead',
    '["Define and execute the company-wide growth and revenue strategy","Set KPIs and forecasts for sales, marketing and partnerships","Lead pipeline reviews and revenue operations cadence","Identify new revenue streams and pricing opportunities"]'::jsonb,
    '["5+ years in growth, revenue or GTM leadership","Proven track record hitting multi-million ARR targets","Strong analytical and forecasting skills","Excellent leadership and stakeholder management"]'::jsonb),

  ('operations-project-manager', 'Operations & Project Manager', 'Leadership & Operations', 'Full-time', 'Remote', 'Mid-Senior', 1, true, true, 2,
    'Run day-to-day operations and deliver cross-team projects on time. Build SOPs, dashboards and rituals that scale the company.',
    '/careers/operations-project-manager',
    '["Plan, track and deliver projects across departments","Build SOPs, dashboards and reporting cadence","Coordinate hiring, vendors and internal tooling","Drive operational efficiency and process improvements"]'::jsonb,
    '["3+ years in operations or project management","PMP / Agile / Scrum knowledge a plus","Strong organization and communication skills","Comfortable with tools like Notion, ClickUp, Linear"]'::jsonb),

  ('crm-automation-specialist', 'CRM & Automation Specialist', 'Leadership & Operations', 'Full-time', 'Remote', 'Mid', 1, true, false, 3,
    'Design and run our CRM, marketing automation and internal workflows. Connect tools, build playbooks, and automate repetitive work.',
    '/careers/crm-automation-specialist',
    '["Administer CRM (HubSpot/Salesforce/Pipedrive)","Build lifecycle, lead-scoring and nurture automations","Integrate tools via Zapier/Make/n8n and webhooks","Maintain data hygiene and reporting"]'::jsonb,
    '["2+ years CRM administration experience","Hands-on with marketing automation platforms","Basic SQL and API integration knowledge","Detail-oriented with strong documentation habits"]'::jsonb),

  ('sales-closer-bde', 'Sales Closer / Business Development Executive', 'Sales & Business Development', 'Full-time', 'Remote', 'Mid', 2, true, true, 4,
    'Own the closing motion on qualified opportunities. Run discovery calls, demos and negotiations to convert pipeline into revenue.',
    '/careers/sales-closer-bde',
    '["Run discovery, demo and closing calls","Manage pipeline in CRM with accurate forecasting","Negotiate proposals and contracts","Hit monthly and quarterly quota"]'::jsonb,
    '["2+ years B2B closing experience","Strong consultative selling skills","Excellent English communication","Track record of exceeding quota"]'::jsonb),

  ('sdr-lead-generation', 'SDR / Lead Generation Executive', 'Sales & Business Development', 'Full-time', 'Remote', 'Entry-Mid', 2, true, false, 5,
    'Build top of funnel through outbound prospecting, qualification and meeting booking for the closing team.',
    '/careers/sdr-lead-generation',
    '["Prospect via email, LinkedIn and calls","Qualify inbound and outbound leads","Book qualified meetings for AEs","Keep CRM clean and up to date"]'::jsonb,
    '["1+ year SDR/BDR experience preferred","Comfortable with cold outreach","Familiar with Apollo, LinkedIn Sales Nav, HubSpot","Resilient and target-driven"]'::jsonb),

  ('partnership-outreach-executive', 'Partnership & Outreach Executive', 'Sales & Business Development', 'Full-time', 'Remote', 'Mid', 1, true, false, 6,
    'Develop strategic partnerships, referral networks and co-marketing opportunities to expand reach.',
    '/careers/partnership-outreach-executive',
    '["Identify and pitch potential partners","Run referral and affiliate programs","Co-create marketing and joint events","Track partner performance and ROI"]'::jsonb,
    '["2+ years in partnerships or BD","Strong networker and relationship builder","Excellent written and verbal communication","Experience in SaaS or services preferred"]'::jsonb),

  ('international-sales-executive', 'International Sales Executive', 'Sales & Business Development', 'Full-time', 'Remote', 'Mid-Senior', 1, true, false, 7,
    'Drive sales in international markets (US, EU, MENA, APAC). Localize messaging and adapt sales motion per region.',
    '/careers/international-sales-executive',
    '["Own a global territory and quota","Localize pitch for regional buyers","Manage time-zone-spanning pipeline","Partner with marketing on regional campaigns"]'::jsonb,
    '["3+ years international B2B sales","Multilingual a plus","Strong cultural awareness","Self-driven and remote-ready"]'::jsonb),

  ('performance-marketer', 'Performance Marketer', 'Marketing & Growth', 'Full-time', 'Remote', 'Mid', 1, true, true, 8,
    'Plan, launch and optimize paid acquisition across Google, Meta, LinkedIn and beyond to hit CAC and ROAS targets.',
    '/careers/performance-marketer',
    '["Run paid campaigns across major channels","Manage budgets and bidding","A/B test creatives and landing pages","Report on CAC, ROAS and LTV"]'::jsonb,
    '["3+ years paid media experience","Hands-on with GA4, Meta and Google Ads","Strong analytics and Excel/SQL skills","Experience scaling SaaS or e-commerce a plus"]'::jsonb),

  ('content-seo-specialist', 'Content & SEO Specialist', 'Marketing & Growth', 'Full-time', 'Remote', 'Mid', 1, true, false, 9,
    'Own organic growth through content strategy, on-page SEO and topical authority. Drive qualified organic traffic.',
    '/careers/content-seo-specialist',
    '["Run keyword and topic research","Brief and publish high-quality articles","Own on-page and technical SEO","Track rankings, traffic and conversions"]'::jsonb,
    '["2+ years SEO/content marketing","Strong English writing/editing skills","Hands-on with Ahrefs/SEMrush/GSC","Knowledge of schema and Core Web Vitals"]'::jsonb),

  ('social-media-brand-executive', 'Social Media & Brand Executive', 'Marketing & Growth', 'Full-time', 'Remote', 'Mid', 1, true, false, 10,
    'Build the brand on social. Plan calendars, publish, engage and grow community across LinkedIn, Instagram, X and YouTube.',
    '/careers/social-media-brand-executive',
    '["Own social content calendar","Write copy and brief creatives","Engage community and DMs","Report on reach, engagement and growth"]'::jsonb,
    '["2+ years managing brand social accounts","Strong copywriting","Sense of design and trends","Comfortable with Buffer/Later/Notion"]'::jsonb),

  ('creative-content-video-editor', 'Creative Content Creator / Video Editor', 'Marketing & Growth', 'Full-time', 'Remote', 'Mid', 1, true, false, 11,
    'Produce short-form and long-form video, motion graphics and visual content that powers our marketing engine.',
    '/careers/creative-content-video-editor',
    '["Edit reels, shorts, ads and case-study videos","Create motion graphics and thumbnails","Collaborate with marketing on storyboards","Maintain brand visual consistency"]'::jsonb,
    '["2+ years video editing experience","Strong portfolio of short-form content","Premiere Pro / After Effects / CapCut","Eye for storytelling and pacing"]'::jsonb),

  ('full-stack-developer', 'Full Stack Developer', 'Product & Technical', 'Full-time', 'Remote', 'Mid-Senior', 2, true, true, 12,
    'Build and ship features end-to-end across frontend and backend on a modern TypeScript stack.',
    '/careers/full-stack-developer',
    '["Build features across React and Node/Edge backends","Design APIs and database schemas","Write tests and ship to production","Collaborate with design and product"]'::jsonb,
    '["3+ years full-stack TypeScript","React + Node + Postgres/Supabase","Comfort with CI/CD and cloud","Strong product mindset"]'::jsonb),

  ('frontend-developer', 'Frontend Developer', 'Product & Technical', 'Full-time', 'Remote', 'Mid', 1, true, false, 13,
    'Craft polished, performant UI in React + TypeScript with a strong design sense.',
    '/careers/frontend-developer',
    '["Implement pixel-perfect UI from Figma","Optimize performance and accessibility","Collaborate with backend on APIs","Write reusable components and tests"]'::jsonb,
    '["3+ years React + TypeScript","Tailwind CSS and design-systems experience","Strong attention to detail","Understanding of Web Vitals and a11y"]'::jsonb),

  ('ui-ux-designer', 'UI/UX Designer', 'Product & Technical', 'Full-time', 'Remote', 'Mid', 1, true, false, 14,
    'Design intuitive, beautiful product and marketing experiences from research to high-fidelity delivery.',
    '/careers/ui-ux-designer',
    '["Design product flows, wireframes and prototypes","Run user research and usability tests","Maintain design system","Partner with engineering on delivery"]'::jsonb,
    '["3+ years product design","Strong Figma skills","Portfolio with shipped work","Sense for typography, color and motion"]'::jsonb),

  ('technical-support-executive', 'Technical Support Executive', 'Product & Technical', 'Full-time', 'Remote', 'Mid', 1, true, false, 15,
    'Be the technical voice helping customers troubleshoot, debug and succeed with our products and services.',
    '/careers/technical-support-executive',
    '["Resolve technical tickets with empathy and speed","Reproduce bugs and escalate to engineering","Write KB articles and tutorials","Identify product improvement opportunities"]'::jsonb,
    '["2+ years technical support","Comfort reading logs and basic code","Excellent written English","Familiar with Intercom/Zendesk/Front"]'::jsonb),

  ('qa-testing-executive', 'QA & Testing Executive', 'Product & Technical', 'Full-time', 'Remote', 'Mid', 1, true, false, 16,
    'Own product quality through manual and automated testing across web and integrations.',
    '/careers/qa-testing-executive',
    '["Design test plans and cases","Run manual regression and exploratory testing","Build automated tests (Playwright/Cypress)","File and triage bug reports"]'::jsonb,
    '["2+ years QA experience","Hands-on with at least one automation tool","Strong attention to detail","ISTQB a plus"]'::jsonb),

  ('customer-success-manager', 'Customer Success Manager', 'Customer Success', 'Full-time', 'Remote', 'Mid-Senior', 1, true, true, 17,
    'Own customer outcomes post-sale. Drive adoption, retention and expansion across a book of business.',
    '/careers/customer-success-manager',
    '["Onboard and ramp new accounts","Run QBRs and success plans","Drive renewals and upsell","Be the voice of the customer internally"]'::jsonb,
    '["3+ years CSM in SaaS or services","Strong relationship and presentation skills","Comfort with metrics: NRR, GRR, churn","Empathy and ownership mindset"]'::jsonb),

  ('client-success-account-coordinator', 'Client Success / Account Coordinator', 'Customer Success', 'Full-time', 'Remote', 'Entry-Mid', 1, true, false, 18,
    'Support CSMs and clients with day-to-day coordination, requests and reporting.',
    '/careers/client-success-account-coordinator',
    '["Coordinate client requests and deliverables","Schedule meetings and follow-ups","Maintain account notes and CRM hygiene","Prepare reports and recaps"]'::jsonb,
    '["1+ year client-facing experience","Strong organization and follow-through","Excellent written communication","Comfortable with CRM and spreadsheets"]'::jsonb),

  ('wordpress-shopify-developer', 'WordPress / Shopify Developer', 'Service Delivery', 'Full-time', 'Remote', 'Mid', 1, true, false, 19,
    'Build and maintain client websites and storefronts on WordPress and Shopify with quality and speed.',
    '/careers/wordpress-shopify-developer',
    '["Build custom WP themes and Shopify storefronts","Customize Liquid, PHP and JS as needed","Integrate plugins, apps and payment gateways","Optimize for speed, SEO and conversions"]'::jsonb,
    '["3+ years WordPress and/or Shopify dev","Strong HTML/CSS/JS, PHP or Liquid","Experience with WooCommerce a plus","Eye for design fidelity"]'::jsonb),

  ('web-project-coordinator', 'Web Project Coordinator', 'Service Delivery', 'Full-time', 'Remote', 'Mid', 1, true, false, 20,
    'Coordinate client web projects from kickoff to launch. Bridge clients, designers and developers to ship on time.',
    '/careers/web-project-coordinator',
    '["Run kickoffs, sprints and client check-ins","Manage scope, timelines and deliverables","Coordinate designers, devs and QA","Own client communication and updates"]'::jsonb,
    '["2+ years coordinating web/agency projects","Strong client communication","Familiar with Figma, WordPress/Shopify basics","Tools: ClickUp/Asana/Notion"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  department = EXCLUDED.department,
  employment_type = EXCLUDED.employment_type,
  location = EXCLUDED.location,
  experience_level = EXCLUDED.experience_level,
  vacancies = EXCLUDED.vacancies,
  is_active = true,
  is_featured = EXCLUDED.is_featured,
  sort_order = EXCLUDED.sort_order,
  description = EXCLUDED.description,
  apply_url = EXCLUDED.apply_url,
  responsibilities = EXCLUDED.responsibilities,
  requirements = EXCLUDED.requirements,
  updated_at = now();
