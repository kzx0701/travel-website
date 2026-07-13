-- ============================================================================
-- Travel Map Website - Supabase Schema
-- ============================================================================
-- 包含：profiles / residences / visit_records / trips / purpose_categories /
--       profile_settings 表结构、RLS 策略、触发器、索引与预设数据
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. 扩展
-- ----------------------------------------------------------------------------
-- pgcrypto 用于 gen_random_uuid()（Supabase 默认已启用，此处保留幂等语句）
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. profiles 表
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_seed  text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 自己可读
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- 自己可改（仅 display_name / avatar_seed）
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. residences 表（每用户仅一条）
-- ----------------------------------------------------------------------------
create table if not exists public.residences (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  province_code text not null,
  city_code     text not null,
  district_code text not null,
  province_name text not null,
  city_name     text not null,
  district_name text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id)
);

alter table public.residences enable row level security;

drop policy if exists "residences_select_self" on public.residences;
create policy "residences_select_self"
  on public.residences for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "residences_insert_self" on public.residences;
create policy "residences_insert_self"
  on public.residences for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "residences_update_self" on public.residences;
create policy "residences_update_self"
  on public.residences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "residences_delete_self" on public.residences;
create policy "residences_delete_self"
  on public.residences for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. trips 表
-- ----------------------------------------------------------------------------
create table if not exists public.trips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       varchar(100) not null,
  start_date date not null,
  end_date   date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trips enable row level security;

drop policy if exists "trips_select_self" on public.trips;
create policy "trips_select_self"
  on public.trips for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "trips_insert_self" on public.trips;
create policy "trips_insert_self"
  on public.trips for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "trips_update_self" on public.trips;
create policy "trips_update_self"
  on public.trips for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "trips_delete_self" on public.trips;
create policy "trips_delete_self"
  on public.trips for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 4. visit_records 表
