-- Kirjaajanne v2.0 — Anonymisoitu datapankki tulevaisuuden AI-koulutusta varten.
--
-- Taulu tallentaa VAIN valmiin, mallin jo anonymisoiman Kanta-kirjauksen
-- (ks. `src/app/api/chat/route.ts`:n EHDOTON ANONYMISOINTISÄÄNTÖ-osio
-- system-promptissa). Tauluun ei koskaan tallenneta raakaa sanelua,
-- äänitiedostoja eikä mitään suoraan käyttäjän syöttämää tekstiä.
--
-- Aja tämä migraatio Supabase-projektin SQL-editorissa tai
-- `supabase db push` -komennolla (Supabase CLI).

create table if not exists public.anonymized_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kanta_content text not null
);

comment on table public.anonymized_records is
  'Anonymisoidut, tekoälyn tuottamat Kanta-kirjaukset AI-koulutusdataksi. Ei henkilötietoja.';
comment on column public.anonymized_records.kanta_content is
  'Mallin anonymisoima, valmis Kanta-rakenteinen kirjaus (Esitiedot/Tila/Hoito/Ohjeet/Suunnitelma).';

-- Rivitason tietoturva: taulu ei ole julkisesti luettavissa eikä
-- muokattavissa anon/authenticated-rooleilla. Kirjoitus tapahtuu
-- yksinomaan palvelimelta `service_role`-avaimella (ks. src/lib/supabase.ts),
-- joka ohittaa RLS:n automaattisesti — eli alla ei tarvita erillistä
-- INSERT-policya service_role:lle.
alter table public.anonymized_records enable row level security;
