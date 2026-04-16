import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Área do Inquilino — ProprietárioZen',
  robots: { index: false, follow: false },
}

export default function InquilinoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
