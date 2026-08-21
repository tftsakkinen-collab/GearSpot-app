#!/usr/bin/env python3
"""
Antigravity-koodariagentti - YouTube Outlier & Sisällöllisen Arbitraasin Hakukone -> Google Sheets
- Kaksikielinen haku (FI / EN)
- Goliath-filtteri: Ohittaa kanavat, joilla > 100 000 tilaajaa
- Outlier-analyysi: View/Sub-suhde > 5 ja kuvauksen pituus < 150 merkkiä (heikko laatu / kultainen tilaisuus)
- Rikastettu data tallennetaan Google Sheetiin
"""

import html
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Google Sheets API Scopes
SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

# Oletushakukohteet (kaksikielinen)
DEFAULT_SEARCH_TARGETS = [
    # Suomenkieliset avainsanat
    {"keyword": "fysioterapia", "lang": "FI"},
    {"keyword": "työpaikkaergonomia", "lang": "FI"},
    {"keyword": "niskakipu", "lang": "FI"},
    # Englanninkieliset avainsanat
    {"keyword": "physiotherapy", "lang": "EN"},
    {"keyword": "desk ergonomics", "lang": "EN"},
    {"keyword": "neck pain", "lang": "EN"}
]

# Strategiset rajat ja kriteerit
DEFAULT_MAX_RESULTS = 10
DEFAULT_MAX_SUBSCRIBERS = 100_000  # Goliath-filtteri: ohita yli 100k tilaajan mediatalot
OUTLIER_RATIO_THRESHOLD = 5.0
SHORT_DESC_THRESHOLD = 150

# Sarakkeet Google Sheetiin
SHEET_HEADERS = [
    "Kieli",
    "Hakusana",
    "Videon otsikko",
    "Kanavan nimi",
    "Katselukerrat",
    "Tilaajamäärä",
    "View/Sub-suhde",
    "Kuvauksen pituus",
    "Laatupisteytys",
    "Outlier-status",
    "Julkaisupäivä",
    "Videon URL"
]


def get_sheets_service(service_account_file: str):
    """
    Luo Google Sheets API -palvelun Service Account -tunnuksilla.
    """
    if not os.path.exists(service_account_file):
        raise FileNotFoundError(
            f"Service Account -avaintiedostoa ei löytynyt polusta: {service_account_file}\n"
            "Tarkista .env-tiedoston SERVICE_ACCOUNT_FILE -muuttuja."
        )

    credentials = service_account.Credentials.from_service_account_file(
        service_account_file,
        scopes=SHEETS_SCOPES
    )
    return build('sheets', 'v4', credentials=credentials)


def get_youtube_service(api_key: str):
    """
    Luo YouTube Data API v3 -palvelun API-avaimella.
    """
    if not api_key or api_key == "AIzaSyYourYouTubeApiKeyHere":
        raise ValueError(
            "YOUTUBE_API_KEY puuttuu tai on oletusarvo .env-tiedostossa.\n"
            "Aseta toimiva YouTube Data API v3 -avain .env-tiedostoon."
        )
    return build('youtube', 'v3', developerKey=api_key)


def fetch_channel_subscribers(youtube_service, channel_ids: set) -> dict:
    """
    Hakee kanavien tilaajamäärät eräajona (max 50 kanavaa per pyyntö).
    Palauttaa sanakirjan: {channel_id: subscriber_count}
    """
    channel_sub_map = {}
    channel_list = list(channel_ids)
    chunk_size = 50

    for i in range(0, len(channel_list), chunk_size):
        chunk = channel_list[i:i + chunk_size]
        try:
            response = youtube_service.channels().list(
                id=','.join(chunk),
                part='statistics'
            ).execute()

            for item in response.get('items', []):
                c_id = item['id']
                stats = item.get('statistics', {})
                if stats.get('hiddenSubscriberCount', False):
                    channel_sub_map[c_id] = 0
                else:
                    channel_sub_map[c_id] = int(stats.get('subscriberCount', 0))
        except HttpError as e:
            print(f"Virhe haettaessa kanavatietoja: {e}", file=sys.stderr)

    return channel_sub_map


