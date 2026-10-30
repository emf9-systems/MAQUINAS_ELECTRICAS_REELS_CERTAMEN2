-- =====================================================================
-- Certamen 2 · Máquinas Eléctricas — esquema completo de Supabase
-- Pegar COMPLETO en Supabase → SQL Editor → Run. Después pegar seed.sql.
-- Se puede volver a ejecutar sin perder datos (usa "if not exists" / "or replace").
--
-- Idea general de seguridad:
--   * Todas las tablas tienen RLS (Row Level Security) activado.
--   * Los clientes (el navegador) solo pueden LEER. Nada de monedas, cartas,
--     ventas ni intercambios se escribe directo desde el navegador.
--   * Todo lo que mueve monedas o cartas pasa por funciones RPC
--     "security definer" que validan, bloquean filas (FOR UPDATE) y hacen
--     todo dentro de una sola transacción: o se hace completo o no se hace.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Catálogo (lo llena seed.sql, generado desde js/data/catalog.js)
-- ---------------------------------------------------------------------
create table if not exists public.rarities (
  id text primary key,                       -- comun, rara, epica, legendaria, mitica
  rank integer not null unique,              -- 1 = más común
  sell_price integer not null check (sell_price > 0)   -- lo que paga el juego (bajo a propósito)
);

create table if not exists public.cards (
  id text primary key,                       -- c001, c002, …
  rarity text not null references public.rarities(id),
  active boolean not null default true       -- false = ya no sale en sobres (pero se conserva)
);

create table if not exists public.packs (
  id text primary key,
  price integer not null check (price >= 0),
  n_cards integer not null check (n_cards between 1 and 10),
  weights jsonb not null,                    -- {"comun":70,"rara":24,…}
  guaranteed text references public.rarities(id),   -- la última carta es de esta rareza o mejor
  free_only boolean not null default false   -- el sobre diario: solo con fichas gratis
);

-- ---------------------------------------------------------------------
-- 2. Jugadores
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9_.-]{3,20}$'),
  display_name text check (char_length(display_name) <= 30),
  avatar_url text check (char_length(avatar_url) <= 400),
  bio text check (char_length(bio) <= 160),
  accent text not null default '#ff6b4a' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  title text check (char_length(title) <= 40),
  favorite_card text references public.cards(id) on delete set null,
  xp bigint not null default 0 check (xp >= 0),
  level integer not null default 1,
  coins integer not null default 300 check (coins >= 0),
  free_packs integer not null default 1 check (free_packs >= 0),
  pity integer not null default 0,
  correct_total integer not null default 0,
  answered_total integer not null default 0,
  best_streak integer not null default 0,
  day_streak integer not null default 0,
  last_daily date,
  best_grade numeric(2,1) not null default 0 check (best_grade between 0 and 7),
  exams_taken integer not null default 0,
  cards_unique integer not null default 0,
  cards_total integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Progreso de estudio (lecciones vistas, ajustes, misiones): privado, cada uno el suyo.
create table if not exists public.progress (
  id uuid primary key references auth.users on delete cascade,
  save jsonb not null,
  updated_at timestamptz not null default now()
);

-- Inventario: cuántas copias tiene cada jugador de cada carta.
create table if not exists public.user_cards (
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id text not null references public.cards(id),
  qty integer not null default 0 check (qty >= 0),
  first_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- Límite diario de lo que se puede ganar estudiando (anti-trampa).
create table if not exists public.daily_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  xp integer not null default 0,
  coins integer not null default 0,
  missions integer not null default 0,
  primary key (user_id, day)
);
alter table public.daily_stats add column if not exists missions integer not null default 0;

create table if not exists public.exam_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  correct integer not null,
  total integer not null,
  seconds integer not null,
  grade numeric(2,1) not null,
  coins integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pack_openings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_id text not null references public.packs(id),
  cards text[] not null,
  paid integer not null,
  created_at timestamptz not null default now()
);

