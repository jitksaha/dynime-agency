
INSERT INTO public.products (name, slug, description, price, category, is_active, is_featured, sort_order) VALUES
-- DWS — Web Services
('WordPress Web Design', 'wordpress-design', 'Custom, responsive WordPress websites tailored to your brand. SEO-optimized, fast loading, mobile-first design that converts visitors into customers.', 899, 'Web Development', true, true, 1),
('Website Redesign', 'website-redesign', 'Transform your outdated website into a modern, fast, conversion-optimized site. SEO-preserved migration with 301 redirects.', 1299, 'Web Development', true, true, 2),
('WordPress Maintenance', 'wordpress-maintenance', 'Weekly updates, daily backups, malware scanning, uptime monitoring, and priority support to keep your site secure and fast.', 99, 'Web Development', true, false, 3),
('Page Speed Optimization', 'speed-optimization', 'Sub-3 second load times guaranteed. Image compression, code minification, CDN configuration, and Core Web Vitals optimization.', 499, 'Web Development', true, true, 4),
('WooCommerce Development', 'woocommerce', 'Complete WooCommerce stores with custom design, payment gateways, inventory management, and shipping integration.', 1499, 'E-Commerce', true, true, 5),
('Shopify Development', 'shopify', 'Custom Shopify themes, app integration, and conversion-optimized checkout. Launch your store in 1-2 weeks.', 1199, 'E-Commerce', true, false, 6),
('UI/UX Design', 'ui-ux-design', 'User-centered design that converts. Wireframes, prototypes, and high-fidelity designs in Figma for web and mobile apps.', 799, 'Web Development', true, false, 7),
('Custom Web Apps', 'custom-web-apps', 'Bespoke web applications built with React, Node.js, and modern stacks. Scalable architecture from MVP to enterprise.', 2999, 'Web Development', true, true, 8),

-- DMS — Marketing Services
('Social Media Management', 'social-media', 'Strategy, content creation, posting, and community management across Facebook, Instagram, LinkedIn, and TikTok.', 599, 'Marketing Tools', true, true, 9),
('Facebook & Instagram Ads', 'facebook-ads', 'Profitable Meta Ads campaigns. Audience research, creative production, A/B testing, and continuous optimization.', 699, 'Marketing Tools', true, true, 10),
('Google Ads Management', 'google-ads', 'High-ROI Google Ads campaigns. Search, Display, Shopping, and YouTube ads with conversion tracking.', 699, 'Marketing Tools', true, false, 11),
('SEO Services', 'seo', 'Rank higher on Google with technical SEO, on-page optimization, content strategy, and authority link building.', 799, 'SEO & Analytics', true, true, 12),
('Brand Strategy', 'brand-strategy', 'Build a memorable brand. Logo design, brand guidelines, voice & tone, visual identity, and brand positioning.', 1499, 'Design Assets', true, false, 13),
('Content Marketing', 'content-marketing', 'Blog posts, articles, case studies, and thought leadership content that drives traffic, engagement, and conversions.', 599, 'Marketing Tools', true, false, 14),
('Email Marketing', 'email-marketing', 'Automated email sequences, newsletters, and campaigns. Segmentation, design, copywriting, and deliverability optimization.', 499, 'Marketing Tools', true, false, 15),
('Analytics & Reporting', 'analytics', 'GA4 setup, conversion tracking, custom dashboards, and monthly insight reports to make data-driven decisions.', 399, 'SEO & Analytics', true, false, 16),

-- DCS — Consultancy Services
('US Company Formation', 'us-company', 'Form your LLC or C-Corp in the USA. EIN, registered agent, operating agreement, and business bank account setup.', 599, 'Consulting', true, true, 17),
('UK Company Formation', 'uk-company', 'Register your Limited Company in the UK in 24 hours. Companies House filing, VAT registration, and HMRC setup.', 299, 'Consulting', true, false, 18),
('US Virtual Address', 'us-address', 'Premium US business address with mail handling, scanning, and forwarding. Perfect for non-US founders.', 149, 'Consulting', true, false, 19),
('UK Virtual Address', 'uk-address', 'Professional London business address with mail forwarding. Use as registered office for Companies House.', 99, 'Consulting', true, false, 20),
('Payment Gateway Setup', 'payment-gateway', 'Stripe, PayPal, Wise, and merchant account setup for international businesses. Get paid from clients worldwide.', 399, 'Consulting', true, true, 21),
('Business Consulting', 'consulting', 'Strategic business consulting for startups and growing companies. Growth strategy, operations, and scaling guidance.', 999, 'Consulting', true, false, 22),

-- Bonus offerings
('Logo Design Package', 'logo-design', 'Professional logo design with 3 concepts, unlimited revisions, and full brand asset package (PNG, SVG, AI files).', 199, 'Design Assets', true, false, 23),
('Landing Page Template', 'landing-page-template', 'High-converting landing page template. Fully responsive, SEO-optimized, ready to customize and deploy.', 49, 'Templates', true, false, 24);
