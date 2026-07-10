import RequireRole from '@/components/RequireRole'

export default function VentesLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={['admin']}>{children}</RequireRole>
}
