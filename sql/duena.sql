-- ============================================================
--  Mi Negocio Al Día — superpoderes de la dueña
--  Pegar TODO este bloque en Supabase → SQL Editor → RUN (una vez)
--
--  ¿Qué agrega?
--   · integrantes_negocio(): lista de integrantes con su correo
--     (solo puede llamarla quien ya esté en ese negocio)
--   · expulsar_miembro(): saca a alguien del negocio
--     (solo la dueña: la cuenta que creó el negocio)
--
--  No toca ningún dato existente: es solo herramientas nuevas.
-- ============================================================

create or replace function public.integrantes_negocio(p_negocio uuid)
returns table (user_id uuid, correo text, rol text, es_duena boolean)
language sql stable security definer set search_path = public, auth as $$
  select m.user_id,
         (select u.email from auth.users u where u.id = m.user_id),
         m.rol::text,
         (n.creado_por = m.user_id)
  from public.miembro m
  join public.negocio n on n.id = m.negocio_id
  where m.negocio_id = p_negocio
    and exists (select 1 from public.miembro y
                where y.user_id = auth.uid() and y.negocio_id = p_negocio);
$$;

create or replace function public.expulsar_miembro(p_negocio uuid, p_user uuid)
returns void
language sql volatile security definer set search_path = public as $$
  delete from public.miembro m
  where m.negocio_id = p_negocio
    and m.user_id = p_user
    and m.user_id <> (select n.creado_por from public.negocio n where n.id = p_negocio)
    and exists (select 1 from public.negocio n
                where n.id = p_negocio and n.creado_por = auth.uid());
$$;
