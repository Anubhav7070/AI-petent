"use client" // Added client directive to prevent SSR document errors

import { Navigation } from "@/components/navigation"
import { TeacherDashboard } from "@/components/teacher-dashboard"

export default function TeacherPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <TeacherDashboard />
      </main>
    </div>
  )
}
