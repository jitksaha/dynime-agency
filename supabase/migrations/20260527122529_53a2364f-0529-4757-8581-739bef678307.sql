UPDATE public.blog_posts
SET slug = 'dynime-os-replaces-10-tools',
    title = 'How Dynime OS Replaces 10+ SaaS Tools for SMBs',
    tags = ARRAY['Dynime OS','SaaS','SMB','HRM','CRM'],
    content = regexp_replace(regexp_replace(content, 'Business Manager', 'OS', 'gi'), '\mDBM\M', 'Dynime OS', 'g')
WHERE slug = 'dbm-replace-10-tools';