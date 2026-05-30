-- Seed default published pages with block content
INSERT INTO public.pages (title, slug, is_published, meta_title, meta_description, content) VALUES
('Home', 'home', true,
  'Dynime — Digital Experiences That Convert',
  'Full-service digital agency specializing in web development, e-commerce, digital marketing, and business formation.',
  '[
    {"id":"h1","type":"hero","props":{"heading":"Welcome to Dynime","subtext":"We build amazing digital experiences that drive growth and innovation.","buttonText":"Get Started","buttonUrl":"/contact","bgImage":"","overlay":true,"align":"center"}},
    {"id":"h2","type":"features","props":{"heading":"Our Services","columns":3,"items":[{"title":"Web Development","description":"Custom websites and web applications built with modern technologies.","icon":"Globe"},{"title":"Digital Marketing","description":"Strategic digital marketing campaigns that drive results.","icon":"Megaphone"},{"title":"Cloud Solutions","description":"Scalable cloud infrastructure and DevOps services.","icon":"Cloud"}]}},
    {"id":"h3","type":"testimonial","props":{"quote":"Dynime transformed our digital presence completely. Their team delivered beyond expectations.","author":"Happy Client","role":"CEO","avatar":""}},
    {"id":"h4","type":"cta","props":{"heading":"Ready to Get Started?","subtext":"Contact us today for a free consultation and let us help you grow.","buttonText":"Contact Us","buttonUrl":"/contact","bgColor":"primary","align":"center"}}
  ]'::jsonb),
('About', 'about', true,
  'About Dynime — Our Story & Mission',
  'Learn about Dynime, our journey, mission, and the team behind the innovation.',
  '[
    {"id":"a1","type":"hero","props":{"heading":"About Dynime","subtext":"Learn about our journey, mission, and the team behind the innovation.","buttonText":"Our Services","buttonUrl":"/services","bgImage":"","overlay":true,"align":"center"}},
    {"id":"a2","type":"paragraph","props":{"text":"Dynime is a forward-thinking digital agency dedicated to helping businesses thrive in the digital age. Founded with a vision to bridge the gap between technology and business growth, we have been delivering innovative solutions to clients across the globe.","align":"left","color":""}},
    {"id":"a3","type":"features","props":{"heading":"Why Choose Us","columns":3,"items":[{"title":"Expert Team","description":"Our team of skilled professionals brings years of experience.","icon":"Users"},{"title":"Innovation First","description":"We stay ahead with cutting-edge technologies and approaches.","icon":"Zap"},{"title":"Global Reach","description":"Serving clients across multiple countries and industries.","icon":"Globe"}]}},
    {"id":"a4","type":"quote","props":{"text":"Our mission is to empower businesses with innovative digital solutions that drive measurable results.","author":"Dynime Team","color":""}},
    {"id":"a5","type":"cta","props":{"heading":"Want to Work With Us?","subtext":"Join our growing list of satisfied clients worldwide.","buttonText":"Get In Touch","buttonUrl":"/contact","bgColor":"primary","align":"center"}}
  ]'::jsonb),
('Services', 'services', true,
  'Our Services — Web, Marketing & Cloud',
  'Comprehensive digital solutions tailored to your business needs: web development, e-commerce, marketing, and more.',
  '[
    {"id":"s1","type":"hero","props":{"heading":"Our Services","subtext":"Comprehensive digital solutions tailored to your business needs.","buttonText":"Contact Us","buttonUrl":"/contact","bgImage":"","overlay":true,"align":"center"}},
    {"id":"s2","type":"features","props":{"heading":"Web Development Services","columns":3,"items":[{"title":"Custom Websites","description":"Responsive, fast, and SEO-optimized websites.","icon":"Globe"},{"title":"E-Commerce","description":"Full-featured online stores with secure payments.","icon":"ShoppingCart"},{"title":"Web Applications","description":"Complex web apps with modern frameworks.","icon":"Code"}]}},
    {"id":"s3","type":"features","props":{"heading":"Digital Marketing","columns":3,"items":[{"title":"SEO Optimization","description":"Rank higher on search engines organically.","icon":"Search"},{"title":"Social Media","description":"Engaging social media campaigns.","icon":"Share2"},{"title":"Content Strategy","description":"Compelling content that converts.","icon":"FileText"}]}},
    {"id":"s4","type":"cta","props":{"heading":"Need a Custom Solution?","subtext":"Let us discuss how we can help your business grow.","buttonText":"Request a Quote","buttonUrl":"/contact","bgColor":"primary","align":"center"}}
  ]'::jsonb),
