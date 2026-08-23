-- Kirjaajanne v2.2 — Dynaamiset sanelupohjat (pikanäppäimet).
--
-- Siirtää aiemmin koodiin kovakoodatut pikanäppäinpohjat ("TMD-tutkimus",
-- "Manuaaliterapia", "Ergonomiaohjaus") tietokantaan, jotta niitä voidaan
-- lisätä ja muokata ilman uutta koodijulkaisua. Taulua luetaan ja
-- kirjoitetaan yksinomaan palvelimelta `/api/templates`-reitin kautta
-- (ks. `src/app/api/templates/route.ts`), joka käyttää `service_role`-
-- avainta — sama malli kuin `anonymized_records`-taulussa.
--
-- Aja tämä migraatio Supabase-projektin SQL-editorissa tai
-- `supabase db push` -komennolla (Supabase CLI).

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  label text not null unique,
  template_text text not null,
  sort_order integer not null default 0
);

comment on table public.templates is
  'Dynaamiset pikanäppäinpohjat (Quick Inserts) sanelutekstikenttää varten. Ylläpidetään /api/templates-reitin kautta.';
comment on column public.templates.label is
  'Napin teksti käyttöliittymässä (esim. "TMD-tutkimus").';
comment on column public.templates.template_text is
  'Valmis tekstirunko, joka lisätään kursorin kohdalle Textareaan napin painalluksesta.';
comment on column public.templates.sort_order is
  'Valinnainen manuaalinen järjestysnumero. Oletusjärjestys on kuitenkin created_at, jotta uudet pohjat ilmestyvät luonnollisesti listan loppuun.';

-- Rivitason tietoturva: taulu ei ole julkisesti luettavissa eikä
-- muokattavissa anon/authenticated-rooleilla. Sekä luku (GET) että
-- kirjoitus (POST, vaatii lisäksi TEMPLATE_ADMIN_SECRET-tunnussanan)
-- tapahtuvat yksinomaan palvelimelta `service_role`-avaimella, joka
-- ohittaa RLS:n automaattisesti — erillisiä policyja ei tarvita.
alter table public.templates enable row level security;

-- Alkuperäiset kolme pikanäppäintä (aiemmin kovakoodattu
-- dictation-panel.tsx:ssä), jotta käyttöliittymän toiminnallisuus säilyy
-- ennallaan heti migraation ajon jälkeen.
insert into public.templates (label, template_text, sort_order)
values
  (
    'TMD-tutkimus',
    'TMD-tutkimus: mandibulan liikelaajuudet mitattu (depressio/elevaatio/protraktio/retraktio), palpaatioarkuus m. masseter ja m. temporalis, niveläänet ja mahdollinen deviaatio avattaessa. ',
    1
  ),
  (
    'Manuaaliterapia',
    'Manuaaliterapia: pehmytkudoskäsittely ja nivelmobilisointi kohdealueelle. Hoidon jälkeen liikelaajuus ja kipu koettu subjektiivisesti parantuneeksi. ',
    2
  ),
  (
    'Ergonomiaohjaus',
    'Ergonomiaohjaus: käytiin läpi työpisteen/arjen ergonomia ja annettiin kirjalliset kotiharjoitteet kuormituksen tasaamiseksi. ',
    3
  )
on conflict (label) do nothing;