-- ----------------------------------------------------------------------------
create table if not exists public.visit_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  city_code    text not null,
  city_name    text not null,
  province_code text not null,
  province_name text not null,
  start_date   date not null,
  end_date     date,
  purpose      text not null default '其他',
  note         varchar(50),
  trip_id      uuid references public.trips (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.visit_records enable row level security;

drop policy if exists "visit_records_select_self" on public.visit_records;
create policy "visit_records_select_self"
  on public.visit_records for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "visit_records_insert_self" on public.visit_records;
create policy "visit_records_insert_self"
  on public.visit_records for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "visit_records_update_self" on public.visit_records;
create policy "visit_records_update_self"
  on public.visit_records for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "visit_records_delete_self" on public.visit_records;
create policy "visit_records_delete_self"
  on public.visit_records for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 5. purpose_categories 表
-- ----------------------------------------------------------------------------
create table if not exists public.purpose_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.purpose_categories enable row level security;

-- 系统预设（user_id IS NULL）所有人可读
drop policy if exists "purpose_categories_select_all" on public.purpose_categories;
create policy "purpose_categories_select_all"
  on public.purpose_categories for select
  to authenticated
  using (user_id is null or user_id = auth.uid());

-- 用户只能插入自己的
drop policy if exists "purpose_categories_insert_self" on public.purpose_categories;
create policy "purpose_categories_insert_self"
  on public.purpose_categories for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "purpose_categories_update_self" on public.purpose_categories;
create policy "purpose_categories_update_self"
  on public.purpose_categories for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "purpose_categories_delete_self" on public.purpose_categories;
create policy "purpose_categories_delete_self"
  on public.purpose_categories for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6. profile_settings 表
-- ----------------------------------------------------------------------------
create table if not exists public.profile_settings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  is_public   boolean not null default false,
  share_token varchar(64),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

alter table public.profile_settings enable row level security;

-- 自己可读写
drop policy if exists "profile_settings_select_self" on public.profile_settings;
create policy "profile_settings_select_self"
  on public.profile_settings for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "profile_settings_insert_self" on public.profile_settings;
create policy "profile_settings_insert_self"
  on public.profile_settings for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "profile_settings_update_self" on public.profile_settings;
create policy "profile_settings_update_self"
  on public.profile_settings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "profile_settings_delete_self" on public.profile_settings;
create policy "profile_settings_delete_self"
  on public.profile_settings for delete
  to authenticated
  using (user_id = auth.uid());

-- 通过 share_token 公开只读访问（is_public = true 时）
-- 使用 SECURITY DEFINER 函数绕过 RLS，允许匿名通过 token 查询公开档案
create or replace function public.get_public_profile_settings(p_token text)
returns table (
  id uuid,
  user_id uuid,
  is_public boolean,
  share_token varchar
)
language sql
security definer
set search_path = public
as $$
  select id, user_id, is_public, share_token
  from public.profile_settings
  where share_token = p_token and is_public = true;
$$;

-- 公开访问 profile（display_name / avatar_seed）的辅助函数
create or replace function public.get_public_profile(p_token text)
returns table (
  id uuid,
  display_name text,
  avatar_seed text
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.avatar_seed
  from public.profiles p
  join public.profile_settings s on s.user_id = p.id
  where s.share_token = p_token and s.is_public = true;
$$;

-- 公开访问 visit_records（通过 share_token，仅 is_public = true 时）
-- SECURITY DEFINER 绕过 RLS，允许匿名通过 token 只读查询到达记录
create or replace function public.get_public_visit_records(p_token text)
returns table (
  id uuid,
  user_id uuid,
  city_code text,
  city_name text,
  province_code text,
  province_name text,
  start_date date,
  end_date date,
  purpose text,
  note varchar,
  trip_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select vr.id, vr.user_id, vr.city_code, vr.city_name, vr.province_code,
         vr.province_name, vr.start_date, vr.end_date, vr.purpose, vr.note,
         vr.trip_id, vr.created_at, vr.updated_at
  from public.visit_records vr
  join public.profile_settings s on s.user_id = vr.user_id
  where s.share_token = p_token and s.is_public = true
  order by vr.start_date desc;
$$;

-- 公开访问 trips（通过 share_token，仅 is_public = true 时）
create or replace function public.get_public_trips(p_token text)
returns table (
  id uuid,
  user_id uuid,
  name varchar,
  start_date date,
  end_date date,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.user_id, t.name, t.start_date, t.end_date, t.created_at, t.updated_at
  from public.trips t
  join public.profile_settings s on s.user_id = t.user_id
  where s.share_token = p_token and s.is_public = true
  order by t.start_date desc;
$$;

-- ----------------------------------------------------------------------------
-- 7. 索引
-- ----------------------------------------------------------------------------
create index if not exists idx_visit_records_user_id    on public.visit_records (user_id);
create index if not exists idx_visit_records_city_code  on public.visit_records (city_code);
create index if not exists idx_visit_records_trip_id    on public.visit_records (trip_id);
create index if not exists idx_trips_user_id            on public.trips (user_id);
create index if not exists idx_residences_user_id       on public.residences (user_id);
create index if not exists idx_purpose_categories_user  on public.purpose_categories (user_id);

-- ----------------------------------------------------------------------------
-- 8. updated_at 自动更新触发器
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_residences_updated_at on public.residences;
create trigger trg_residences_updated_at
  before update on public.residences
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_visit_records_updated_at on public.visit_records;
create trigger trg_visit_records_updated_at
  before update on public.visit_records
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_trips_updated_at on public.trips;
create trigger trg_trips_updated_at
  before update on public.trips
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_profile_settings_updated_at on public.profile_settings;
create trigger trg_profile_settings_updated_at
  before update on public.profile_settings
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 9. 注册新用户时自动创建 profile 与 profile_settings
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_seed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    substr(md5(random()::text), 1, 8)
  );

  insert into public.profile_settings (user_id, is_public, share_token)
  values (new.id, false, null);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 10. 预设 6 类出行目的（幂等：仅插入尚未存在的系统预设）
-- ----------------------------------------------------------------------------
insert into public.purpose_categories (user_id, name, sort_order)
select * from (values
  (null::uuid, '旅游',    1),
  (null::uuid, '出差',    2),
  (null::uuid, '探亲',    3),
  (null::uuid, '工作学习', 4),
  (null::uuid, '中转',    5),
  (null::uuid, '其他',    6)
) as seed(user_id, name, sort_order)
where not exists (
  select 1 from public.purpose_categories pc
  where pc.user_id is null and pc.name = seed.name
);
