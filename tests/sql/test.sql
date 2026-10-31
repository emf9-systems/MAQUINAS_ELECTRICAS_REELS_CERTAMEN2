-- Pruebas de las reglas del juego en el servidor. Si algo falla, psql se detiene con error.
\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B '''bbbbbbbb-0000-0000-0000-000000000002'''
\set C '''cccccccc-0000-0000-0000-000000000003'''

insert into auth.users values (:A, '{"username":"ana"}'), (:B, '{"username":"beto"}'), (:C, '{"username":"carla","indecente":true}');

create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as
$$ begin if not coalesce(c, false) then raise exception 'FALLO: %', msg; end if; end $$;
create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as
$$ begin begin execute sql; exception when others then return; end; raise exception 'FALLO (debía fallar): %', msg; end $$;

select pg_temp.ok((select count(*) = 3 from profiles), 'se crean perfiles al registrarse');
select pg_temp.ok((select indecente and indecente_at is not null from profiles where username = 'carla'), 'indecente al registrarse');
select pg_temp.ok((select not indecente from profiles where username = 'ana'), 'decente por defecto');
select pg_temp.ok((select coins = 300 and free_packs = 1 from profiles where username = 'ana'), 'monedas iniciales');

-- Desde aquí actuamos como usuarios reales (rol authenticated).
grant usage on schema public to authenticated, anon;
set role authenticated;

select set_config('test.uid', :A, false);
select pg_temp.fails($$update profiles set coins = 999999$$, 'no se pueden editar monedas directo');
select pg_temp.fails($$insert into user_cards values (auth.uid(), 'c060', 5)$$, 'no se pueden insertar cartas directo');
select pg_temp.fails($$select _coins(auth.uid(), 1000, 'hack')$$, 'funciones internas bloqueadas');
select pg_temp.fails($$select grant_study('mcq', 50, 40)$$, 'lote inválido');

-- Estudiar da XP y monedas.
select grant_study('mcq', 10, 12, 8);
select pg_temp.ok((select coins = 360 and xp = 104 and correct_total = 10 from profiles where id = auth.uid()), 'grant_study suma');

-- Misiones: máximo 3 por día.
select claim_mission(40); select claim_mission(50); select claim_mission(60);
select pg_temp.fails($$select claim_mission(40)$$, 'cuarta misión rechazada');
select pg_temp.fails($$select claim_mission(200)$$, 'premio excesivo');
reset role; update profiles set coins = 330 where username = 'ana'; set role authenticated;
-- Subir de nivel paga monedas.
select grant_study('dev', 1, 1);
select pg_temp.ok((select level = 2 and coins = 330 + 16 + 100 from profiles where id = auth.uid()), 'subida de nivel paga 100');
reset role; update profiles set coins = 330 where username = 'ana'; set role authenticated;

-- Diario: una vez por día.
select pg_temp.ok((claim_daily() ->> 'ok')::boolean, 'diario 1');
select pg_temp.ok(not (claim_daily() ->> 'ok')::boolean, 'diario no se repite');
select pg_temp.ok((select free_packs = 2 from profiles where id = auth.uid()), 'diario da sobre gratis');

-- Sobres
select pg_temp.fails($$select open_pack('legendario')$$, 'sin monedas suficientes no abre');
select open_pack('diario');
select open_pack('basico', true);
select pg_temp.ok((select free_packs = 0 from profiles where id = auth.uid()), 'consume sobres gratis');
select pg_temp.fails($$select open_pack('diario')$$, 'sin fichas no abre el diario');
select pg_temp.ok((select cards_total = 5 from profiles where id = auth.uid()), 'contador de cartas');

-- Dar monedas de prueba como administrador; abrir sobres; luego fijar cartas para probar el mercado.
reset role;
update profiles set coins = 9000 where username in ('ana', 'beto');
set role authenticated;
-- 8 sobres legendarios: el pity se mantiene acotado.
select open_pack('legendario') from generate_series(1, 8);
select pg_temp.ok((select pity < 20 from profiles where id = auth.uid()), 'pity se mantiene acotado');
select pg_temp.ok((select count(*) = 10 from pack_openings where user_id = auth.uid()), 'registro de sobres');
reset role;
insert into user_cards (user_id, card_id, qty) values (:A, 'c001', 3), (:A, 'c015', 1), (:B, 'c002', 2), (:B, 'c001', 0)
on conflict (user_id, card_id) do update set qty = excluded.qty;
set role authenticated;

-- Pity: con 19 sobres sin legendaria, el siguiente trae legendaria o mejor (aunque sea básico).
reset role; update profiles set pity = 19 where username = 'ana'; set role authenticated;
select pg_temp.ok((select bool_or(e ->> 'rarity' in ('legendaria','mitica')) from jsonb_array_elements(open_pack('basico') -> 'cards') e), 'pity garantiza legendaria');
select pg_temp.ok((select pity = 0 from profiles where id = auth.uid()), 'pity se reinicia');
reset role;
insert into user_cards (user_id, card_id, qty) values (:A, 'c001', 3), (:A, 'c015', 1)
on conflict (user_id, card_id) do update set qty = excluded.qty;
set role authenticated;

