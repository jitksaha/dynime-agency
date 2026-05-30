
-- Seed ~800 realistic historical orders (Jan 2019 → Apr 2026) into public.orders
-- so the Order Management page reflects the Dynime business history.
-- Idempotent: skips if any DYN-* historical invoices already exist.

DO $$
DECLARE
  existing int;
  cur_date timestamptz;
  end_date timestamptz := '2026-04-30'::timestamptz;
  i int;
  per_month int;
  svc_idx int;
  status_pick numeric;
  pick_status text;
  cur_currency text;
  base_price numeric;
  qty int;
  total_val numeric;
  client_name text;
  client_email text;
  country text;
  service_name text;
  service_cat text;
  inv_no text;
  seq int := 1;
  services text[] := ARRAY[
    'USA LLC Formation|company_formation|499',
    'UK Ltd Company Formation|company_formation|349',
    'BVI Offshore Formation|company_formation|1200',
    'Singapore Pte Ltd Setup|company_formation|899',
    'Dubai Mainland Company|company_formation|2500',
    'EIN / ITIN Registration|company_formation|199',
    'Annual Compliance Filing|company_formation|450',
    'Registered Agent (Annual)|company_formation|150',
    'Website Development - Business|web|1499',
    'Website Development - E-commerce|web|3499',
    'Custom Web Application|web|6500',
    'Mobile App Development|web|8500',
    'SEO Package (3 months)|marketing|899',
    'Google Ads Management|marketing|650',
    'Social Media Management|marketing|550',
    'Content Marketing Pack|marketing|750',
    'Stripe Account Setup|gateway|299',
    'PayPal Business Setup|gateway|199',
    'Merchant Account (High Risk)|gateway|1500',
    'Payment Gateway Integration|gateway|450',
    'Logo & Brand Identity|web|499',
    'Bookkeeping (Quarterly)|other|350',
    'Tax Filing Service|other|450',
    'Trademark Registration USA|other|699',
    'Virtual Office (Annual)|other|480'
  ];
  clients text[] := ARRAY[
    'Acme Holdings LLC|orders@acmeholdings.com|United States',
    'Bluewave Trading Ltd|finance@bluewavetrading.co.uk|United Kingdom',
    'Sunrise Tech Pte Ltd|admin@sunrisetech.sg|Singapore',
    'Falcon Logistics FZE|ops@falconlog.ae|UAE',
    'Nordic Crafts AB|hello@nordiccrafts.se|Sweden',
    'Maple Ventures Inc|billing@mapleventures.ca|Canada',
    'Tigerlily Apparel Pvt Ltd|accounts@tigerlily.in|India',
    'Kanto Trading KK|finance@kantotrading.jp|Japan',
    'Zentrum GmbH|info@zentrum.de|Germany',
    'Atlas Imports SARL|admin@atlasimports.fr|France',
    'Coral Bay Resorts Ltd|reservations@coralbay.au|Australia',
    'Pinecrest Studio|hello@pinecrest.studio|United States',
    'Velvet Bloom Cosmetics|orders@velvetbloom.com|Canada',
    'Orion Capital Partners|ops@orioncap.com|Switzerland',
    'Saffron Spice Co|sales@saffronspice.co|United Kingdom',
    'BrightPath Education|info@brightpathedu.com|United States',
    'Harborline Shipping|ops@harborline.gr|Greece',
    'Quantum Robotics SL|ventas@quantumrobotics.es|Spain',
    'Evergreen Botanicals|hello@evergreenbot.com|New Zealand',
    'Skylar Fashion House|orders@skylarfashion.com|Italy',
    'GoldenLeaf Trading LLP|director@goldenleaf.in|India',
    'NorthStar Crypto OU|info@northstarcrypto.ee|Estonia',
    'Rio Verde Imports|contato@rioverde.com.br|Brazil',
    'Manila Tech Solutions|hello@manilatech.ph|Philippines',
    'Kobenhavn Design ApS|admin@kbhdesign.dk|Denmark',
    'Lagos Digital Hub Ltd|info@lagosdigital.ng|Nigeria',
    'Cape Town Coffee Roasters|orders@capetowncoffee.za|South Africa',
    'Bangkok Boutique Co|sales@bkkboutique.co.th|Thailand',
    'Istanbul Carpet Co|export@istanbulcarpet.com.tr|Turkey',
    'Vienna Music Group GmbH|info@viennamusic.at|Austria',
    'Hanoi Crafts JSC|export@hanoicrafts.vn|Vietnam',
    'Buenos Aires Leather SA|ventas@baleather.com.ar|Argentina',
    'Reykjavik Outdoor ehf|hello@reykjavikoutdoor.is|Iceland',
    'Dubai Gold Souk Trading|sales@dubaigoldsouk.ae|UAE',
    'Mumbai SaaS Labs Pvt Ltd|founders@mumbaisaas.in|India',
    'Helsinki Game Studio Oy|biz@helsinkigame.fi|Finland'
  ];
  it text;
  parts text[];
