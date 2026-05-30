-- Server-side HTML sanitizer for careers.content_html (defense-in-depth)
CREATE OR REPLACE FUNCTION public.sanitize_html_basic(_html text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  result text := _html;
BEGIN
  IF result IS NULL THEN
    RETURN NULL;
  END IF;

  -- Remove dangerous tag blocks (with content)
  result := regexp_replace(result, '<\s*script\b[^>]*>.*?<\s*/\s*script\s*>', '', 'gis');
  result := regexp_replace(result, '<\s*style\b[^>]*>.*?<\s*/\s*style\s*>', '', 'gis');
  result := regexp_replace(result, '<\s*iframe\b[^>]*>.*?<\s*/\s*iframe\s*>', '', 'gis');
  result := regexp_replace(result, '<\s*object\b[^>]*>.*?<\s*/\s*object\s*>', '', 'gis');
  result := regexp_replace(result, '<\s*embed\b[^>]*/?>', '', 'gis');
  result := regexp_replace(result, '<\s*form\b[^>]*>.*?<\s*/\s*form\s*>', '', 'gis');

  -- Remove standalone dangerous self-closing/void tags
  result := regexp_replace(result, '<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*/?>', '', 'gi');

  -- Strip inline event handlers: on*="..." or on*='...' or on*=value
  result := regexp_replace(result, '\son[a-z]+\s*=\s*"[^"]*"', '', 'gi');
  result := regexp_replace(result, '\son[a-z]+\s*=\s*''[^'']*''', '', 'gi');
  result := regexp_replace(result, '\son[a-z]+\s*=\s*[^\s>]+', '', 'gi');

  -- Neutralize javascript:, vbscript:, data: URLs in href/src attributes
  result := regexp_replace(result, '(href|src|xlink:href)\s*=\s*"\s*(javascript|vbscript|data)\s*:[^"]*"', '\1="#"', 'gi');
  result := regexp_replace(result, '(href|src|xlink:href)\s*=\s*''\s*(javascript|vbscript|data)\s*:[^'']*''', '\1="#"', 'gi');

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.careers_sanitize_html()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.content_html IS NOT NULL THEN
    NEW.content_html := public.sanitize_html_basic(NEW.content_html);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_careers_sanitize_html ON public.careers;
CREATE TRIGGER trg_careers_sanitize_html
BEFORE INSERT OR UPDATE OF content_html ON public.careers
FOR EACH ROW
EXECUTE FUNCTION public.careers_sanitize_html();