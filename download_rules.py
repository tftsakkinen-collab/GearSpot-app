#!/usr/bin/env python3
"""
Antigravity-koodariagentti - Google Drive Rule Sync
Lataa '03_DEV_AND_SYSTEMS.md' Google Drivesta ja tallentaa sen lokaalisti kansioon 'config/rules.md'.
"""

import io
import json
import os
import sys
from dotenv import load_dotenv
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials as UserCredentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import google.auth
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.errors import HttpError

# Google Drive API Scopes (vain lukuoikeus vaaditaan)
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# Oletusarvoiset tiedostonimet ja polut
DEFAULT_DRIVE_FILENAME = "03_DEV_AND_SYSTEMS.md"
DEFAULT_TARGET_FILEPATH = os.path.join("config", "rules.md")


def get_credentials():
    """
    Hakee Google Drive -tunnistautumistiedot .env-tiedostosta ja ympäristömuuttujista.
    Tukee:
      1. Service Account JSON -tiedostoa (SERVICE_ACCOUNT_FILE tai GOOGLE_APPLICATION_CREDENTIALS)
      2. Service Account JSON -merkkijonoa (SERVICE_ACCOUNT_INFO)
      3. OAuth 2.0 käyttäjätunnuksia (OAUTH_CLIENT_SECRETS_FILE ja OAUTH_TOKEN_FILE)
      4. Oletusarvoista Application Default Credentials (ADC) -tunnistautumista
    """
    load_dotenv()

    # 1. Service Account -tiedostopolku
    sa_file = os.getenv("SERVICE_ACCOUNT_FILE") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_file and os.path.exists(sa_file):
        print(f"Käytetään Service Account -avaintiedostoa: {sa_file}")
        return service_account.Credentials.from_service_account_file(
            sa_file, scopes=SCOPES
        )

    # 2. Service Account JSON suoraan ympäristömuuttujana
    sa_info_str = os.getenv("SERVICE_ACCOUNT_INFO")
    if sa_info_str:
        try:
            sa_info = json.loads(sa_info_str)
            print("Käytetään SERVICE_ACCOUNT_INFO -ympäristömuuttujaa.")
            return service_account.Credentials.from_service_account_info(
                sa_info, scopes=SCOPES
            )
        except json.JSONDecodeError as err:
            raise ValueError(f"SERVICE_ACCOUNT_INFO sisältää virheellistä JSON-dataa: {err}")

    # 3. OAuth 2.0 User Token & Client Secrets
    token_file = os.getenv("OAUTH_TOKEN_FILE", "token.json")
    client_secrets_file = os.getenv("OAUTH_CLIENT_SECRETS_FILE")

    creds = None
    if os.path.exists(token_file):
        try:
            creds = UserCredentials.from_authorized_user_file(token_file, SCOPES)
        except Exception as e:
            print(f"Varoitus: Token-tiedoston lukeminen epäonnistui: {e}")

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Päivitetään vanhentunut OAuth-token...")
            creds.refresh(Request())
        elif client_secrets_file and os.path.exists(client_secrets_file):
            print("Aloitetaan OAuth2-kirjautumisprosessi...")
            flow = InstalledAppFlow.from_client_secrets_file(client_secrets_file, SCOPES)
            creds = flow.run_local_server(port=0)
            with open(token_file, "w", encoding="utf-8") as token:
                token.write(creds.to_json())
            print(f"OAuth-token tallennettu tiedostoon: {token_file}")

    if creds:
        return creds

    # 4. Google Auth Default fallback
    try:
        default_creds, _ = google.auth.default(scopes=SCOPES)
        if default_creds:
            print("Käytetään järjestelmän oletustunnistautumista (Google ADC).")
            return default_creds
    except Exception:
        pass

    raise RuntimeError(
        "Autentikaatiota ei löydetty!\n"
        "Määritä Service Account tai OAuth -tiedot .env-tiedostoon.\n"
        "Katso mallia tiedostosta .env.example."
    )


def download_file_from_drive(drive_service, drive_filename: str, target_filepath: str):
    """
    Etsii ja lataa tiedoston Google Drivesta paikalliseen kohdepolkuun.
    """
    print(f"Etsitään tiedostoa '{drive_filename}' Google Drivesta...")

    # Etsitään tiedosto nimellä, poissuljetaan roskakorissa olevat
    query = f"name = '{drive_filename}' and trashed = false"
    response = drive_service.files().list(
        q=query,
        spaces='drive',
        fields='files(id, name, mimeType)',
        pageSize=10
    ).execute()

    files = response.get('files', [])

    if not files:
        raise FileNotFoundError(
            f"Tiedostoa '{drive_filename}' ei löytynyt Google Drivesta. "
            "Varmista, että tiedosto on olemassa ja että Service Accountilla / käyttäjällä on lukuoikeus siihen."
        )

    file_item = files[0]
    file_id = file_item['id']
    mime_type = file_item.get('mimeType', '')
    print(f"Löydetty tiedosto: {file_item['name']} (ID: {file_id}, Tyyppi: {mime_type})")

    # Varmistetaan kohdekansion olemassaolo
    target_dir = os.path.dirname(target_filepath)
    if target_dir:
        os.makedirs(target_dir, exist_ok=True)

    # Ladataan sisältö
    # Jos kyseessä on Google Docs -dokumentti, exportataan tekstinä/markdownina
    if mime_type == 'application/vnd.google-apps.document':
        print("Tiedosto on Google Doc -dokumentti, viedään tekstimuodossa (text/plain)...")
        request = drive_service.files().export_media(
            fileId=file_id,
            mimeType='text/plain'
        )
    else:
        # Binääri- tai tavallinen tiedosto (esim. suora .md-tiedosto)
        request = drive_service.files().get_media(fileId=file_id)

    file_stream = io.BytesIO()
    downloader = MediaIoBaseDownload(file_stream, request)

    done = False
    while not done:
        status, done = downloader.next_chunk()
        if status:
            print(f"Lataus: {int(status.progress() * 100)}%")

    # Kirjoitetaan paikalliseen tiedostoon
    file_stream.seek(0)
    with open(target_filepath, 'wb') as f:
        f.write(file_stream.read())

    print(f"Tiedosto tallennettu onnistuneesti kohteeseen: {target_filepath}")


def main():
    load_dotenv()
    drive_filename = os.getenv("DRIVE_FILENAME", DEFAULT_DRIVE_FILENAME)
    target_filepath = os.getenv("TARGET_FILEPATH", DEFAULT_TARGET_FILEPATH)

    try:
        credentials = get_credentials()
        drive_service = build('drive', 'v3', credentials=credentials)
        download_file_from_drive(drive_service, drive_filename, target_filepath)
        print("Valmis!")
    except Exception as e:
        print(f"VIRHE: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