def fetch_youtube_outlier_videos(youtube_service, search_targets, max_results=10, max_subscribers=DEFAULT_MAX_SUBSCRIBERS):
    """
    Hakee videot kaksikielisesti, hakee kanavien tilaajatilastot,
    soveltaa Goliath-filtteriä (> 100k tilaajaa ohitetaan),
    laskee View/Sub-suhteen sekä arvioi kuvauksen pituuden ja laadun.
    """
    raw_video_items = []
    seen_video_ids = set()
    channel_ids_to_fetch = set()

    for target in search_targets:
        keyword = target["keyword"]
        lang = target["lang"]
        print(f"[{lang}] Haetaan YouTube-videoita avainsanalla: '{keyword}' (järjestys: katselukerrat)...")
        try:
            # 1. Haku katselukertojen mukaan
            search_response = youtube_service.search().list(
                q=keyword,
                part='snippet',
                type='video',
                order='viewCount',
                maxResults=max_results
            ).execute()

            items = search_response.get('items', [])
            if not items:
                print(f"  Ei hakutuloksia sanalle '{keyword}'.")
                continue

            video_ids = [item['id']['videoId'] for item in items if 'videoId' in item['id']]
            if not video_ids:
                continue

            # 2. Haetaan tarkat videotilastot ja snippetit eräajona
            video_response = youtube_service.videos().list(
                id=','.join(video_ids),
                part='snippet,statistics'
            ).execute()

            for vid in video_response.get('items', []):
                vid_id = vid['id']
                if vid_id in seen_video_ids:
                    continue
                seen_video_ids.add(vid_id)

                channel_id = vid.get('snippet', {}).get('channelId', '')
                if channel_id:
                    channel_ids_to_fetch.add(channel_id)

                raw_video_items.append({
                    'keyword': keyword,
                    'lang': lang,
                    'video': vid
                })

            print(f"  -> Löydetty {len(video_ids)} videota sanalle '{keyword}'.")

        except HttpError as e:
            print(f"YouTube API -virhe avainsanalla '{keyword}': {e}", file=sys.stderr)
            raise e

    if not raw_video_items:
        return []

    # 3. Haetaan kaikkien kanavien tilaajamäärät
    print(f"\nHaetaan {len(channel_ids_to_fetch)} kanavan tilaajatilastot...")
    channel_sub_map = fetch_channel_subscribers(youtube_service, channel_ids_to_fetch)

    # 4. Lasketaan metriikat, suodatetaan Goliath-kanavat ja analysoidaan Outlierit
    processed_rows = []
    goliath_filtered_count = 0

    for entry in raw_video_items:
        keyword = entry['keyword']
        lang = entry['lang']
        vid = entry['video']
        vid_id = vid['id']
        snippet = vid.get('snippet', {})
        stats = vid.get('statistics', {})

        title = html.unescape(snippet.get('title', 'N/A'))
        channel_title = html.unescape(snippet.get('channelTitle', 'N/A'))
        channel_id = snippet.get('channelId', '')
        description = snippet.get('description', '')
        desc_length = len(description.strip())

        try:
            views = int(stats.get('viewCount', 0))
        except (ValueError, TypeError):
            views = 0

        subscribers = channel_sub_map.get(channel_id, 0)

        # ==============================================================================
        # GOLIATH-FILTTERI:
        # Jos kanavan tilaajamäärä on yli 100 000, ohitetaan video kokonaan.
        # ==============================================================================
        if subscribers > max_subscribers:
            goliath_filtered_count += 1
            continue

        # Lasketaan katselukertojen suhde tilaajiin (View / Sub)
        if subscribers > 0:
            view_sub_ratio = round(views / subscribers, 2)
        else:
            # Jos tilaajamäärä on 0 tai piilotettu
            view_sub_ratio = round(float(views), 2) if views > 0 else 0.0

        # Outlier & Laatu -kriteerit:
        # 1. View/Sub > 5
        # 2. Kuvauksen pituus < 150 merkkiä (heikko laatu / puutteellinen optimointi)
        is_ratio_outlier = view_sub_ratio > OUTLIER_RATIO_THRESHOLD
        is_short_desc = desc_length < SHORT_DESC_THRESHOLD

        if is_ratio_outlier and is_short_desc:
            outlier_status = "🎯 KULTAINEN TILAISUUS (Outlier + Heikko laatu)"
            quality_score = f"Heikko laatu / Kuvaus vain {desc_length} merkkiä"
            sort_priority = 3
        elif is_ratio_outlier:
            outlier_status = "⚡ Outlier (Ratio > 5)"
            quality_score = f"Hyvä / Kuvaus {desc_length} merkkiä"
            sort_priority = 2
        elif is_short_desc:
            outlier_status = "Normaali"
            quality_score = f"Puutteellinen kuvaus ({desc_length} merkkiä)"
            sort_priority = 1
        else:
            outlier_status = "Normaali"
            quality_score = f"Normaali ({desc_length} merkkiä)"
            sort_priority = 0

        # Julkaisupäivämäärä (YYYY-MM-DD)
        published_raw = snippet.get('publishedAt', '')
        if published_raw:
            try:
                published_date = datetime.fromisoformat(
                    published_raw.replace('Z', '+00:00')
                ).strftime('%Y-%m-%d')
            except Exception:
                published_date = published_raw
        else:
            published_date = 'N/A'

        video_url = f"https://www.youtube.com/watch?v={vid_id}"

        row_data = [
            lang,
            keyword,
            title,
            channel_title,
            views,
            subscribers,
            view_sub_ratio,
            desc_length,
            quality_score,
            outlier_status,
            published_date,
            video_url
        ]

        processed_rows.append({
            'sort_priority': sort_priority,
            'view_sub_ratio': view_sub_ratio,
            'views': views,
            'row': row_data
        })

    print(f"Goliath-filtteri suodatti pois {goliath_filtered_count} videota (> {max_subscribers:,} tilaajaa).")

    # Järjestetään tulokset: parhaat mahdollisuudet (prioriteetti) ja korkein View/Sub-suhde ensin
    processed_rows.sort(
        key=lambda x: (x['sort_priority'], x['view_sub_ratio'], x['views']),
        reverse=True
    )

    return [item['row'] for item in processed_rows]


