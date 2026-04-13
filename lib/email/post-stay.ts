import { resend, FROM, layout, ctaButton } from "./_shared";
import { env } from "@/lib/env";

interface PostStayEmailData {
  firstName: string;
  email: string;
  locationName: string;
  locationSlug: string;
  stayType: "SHORT" | "LONG";
}

export async function sendPostStayFeedback(data: PostStayEmailData) {
  const stayLabel = data.stayType === "SHORT" ? "stay" : "time";

  const feedbackUrl = `${env.NEXT_PUBLIC_BASE_URL}/feedback?` + new URLSearchParams({
    location: data.locationSlug,
    name: `STACEY ${data.locationName}`,
    firstName: data.firstName,
    type: data.stayType,
  }).toString();

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Thanks for being part of STACEY, ${data.firstName}!</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">
      We hope you enjoyed your ${stayLabel} at STACEY ${data.locationName}.
      It was great having you — our members make STACEY what it is.
    </p>
    <div style="background:#FFF5F7;border-left:4px solid #FCB0C0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;">How was your ${stayLabel}?</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.5;">
        Your feedback helps us improve and helps future members find their new home.
        It only takes a minute.
      </p>
    </div>
    ${ctaButton("Rate your stay", feedbackUrl)}
    <p style="font-size:14px;color:#555;line-height:1.6;">
      ${data.stayType === "SHORT"
        ? "Thinking about a longer stay? Check out our <a href=\"https://stacey.de\" style=\"color:#1A1A1A;font-weight:600;\">long-term options</a> — many of our members started with a short stay."
        : "You'll always be part of the STACEY family. If you ever need a room again, you know where to find us."}
    </p>
  `);

  return resend.emails.send({
    from: FROM,
    to: data.email,
    subject: `Thanks for staying at STACEY ${data.locationName}`,
    html,
  });
}
