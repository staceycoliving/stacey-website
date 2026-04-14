import { redirect } from "next/navigation";

// Old /admin/rent route → /admin/finance (Rent Roll tab)
export default function AdminRentRedirect() {
  redirect("/admin/finance?tab=rent");
}
