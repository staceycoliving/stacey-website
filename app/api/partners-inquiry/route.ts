import { NextResponse } from "next/server";
import { z } from "zod";
import { resend } from "@/lib/email/_shared";

// Where partner inquiries get delivered. Override via env var in Vercel.
const PARTNER_EMAIL = process.env.PARTNERS_INQUIRY_EMAIL || "booking@stacey.de";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  company: z.string().max(120).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  propertyCity: z.string().max(80).optional().default(""),
  propertySize: z.string().max(80).optional().default(""),
  message: z.string().min(10).max(5000),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const rows = [
    ["Name", d.name],
    ["Email", d.email],
    ["Company", d.company || ","],
    ["Phone", d.phone || ","],
    ["Property city", d.propertyCity || ","],
    ["Property size", d.propertySize || ","],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px">${k}</td><td style="padding:6px 0;font-size:14px;color:#111">${v}</td></tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111">New partners inquiry</h2>
      <table style="border-collapse:collapse">${rows}</table>
      <h3 style="margin:24px 0 8px;font-size:14px;color:#111">Message</h3>
      <p style="white-space:pre-wrap;font-size:14px;line-height:1.55;color:#333">${d.message.replace(/</g, "&lt;")}</p>
    </div>
  `.trim();

  const text = [
    "New partners inquiry",
    "",
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    d.company && `Company: ${d.company}`,
    d.phone && `Phone: ${d.phone}`,
    d.propertyCity && `Property city: ${d.propertyCity}`,
    d.propertySize && `Property size: ${d.propertySize}`,
    "",
    "Message:",
    d.message,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await resend.emails.send({
      from: "STACEY Partners <booking@stacey.de>",
      to: PARTNER_EMAIL,
      replyTo: d.email,
      subject: `Partners inquiry, ${d.name}${d.company ? ` (${d.company})` : ""}`,
      html,
      text,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("partners inquiry email failed:", err);
    return NextResponse.json(
      { error: "Email delivery failed, please try again later." },
      { status: 502 },
    );
  }
}