-- Libro contable de monedas: cada movimiento queda registrado.
create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Mercado
-- ---------------------------------------------------------------------
create table if not exists public.market_listings (
  id bigint generated always as identity primary key,
  seller uuid not null references public.profiles(id) on delete cascade,
  card_id text not null references public.cards(id),
  price integer not null check (price > 0 and price <= 100000),
  status text not null default 'open' check (status in ('open','sold','cancelled')),
  buyer uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists market_open_idx on public.market_listings (status, card_id, price);

create table if not exists public.trades (
  id bigint generated always as identity primary key,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  offer_cards jsonb not null default '[]',      -- [{"card":"c001","qty":1}]
  request_cards jsonb not null default '[]',
  offer_coins integer not null default 0 check (offer_coins >= 0),
  request_coins integer not null default 0 check (request_coins >= 0),
  message text check (char_length(message) <= 140),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (from_user <> to_user)
);
create index if not exists trades_to_idx on public.trades (to_user, status);
create index if not exists trades_from_idx on public.trades (from_user, status);

-- ---------------------------------------------------------------------
-- 4. RLS: todos pueden LEER lo público; nadie escribe directo.
-- ---------------------------------------------------------------------
alter table public.rarities enable row level security;
alter table public.cards enable row level security;
alter table public.packs enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.user_cards enable row level security;
alter table public.daily_stats enable row level security;
alter table public.exam_results enable row level security;
alter table public.pack_openings enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.market_listings enable row level security;
alter table public.trades enable row level security;

drop policy if exists "leer rarezas" on public.rarities;
create policy "leer rarezas" on public.rarities for select using (true);
drop policy if exists "leer cartas" on public.cards;
create policy "leer cartas" on public.cards for select using (true);
drop policy if exists "leer sobres" on public.packs;
create policy "leer sobres" on public.packs for select using (true);
drop policy if exists "perfiles publicos" on public.profiles;
create policy "perfiles publicos" on public.profiles for select using (true);
drop policy if exists "mi progreso" on public.progress;
create policy "mi progreso" on public.progress for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "colecciones publicas" on public.user_cards;
create policy "colecciones publicas" on public.user_cards for select using (true);
drop policy if exists "mis limites" on public.daily_stats;
create policy "mis limites" on public.daily_stats for select using (auth.uid() = user_id);
drop policy if exists "mis certamenes" on public.exam_results;
create policy "mis certamenes" on public.exam_results for select using (auth.uid() = user_id);
drop policy if exists "mis sobres" on public.pack_openings;
create policy "mis sobres" on public.pack_openings for select using (auth.uid() = user_id);
drop policy if exists "mis monedas" on public.coin_ledger;
create policy "mis monedas" on public.coin_ledger for select using (auth.uid() = user_id);
drop policy if exists "mercado publico" on public.market_listings;
create policy "mercado publico" on public.market_listings for select using (true);
drop policy if exists "mis intercambios" on public.trades;
create policy "mis intercambios" on public.trades for select using (auth.uid() in (from_user, to_user));

revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
-- La única escritura directa permitida: tu propio progreso de estudio (protegido por RLS).
grant insert, update on public.progress to authenticated;
revoke all on public.progress from anon;

-- ---------------------------------------------------------------------
-- 5. Utilidades internas
-- ---------------------------------------------------------------------
create or replace function public.level_for(p_xp bigint) returns integer
language sql immutable as $$
  -- Nivel n necesita 60·n·(n-1) XP acumulada (misma fórmula que js/state.js)
  select greatest(1, floor((1 + sqrt(1 + 4 * p_xp / 60.0)) / 2)::integer);
$$;

create or replace function public.today_cl() returns date
language sql stable as $$ select (now() at time zone 'America/Santiago')::date $$;

create or replace function public.me() returns uuid
language plpgsql stable as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Debes iniciar sesión' using errcode = '28000'; end if;
  return u;
end $$;

create or replace function public._coins(p_user uuid, p_delta integer, p_reason text, p_ref text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  update profiles set coins = coins + p_delta, updated_at = now()
   where id = p_user and coins + p_delta >= 0
  returning coins into v;
  if v is null then raise exception 'Monedas insuficientes' using errcode = 'P0001'; end if;
  insert into coin_ledger (user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
  return v;
end $$;

create or replace function public._give_card(p_user uuid, p_card text, p_qty integer default 1)
returns integer language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  insert into user_cards (user_id, card_id, qty) values (p_user, p_card, p_qty)
  on conflict (user_id, card_id) do update set qty = user_cards.qty + excluded.qty
  returning qty into v;
  return v;
end $$;

-- Quita p_qty copias dejando al menos p_keep (1 = solo se comercian las repetidas).
create or replace function public._take_card(p_user uuid, p_card text, p_qty integer, p_keep integer default 1)
returns void language plpgsql security definer set search_path = public as $$
begin
  update user_cards set qty = qty - p_qty
   where user_id = p_user and card_id = p_card and qty - p_qty >= p_keep;
  if not found then
    raise exception 'No tienes suficientes repetidas de %', p_card using errcode = 'P0001';
  end if;
end $$;

-- Mantiene al día los contadores de colección del perfil (para el ranking).
create or replace function public._card_stats() returns trigger
language plpgsql security definer set search_path = public as $$
declare u uuid := coalesce(new.user_id, old.user_id);
begin
  update profiles p set
    cards_unique = (select count(*) from user_cards where user_id = u and qty > 0),
    cards_total  = (select coalesce(sum(qty),0) from user_cards where user_id = u)
  where p.id = u;
  return null;
end $$;
drop trigger if exists user_cards_stats on public.user_cards;
create trigger user_cards_stats after insert or update or delete on public.user_cards
for each row execute function public._card_stats();

-- Al registrarse, se crea el perfil con el usuario elegido.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, display_name)
  values (new.id, new.raw_user_meta_data ->> 'username', new.raw_user_meta_data ->> 'username');
  insert into coin_ledger (user_id, delta, reason) values (new.id, 300, 'bienvenida');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. RPC: perfil
-- ---------------------------------------------------------------------
create or replace function public.update_profile(
  p_display_name text, p_bio text, p_accent text, p_title text, p_favorite_card text, p_avatar_url text)
returns profiles language plpgsql security definer set search_path = public as $$
declare u uuid := me(); r profiles;
begin
  if p_favorite_card is not null and not exists
     (select 1 from user_cards where user_id = u and card_id = p_favorite_card and qty > 0) then
    raise exception 'Solo puedes destacar una carta que tengas' using errcode = 'P0001';
  end if;
  -- La foto solo puede venir de TU carpeta del bucket "avatars".
  if p_avatar_url is not null and p_avatar_url !~ ('/storage/v1/object/public/avatars/' || u::text || '/') then
    raise exception 'Foto de perfil no válida' using errcode = 'P0001';
  end if;
  update profiles set
    display_name = nullif(trim(p_display_name), ''),
    bio = nullif(trim(p_bio), ''),
    accent = coalesce(p_accent, accent),
    title = nullif(trim(p_title), ''),
    favorite_card = p_favorite_card,
    avatar_url = p_avatar_url,
    updated_at = now()
  where id = u returning * into r;
  return r;
end $$;

-- Suma XP, recalcula el nivel y paga 50 monedas por cada nivel subido.
create or replace function public._add_xp(p_user uuid, p_xp integer)
returns integer language plpgsql security definer set search_path = public as $$
declare old_lv integer; new_lv integer;
begin
  select level into old_lv from profiles where id = p_user for update;
  update profiles set xp = xp + p_xp, level = level_for(xp + p_xp), updated_at = now()
   where id = p_user returning level into new_lv;
  if new_lv > old_lv then perform _coins(p_user, 50 * (new_lv - old_lv), 'subida-nivel', new_lv::text); end if;
  return new_lv;
end $$;

-- ---------------------------------------------------------------------
-- 7. RPC: recompensas por estudiar (con topes diarios)
-- ---------------------------------------------------------------------
-- El navegador junta respuestas y las manda en lotes. El servidor no puede
-- saber si cada respuesta fue correcta, así que limita cuánto se puede ganar:
-- por llamada y por día. Así un tramposo no puede inflar sin límite.
create or replace function public.grant_study(p_kind text, p_correct integer, p_answered integer, p_best_streak integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u uuid := me();
  d date := today_cl();
  per_xp integer; per_coin integer;
  gx integer; gc integer; ds daily_stats; p profiles;
begin
  if p_answered < 1 or p_answered > 30 or p_correct < 0 or p_correct > p_answered then
    raise exception 'Lote inválido' using errcode = 'P0001';
  end if;
  select case p_kind when 'mcq' then 10 when 'rush' then 12 when 'dev' then 25 when 'lesson' then 15 else 0 end,
         case p_kind when 'mcq' then 3  when 'rush' then 4  when 'dev' then 8  when 'lesson' then 5  else 0 end
    into per_xp, per_coin;
  if per_xp = 0 then raise exception 'Tipo desconocido' using errcode = 'P0001'; end if;

  insert into daily_stats (user_id, day) values (u, d) on conflict do nothing;
  select * into ds from daily_stats where user_id = u and day = d for update;
  gx := least(p_correct * per_xp + (p_answered - p_correct) * 2, greatest(0, 20000 - ds.xp));
  gc := least(p_correct * per_coin, greatest(0, 1500 - ds.coins));
  update daily_stats set xp = xp + gx, coins = coins + gc where user_id = u and day = d;

  perform _add_xp(u, gx);
  update profiles set
    correct_total = correct_total + p_correct,
    answered_total = answered_total + p_answered,
    best_streak = greatest(best_streak, least(p_best_streak, correct_total + p_correct)),
    updated_at = now()
  where id = u returning * into p;
  if gc > 0 then perform _coins(u, gc, 'estudio:' || p_kind); end if;
  return jsonb_build_object('xp', gx, 'coins', gc, 'level', p.level, 'capped', gc < p_correct * per_coin);
end $$;

-- Nota chilena con 60% de exigencia (misma fórmula que js/util.js)
create or replace function public.grade_cl(p_correct integer, p_total integer) returns numeric
language sql immutable as $$
  select round(case when p_total <= 0 then 1
    when p_correct::numeric / p_total < 0.6 then 1 + 3 * (p_correct::numeric / p_total) / 0.6
    else 4 + 3 * ((p_correct::numeric / p_total) - 0.6) / 0.4 end, 1);
$$;

create or replace function public.submit_exam(p_mode text, p_correct integer, p_total integer, p_seconds integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u uuid := me(); g numeric; c integer := 0; last timestamptz; xp_gain integer;
begin
  if p_mode not in ('alternativas','desarrollo','mini') or p_total not between 4 and 40
     or p_correct not between 0 and p_total or p_seconds < 0 then
    raise exception 'Resultado inválido' using errcode = 'P0001';
  end if;
  g := grade_cl(p_correct, p_total);
  select max(created_at) into last from exam_results where user_id = u and coins > 0;
  -- Monedas solo si el intento duró algo razonable y no se repite en ráfaga.
  if p_seconds >= p_total * 8 and (last is null or last < now() - interval '3 minutes') then
    c := round(g * 20)::integer;
  end if;
  xp_gain := p_correct * 15;
  insert into exam_results (user_id, mode, correct, total, seconds, grade, coins)
  values (u, p_mode, p_correct, p_total, p_seconds, g, c);
  update profiles set
    best_grade = case when p_mode = 'alternativas' then greatest(best_grade, g) else best_grade end,
    exams_taken = exams_taken + 1, updated_at = now()
  where id = u;
  perform _add_xp(u, xp_gain);
  if c > 0 then perform _coins(u, c, 'certamen', p_mode); end if;
  return jsonb_build_object('grade', g, 'coins', c, 'xp', xp_gain);
end $$;

-- Premio diario: monedas según la racha de días + un sobre gratis.
create or replace function public.claim_daily() returns jsonb
language plpgsql security definer set search_path = public as $$
declare u uuid := me(); d date := today_cl(); p profiles; streak integer; bonus integer;
begin
  select * into p from profiles where id = u for update;
  if p.last_daily = d then
    return jsonb_build_object('ok', false, 'streak', p.day_streak);
  end if;
  streak := case when p.last_daily = d - 1 then p.day_streak + 1 else 1 end;
  bonus := 50 + 10 * least(streak, 10);
  update profiles set last_daily = d, day_streak = streak, free_packs = least(free_packs + 1, 5), updated_at = now()
   where id = u;
  perform _coins(u, bonus, 'diario');
  return jsonb_build_object('ok', true, 'streak', streak, 'coins', bonus, 'free_packs', 1);
end $$;

-- Misiones diarias: el navegador lleva la cuenta; el servidor limita a 3 premios por día de 80 monedas máx.
create or replace function public.claim_mission(p_coins integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := me(); d date := today_cl(); ds daily_stats; v integer;
begin
  if p_coins not between 1 and 80 then raise exception 'Premio inválido' using errcode = 'P0001'; end if;
  insert into daily_stats (user_id, day) values (u, d) on conflict do nothing;
  select * into ds from daily_stats where user_id = u and day = d for update;
  if ds.missions >= 3 then raise exception 'Ya cobraste las misiones de hoy' using errcode = 'P0001'; end if;
  update daily_stats set missions = missions + 1 where user_id = u and day = d;
  v := _coins(u, p_coins, 'mision');
  return jsonb_build_object('coins', v);
end $$;

-- ---------------------------------------------------------------------
-- 8. RPC: abrir sobres (el azar ocurre en el servidor)
-- ---------------------------------------------------------------------
create or replace function public._roll_rarity(p_weights jsonb, p_min_rank integer)
returns text language plpgsql volatile set search_path = public as $$
declare total numeric := 0; r numeric; acc numeric := 0; rec record;
begin
  for rec in select ra.id, ra.rank, coalesce((p_weights ->> ra.id)::numeric, 0) w
               from rarities ra where ra.rank >= p_min_rank order by ra.rank loop
    total := total + rec.w;
  end loop;
  if total <= 0 then
    return (select id from rarities where rank >= p_min_rank order by rank limit 1);
  end if;
  r := random() * total;
  for rec in select ra.id, coalesce((p_weights ->> ra.id)::numeric, 0) w
               from rarities ra where ra.rank >= p_min_rank order by ra.rank loop
    acc := acc + rec.w;
    if r < acc then return rec.id; end if;
  end loop;
  return (select id from rarities where rank >= p_min_rank order by rank desc limit 1);
end $$;

create or replace function public.open_pack(p_pack text, p_use_free boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u uuid := me(); pk packs; p profiles; i integer; rar text; card text; q integer;
  min_rank integer; got text[] := '{}'; out jsonb := '[]'; best integer := 0; rk integer;
  leg_rank integer := (select rank from rarities where id = 'legendaria');
  pity_limit constant integer := 20;
begin
  select * into pk from packs where id = p_pack;
  if pk.id is null then raise exception 'Sobre desconocido' using errcode = 'P0001'; end if;
  select * into p from profiles where id = u for update;
  if pk.free_only or p_use_free then
    if p.free_packs < 1 then raise exception 'No tienes sobres gratis' using errcode = 'P0001'; end if;
    update profiles set free_packs = free_packs - 1 where id = u;
  else
    perform _coins(u, -pk.price, 'sobre', pk.id);
  end if;

  for i in 1 .. pk.n_cards loop
    min_rank := 1;
    if i = pk.n_cards and pk.guaranteed is not null then
      min_rank := (select rank from rarities where id = pk.guaranteed);
    end if;
    -- Pity: tras muchos sobres sin legendaria, la última carta es legendaria o mejor.
    if i = pk.n_cards and p.pity + 1 >= pity_limit then min_rank := greatest(min_rank, leg_rank); end if;
    rar := _roll_rarity(pk.weights, min_rank);
    select id into card from cards where rarity = rar and active order by random() limit 1;
    if card is null then
      select id into card from cards where active order by random() limit 1;
    end if;
    q := _give_card(u, card, 1);
    rk := (select r.rank from rarities r join cards c on c.rarity = r.id where c.id = card);
    best := greatest(best, rk);
    got := got || card;
    out := out || jsonb_build_object('card', card, 'rarity', rar, 'qty', q, 'new', q = 1);
  end loop;

  update profiles set pity = case when best >= leg_rank then 0 else pity + 1 end, updated_at = now()
   where id = u returning * into p;
  insert into pack_openings (user_id, pack_id, cards, paid)
  values (u, pk.id, got, case when pk.free_only or p_use_free then 0 else pk.price end);
  return jsonb_build_object('cards', out, 'coins', p.coins, 'free_packs', p.free_packs, 'pity', p.pity);
end $$;

-- ---------------------------------------------------------------------
-- 9. RPC: vender repetidas al juego (precio bajo y fijo)
-- ---------------------------------------------------------------------
create or replace function public.sell_to_system(p_card text, p_qty integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := me(); price integer; v integer;
begin
  if p_qty < 1 or p_qty > 99 then raise exception 'Cantidad inválida' using errcode = 'P0001'; end if;
  select r.sell_price into price from cards c join rarities r on r.id = c.rarity where c.id = p_card;
  if price is null then raise exception 'Carta desconocida' using errcode = 'P0001'; end if;
  perform _take_card(u, p_card, p_qty, 1);
  v := _coins(u, price * p_qty, 'venta-sistema', p_card);
  return jsonb_build_object('coins', v, 'earned', price * p_qty);
end $$;

-- ---------------------------------------------------------------------
-- 10. RPC: mercado entre jugadores (venta a precio libre)
-- ---------------------------------------------------------------------
-- La carta queda "en custodia" mientras está publicada: se descuenta del
-- inventario al publicar y vuelve si se cancela. Así nadie vende dos veces.
create or replace function public.create_listing(p_card text, p_price integer)
returns bigint language plpgsql security definer set search_path = public as $$
declare u uuid := me(); minp integer; lid bigint;
begin
  select r.sell_price into minp from cards c join rarities r on r.id = c.rarity where c.id = p_card;
  if minp is null then raise exception 'Carta desconocida' using errcode = 'P0001'; end if;
  if p_price < minp or p_price > 100000 then
    raise exception 'El precio debe estar entre % y 100000', minp using errcode = 'P0001';
  end if;
  if (select count(*) from market_listings where seller = u and status = 'open') >= 20 then
    raise exception 'Máximo 20 publicaciones abiertas' using errcode = 'P0001';
  end if;
  perform _take_card(u, p_card, 1, 1);
  insert into market_listings (seller, card_id, price) values (u, p_card, p_price) returning id into lid;
  return lid;
end $$;

create or replace function public.cancel_listing(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare u uuid := me(); l market_listings;
begin
  select * into l from market_listings where id = p_id for update;
  if l.id is null or l.seller <> u or l.status <> 'open' then
    raise exception 'No puedes cancelar esta publicación' using errcode = 'P0001';
  end if;
  update market_listings set status = 'cancelled', closed_at = now() where id = p_id;
  perform _give_card(u, l.card_id, 1);
end $$;

create or replace function public.buy_listing(p_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u uuid := me(); l market_listings; fee integer; v integer;
begin
  select * into l from market_listings where id = p_id for update;
  if l.id is null or l.status <> 'open' then raise exception 'Esta carta ya no está a la venta' using errcode = 'P0001'; end if;
  if l.seller = u then raise exception 'No puedes comprarte a ti mismo' using errcode = 'P0001'; end if;
  -- Bloqueo de ambos perfiles en orden fijo para evitar bloqueos cruzados.
  perform 1 from profiles where id in (u, l.seller) order by id for update;
  fee := ceil(l.price * 0.05);           -- 5% de comisión que se "quema" (evita inflación)
  v := _coins(u, -l.price, 'compra-mercado', p_id::text);
  perform _coins(l.seller, l.price - fee, 'venta-mercado', p_id::text);
  perform _give_card(u, l.card_id, 1);
  update market_listings set status = 'sold', buyer = u, closed_at = now() where id = p_id;
  return jsonb_build_object('coins', v, 'card', l.card_id);
end $$;

-- ---------------------------------------------------------------------
-- 11. RPC: intercambios (cartas y/o monedas)
-- ---------------------------------------------------------------------
create or replace function public._check_items(p jsonb) returns void
language plpgsql immutable as $$
declare e jsonb;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 6 then
    raise exception 'Lista de cartas inválida' using errcode = 'P0001';
  end if;
  for e in select * from jsonb_array_elements(p) loop
    if (e ->> 'card') is null or coalesce((e ->> 'qty')::integer, 0) not between 1 and 10 then
      raise exception 'Lista de cartas inválida' using errcode = 'P0001';
    end if;
  end loop;
end $$;

create or replace function public.create_trade(p_to uuid, p_offer jsonb, p_request jsonb,
  p_offer_coins integer default 0, p_request_coins integer default 0, p_message text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare u uuid := me(); e jsonb; tid bigint;
begin
  perform _check_items(p_offer); perform _check_items(p_request);
  if p_to = u or not exists (select 1 from profiles where id = p_to) then
    raise exception 'Destinatario inválido' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_offer) + jsonb_array_length(p_request) = 0 then
    raise exception 'El intercambio está vacío' using errcode = 'P0001';
  end if;
  if p_offer_coins not between 0 and 100000 or p_request_coins not between 0 and 100000 then
    raise exception 'Monedas fuera de rango' using errcode = 'P0001';
  end if;
  if (select count(*) from trades where from_user = u and status = 'pending') >= 10 then
    raise exception 'Máximo 10 ofertas pendientes' using errcode = 'P0001';
  end if;
  -- Custodia de lo ofrecido (cartas repetidas y monedas).
  for e in select * from jsonb_array_elements(p_offer) loop
    perform _take_card(u, e ->> 'card', (e ->> 'qty')::integer, 1);
  end loop;
  insert into trades (from_user, to_user, offer_cards, request_cards, offer_coins, request_coins, message)
  values (u, p_to, p_offer, p_request, p_offer_coins, p_request_coins, nullif(trim(p_message), ''))
  returning id into tid;
  if p_offer_coins > 0 then perform _coins(u, -p_offer_coins, 'custodia-intercambio', tid::text); end if;
  return tid;
end $$;

create or replace function public._refund_trade(t trades) returns void
language plpgsql security definer set search_path = public as $$
declare e jsonb;
begin
  for e in select * from jsonb_array_elements(t.offer_cards) loop
    perform _give_card(t.from_user, e ->> 'card', (e ->> 'qty')::integer);
  end loop;
  if t.offer_coins > 0 then perform _coins(t.from_user, t.offer_coins, 'devolucion-intercambio', t.id::text); end if;
end $$;

create or replace function public.respond_trade(p_id bigint, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare u uuid := me(); t trades; e jsonb;
begin
  select * into t from trades where id = p_id for update;
  if t.id is null or t.to_user <> u or t.status <> 'pending' then
    raise exception 'Este intercambio ya no está disponible' using errcode = 'P0001';
  end if;
  if not p_accept then
    perform _refund_trade(t);
    update trades set status = 'rejected', closed_at = now() where id = p_id;
    return 'rejected';
  end if;
  perform 1 from profiles where id in (t.from_user, t.to_user) order by id for update;
  -- Lo que pide el otro sale de tus repetidas (siempre te queda 1 copia).
  for e in select * from jsonb_array_elements(t.request_cards) loop
    perform _take_card(u, e ->> 'card', (e ->> 'qty')::integer, 1);
    perform _give_card(t.from_user, e ->> 'card', (e ->> 'qty')::integer);
  end loop;
  for e in select * from jsonb_array_elements(t.offer_cards) loop
    perform _give_card(u, e ->> 'card', (e ->> 'qty')::integer);
  end loop;
  if t.request_coins > 0 then
    perform _coins(u, -t.request_coins, 'pago-intercambio', t.id::text);
    perform _coins(t.from_user, t.request_coins, 'cobro-intercambio', t.id::text);
  end if;
  if t.offer_coins > 0 then perform _coins(u, t.offer_coins, 'cobro-intercambio', t.id::text); end if;
  update trades set status = 'accepted', closed_at = now() where id = p_id;
  return 'accepted';
end $$;

create or replace function public.cancel_trade(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare u uuid := me(); t trades;
begin
  select * into t from trades where id = p_id for update;
  if t.id is null or t.from_user <> u or t.status <> 'pending' then
    raise exception 'No puedes cancelar este intercambio' using errcode = 'P0001';
  end if;
  perform _refund_trade(t);
  update trades set status = 'cancelled', closed_at = now() where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- 12. Permisos de las funciones: solo usuarios con sesión.
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.update_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.grant_study(text,integer,integer,integer) to authenticated;
grant execute on function public.submit_exam(text,integer,integer,integer) to authenticated;
grant execute on function public.claim_daily() to authenticated;
grant execute on function public.claim_mission(integer) to authenticated;
grant execute on function public.open_pack(text,boolean) to authenticated;
grant execute on function public.sell_to_system(text,integer) to authenticated;
grant execute on function public.create_listing(text,integer) to authenticated;
grant execute on function public.cancel_listing(bigint) to authenticated;
grant execute on function public.buy_listing(bigint) to authenticated;
grant execute on function public.create_trade(uuid,jsonb,jsonb,integer,integer,text) to authenticated;
grant execute on function public.respond_trade(bigint,boolean) to authenticated;
grant execute on function public.cancel_trade(bigint) to authenticated;
grant execute on function public.level_for(bigint) to anon, authenticated;
grant execute on function public.grade_cl(integer,integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 13. Storage: fotos de perfil (bucket público "avatars", máx 1 MB, solo imágenes)
--     Cada usuario solo puede escribir dentro de su carpeta: avatars/<su id>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/webp','image/png','image/jpeg','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 1048576,
  allowed_mime_types = array['image/webp','image/png','image/jpeg','image/gif'];

drop policy if exists "avatars lectura" on storage.objects;
create policy "avatars lectura" on storage.objects for select
  using (bucket_id = 'avatars');
drop policy if exists "avatars subir propio" on storage.objects;
create policy "avatars subir propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars cambiar propio" on storage.objects;
create policy "avatars cambiar propio" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars borrar propio" on storage.objects;
create policy "avatars borrar propio" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 14. Tiempo real: avisar al navegador cuando cambian el mercado o sus intercambios.
-- ---------------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.market_listings; exception when others then null; end;
  begin alter publication supabase_realtime add table public.trades; exception when others then null; end;
end $$;
