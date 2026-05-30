
-- Backfill client_name on the 8 generic consultancy entries
UPDATE public.portfolio_projects SET client_name = 'Global Trade Florida LLC'
  WHERE id = 'f7c2dc2c-8894-4b93-b5e1-e3a73418fcc3';
UPDATE public.portfolio_projects SET client_name = 'Fast Solution Global Limited'
  WHERE id = 'daecfcd4-211a-4839-8735-8635bec66fc5';
UPDATE public.portfolio_projects SET client_name = 'Meridian Banking Partners Ltd'
  WHERE id = 'fea7bc6b-c45e-49d2-a311-88a24f9fbc00';
UPDATE public.portfolio_projects SET client_name = 'Tax Filing Pro UK Ltd'
  WHERE id = 'f709f5b6-ed4b-4493-86d4-bb7c25067d4c';
UPDATE public.portfolio_projects SET client_name = 'Helix GTM Strategies LLC'
  WHERE id = '08633063-6ad8-4249-92f8-2824c2cffbda';
UPDATE public.portfolio_projects SET client_name = 'Emirates Trade License Hub FZ-LLC'
  WHERE id = '3c53a112-439a-46a8-b0d9-0300f9263644';
UPDATE public.portfolio_projects SET client_name = 'Pinnacle Pitch Advisors Ltd'
  WHERE id = '1d55d374-b75c-4020-8155-5afe40c47adf';
UPDATE public.portfolio_projects SET client_name = 'Ledgerline Bookkeeping Ltd'
  WHERE id = 'ecc7a591-03ba-485a-8796-3508bb3c0de6';

-- Insert new trust-building projects
INSERT INTO public.portfolio_projects (title, slug, category, description, client_name, technologies, alt_text, is_published, sort_order) VALUES
('US LLC Formation – Florida','us-llc-formation-florida','Consultancy','Full Florida LLC incorporation including Articles of Organization, Operating Agreement and EIN application with the IRS.','Global Trade Florida LLC',ARRAY['US LLC','Florida','EIN'],'Florida LLC formation consultancy',true,120),
('EIN Registration – IRS','ein-registration-irs','Consultancy','IRS EIN (Employer Identification Number) registration for non-US founders, including SS-4 filing and ITIN advisory.','Fast Solution Global Limited',ARRAY['EIN','IRS','ITIN'],'EIN registration with IRS',true,121),
('UK Limited Company Registration','uk-ltd-company-registration','Consultancy','Companies House Ltd registration with SIC selection, share allocation and PSC filing for international founders.','Fast Solution Global Limited',ARRAY['UK Ltd','Companies House','PSC'],'UK limited company registration',true,122),
('UK VAT Registration','uk-vat-registration','Consultancy','HMRC VAT registration and scheme advisory for UK and overseas e-commerce sellers including OSS/IOSS guidance.','Tax Filing Pro UK Ltd',ARRAY['VAT','HMRC','OSS'],'UK VAT registration service',true,123),
('Self Assessment Tax Filing','self-assessment-tax-filing','Consultancy','HMRC Self Assessment SA100 preparation and filing for directors, landlords and freelancers.','Tax Filing Pro UK Ltd',ARRAY['Self Assessment','HMRC','Tax'],'Self assessment tax filing',true,124),
('US Federal & State Tax Filing','us-federal-state-tax-filing','Consultancy','Form 1120, 5472 and state franchise tax filing for US LLCs and C-Corps owned by non-residents.','Global Trade Florida LLC',ARRAY['US Tax','1120','5472'],'US federal and state tax filing',true,125),
('Wyoming LLC + EIN Bundle','wyoming-llc-ein-bundle','Consultancy','Wyoming LLC formation with registered agent, EIN, and US business bank account introduction.','Apex Wyoming Holdings LLC',ARRAY['Wyoming LLC','EIN','Banking'],'Wyoming LLC and EIN bundle',true,126),
('Companies House Annual Confirmation','companies-house-annual-confirmation','Consultancy','Annual confirmation statement (CS01) and accounts filing for active UK limited companies.','Fast Consultancy Services Ltd',ARRAY['UK Ltd','CS01','Filing'],'Companies House annual confirmation',true,127),
('UAE Free Zone Company Setup','uae-free-zone-setup','Consultancy','IFZA / Meydan free zone company setup with visa quota, Emirates ID and corporate bank account.','Emirates Trade License Hub FZ-LLC',ARRAY['UAE','Free Zone','IFZA'],'UAE free zone company setup',true,128),
('Quarterly Bookkeeping & Year-End Accounts','quarterly-bookkeeping-year-end','Consultancy','Xero/QuickBooks bookkeeping with quarterly management reports and statutory year-end accounts.','Ledgerline Bookkeeping Ltd',ARRAY['Bookkeeping','Xero','Accounts'],'Quarterly bookkeeping and year-end accounts',true,129),

('SEO for Tax & Accounting Firm','seo-tax-accounting','Marketing','12-month SEO programme for a tax firm ranking #1 for "self assessment accountant london" and 40+ commercial keywords.','Tax Filing Pro UK Ltd',ARRAY['SEO','Local','Content'],'SEO for tax and accounting firm',true,220),
('Google Ads – Company Formation','google-ads-company-formation','Marketing','Google Search & PMax campaigns for a UK company formation agent generating 2,400 incorporations in 6 months.','Fast Solution Global Limited',ARRAY['Google Ads','PMax','Lead Gen'],'Google Ads for company formation',true,221),
('Meta Ads – US LLC for Non-Residents','meta-ads-us-llc-nonres','Marketing','Meta Ads funnel targeting global founders for US LLC + EIN package, 5.4x ROAS over 90 days.','Global Trade Florida LLC',ARRAY['Meta Ads','Funnel','DTC'],'Meta ads US LLC formation',true,222),
('LinkedIn Ads – Business Banking','linkedin-ads-business-banking','Marketing','LinkedIn ABM campaign for a multi-currency business bank introducer generating 320 SQLs per month.','Meridian Banking Partners Ltd',ARRAY['LinkedIn','ABM','Banking'],'LinkedIn ads for business banking',true,223),
('Brand & Website – Consultancy Firm','brand-website-consultancy','Marketing','Full rebrand and high-converting website for a consultancy firm, lifting lead form completion by 86%.','Fast Consultancy Services Ltd',ARRAY['Branding','Web','CRO'],'Brand and website consultancy firm',true,224),
('YouTube + Content – Tax Education','youtube-content-tax-education','Marketing','YouTube channel and blog content programme for a tax filing brand reaching 1.4M annual organic viewers.','Tax Filing Pro UK Ltd',ARRAY['YouTube','SEO','Content'],'YouTube and content for tax education',true,225);
