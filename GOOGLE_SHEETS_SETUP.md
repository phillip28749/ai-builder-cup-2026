# Connect each user's Google Sheets

Firebase Google sign-in identifies the user. The separate **Customer Hub → Connect Google Sheets** action asks Google for permission to create and maintain the studio workbook in that user's Drive. This uses Google's server-side OAuth flow with offline access; the frontend never receives the OAuth client secret or refresh token.

## One-time operator setup

Use the same Google Cloud project as Firebase, currently `ai-builder-cup-66e9f` for local configuration.

1. Enable the [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=ai-builder-cup-66e9f).
2. In **Google Auth Platform**, configure **Branding** (app name/support contacts) and **Audience**. For an external app in Testing, add every demo user's Google email under Test users.
3. Under **Data Access**, declare `openid`, `email`, and `https://www.googleapis.com/auth/drive.file`. This Drive scope permits files created through this app; broad Drive access is not requested. Existing arbitrary spreadsheets cannot be selected in this POC.
4. Under [Clients](https://console.cloud.google.com/auth/clients?project=ai-builder-cup-66e9f), create an OAuth client of type **Web application** for the Sheets integration. Use an app-specific client rather than modifying Firebase's login redirect configuration.
5. Add this exact **Authorized redirect URI**:

```text
http://localhost:8088/api/google/sheets/callback
```

6. Save the OAuth **Client ID** and **Client secret** in the root `.env`:

```dotenv
GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8088/api/google/sheets/callback
SESSION_SECRET=YOUR_STABLE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
```

Local placeholders and a random session secret were prepared during implementation. Keep the existing secret stable: changing it invalidates customer cookies and prevents decrypting existing Sheets credentials. Generate a new secret only for a new installation, for example with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

7. Restart `npm run dev`. Use **http://localhost:8088** consistently, including for Google sign-in and connection; do not switch to `127.0.0.1` during the OAuth round trip.

For Cloud Run, register `https://YOUR_CLOUD_RUN_HOST/api/google/sheets/callback` and set that exact redirect in the backend. The deploy script accepts optional `OAuthClientId`, `OAuthSecretName`, and `PublicOrigin` parameters together. Store the OAuth client secret in Secret Manager and grant the runtime service account access. Firebase web configuration and the OAuth client ID are public identifiers; the OAuth client secret, session secret, and refresh tokens are private.

## User flow

1. Sign in to the studio with Google.
2. Open **Customer Hub → Connect Google Sheets**.
3. Approve access using the **same Google account** as the studio login.
4. The app creates a workbook named after the brand with Products, BranchStock, and Orders tabs, and writes the current catalog, stock, and submitted orders. Draft orders are excluded. This includes sample starter products if they remain in the studio.
5. Back in Customer Hub, use **Open Sheet** and **Sync workbook**. Submitted orders and owner status changes update this workbook through the existing connector. Accepted orders adjust stock; rejected/cancelled orders do not adjust stock.

Products is updated when you add an item, save offering name/description/price changes, or click Sync workbook. Editing Products in Sheets does not update the studio catalog and may be replaced on the next app sync. New items receive their starting BranchStock rows; catalog sync preserves existing stock quantities. Failed writes remain saved locally with a retry action. BranchStock is the live stock source after connection. Brand profiles, posts, media, and conversations remain in local/Firestore storage, not in the Sheet. Stock synchronization is manual or triggered during order actions; it is not a continuous background mirror of every studio record.

**Disconnect** deletes stored OAuth credentials and stops this app's sync while preserving the workbook. Reconnecting reuses its recorded ID and refreshes stock without reinitializing its data. Orders created while disconnected are not automatically backfilled on reconnect; review those records manually. You can separately remove the app's Google permission in your Google account settings.

If creation succeeded but initialization failed, **Finish workbook setup** retries writing the initial records to that same workbook. Do not edit the incomplete workbook before initialization finishes. If the workbook was deleted or no longer accessible, reconnect cannot recreate it automatically; restore it or have the operator reconcile the connection record.

## Security and persistence

- Each integration belongs to the verified Firebase workspace. Google callback identity must match that user's Google provider identity.
- OAuth state expires after ten minutes, is single-use, and is bound to an HTTP-only browser cookie. The authorization-code exchange uses PKCE.
- Tokens and the pending PKCE verifier are encrypted with AES-256-GCM using a key derived from `SESSION_SECRET`, with the workspace ID as authenticated context.
- Local connection metadata: `.data/workspaces/user_<hash>/sheets-connection.json`; cloud: `workspaces/{id}/integrations/sheets`. Neither is returned by owner state or public APIs.
- Customer storefront requests can use the owner's stored authorization to write that storefront's confirmed submissions. They cannot pick another private integration or fetch OAuth credentials.
- The existing demo service-account Sheet remains separate. Personal accounts never use the global demo Sheet ID.
- Refresh authorization can expire or be revoked; use **Renew Google access** to consent again. External Testing apps have Google's testing restrictions, including refresh-token expiry in applicable cases.

## Validation status

TypeScript checking and production build completed. This flow has not been exercised against live OAuth credentials or a real workbook. Before the demo, verify consent/cancellation, same-account enforcement, two-account isolation, workbook creation, token refresh after restart, order submission/acceptance, initialization retry, and disconnect/reconnect in the configured Google project.

References: [Google server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Drive file scope](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), and [Sheets creation](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/create).
