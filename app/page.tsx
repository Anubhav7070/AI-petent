import { MLFrameworkDashboard } from "@/components/ml-framework-dashboard"
import { Navigation } from "@/components/navigation"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-balance">
            AI-Powered Educational Management System
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Real-time hybrid machine learning framework for educational institutions
          </p>
        </div>
        <MLFrameworkDashboard />
      </main>
    </div>
  )
}
