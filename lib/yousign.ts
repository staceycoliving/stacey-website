import { env } from "./env";

const YOUSIGN_API_KEY = env.YOUSIGN_API_KEY;
const YOUSIGN_BASE_URL = env.YOUSIGN_BASE_URL;

function headers() {
  return {
    Authorization: `Bearer ${YOUSIGN_API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function yousignFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${YOUSIGN_BASE_URL}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Yousign API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── 1. Create signature request ───
export async function createSignatureRequest(name: string) {
  return yousignFetch("/signature_requests", {
    method: "POST",
    body: JSON.stringify({
      name,
      delivery_mode: "none", // No emails from Yousign — we send the signed doc ourselves
      timezone: "Europe/Berlin",
    }),
  });
}

// ─── 2. Upload document ───
export async function uploadDocument(
  signatureRequestId: string,
  fileBuffer: Buffer,
  fileName: string
) {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(fileBuffer)]), fileName);
  formData.append("nature", "signable_document");

  const res = await fetch(
    `${YOUSIGN_BASE_URL}/signature_requests/${signatureRequestId}/documents`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` },
      body: formData,
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Yousign upload error ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── 3. Add signer with signature fields ───
type SignatureField = {
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export async function addSigner(
  signatureRequestId: string,
  documentId: string,
  signer: {
    firstName: string;
    lastName: string;
    email: string;
  },
  signatureFields: SignatureField[]
) {
  return yousignFetch(`/signature_requests/${signatureRequestId}/signers`, {
    method: "POST",
    body: JSON.stringify({
      info: {
        first_name: signer.firstName,
        last_name: signer.lastName,
        email: signer.email,
        locale: "en",
      },
      signature_level: "electronic_signature",
      signature_authentication_mode: "no_otp",
      fields: signatureFields.map((f) => ({
        type: "signature",
        document_id: documentId,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width ?? 190,
        height: f.height ?? 50,
      })),
    }),
  });
}

// ─── 4. Activate signature request ───
export async function activateSignatureRequest(signatureRequestId: string) {
  return yousignFetch(`/signature_requests/${signatureRequestId}/activate`, {
    method: "POST",
  });
}

// ─── 5. Download signed document ───
export async function downloadSignedDocument(
  signatureRequestId: string,
  documentId: string
): Promise<ArrayBuffer> {
  const res = await fetch(
    `${YOUSIGN_BASE_URL}/signature_requests/${signatureRequestId}/documents/${documentId}/download`,
    { headers: { Authorization: `Bearer ${YOUSIGN_API_KEY}` } }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Yousign download error ${res.status}: ${body}`);
  }
  return res.arrayBuffer();
}

// ─── Lease signature position (tenant, page 1 only) ───
// 12,92cm from left = 366pt, 26,3cm from top = 746pt
// Yousign coordinates: origin top-left, A4 = 595 x 842 pt
const LEASE_SIGNATURE_FIELDS: SignatureField[] = [
  { page: 1, x: 366, y: 746, width: 190, height: 45 },
];

// ─── Full flow: generate signing URL ───
export async function createLeaseSigningSession(
  fileBuffer: Buffer,
  fileName: string,
  signer: { firstName: string; lastName: string; email: string }
) {
  // 1. Create request
  const sigReq = await createSignatureRequest(
    `Lease Agreement – ${signer.firstName} ${signer.lastName}`
  );

  // 2. Upload document
  const doc = await uploadDocument(sigReq.id, fileBuffer, fileName);

  // 3. Add signer with signature fields on pages 1, 4, 6, 8, 10
  const signerResult = await addSigner(
    sigReq.id,
    doc.id,
    signer,
    LEASE_SIGNATURE_FIELDS
  );
  // 4. Activate — signing URL is in the activated response
  const activated = await activateSignatureRequest(sigReq.id);

  const signingUrl =
    signerResult.signature_link ??
    activated?.signers?.[0]?.signature_link ??
    null;

  return {
    signatureRequestId: sigReq.id,
    documentId: doc.id,
    signerId: signerResult.id,
    signingUrl,
  };
}

export function isYousignConfigured() {
  return YOUSIGN_API_KEY.length > 0;
}
