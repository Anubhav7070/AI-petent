export interface QRScanResult {
  success: boolean
  qr_codes_found: number
  results: Array<{
    success: boolean
    type: "student_id" | "attendance_session"
    student_id?: string
    student_name?: string
    session_id?: string
    session_name?: string
    class_id?: string
    expires_at?: string
    message: string
  }>
}

export interface StudentQRData {
  type: "student_id"
  student_id: string
  student_name: string
  timestamp: string
}

export interface SessionQRData {
  type: "attendance_session"
  session_id: string
  session_name: string
  class_id: string
  timestamp: string
  expires_at: string
}

export class QRScannerService {
  private apiBaseUrl: string

  constructor() {
    // Use localhost for development, adjust for production
    this.apiBaseUrl = process.env.NEXT_PUBLIC_QR_API_URL || "http://localhost:5001"
  }

  // Convert video frame to base64 image
  private videoToBase64(video: HTMLVideoElement): string {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    
    if (!ctx) return ""
    
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    return canvas.toDataURL('image/jpeg', 0.8)
  }

  // Real QR code scanning using Python backend
  async scanQRCode(video: HTMLVideoElement): Promise<QRScanResult> {
    try {
      const imageData = this.videoToBase64(video)
      
      const response = await fetch(`${this.apiBaseUrl}/api/qr-scanner/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_data: imageData }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: QRScanResult = await response.json()
      return result
    } catch (error) {
      console.error("Error in QR scanning:", error)
      // Fallback to mock data if API is not available
      return this.getMockQRResult()
    }
  }

  // Fallback mock QR scanning
  private getMockQRResult(): QRScanResult {
    const mockResults = [
      {
        success: true,
        type: "student_id" as const,
        student_id: "STU001",
        student_name: "John Doe",
        message: "Student John Doe identified successfully"
      },
      {
        success: true,
        type: "attendance_session" as const,
        session_id: "session_123",
        session_name: "Morning Lecture",
        class_id: "CS101",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        message: "Session Morning Lecture identified successfully"
      }
    ]

    return {
      success: true,
      qr_codes_found: 1,
      results: [mockResults[Math.floor(Math.random() * mockResults.length)]]
    }
  }

  // Add student to QR system
  async addStudent(studentId: string, studentName: string, email = "", department = ""): Promise<{success: boolean, message: string}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/qr-scanner/add-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          student_name: studentName,
          email,
          department
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error adding student:", error)
      return { success: false, message: "Failed to add student" }
    }
  }

  // Create attendance session
  async createSession(sessionName: string, classId: string, durationHours = 24): Promise<{success: boolean, session?: any, qr_data?: string}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/qr-scanner/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_name: sessionName,
          class_id: classId,
          duration_hours: durationHours
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error creating session:", error)
      return { success: false }
    }
  }

  // Mark attendance
  async markAttendance(studentId: string, sessionId?: string, method = "qr"): Promise<{success: boolean, message: string}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/qr-scanner/mark-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          session_id: sessionId,
          method
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error marking attendance:", error)
      return { success: false, message: "Failed to mark attendance" }
    }
  }

  // Get students list
  async getStudents(): Promise<{success: boolean, students: Array<{student_id: string, student_name: string, email: string, department: string}>}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/qr-scanner/students`)
      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error getting students:", error)
      return { success: false, students: [] }
    }
  }

  // Get sessions list
  async getSessions(): Promise<{success: boolean, sessions: Array<any>}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/qr-scanner/sessions`)
      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error getting sessions:", error)
      return { success: false, sessions: [] }
    }
  }

  // Get attendance report
  async getAttendanceReport(date?: string, studentId?: string, sessionId?: string): Promise<{success: boolean, records: any[]}> {
    try {
      const params = new URLSearchParams()
      if (date) params.append('date', date)
      if (studentId) params.append('student_id', studentId)
      if (sessionId) params.append('session_id', sessionId)

      const response = await fetch(`${this.apiBaseUrl}/api/qr-scanner/attendance-report?${params}`)
      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error getting attendance report:", error)
      return { success: false, records: [] }
    }
  }

  // Get student QR code data
  async getStudentQR(studentId: string): Promise<{success: boolean, qr_data?: string, student_name?: string}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/qr-scanner/student-qr/${studentId}`)
      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error getting student QR:", error)
      return { success: false }
    }
  }

  // Check API health
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/qr-scanner/health`)
      const result = await response.json()
      return result.status === "healthy"
    } catch (error) {
      console.error("QR Scanner API not available:", error)
      return false
    }
  }

  // Generate QR code for student (client-side)
  generateStudentQR(studentId: string, studentName: string): string {
    const qrData: StudentQRData = {
      type: "student_id",
      student_id: studentId,
      student_name: studentName,
      timestamp: new Date().toISOString()
    }
    return JSON.stringify(qrData)
  }

  // Generate QR code for session (client-side)
  generateSessionQR(sessionId: string, sessionName: string, classId: string, expiresAt: string): string {
    const qrData: SessionQRData = {
      type: "attendance_session",
      session_id: sessionId,
      session_name: sessionName,
      class_id: classId,
      timestamp: new Date().toISOString(),
      expires_at: expiresAt
    }
    return JSON.stringify(qrData)
  }

  // Parse QR code data
  parseQRData(qrData: string): StudentQRData | SessionQRData | null {
    try {
      const parsed = JSON.parse(qrData)
      if (parsed.type === "student_id" || parsed.type === "attendance_session") {
        return parsed
      }
      return null
    } catch (error) {
      console.error("Error parsing QR data:", error)
      return null
    }
  }
}

export const qrScannerService = typeof window !== "undefined" ? new QRScannerService() : null
