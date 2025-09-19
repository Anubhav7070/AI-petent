"use client" // Added client directive to prevent SSR document errors

import { Navigation } from "@/components/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, QrCode } from "lucide-react"
import { FacialRecognition } from "@/components/facial-recognition"
import { QRScanner } from "@/components/qr-scanner"

export default function AttendancePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">Smart Attendance System</h1>
          <p className="text-lg text-muted-foreground text-pretty">
            AI-powered attendance tracking with facial recognition and QR code scanning
          </p>
        </div>

        <Tabs defaultValue="qr" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="qr" className="gap-2 text-base">
              <QrCode className="w-4 h-4" />
              QR Code Scanner
            </TabsTrigger>
            <TabsTrigger value="facial" className="gap-2 text-base">
              <Camera className="w-4 h-4" />
              Facial Recognition
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr">
            <QRScanner />
          </TabsContent>

          <TabsContent value="facial">
            <FacialRecognition />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
