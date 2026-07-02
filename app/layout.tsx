import type { Metadata } from "next"
import { Nunito_Sans, Rubik } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { FontProvider } from "@/components/providers/font-provider"

const nunitoSans = Nunito_Sans({ 
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  weight: ["300", "400", "600", "700"]
})

const rubik = Rubik({ 
  subsets: ["latin"],
  variable: "--font-rubik",
  weight: ["400", "500", "600", "700"]
})

export const metadata: Metadata = {
  title: "ANAN POS",
  description: "ระบบจัดการร้านวัสดุก่อสร้าง",
  icons: {
    icon: '/favicon.svg'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" suppressHydrationWarning data-scroll-behavior="smooth" className={`${nunitoSans.variable} ${rubik.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground transition-all duration-200 min-h-screen">
        <FontProvider>
          {children}
          <Toaster position="top-center" richColors />
        </FontProvider>
      </body>
    </html>
  )
}
