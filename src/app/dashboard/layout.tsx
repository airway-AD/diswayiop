import RequireRole from '@/components/RequireRole'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={['admin', 'marcom']}>{children}</RequireRole>
}
