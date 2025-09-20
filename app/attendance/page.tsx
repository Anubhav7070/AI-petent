"use client" // Added client directive to prevent SSR document errors

import { Navigation } from "@/components/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, QrCode, UserPlus } from "lucide-react"
import { FacialRecognition } from "@/components/facial-recognition"
import { QRScanner } from "@/components/qr-scanner"
import { FaceEnrollment } from "@/components/face-enrollment"

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

        <Tabs defaultValue="enrollment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="enrollment" className="gap-2 text-base">
              <UserPlus className="w-4 h-4" />
              Student Enrollment
            </TabsTrigger>
            <TabsTrigger value="facial" className="gap-2 text-base">
              <Camera className="w-4 h-4" />
              Facial Recognition
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-2 text-base">
              <QrCode className="w-4 h-4" />
              QR Code Scanner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="enrollment">
            <FaceEnrollment />
          </TabsContent>

          <TabsContent value="facial">
            <FacialRecognition />
          </TabsContent>

          <TabsContent value="qr">
            <QRScanner />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