def save_to_google_sheet(sheets_service, sheet_id: str, rows: list):
    """
    Tallentaa tulokset Google Sheetiin.
    Korvaa ja päivittää taulukon otsikot ja datarivit.
    """
    if not sheet_id or sheet_id == "your_google_sheet_id_here":
        raise ValueError(
            "SHEET_ID puuttuu tai on oletusarvo .env-tiedostossa.\n"
            "Aseta Google Sheetin ID .env-tiedostoon."
        )

    print("Kirjoitetaan tulokset Google Sheetiin...")

    # Kirjoitetaan otsikot ja datarivit A1:stä alkaen
    values_to_write = [SHEET_HEADERS] + rows
    body = {'values': values_to_write}

    try:
        # Tyhjennetään ensin vanha sisältö (A:L kattaa kaikki 12 saraketta)
        sheets_service.spreadsheets().values().clear(
            spreadsheetId=sheet_id,
            range="A:L"
        ).execute()

        # Kirjoitetaan uusi data
        sheets_service.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range="A1",
            valueInputOption="USER_ENTERED",
            body=body
        ).execute()
        print(f"Kirjoitettu otsikkorivi ja {len(rows)} riviä analysoitua dataa Google Sheetiin.")

    except HttpError as e:
        print(f"Virhe Google Sheetiin kirjoittamisessa: {e}", file=sys.stderr)
        print("Varmista, että Service Accountilla on muokkausoikeudet (Editor) annettuun Sheetiin!")
        raise e


def main():
    load_dotenv()

    service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "credentials/service-account.json")
    youtube_api_key = os.getenv("YOUTUBE_API_KEY")
    sheet_id = os.getenv("SHEET_ID")

    max_results = int(os.getenv("MAX_RESULTS_PER_KEYWORD", DEFAULT_MAX_RESULTS))
    max_subscribers = int(os.getenv("MAX_SUBSCRIBERS", DEFAULT_MAX_SUBSCRIBERS))

    # Käytetään oletuksena kattavaa kaksikielistä hakukohdelistaa
    search_targets = DEFAULT_SEARCH_TARGETS

    print("=== Antigravity Sisällöllisen Arbitraasin Hakukone (FI / EN) ===")
    print(f"Hakukohteet: {[(t['lang'], t['keyword']) for t in search_targets]}")
    print(f"Max tuloksia per hakusana: {max_results}")
    print(f"Goliath-tilaajaraja: max {max_subscribers:,} tilaajaa")
    print(f"Outlier-kriteerit: View/Sub > {OUTLIER_RATIO_THRESHOLD} & Kuvaus < {SHORT_DESC_THRESHOLD} merkkiä\n")

    # Validointi
    if not youtube_api_key:
        print("VIRHE: YOUTUBE_API_KEY puuttuu .env-tiedostosta!", file=sys.stderr)
        print("Määritä YOUTUBE_API_KEY .env-tiedostoon (katso malli .env.example).", file=sys.stderr)
        sys.exit(1)

    if not sheet_id:
        print("VIRHE: SHEET_ID puuttuu .env-tiedostosta!", file=sys.stderr)
        print("Määritä SHEET_ID .env-tiedostoon (katso malli .env.example).", file=sys.stderr)
        sys.exit(1)

    try:
        youtube_service = get_youtube_service(youtube_api_key)
        sheets_service = get_sheets_service(service_account_file)

        # 1. Haetaan ja analysoidaan kaksikieliset videot + suodatetaan Goliath-kanavat
        rows = fetch_youtube_outlier_videos(
            youtube_service,
            search_targets,
            max_results=max_results,
            max_subscribers=max_subscribers
        )

        if not rows:
            print("Ei kriteerit täyttäviä videoita löytynyt.")
            return

        # Lasketaan tilastot
        gold_count = sum(1 for r in rows if "🎯 KULTAINEN TILAISUUS" in str(r[9]))
        outlier_count = sum(1 for r in rows if "Outlier" in str(r[9]))
        fi_count = sum(1 for r in rows if r[0] == "FI")
        en_count = sum(1 for r in rows if r[0] == "EN")

        print(f"\nAnalyysi valmis! Yhteensä {len(rows)} kelvollista videota tallennettavaksi.")
        print(f"  - FI-tuloksia: {fi_count} kpl | EN-tuloksia: {en_count} kpl")
        print(f"  - 🎯 Kultaiset tilaisuudet (Outlier + Heikko laatu): {gold_count} kpl")
        print(f"  - ⚡ Outlier-videot yhteensä: {outlier_count} kpl")

        # 2. Tallennetaan Google Sheetiin
        save_to_google_sheet(sheets_service, sheet_id, rows)
        print("\nKaikki valmista! Tulokset päivitetty Google Sheetiin onnistuneesti.")

    except Exception as e:
        print(f"\nKäsittelemätön virhe: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
