"""
Genera Refresh Token con acceso a Google Ads + Analytics + Sheets.
Ejecutar: python3 generate_token.py
"""

from google_auth_oauthlib.flow import InstalledAppFlow

CREDENTIALS_FILE = "/Users/Vale/Desktop/COPYLAB PROJECTS/ASISTENTE PERSONAL/credentials/client_secret_469408943186-71c8lttqghqhic79qf9slf2plr2d63p9.apps.googleusercontent.com.json"

SCOPES = [
    "https://www.googleapis.com/auth/adwords",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
]


def main():
    print("Abriendo navegador para autorizar Google Ads + Analytics + Sheets...")
    print("Inicia sesion con la cuenta que tiene acceso.\n")

    flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    print("\nAutorizacion exitosa.\n")
    print("=" * 60)
    print("REFRESH_TOKEN=" + creds.refresh_token)
    print("=" * 60)
    print("\nCopia ese token y pegalo aca en el chat.")


if __name__ == "__main__":
    main()
