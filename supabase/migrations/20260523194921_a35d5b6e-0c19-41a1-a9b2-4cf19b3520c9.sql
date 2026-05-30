DELETE FROM public.service_pricing
WHERE service_slug IN (
  'web-design-development',
  'wordpress-woocommerce',
  'react-mern-apps',
  'maintenance-security'
);

DELETE FROM public.service_addons
WHERE service_slug IN (
  'web-design-development',
  'wordpress-woocommerce',
  'react-mern-apps',
  'maintenance-security'
);