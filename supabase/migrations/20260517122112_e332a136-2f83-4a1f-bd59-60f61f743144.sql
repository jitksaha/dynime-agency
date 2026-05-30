DO $$
DECLARE
  src jsonb;
  item jsonb;
  k text;
BEGIN
  SELECT (value #>> '{}')::jsonb -> 'team' -> 'items'
    INTO src
    FROM public.site_settings
   WHERE key = 'home_sections';

  IF src IS NULL THEN
    RAISE NOTICE 'No public team data found';
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(src)
  LOOP
    k := item->>'employeeKey';
    IF k IS NULL OR k = '' THEN CONTINUE; END IF;

    UPDATE public.employees e SET
      phone         = COALESCE(NULLIF(e.phone, ''), NULLIF(item->>'phone', '')),
      photo_url     = COALESCE(NULLIF(e.photo_url, ''), NULLIF(item->>'photoUrl', '')),
      address       = COALESCE(NULLIF(e.address, ''), NULLIF(item->>'country', '')),
      joining_date  = COALESCE(e.joining_date, NULLIF(item->>'joinedAt','')::date),
      designation   = COALESCE(NULLIF(e.designation, ''), NULLIF(item->>'role','')),
      department    = COALESCE(NULLIF(e.department, ''), NULLIF(item->>'specialty','')),
      metadata      = COALESCE(e.metadata, '{}'::jsonb)
                       || jsonb_strip_nulls(jsonb_build_object(
                            'initials', NULLIF(item->>'initials',''),
                            'color',    NULLIF(item->>'color',''),
                            'country',  NULLIF(item->>'country',''),
                            'bio',      NULLIF(item->>'bio',''),
                            'specialty',NULLIF(item->>'specialty',''),
                            'public_status', NULLIF(item->>'status',''),
                            'employee_key',  k
                          )),
      updated_at = now()
    WHERE e.team_member_key = k
       OR lower(trim(coalesce(e.email,''))) = lower(trim(coalesce(item->>'email','')));
  END LOOP;
END $$;