('Portfolio', 'portfolio', true,
  'Our Portfolio — Recent Work & Case Studies',
  'Explore our latest projects and success stories across web development, e-commerce, and digital marketing.',
  '[
    {"id":"p1","type":"hero","props":{"heading":"Our Portfolio","subtext":"Explore our latest projects and success stories.","buttonText":"Contact Us","buttonUrl":"/contact","bgImage":"","overlay":true,"align":"center"}},
    {"id":"p2","type":"paragraph","props":{"text":"We take pride in every project we deliver. Browse through our portfolio to see the diverse range of work we have done for clients across various industries.","align":"center","color":""}},
    {"id":"p3","type":"cta","props":{"heading":"Have a Project in Mind?","subtext":"Let us bring your vision to life with our expertise.","buttonText":"Start a Project","buttonUrl":"/contact","bgColor":"primary","align":"center"}}
  ]'::jsonb),
('Blog', 'blog', true,
  'Blog — Insights from the Dynime Team',
  'Insights, tips, and updates on web development, digital marketing, and technology from the Dynime team.',
  '[
    {"id":"b1","type":"hero","props":{"heading":"Our Blog","subtext":"Insights, tips, and updates from the Dynime team.","buttonText":"Contact Us","buttonUrl":"/contact","bgImage":"","overlay":true,"align":"center"}},
    {"id":"b2","type":"paragraph","props":{"text":"Stay updated with the latest trends in web development, digital marketing, and technology. Our team shares valuable insights to help you make informed decisions for your business.","align":"center","color":""}}
  ]'::jsonb),
('Shop', 'shop', true,
  'Digital Shop — Templates, Plugins & Services',
  'Premium digital products and services for your business: templates, plugins, and on-demand services.',
  '[
    {"id":"sh1","type":"hero","props":{"heading":"Digital Shop","subtext":"Premium digital products and services for your business.","buttonText":"Browse Products","buttonUrl":"#products","bgImage":"","overlay":true,"align":"center"}},
    {"id":"sh2","type":"features","props":{"heading":"Product Categories","columns":3,"items":[{"title":"Templates","description":"Professional website and app templates.","icon":"Layout"},{"title":"Plugins","description":"Powerful plugins to extend functionality.","icon":"Puzzle"},{"title":"Services","description":"On-demand professional services.","icon":"Briefcase"}]}}
  ]'::jsonb),
('Contact', 'contact', true,
  'Contact Dynime — Get in Touch',
  'Get in touch with the Dynime team. We would love to hear from you and answer your questions.',
  '[
    {"id":"c1","type":"hero","props":{"heading":"Contact Us","subtext":"Get in touch with our team. We would love to hear from you.","buttonText":"","buttonUrl":"","bgImage":"","overlay":true,"align":"center"}},
    {"id":"c2","type":"paragraph","props":{"text":"Whether you have a question about our services, pricing, or anything else, our team is ready to answer all your questions. Reach out to us and we will get back to you as soon as possible.","align":"center","color":""}},
    {"id":"c3","type":"cta","props":{"heading":"Ready to Start?","subtext":"Fill out the form or reach us directly via email or phone.","buttonText":"Send Message","buttonUrl":"#contact-form","bgColor":"primary","align":"center"}}
  ]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Add additional site settings (won't touch existing keys)
INSERT INTO public.site_settings (key, value) VALUES
('site_description', '"Full-service digital agency specializing in web development, e-commerce, digital marketing, and business formation."'),
('contact_email', '"hello@dynime.com"'),
('contact_phone', '"+1 (234) 567-890"'),
('social_facebook', '"https://facebook.com/dynime"'),
('social_twitter', '"https://twitter.com/dynime"'),
('social_instagram', '"https://instagram.com/dynime"'),
('social_linkedin', '"https://linkedin.com/company/dynime"'),
('footer_text', '"© 2026 Dynime. All rights reserved."')
ON CONFLICT (key) DO NOTHING;