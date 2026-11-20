-- Fija el search_path de fp_normalize (aviso de seguridad de Supabase: function_search_path_mutable).
ALTER FUNCTION public.fp_normalize(text) SET search_path = pg_catalog;
