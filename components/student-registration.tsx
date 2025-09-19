"use client"

import type React from "react"
import QRCode from "qrcode"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Camera, User, Save, X } from "lucide-react"
import { studentDB, type Student } from "@/lib/student-database"
import { faceRecognitionService } from "@/lib/face-recognition-utils"

interface StudentRegistrationProps {
  onStudentAdded?: (student: Student) => void
  onClose?: () => void
}

export function StudentRegistration({ onStudentAdded, onClose }: StudentRegistrationProps) {
  const [formData, setFormData] = useState({
    name: "",
    rollNumber: "",
    email: "",
    class: "",
    section: "",
  })
  const [faceImage, setFaceImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [studentQRCode, setStudentQRCode] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.rollNumber.trim()) newErrors.rollNumber = "Roll number is required"
    if (!formData.class.trim()) newErrors.class = "Class/Year is required"
    if (!formData.section.trim()) newErrors.section = "Section/Department is required"

    // Check if roll number already exists
    if (formData.rollNumber && studentDB.getStudentByRollNumber(formData.rollNumber)) {
      newErrors.rollNumber = "Roll number already exists"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Please select a valid image file" }))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setFaceImage(e.target?.result as string)
      setErrors((prev) => ({ ...prev, image: "" }))
    }
    reader.readAsDataURL(file)
  }

  const startCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setErrors((prev) => ({ ...prev, camera: "Camera not available in this environment" }))
      return
    }

    try {
      const constraints = {
        video: {
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15 },
        },
        audio: false,
      }

      console.log("[v0] Requesting camera access...")
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("[v0] Camera access granted successfully")

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream

        videoRef.current.onloadedmetadata = () => {
          console.log("[v0] Video metadata loaded")
          videoRef.current
            ?.play()
            .then(() => {
              console.log("[v0] Video playback started")
              setStream(mediaStream)
              setShowCamera(true)
              setErrors((prev) => ({ ...prev, camera: "" }))
            })
            .catch((playError) => {
              console.error("[v0] Video play error:", playError)
              setErrors((prev) => ({ ...prev, camera: "Failed to start video playback" }))
            })
        }

        videoRef.current.onerror = (e) => {
          console.error("[v0] Video error:", e)
          setErrors((prev) => ({ ...prev, camera: "Failed to load video stream" }))
        }
      }
    } catch (error: any) {
      console.error("[v0] Camera access error:", error)

      if (error.name === "NotAllowedError") {
        setErrors((prev) => ({
          ...prev,
          camera: "Camera access denied. Please allow camera access in your browser settings and try again.",
        }))
      } else if (error.name === "NotFoundError") {
        setErrors((prev) => ({
          ...prev,
          camera: "No camera found. Please connect a camera device and refresh the page.",
        }))
      } else if (error.name === "NotReadableError") {
        setErrors((prev) => ({
          ...prev,
          camera: "Camera is already in use by another application. Please close other camera apps and try again.",
        }))
      } else {
        setErrors((prev) => ({
          ...prev,
          camera: `Camera error: ${error.message || "Unable to access camera"}`,
        }))
      }
    }
  }

  const capturePhoto = async () => {
    console.log("[v0] Starting photo capture...")

    if (!videoRef.current || !canvasRef.current) {
      console.error("[v0] Video or canvas ref not available")
      setErrors((prev) => ({ ...prev, camera: "Camera not ready for capture" }))
      return
    }

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      console.error("[v0] Canvas context not available")
      setErrors((prev) => ({ ...prev, camera: "Canvas not available for photo capture" }))
      return
    }

    try {
      // Ensure video is playing and has valid dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error("[v0] Video dimensions are invalid")
        setErrors((prev) => ({ ...prev, camera: "Video not ready. Please wait for camera to initialize." }))
        return
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      console.log(`[v0] Capturing photo at ${canvas.width}x${canvas.height}`)

      // Draw the current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Convert to high-quality JPEG
      const imageData = canvas.toDataURL("image/jpeg", 0.95)

      if (imageData === "data:,") {
        console.error("[v0] Failed to capture image data")
        setErrors((prev) => ({ ...prev, camera: "Failed to capture photo. Please try again." }))
        return
      }

      setFaceImage(imageData)
      console.log("[v0] Photo captured successfully")

      // Store image data for future attendance use
      if (formData.rollNumber && typeof localStorage !== "undefined") {
        localStorage.setItem(`student_photo_${formData.rollNumber}`, imageData)
        console.log("[v0] Photo stored for future attendance tracking")
      }

      stopCamera()
      setErrors((prev) => ({ ...prev, camera: "" }))
    } catch (error) {
      console.error("[v0] Photo capture error:", error)
      setErrors((prev) => ({ ...prev, camera: "Failed to capture photo. Please try again." }))
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const generateStudentQRCode = async (rollNumber: string) => {
    try {
      const qrData = JSON.stringify({
        type: "student_id",
        rollNumber: rollNumber,
        timestamp: Date.now(),
      })

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })

      setStudentQRCode(qrCodeDataURL)
      console.log("[v0] Generated QR code for student:", rollNumber)
    } catch (error) {
      console.error("[v0] QR code generation error:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsProcessing(true)

    try {
      // Create student record
      const newStudent = studentDB.addStudent({
        name: formData.name,
        rollNumber: formData.rollNumber,
        email: formData.email || undefined,
        class: formData.class,
        section: formData.section,
        faceImageUrl: faceImage || undefined,
      })

      await generateStudentQRCode(formData.rollNumber)

      // Process face image if provided
      if (faceImage) {
        const img = new Image()
        img.onload = async () => {
          const descriptor = await faceRecognitionService.extractFaceDescriptor(img)
          if (descriptor) {
            studentDB.updateStudentFaceData(newStudent.id, faceImage, descriptor)
          }
        }
        img.src = faceImage
      }

      onStudentAdded?.(newStudent)

      console.log("[v0] Student added successfully with QR code")
    } catch (error) {
      console.error("[v0] Error adding student:", error)
      setErrors((prev) => ({ ...prev, submit: "Failed to add student" }))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Add New Student
            </CardTitle>
            <CardDescription>Register a new student with their details and face photo</CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter student's full name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rollNumber">Roll Number *</Label>
              <Input
                id="rollNumber"
                value={formData.rollNumber}
                onChange={(e) => handleInputChange("rollNumber", e.target.value)}
                placeholder="Enter roll number"
                className={errors.rollNumber ? "border-red-500" : ""}
              />
              {errors.rollNumber && <p className="text-sm text-red-500">{errors.rollNumber}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Class/Year *</Label>
              <Select value={formData.class} onValueChange={(value) => handleInputChange("class", value)}>
                <SelectTrigger className={errors.class ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select class/year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9th">9th Grade</SelectItem>
                  <SelectItem value="10th">10th Grade</SelectItem>
                  <SelectItem value="11th">11th Grade</SelectItem>
                  <SelectItem value="12th">12th Grade</SelectItem>
                  <SelectItem value="freshman">Freshman (1st Year)</SelectItem>
                  <SelectItem value="sophomore">Sophomore (2nd Year)</SelectItem>
                  <SelectItem value="junior">Junior (3rd Year)</SelectItem>
                  <SelectItem value="senior">Senior (4th Year)</SelectItem>
                  <SelectItem value="graduate">Graduate Student</SelectItem>
                  <SelectItem value="phd">PhD Student</SelectItem>
                </SelectContent>
              </Select>
              {errors.class && <p className="text-sm text-red-500">{errors.class}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="section">Section/Department *</Label>
              <Select value={formData.section} onValueChange={(value) => handleInputChange("section", value)}>
                <SelectTrigger className={errors.section ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select section/department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                  <SelectItem value="D">Section D</SelectItem>
                  <SelectItem value="CS">Computer Science</SelectItem>
                  <SelectItem value="EE">Electrical Engineering</SelectItem>
                  <SelectItem value="ME">Mechanical Engineering</SelectItem>
                  <SelectItem value="CE">Civil Engineering</SelectItem>
                  <SelectItem value="BBA">Business Administration</SelectItem>
                  <SelectItem value="MBA">Master of Business Administration</SelectItem>
                  <SelectItem value="MATH">Mathematics</SelectItem>
                  <SelectItem value="PHYS">Physics</SelectItem>
                  <SelectItem value="CHEM">Chemistry</SelectItem>
                  <SelectItem value="BIO">Biology</SelectItem>
                  <SelectItem value="ENG">English Literature</SelectItem>
                  <SelectItem value="HIST">History</SelectItem>
                  <SelectItem value="PSYC">Psychology</SelectItem>
                </SelectContent>
              </Select>
              {errors.section && <p className="text-sm text-red-500">{errors.section}</p>}
            </div>
          </div>

          {/* Face Photo Section */}
          <div className="space-y-4">
            <div>
              <Label>Face Photo for Attendance (Recommended)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Upload or capture a clear photo for automatic attendance tracking. This photo will be used for facial
                recognition during attendance.
              </p>
            </div>

            {!showCamera && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

            {showCamera && (
              <div className="space-y-2">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-w-md mx-auto rounded-lg border-2 border-primary/20"
                    onLoadedMetadata={() => console.log("[v0] Video metadata loaded, ready for capture")}
                    onError={(e) => console.error("[v0] Video error:", e)}
                  />
                  <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none">
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-primary"></div>
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary"></div>
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary"></div>
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-primary"></div>
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2 justify-center">
                  <Button type="button" onClick={capturePhoto} className="gap-2">
                    <Camera className="h-4 w-4" />
                    Capture Photo
                  </Button>
                  <Button type="button" variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Position your face in the center and click capture when ready
                </p>
              </div>
            )}

            {faceImage && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Preview:</p>
                <img
                  src={faceImage || "/placeholder.svg"}
                  alt="Student face"
                  className="w-32 h-32 object-cover rounded-lg border mx-auto"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFaceImage(null)}
                  className="mx-auto block"
                >
                  Remove Photo
                </Button>
              </div>
            )}

            {studentQRCode && (
              <div className="space-y-2 text-center">
                <p className="text-sm text-gray-600">Student QR Code:</p>
                <img
                  src={studentQRCode || "/placeholder.svg"}
                  alt="Student QR Code"
                  className="w-64 h-64 mx-auto border rounded-lg shadow-lg"
                />
                <p className="text-xs text-muted-foreground">
                  This QR code can be used for quick student identification
                </p>
              </div>
            )}

            {errors.image && <p className="text-sm text-red-500">{errors.image}</p>}
            {errors.camera && <p className="text-sm text-red-500">{errors.camera}</p>}
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isProcessing} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isProcessing ? "Adding Student..." : "Add Student"}
            </Button>

            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
