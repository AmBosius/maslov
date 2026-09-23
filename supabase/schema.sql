-- =========================================================
-- Маслов — база: товары, заявки, админы.
-- Выполнить целиком в Supabase: SQL Editor → New query → Run.
-- Скрипт можно запускать повторно — ничего не задвоится.
--
-- Модель доступа:
--   товары   — читают все (это витрина), но только не скрытые;
--              меняет только админ.
--   заявки   — посетитель не видит таблицу вообще, создаёт заявку
--              только через функцию submit_request(); читает и
--              меняет статус только админ.
--   админы   — список правится только из панели Supabase.
-- =========================================================

-- ---------- Кто такой администратор ----------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- Политик нет: сам себя в админы через API добавить нельзя.

-- SECURITY DEFINER обязателен: политики вызывают эту функцию от имени
-- посетителя, а он не имеет права читать public.admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Товары ----------
create table if not exists public.products (
  -- Текстовый id: у стартовых товаров читаемые (motul-8100-...),
  -- у добавленных из админки — сгенерированные.
  id         text primary key default gen_random_uuid()::text,
  brand      text    not null,
  name       text    not null,
  viscosity  text    not null,
  volume     numeric(4, 1) not null check (volume > 0),
  price      integer not null check (price >= 0),
  approvals  text[]  not null default '{}',
  -- in_stock — в наличии, on_order — под заказ, out — нет (скрыт с сайта)
  status     text    not null default 'in_stock'
             check (status in ('in_stock', 'on_order', 'out')),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status, sort_order);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

