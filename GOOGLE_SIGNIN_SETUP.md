# Google sign-in setup

Google sign-in has a no-cost Firebase tier suitable for this POC, subject to quotas. Standard Google Sheets API usage within quota has no additional API charge. Hosting, storage, Gemini images, and Veo have separate pricing; enabling sign-in does not make the whole application free. See [Firebase pricing](https://firebase.google.com/pricing) and [Sheets API limits](https://developers.google.com/workspace/sheets/api/limits).

## Configure once as the app operator

1. Open the [Firebase console](https://console.firebase.google.com/) and add Firebase to your Google Cloud project (or create a Firebase project for local use).
2. Under **Authentication → Sign-in method**, enable **Google**, choose a support email, and save.
3. Under **Authentication → Settings → Authorized domains**, add `localhost` for local development and your deployed site's hostname for deployment. Enter hostnames without a URL path or port.
4. Under **Project settings → General → Your apps**, register a **Web app** and copy its Firebase configuration. Firebase Hosting is not required for the Cloud Run app.
5. Copy `.env.example` to `.env` if needed. Set this public web configuration on a single line, using your real values:

```dotenv
DEMO_MODE=false
FIREBASE_WEB_CONFIG={"apiKey":"YOUR_FIREBASE_WEB_API_KEY","authDomain":"YOUR_PROJECT.firebaseapp.com","projectId":"YOUR_PROJECT","appId":"YOUR_WEB_APP_ID"}
```

6. Restart `npm run dev` and visit **http://localhost:8088/login**. Click **Continue with Google**. First sign-in creates the account automatically; returning users open the same workspace. The same action handles registration and login.

The Firebase web API key identifies the Firebase project and is designed to be public. It is different from `GEMINI_API_KEY`, which must remain on the backend. No application Google client secret is required for this Firebase popup flow. Keep `.env` out of version control.

For Cloud Run, save the web configuration object as a JSON file and pass its path to `deploy.ps1 -FirebaseConfigFile ...` with the other deployment parameters. Use the same Firebase/Google Cloud project. Authorize the resulting Cloud Run hostname in Firebase Authentication.

Implementation follows [Firebase's Google sign-in guide](https://firebase.google.com/docs/auth/web/google-signin).

## What users connect

Users only choose their Google account and consent to basic identity access. They do not set up a Firebase project themselves. Each account receives its own studio, blank brand profile, and sample starter catalog/audiences.

- Local records: `.data/workspaces/user_<hash>/workspace.json`.
- Local private media: the same workspace directory, under `media`.
- Cloud records: per-workspace Firestore documents; media in a private bucket with workspace-scoped paths.
- Public storefront: the studio's intentional public catalog/brand and isolated customer sessions.

Signing in does **not** grant Sheets access. Use **Customer Hub ? Connect Google Sheets** for separate consent and workbook creation after the operator completes [Sheets setup](GOOGLE_SHEETS_SETUP.md). The existing service-account Sheet connector is restricted to explicit sample demo mode. Gemini generation uses the operator's backend API key; this change does not add individual user keys.

## Verify with real accounts

Sign in with two Google accounts, change each brand name, upload a distinct photo, then sign out and back in. Confirm each account retains only its own private changes and media. Automated isolation checks use injected verified-token fixtures; real Google popup, domain, and project configuration still need this live check.
