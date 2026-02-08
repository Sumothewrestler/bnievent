import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BOOK YOUR TICKETS',
  description: 'Book Your Tickets for BNI Event',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://sdk.cashfree.com/js/v3/cashfree.js" async></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
