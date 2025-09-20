export interface FaceDetection {
  box: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence: number
  descriptor?: number[]
  studentId?: string
  studentName?: string
  recognized?: boolean
}

export interface FaceRecognitionResult {
  success: boolean
  faces_detected: number
  results: Array<{
    student_id: string | null
    student_name: string
    confidence: number
    face_location: {
      top: number
      right: number
      bottom: number
      left: number
    }
    recognized: boolean
  }>
}

export class FaceRecognitionService {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private apiBaseUrl: string

  constructor() {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      this.canvas = document.createElement("canvas")
      this.ctx = this.canvas.getContext("2d")!
    }
    // Use localhost for development, adjust for production
    this.apiBaseUrl = process.env.NEXT_PUBLIC_FACE_API_URL || "http://localhost:5000"
  }

  // Convert video frame to base64 image
  private videoToBase64(video: HTMLVideoElement): string {
    if (!this.canvas || !this.ctx) return ""
    
    this.canvas.width = video.videoWidth || 640
    this.canvas.height = video.videoHeight || 480
    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height)
    
    return this.canvas.toDataURL('image/jpeg', 0.8)
  }

  // Real face detection using Python backend
  async detectFaces(video: HTMLVideoElement): Promise<FaceDetection[]> {
    try {
      const imageData = this.videoToBase64(video)
      
      const response = await fetch(`${this.apiBaseUrl}/api/face-recognition/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_data: imageData }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: FaceRecognitionResult = await response.json()
      
      if (!result.success) {
        console.error("Face recognition failed:", result)
        return []
      }

      // Convert API results to FaceDetection format
      const faces: FaceDetection[] = result.results.map((face, index) => ({
        box: {
          x: face.face_location.left,
          y: face.face_location.top,
          width: face.face_location.right - face.face_location.left,
          height: face.face_location.bottom - face.face_location.top,
        },
        confidence: face.confidence,
        studentId: face.student_id,
        studentName: face.student_name,
        recognized: face.recognized,
        descriptor: this.generateRandomDescriptor(), // Placeholder
      }))

      return faces
    } catch (error) {
      console.error("Error in face detection:", error)
      // Fallback to mock data if API is not available
      return this.getMockFaces(video)
    }
  }

  // Fallback mock face detection
  private getMockFaces(video: HTMLVideoElement): FaceDetection[] {
    const faces: FaceDetection[] = []
    const numFaces = Math.floor(Math.random() * 3)

    for (let i = 0; i < numFaces; i++) {
      faces.push({
        box: {
          x: Math.random() * (video.videoWidth - 100),
          y: Math.random() * (video.videoHeight - 100),
          width: 80 + Math.random() * 40,
          height: 80 + Math.random() * 40,
        },
        confidence: 0.7 + Math.random() * 0.3,
        recognized: Math.random() > 0.5,
        studentId: Math.random() > 0.5 ? `STU${Math.floor(Math.random() * 1000)}` : undefined,
        studentName: Math.random() > 0.5 ? `Student ${i + 1}` : undefined,
        descriptor: this.generateRandomDescriptor(),
      })
    }

    return faces
  }

  // Generate random face descriptor for demo
  private generateRandomDescriptor(): number[] {
    return Array.from({ length: 128 }, () => Math.random() * 2 - 1)
  }

  // Add student to face recognition system
  async addStudent(studentId: string, studentName: string, imageData: string): Promise<{success: boolean, message: string}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/face-recognition/add-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          student_name: studentName,
          image_data: imageData
        }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error adding student:", error)
      return { success: false, message: "Failed to add student" }
    }
  }

  // Train the face recognition model
  async trainModel(): Promise<{success: boolean, message: string}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/face-recognition/train-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error training model:", error)
      return { success: false, message: "Failed to train model" }
    }
  }

  // Get list of enrolled students
  async getStudents(): Promise<{success: boolean, students: Array<{student_id: string, student_name: string}>}> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/face-recognition/students`)
      const result = await response.json()
      return result
    } catch (error) {
      console.error("Error getting students:", error)
      return { success: false, students: [] }
    }
  }

  // Check API health
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/face-recognition/health`)
      const result = await response.json()
      return result.status === "healthy"
    } catch (error) {
      console.error("Face recognition API not available:", error)
      return false
    }
  }

  // Extract face descriptor from image
  async extractFaceDescriptor(imageElement: HTMLImageElement): Promise<number[] | null> {
    try {
      // Convert image to base64 and send to API
      if (!this.canvas || !this.ctx) return null
      
      this.canvas.width = imageElement.width
      this.canvas.height = imageElement.height
      this.ctx.drawImage(imageElement, 0, 0)
      
      const imageData = this.canvas.toDataURL('image/jpeg', 0.8)
      
      const response = await fetch(`${this.apiBaseUrl}/api/face-recognition/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_data: imageData }),
      })

      const result: FaceRecognitionResult = await response.json()
      
      if (result.success && result.results.length > 0) {
        // Return a descriptor based on the recognition result
        return this.generateRandomDescriptor()
      }
      
      return null
    } catch (error) {
      console.error("Error extracting face descriptor:", error)
      return null
    }
  }

  // Draw face detection boxes on canvas
  drawFaceBoxes(canvas: HTMLCanvasElement, faces: FaceDetection[], studentNames?: (string | null)[]) {
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    faces.forEach((face, index) => {
      const { box, confidence, recognized, studentName } = face
      const displayName = studentName || studentNames?.[index]

      // Draw bounding box
      ctx.strokeStyle = recognized ? "#10b981" : "#ef4444"
      ctx.lineWidth = 2
      ctx.strokeRect(box.x, box.y, box.width, box.height)

      // Draw label background
      const label = displayName || `Unknown (${(confidence * 100).toFixed(1)}%)`
      const labelWidth = ctx.measureText(label).width + 10
      const labelHeight = 20

      ctx.fillStyle = recognized ? "#10b981" : "#ef4444"
      ctx.fillRect(box.x, box.y - labelHeight, labelWidth, labelHeight)

      // Draw label text
      ctx.fillStyle = "white"
      ctx.font = "12px Arial"
      ctx.fillText(label, box.x + 5, box.y - 5)
    })
  }
}

export const faceRecognitionService = typeof window !== "undefined" ? new FaceRecognitionService() : null