-- Скрытые товары отсекаются политикой, а не фильтром на сайте:
-- клиентский фильтр обходится подменой запроса.
drop policy if exists "public reads visible products" on public.products;
create policy "public reads visible products"
  on public.products for select to anon, authenticated
  using (status <> 'out' or public.is_admin());

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products"
  on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- PostgREST требует табличные гранты помимо RLS.
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- ---------- Заявки ----------
create table if not exists public.requests (
  id         uuid primary key default gen_random_uuid(),
  number     text    not null unique,
  name       text,
  phone      text    not null,
  car        text,
  comment    text,
  -- Снимок позиций на момент заявки: если продавец потом поменяет
  -- цену, в заявке останется та, что видел клиент.
  items      jsonb   not null default '[]'::jsonb,
  total      integer not null default 0,
  status     text    not null default 'new'
             check (status in ('new', 'in_work', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists requests_created_idx on public.requests (created_at desc);
create index if not exists requests_phone_idx on public.requests (phone, created_at desc);

create sequence if not exists public.request_number_seq start with 1;

-- Номер вида МС-26-0001
create or replace function public.next_request_number()
returns text
language sql
volatile
as $$
  select 'МС-' || to_char(now(), 'YY') || '-' ||
         lpad(nextval('public.request_number_seq')::text, 4, '0');
$$;

-- Без revoke аноним мог бы впустую прокручивать нумерацию.
revoke all on function public.next_request_number() from public;

alter table public.requests enable row level security;

drop policy if exists "admins read requests" on public.requests;
create policy "admins read requests"
  on public.requests for select to authenticated
  using (public.is_admin());

drop policy if exists "admins update requests" on public.requests;
create policy "admins update requests"
  on public.requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete requests" on public.requests;
create policy "admins delete requests"
  on public.requests for delete to authenticated
  using (public.is_admin());

revoke all on public.requests from anon;
revoke insert on public.requests from authenticated;
grant select, update, delete on public.requests to authenticated;
revoke all on sequence public.request_number_seq from anon, authenticated;

-- ---------- Приём заявки ----------
-- Возвращает только номер заявки. Позиции и сумму считает сама
-- по таблице товаров: цене из браузера доверять нельзя.
create or replace function public.submit_request(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name    text := nullif(trim(payload ->> 'name'), '');
  v_phone   text := nullif(trim(payload ->> 'phone'), '');
  v_car     text := nullif(trim(payload ->> 'car'), '');
  v_comment text := nullif(trim(payload ->> 'comment'), '');
  v_ids     text[];
  v_items   jsonb;
  v_total   integer;
  v_number  text;
begin
  -- Телефон: ровно 11 цифр (7 + 10), форматирование не важно
  if v_phone is null or length(regexp_replace(v_phone, '\D', '', 'g')) <> 11 then
    raise exception 'Нужен телефон из 11 цифр' using errcode = '22023';
  end if;

  if coalesce(length(v_name), 0) > 100
     or length(v_phone) > 30
     or coalesce(length(v_car), 0) > 200
     or coalesce(length(v_comment), 0) > 2000
  then
    raise exception 'Слишком длинное значение поля' using errcode = '22001';
  end if;

  -- Простая защита от спама: не больше 5 заявок с номера за 10 минут
  if (select count(*) from public.requests
      where phone = v_phone and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Слишком много заявок, попробуйте позже' using errcode = '54000';
  end if;

  -- id товаров из заявки: только строки, не больше 30 штук
  select coalesce(array_agg(x), '{}')
    into v_ids
    from (
      select jsonb_array_elements_text(
               case when jsonb_typeof(payload -> 'items') = 'array'
                    then payload -> 'items' else '[]'::jsonb end
             ) as x
      limit 30
    ) t;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'brand', p.brand, 'name', p.name,
           'viscosity', p.viscosity, 'volume', p.volume,
           'price', p.price, 'status', p.status
         ) order by p.sort_order), '[]'::jsonb),
         coalesce(sum(p.price), 0)
    into v_items, v_total
    from public.products p
   where p.id = any (v_ids) and p.status <> 'out';

  insert into public.requests (number, name, phone, car, comment, items, total)
  values (public.next_request_number(), v_name, v_phone, v_car, v_comment, v_items, v_total)
  returning number into v_number;

  return v_number;
end;
$$;

revoke all on function public.submit_request(jsonb) from public;
grant execute on function public.submit_request(jsonb) to anon, authenticated;

-- ---------- Стартовый каталог ----------
-- on conflict do nothing: повторный запуск не затрёт то, что продавец
-- уже поменял в админке.
insert into public.products (id, brand, name, viscosity, volume, price, approvals, sort_order) values
  ('motul-8100-xclean-530',  'Motul',      '8100 X-clean',           '5W-30', 5, 7490, '{"VW 504 00","VW 507 00","ACEA C3"}', 10),
  ('motul-8100-xcess-540',   'Motul',      '8100 X-cess',            '5W-40', 5, 6990, '{"VW 502 00","MB 229.5","RN0700","RN0710"}', 20),
  ('lm-toptec-4200-530',     'Liqui Moly', 'Top Tec 4200',           '5W-30', 5, 7890, '{"VW 504 00","VW 507 00","MB 229.51"}', 30),
  ('lm-special-aa-020',      'Liqui Moly', 'Special Tec AA',         '0W-20', 4, 5690, '{"API SP","ILSAC GF-6A"}', 40),
  ('lm-molygen-540',         'Liqui Moly', 'Molygen New Generation', '5W-40', 4, 5290, '{"API SN","ACEA A3/B4","VW 502 00"}', 50),
  ('mobil1-esp-530',         'Mobil 1',    'ESP',                    '5W-30', 4, 5990, '{"VW 504 00","VW 507 00","MB 229.52"}', 60),
  ('mobil1-020',             'Mobil 1',    'Advanced Fuel Economy',  '0W-20', 4, 5490, '{"API SP","ILSAC GF-6A"}', 70),
  ('castrol-edge-530',       'Castrol',    'EDGE LL',                '5W-30', 4, 4890, '{"VW 504 00","VW 507 00"}', 80),
  ('castrol-magnatec-540',   'Castrol',    'Magnatec A3/B4',         '5W-40', 4, 3790, '{"API SN","ACEA A3/B4","VW 502 00","RN0700"}', 90),
  ('shell-ultra-540',        'Shell',      'Helix Ultra',            '5W-40', 4, 4290, '{"API SP","VW 502 00","MB 229.5","RN0700","RN0710"}', 100),
  ('shell-hx8-530',          'Shell',      'Helix HX8 ECT',          '5W-30', 4, 3890, '{"API SN","ACEA C3","VW 504 00","VW 507 00"}', 110),
  ('eneos-touring-530',      'ENEOS',      'Premium Touring',        '5W-30', 4, 3590, '{"API SN","ILSAC GF-5"}', 120),
  ('eneos-xprime-020',       'ENEOS',      'X Prime',                '0W-20', 4, 4190, '{"API SP","ILSAC GF-6A"}', 130)
on conflict (id) do nothing;
