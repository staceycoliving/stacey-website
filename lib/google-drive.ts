import { createSign } from "crypto";

// Zero-dependency Google Drive integration.
// Uses direct JWT signing + REST API calls — no googleapis or google-auth-library
// (those crash Turbopack due to their massive size).

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!email || !rawKey) return null;

  // Reuse cached token
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const key = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  // Build JWT
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })).toString("base64url");

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(key, "base64url");

  const jwt = `${header}.${payload}.${signature}`;

  // Exchange JWT for access token
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    console.error("Google token exchange failed:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

/**
 * Upload a PDF to Google Drive (Shared Drive).
 * Creates subfolders per location and month automatically.
 */
export async function uploadMeldescheinToDrive(params: {
  pdf: Buffer;
  firstName: string;
  lastName: string;
  locationName: string;
  arrivalDate: string;
}): Promise<string | null> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) return null;

  const token = await getToken();
  if (!token) return null;

  try {
    const yearStr = params.arrivalDate.slice(0, 4);
    const yearFolderId = await getOrCreateFolder(token, yearStr, folderId);
    const folderName = params.locationName.replace(/^STACEY\s*/i, "");
    const locationFolderId = await getOrCreateFolder(token, folderName, yearFolderId);

    const arrivalFormatted = params.arrivalDate.replace(/-/g, "");
    const fileName = `${params.lastName}_${params.firstName}_${arrivalFormatted}.pdf`;

    const metadata = JSON.stringify({
      name: fileName,
      parents: [locationFolderId],
      mimeType: "application/pdf",
    });

    const boundary = "stacey_upload_boundary";
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`
      ),
      params.pdf,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&supportsAllDrives=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!res.ok) {
      console.error("Drive upload failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.webViewLink || data.id || null;
  } catch (err) {
    console.error("Google Drive upload failed:", err);
    return null;
  }
}

async function getOrCreateFolder(token: string, name: string, parentId: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files?.length) {
    return searchData.files[0].id;
  }

  const createRes = await fetch(`${DRIVE_API}/files?supportsAllDrives=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      parents: [parentId],
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const createData = await createRes.json();
  return createData.id;
}
