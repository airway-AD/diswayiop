import RequireRole from '@/components/RequireRole'

export default function InfographisteLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={['infographiste']}>{children}</RequireRole>
}