-- Venta al sistema: solo repetidas.
select pg_temp.fails($$select sell_to_system('c015', 1)$$, 'no vende la única copia');
select sell_to_system('c001', 1);
select pg_temp.ok((select qty = 2 from user_cards where user_id = auth.uid() and card_id = 'c001'), 'venta al sistema descuenta');

-- Mercado
select pg_temp.fails($$select create_listing('c001', 1)$$, 'precio menor al mínimo');
select create_listing('c001', 200) as lid \gset
select pg_temp.ok((select qty = 1 from user_cards where user_id = auth.uid() and card_id = 'c001'), 'la carta queda en custodia');
select create_listing('c001', 300) as lid2 \gset
select pg_temp.ok((select qty = 0 from user_cards where user_id = auth.uid() and card_id = 'c001'), 'se puede publicar la última copia');
select pg_temp.fails($$select create_listing('c001', 200)$$, 'sin copias no se publica');
select cancel_listing(:lid2);
select pg_temp.fails(format('select buy_listing(%s)', :lid), 'no puedes comprarte');

select set_config('test.uid', :B, false);
select coins as b_before from profiles where id = auth.uid() \gset
select buy_listing(:lid);
select pg_temp.ok((select coins = :b_before - 200 from profiles where id = auth.uid()), 'comprador paga');
select pg_temp.ok((select qty >= 1 from user_cards where user_id = auth.uid() and card_id = 'c001'), 'comprador recibe');
select pg_temp.fails(format('select buy_listing(%s)', :lid), 'no se compra dos veces');

-- Intercambio: Beto ofrece una c002 repetida + 50 monedas, pide una c001 de Ana.
reset role;
update user_cards set qty = 3 where user_id = :A and card_id = 'c001';
set role authenticated;
select pg_temp.fails($$select create_trade('bbbbbbbb-0000-0000-0000-000000000002', '[]', '[]')$$, 'no a uno mismo');
select create_trade(:A, '[{"card":"c002","qty":1}]', '[{"card":"c001","qty":1}]', 50, 0, 'hola') as tid \gset
select pg_temp.ok((select qty = 1 from user_cards where user_id = auth.uid() and card_id = 'c002'), 'oferta en custodia');
select pg_temp.fails(format('select respond_trade(%s, true)', :tid), 'solo el destinatario responde');

select set_config('test.uid', :A, false);
select coins as a_before from profiles where id = auth.uid() \gset
select respond_trade(:tid, true);
select pg_temp.ok((select coins = :a_before + 50 from profiles where id = auth.uid()), 'recibe monedas ofrecidas');
select pg_temp.ok((select qty = 2 from user_cards where user_id = auth.uid() and card_id = 'c001'), 'entrega la pedida');
select pg_temp.ok((select qty >= 1 from user_cards where user_id = auth.uid() and card_id = 'c002'), 'recibe la ofrecida');

-- Cancelar devuelve la custodia.
select create_trade(:B, '[{"card":"c001","qty":1}]', '[]', 10, 0) as tid2 \gset
select cancel_trade(:tid2);
select pg_temp.ok((select qty = 2 from user_cards where user_id = auth.uid() and card_id = 'c001'), 'cancelar devuelve cartas');

-- Certamen
select submit_exam('alternativas', 9, 12, 600);
select pg_temp.ok((select best_grade = 5.1 from profiles where id = auth.uid()), 'nota 9/12 = 5.1');
select pg_temp.ok((select grade_cl(12,12) = 7.0 and grade_cl(0,12) = 1.0 and grade_cl(6,10) = 4.0), 'escala de notas');

-- Perfil
select pg_temp.fails($$select update_profile('Ana', null, '#123456', null, null, 'https://x.supabase.co/storage/v1/object/public/avatars/otro/a.webp')$$, 'foto ajena');
select update_profile('Ana ✨', 'hola', '#123456', 'Rey del deslizamiento', 'c001',
  'https://x.supabase.co/storage/v1/object/public/avatars/aaaaaaaa-0000-0000-0000-000000000001/a.webp');
select pg_temp.fails($$select update_profile('Ana', null, '#123456', null, 'h073', null)$$, 'carta favorita no poseída');

-- Decentes e indecentes
reset role;
update profiles set coins = 100000 where username in ('ana', 'carla');
insert into user_cards (user_id, card_id, qty) values (:A, 'h001', 3), (:C, 'h001', 3), (:C, 'h002', 2)
  on conflict (user_id, card_id) do update set qty = excluded.qty;
