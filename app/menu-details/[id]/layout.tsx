// app/menu-details/layout.tsx
import { AuthProvider } from "@/components/AuthProvider";

export default function MenuDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
