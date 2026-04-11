// Public email API. All app code imports from "@/lib/email" and gets these
// re-exports. Each template lives in its own file under lib/email/ so they
// can be edited in isolation; shared infra (Resend wrapper, layout helpers,
// formatters) lives in _shared.ts.

export { sendShortStayConfirmation } from "./short-stay";
export { sendLongStayConfirmation } from "./long-stay";

export {
  sendDepositPaymentLink,
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
