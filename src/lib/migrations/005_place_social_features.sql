create table if not exists place_reactions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like', 'want')),
  created_at timestamptz not null default now(),
  unique (place_id, user_id, reaction_type)
);

create table if not exists place_visits (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verified boolean not null default true,
  verified_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  unique (place_id, user_id)
);

create table if not exists place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  is_verified_visit boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists place_reactions_place_id_idx on place_reactions(place_id);
create index if not exists place_reactions_user_id_idx on place_reactions(user_id);
create index if not exists place_visits_place_id_idx on place_visits(place_id);
create index if not exists place_visits_user_id_idx on place_visits(user_id);
create index if not exists place_reviews_place_id_idx on place_reviews(place_id);
create index if not exists place_reviews_user_id_idx on place_reviews(user_id);

alter table place_reactions enable row level security;
alter table place_visits enable row level security;
alter table place_reviews enable row level security;

drop policy if exists "members can read place reactions" on place_reactions;
drop policy if exists "editors can insert own place reactions" on place_reactions;
drop policy if exists "editors can delete own place reactions" on place_reactions;

create policy "members can read place reactions"
on place_reactions for select
using (
  exists (
    select 1
    from places p
    where p.id = place_reactions.place_id
      and public.is_project_member(p.project_id)
  )
);

create policy "editors can insert own place reactions"
on place_reactions for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from places p
    where p.id = place_reactions.place_id
      and public.has_project_role(p.project_id, array['owner', 'editor'])
  )
);

create policy "editors can delete own place reactions"
on place_reactions for delete
using (
  user_id = auth.uid()
  and exists (
    select 1
    from places p
    where p.id = place_reactions.place_id
      and public.has_project_role(p.project_id, array['owner', 'editor'])
  )
);

drop policy if exists "members can read place visits" on place_visits;
drop policy if exists "editors can upsert own place visits" on place_visits;
drop policy if exists "editors can update own place visits" on place_visits;

create policy "members can read place visits"
on place_visits for select
using (
  exists (
    select 1
    from places p
    where p.id = place_visits.place_id
      and public.is_project_member(p.project_id)
  )
);

create policy "editors can upsert own place visits"
on place_visits for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from places p
    where p.id = place_visits.place_id
      and public.has_project_role(p.project_id, array['owner', 'editor'])
  )
);

create policy "editors can update own place visits"
on place_visits for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from places p
    where p.id = place_visits.place_id
      and public.has_project_role(p.project_id, array['owner', 'editor'])
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from places p
    where p.id = place_visits.place_id
      and public.has_project_role(p.project_id, array['owner', 'editor'])
  )
);

drop policy if exists "members can read place reviews" on place_reviews;
drop policy if exists "verified editors can insert own place reviews" on place_reviews;
drop policy if exists "authors can update own place reviews" on place_reviews;
drop policy if exists "authors can delete own place reviews" on place_reviews;

create policy "members can read place reviews"
on place_reviews for select
using (
  exists (
    select 1
    from places p
    where p.id = place_reviews.place_id
      and public.is_project_member(p.project_id)
  )
);

create policy "verified editors can insert own place reviews"
on place_reviews for insert
with check (
  user_id = auth.uid()
  and is_verified_visit = true
  and exists (
    select 1
    from places p
    where p.id = place_reviews.place_id
      and public.has_project_role(p.project_id, array['owner', 'editor'])
  )
  and exists (
    select 1
    from place_visits v
    where v.place_id = place_reviews.place_id
      and v.user_id = auth.uid()
      and v.verified = true
  )
);

create policy "authors can update own place reviews"
on place_reviews for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from places p
    where p.id = place_reviews.place_id
      and public.has_project_role(p.project_id, array['owner', 'editor'])
  )
)
with check (
  user_id = auth.uid()
  and is_verified_visit = true
);

create policy "authors can delete own place reviews"
on place_reviews for delete
using (
  user_id = auth.uid()
  and exists (
    select 1
    from places p
    where p.id = place_reviews.place_id
      and public.has_project_role(p.project_id, array['owner', 'editor'])
  )
);

grant select, insert, update, delete on place_reactions to authenticated;
grant select, insert, update, delete on place_visits to authenticated;
grant select, insert, update, delete on place_reviews to authenticated;
