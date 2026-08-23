-- Kirjaajanne — Stripe-maksuintegraatio (SaaS-tilaukset).
--
-- `profiles`-taulu seuraa jokaisen käyttäjän Stripe-tilaustilannetta:
-- 1 kk ilmainen kokeilu, sen jälkeen 20 EUR / kk.
--
-- TÄRKEÄ ARKKITEHTUURIHUOMIO: Kirjaajanteessa ei tämän julkaisun hetkellä
-- ole vielä käytössä Supabase Authia (ei kirjautumis-UI:ta, ei
-- `supabase.auth.*`-kutsuja koodikannassa — "Kirjaudu sisään" -nappi on
-- vielä toiminnallisuudeton paikanvaraaja etusivulla). Jotta maksumuuri ja
-- tilausseuranta voidaan silti toteuttaa NYT ilman että pysähdytään
-- odottamaan erillistä auth-projektia, `profiles.id` on selaimessa
-- generoitu ja `localStorage`+cookieen pysyvästi tallennettu anonyymi
-- `device_id` (UUID) — EI arkaluontoinen tunniste, ei mahdollista tunnistaa
-- henkilöä ilman pääsyä selaimeen. Sarake on silti nimeltään `id` ja
-- tyypiltään `uuid`, jotta taulu on suoraan yhteensopiva tulevaisuuden
-- `references auth.users(id)` -viittauksen kanssa heti kun kirjautuminen
-- otetaan käyttöön (rivit voidaan tuolloin migratoida `device_id`:stä
-- `auth.users.id`:hen käyttäjän kirjautuessa sisään Stripe-asiakas-sähkö-
-- postiosoitteen perusteella).
--
-- Aja tämä migraatio Supabase-projektin SQL-editorissa tai
-- `supabase db push` -komennolla (Supabase CLI).

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  -- Sallitut arvot vastaavat suoraan Stripen omaa `subscription.status`-
  -- kenttää (trialing/active/past_due/canceled/unpaid/incomplete/
  -- incomplete_expired/paused), plus oma "none"-oletusarvo ennen kuin
  -- käyttäjä on koskaan aloittanut Checkout-virtaa.
  subscription_status text not null default 'none',
  trial_end timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Käyttäjien (tällä hetkellä anonyymi device_id, ks. yllä oleva kommentti) Stripe-tilaustilanne. 1kk ilmainen kokeilu, sitten 20 EUR/kk.';
comment on column public.profiles.id is
  'Anonyymi, selaimessa generoitu device_id (uuid) TAI tulevaisuudessa auth.users.id. Ei henkilötieto sellaisenaan.';
comment on column public.profiles.subscription_status is
  'Peilaa suoraan Stripen subscription.status-kenttää: none/trialing/active/past_due/canceled/unpaid/incomplete/incomplete_expired/paused.';

-- Rivitason tietoturva: taulu ei ole julkisesti luettavissa eikä
-- muokattavissa anon/authenticated-rooleilla. Kaikki luku/kirjoitus
-- tapahtuu yksinomaan palvelimelta `service_role`-avaimella
-- (ks. src/lib/supabase.ts, /api/checkout ja /api/webhooks/stripe), joka
-- ohittaa RLS:n automaattisesti — erillisiä policyja ei tarvita.
alter table public.profiles enable row level security;

-- Pidetään `updated_at` ajan tasalla jokaisella UPDATE-kutsulla, jotta
-- webhook-käsittelijän tekemät tilamuutokset (esim. trialing -> active)
-- ovat aina jäljitettävissä.
create or replace function public.set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at();

-- Nopea hakuindeksi webhook-käsittelijän `stripe_customer_id`- ja
-- `stripe_subscription_id`-pohjaisille päivityksille.
create index if not exists idx_profiles_stripe_customer_id
  on public.profiles (stripe_customer_id);
create index if not exists idx_profiles_stripe_subscription_id
  on public.profiles (stripe_subscription_id);
