-- get_friend_category_counts(target_user_id)
-- Retourne les compteurs de facts débloqués par catégorie pour un user donné,
-- mais UNIQUEMENT si le caller est ami accepté avec lui.
-- Contourne RLS de `collections` (qui restreint à user_id = auth.uid()) sans
-- l'ouvrir aux étrangers.

CREATE OR REPLACE FUNCTION public.get_friend_category_counts(target_user_id uuid)
RETURNS TABLE (category text, count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_friend boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF v_uid = target_user_id THEN
    -- self : retour direct
    RETURN QUERY
      SELECT c.category, COALESCE(array_length(c.facts_completed, 1), 0)
      FROM public.collections c
      WHERE c.user_id = v_uid;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.friendships
     WHERE status = 'accepted'
       AND ((user1_id = v_uid AND user2_id = target_user_id)
         OR (user2_id = v_uid AND user1_id = target_user_id))
  ) INTO v_is_friend;

  IF NOT v_is_friend THEN
    RAISE EXCEPTION 'not friends with target user';
  END IF;

  RETURN QUERY
    SELECT c.category, COALESCE(array_length(c.facts_completed, 1), 0)
    FROM public.collections c
    WHERE c.user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_category_counts(uuid) TO authenticated;
