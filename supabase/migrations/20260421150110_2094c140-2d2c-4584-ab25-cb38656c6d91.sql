CREATE OR REPLACE FUNCTION public.list_public_veterinarians()
RETURNS TABLE (
  id uuid,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'veterinarian'::public.app_role
    AND COALESCE(p.is_active, true) = true
  ORDER BY p.full_name;
$$;

REVOKE ALL ON FUNCTION public.list_public_veterinarians() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_veterinarians() TO authenticated;