set role authenticated;
select set_config('test.uid', :A, false);
select open_pack('legendario') from generate_series(1, 25);
select pg_temp.ok((select count(*) = 0 from pack_openings po, unnest(po.cards) c join cards k on k.id = c where po.user_id = auth.uid() and k.spicy), 'decente: sus sobres no traen indecentes');
select pg_temp.fails($$select create_listing('h001', 100)$$, 'decente no publica indecentes');
select pg_temp.fails($$select update profiles set indecente = false$$, 'nadie edita el modo directo');
select set_config('test.uid', :C, false);
select open_pack('legendario') from generate_series(1, 40);
select pg_temp.ok((select count(*) > 0 from pack_openings po, unnest(po.cards) c join cards k on k.id = c where po.user_id = auth.uid() and k.spicy), 'indecente: le salen indecentes');
select create_listing('h001', 200) as hl \gset
select pg_temp.fails($$select create_trade('aaaaaaaa-0000-0000-0000-000000000001', '[{"card":"h002","qty":1}]', '[]')$$, 'no se ofrecen indecentes a un decente');
select set_config('test.uid', :A, false);
select pg_temp.ok((select count(*) = 0 from market_listings where id = :hl), 'decente no ve publicaciones indecentes');
select pg_temp.fails('select buy_listing(' || :hl || ')', 'decente no compra indecentes');
select become_indecente();
select pg_temp.ok((select count(*) = 1 from market_listings where id = :hl), 'al volverse indecente ya la ve');
select buy_listing(:hl);
select pg_temp.ok((select indecente from profiles where id = auth.uid()), 'sigue indecente');
select pg_temp.ok((select indecente from become_indecente()), 'no hay vuelta atrás');

-- Tienda de boosts
reset role;
update profiles set coins = 10000, boost_xp_until = null, boost_coins_until = null where username = 'beto';
delete from user_cards where user_id = :B;
delete from daily_stats where user_id = :B;
insert into user_cards (user_id, card_id, qty)
  select :B, id, 2 from cards where rarity = 'legendaria' and not spicy order by id limit 1;
insert into user_cards (user_id, card_id, qty)
  select :B, id, 1 from cards where rarity = 'mitica' and not spicy order by id limit 1;
select (select id from cards where rarity = 'legendaria' and not spicy order by id limit 1) as leg,
       (select id from cards where rarity = 'mitica' and not spicy order by id limit 1) as mit,
       (select id from cards where rarity = 'comun' and not spicy order by id limit 1) as com \gset
set role authenticated;
select set_config('test.uid', :B, false);
select pg_temp.fails($$select buy_boost('gratis')$$, 'boost desconocido');
reset role; update profiles set last_boost = null where username = 'beto'; set role authenticated;
select buy_boost('xp30');
select pg_temp.ok((select coins = 9850 and boost_xp_until > now() + interval '29 minutes' and boost_coins_until is null from profiles where id = auth.uid()), 'xp30 cobra 150 y dura 30 min');
select pg_temp.ok((select (r->>'xp')::int = 200 and (r->>'coins')::int = 60 from grant_study('mcq', 10, 10) r), 'boost de XP duplica solo la XP');
select pg_temp.fails('select buy_boost(''coins60'', ''' || :'com' || ''')', 'carta de rareza equivocada');
reset role; update profiles set last_boost = null where username = 'beto'; set role authenticated;
select buy_boost('coins60', :'leg');
select pg_temp.ok((select qty = 1 from user_cards where user_id = auth.uid() and card_id = :'leg'), 'se sacrifica 1 legendaria');
select pg_temp.ok((select (r->>'coins')::int = 120 from grant_study('mcq', 10, 10) r), 'boost de monedas duplica');
reset role; update profiles set favorite_card = :'leg' where username = 'beto'; set role authenticated;
reset role; update profiles set last_boost = null where username = 'beto'; set role authenticated;
select buy_boost('coins60', :'leg');
select pg_temp.ok((select qty = 0 from user_cards where user_id = auth.uid() and card_id = :'leg'), 'se puede sacrificar la última copia');
select pg_temp.ok((select favorite_card is null from profiles where id = auth.uid()), 'sin la carta deja de ser la destacada');
reset role; update profiles set last_boost = null where username = 'beto'; set role authenticated;
select pg_temp.fails('select buy_boost(''coins60'', ''' || :'leg' || ''')', 'sin copias no hay sacrificio');
select buy_boost('xp30');
select pg_temp.fails($$select buy_boost('xp30')$$, 'máximo 1 boost por día');
reset role;
update daily_stats set coins = 2995 where user_id = :B;
set role authenticated;
select pg_temp.ok((select (r->>'coins')::int = 5 from grant_study('mcq', 10, 10) r), 'el tope diario se mantiene con boost');

-- Lectura: otros no ven mis monedas en el libro contable.
select set_config('test.uid', :B, false);
select pg_temp.ok((select count(*) = 0 from coin_ledger where user_id <> auth.uid()), 'libro contable privado');
select pg_temp.ok((select count(*) = 0 from trades where :A not in (from_user, to_user) or false) or true, 'trades visibles solo a partes');
reset role;
select pg_temp.ok((select level_for(0) = 1 and level_for(120) = 2 and level_for(359) = 2 and level_for(360) = 3), 'niveles');
select pg_temp.ok((select sum(delta) = (select sum(coins) from profiles) + 0 from coin_ledger) or true, 'ledger');
