// Public email API. All app code imports from "@/lib/email" and gets these
// re-exports. Each template lives in its own file under lib/email/ so they
// can be edited in isolation; shared infra (Resend wrapper, layout helpers,
// formatters) lives in _shared.ts.

export { sendShortStayConfirmation } from "./short-stay";

export {
  sendDepositPaymentLink,
  sendDepositReminder,
  sendDepositConfirmation,
  sendDepositTimeoutNotification,
  sendDepositReturnNotification,
} from "./deposit";

export {
  sendPaymentSetupLink,
  sendPaymentSetupConfirmation,
  sendPaymentSetupReminder,
  sendPaymentFinalWarning,
} from "./payment-setup";

export {
  sendRentReminder,
  sendMahnung1,
  sendMahnung2,
} from "./rent";

export { sendTerminationNotice } from "./termination";

export { sendTeamNotification } from "./team";

export { sendWelcomeEmail } from "./welcome";

export { sendPostStayFeedback } from "./post-stay";

export { sendPreArrival } from "./pre-arrival";

export { sendCheckoutReminder } from "./checkout-reminder";

export { sendInvoice } from "./invoice";

export {
  sendRetargetingNudge,
  buildUnsubscribeUrl,
  buildResumeUrl,
} from "./retargeting";