BEGIN
  SELECT count(*) INTO existing FROM public.orders WHERE invoice_number LIKE 'DYN-%';
  IF existing > 0 THEN
    RAISE NOTICE 'Historical Dynime orders already seeded (% rows). Skipping.', existing;
    RETURN;
  END IF;

  -- Disable user triggers to avoid creating customer_services / milestones for synthetic history
  EXECUTE 'ALTER TABLE public.orders DISABLE TRIGGER USER';

  cur_date := '2019-01-01'::timestamptz;
  WHILE cur_date <= end_date LOOP
    -- Growth curve: more orders per month over time (2019: ~4, 2026: ~18)
    per_month := 4 + floor((extract(epoch from cur_date) - extract(epoch from '2019-01-01'::timestamptz))
                            / (extract(epoch from end_date) - extract(epoch from '2019-01-01'::timestamptz)) * 14)::int
                   + floor(random()*4)::int;

    FOR i IN 1..per_month LOOP
      -- pick service
      svc_idx := 1 + floor(random() * array_length(services,1))::int;
      it := services[svc_idx];
      parts := string_to_array(it, '|');
      service_name := parts[1];
      service_cat := parts[2];
      base_price := parts[3]::numeric;

      -- pick client
      it := clients[1 + floor(random() * array_length(clients,1))::int];
      parts := string_to_array(it, '|');
      client_name := parts[1];
      client_email := parts[2];
      country := parts[3];

      qty := 1 + floor(random()*2)::int;
      total_val := round((base_price * qty * (0.85 + random()*0.35))::numeric, 2);
      cur_currency := 'USD';

      -- status mix: heavy paid/completed, sprinkle pending/cancelled
      status_pick := random();
      pick_status := CASE
        WHEN status_pick < 0.55 THEN 'paid'
        WHEN status_pick < 0.80 THEN 'completed'
        WHEN status_pick < 0.90 THEN 'in_progress'
        WHEN status_pick < 0.96 THEN 'pending'
        ELSE 'cancelled'
      END;

      inv_no := 'DYN-' || to_char(cur_date, 'YYYY') || '-' || lpad(seq::text, 5, '0');
      seq := seq + 1;

      INSERT INTO public.orders (
        invoice_number, customer_email, customer_name, items, subtotal, total,
        currency, status, service_category,
        billing_address, service_brief,
        created_at, updated_at, payment_gateway
      ) VALUES (
        inv_no,
        client_email,
        client_name,
        jsonb_build_array(jsonb_build_object(
          'id', 'svc-' || svc_idx,
          'name', service_name,
          'price', round((total_val / qty)::numeric, 2),
          'quantity', qty,
          'category', service_cat
        )),
        total_val, total_val,
        cur_currency, pick_status, service_cat,
        jsonb_build_object('country', country, 'company', client_name),
        jsonb_build_object('primary_service', service_name, 'source', 'historical_seed'),
        cur_date + (floor(random()*86400*28)::int || ' seconds')::interval,
        cur_date + (floor(random()*86400*28)::int || ' seconds')::interval,
        CASE WHEN random() < 0.6 THEN 'stripe' WHEN random() < 0.85 THEN 'paypal' ELSE 'bank_transfer' END
      );
    END LOOP;

    cur_date := cur_date + interval '1 month';
  END LOOP;

  EXECUTE 'ALTER TABLE public.orders ENABLE TRIGGER USER';

  RAISE NOTICE 'Seeded % historical orders', seq - 1;
END $$;
