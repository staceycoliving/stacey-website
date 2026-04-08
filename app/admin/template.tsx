// Override the root template.tsx — no Framer Motion animation for admin pages
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
