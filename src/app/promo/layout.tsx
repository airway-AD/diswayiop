import RequireRole from '@/components/RequireRole'

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={['cdp', 'admin']}>{children}</RequireRole>
}
