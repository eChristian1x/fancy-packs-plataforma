-- Búsqueda: trigramas para tolerar errores de escritura ("sord" encuentra "sword").
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
-- Minúsculas y sin acentos, para que "ambar" encuentre "Ámbar". Sin depender de la extensión unaccent.
CREATE OR REPLACE FUNCTION fp_normalize(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT translate(lower(coalesce(t, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc')
$$;
