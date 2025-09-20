"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, CameraOff, User, Users, AlertTriangle, CheckCircle, RefreshCw, Upload, Brain, Zap } from "lucide-react"
import { faceRecognitionService } from "@/lib/face-recognition-utils"

interface EnrolledStudent {
  student_id: string
  student_name: string
}

export function FaceEnrollment() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isActive, setIsActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Student enrollment form
  const [studentId, setStudentId] = useState("")
  const [studentName, setStudentName] = useState("")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [enrollmentStatus, setEnrollmentStatus] = useState<"idle" | "capturing" | "processing" | "success" | "error">("idle")
  const [enrollmentMessage, setEnrollmentMessage] = useState("")
  
  // Training status
  const [trainingStatus, setTrainingStatus] = useState<"idle" | "training" | "success" | "error">("idle")
  const [trainingMessage, setTrainingMessage] = useState("")
  
  // Enrolled students
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([])
  const [apiHealth, setApiHealth] = useState<boolean>(false)

  // Check API health on component mount
  useEffect(() => {
    const checkHealth = async () => {
      if (faceRecognitionService) {
        const isHealthy = await faceRecognitionService.checkHealth()
        setApiHealth(isHealthy)
        if (isHealthy) {
          loadEnrolledStudents()
        }
      }
    }
    checkHealth()
  }, [])

  const loadEnrolledStudents = async () => {
    if (faceRecognitionService) {
      const result = await faceRecognitionService.getStudents()
      if (result.success) {
        setEnrolledStudents(result.students)
      }
    }
  }

  const startCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setError("Camera not available in this environment")
      return
    }

    try {
      setError(null)
      setIsLoading(true)

      const constraints = {
        video: {
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15 },
        },
        audio: false,
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsLoading(false)
        }
      }

      setStream(mediaStream)
      setIsActive(true)
    } catch (err: any) {
      setIsLoading(false)
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera access and try again.")
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Please connect a camera device.")
      } else {
        setError(`Camera error: ${err.message || "Unknown error occurred"}`)
      }
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsActive(false)
    setCapturedImage(null)
    setIsLoading(false)
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    
    setCapturedImage(imageData)
    setEnrollmentStatus("capturing")
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const imageData = e.target?.result as string
      setCapturedImage(imageData)
      setEnrollmentStatus("capturing")
    }
    reader.readAsDataURL(file)
  }

  const enrollStudent = async () => {
    if (!capturedImage || !studentId || !studentName) {
      setEnrollmentMessage("Please fill in all fields and capture an image")
      setEnrollmentStatus("error")
      return
    }

    if (!faceRecognitionService) {
      setEnrollmentMessage("Face recognition service not available")
      setEnrollmentStatus("error")
      return
    }

    setEnrollmentStatus("processing")
    setEnrollmentMessage("Adding student to face recognition system...")

    try {
      const result = await faceRecognitionService.addStudent(studentId, studentName, capturedImage)
      
      if (result.success) {
        setEnrollmentStatus("success")
        setEnrollmentMessage(result.message)
        setStudentId("")
        setStudentName("")
        setCapturedImage(null)
        loadEnrolledStudents()
      } else {
        setEnrollmentStatus("error")
        setEnrollmentMessage(result.message)
      }
    } catch (error) {
      setEnrollmentStatus("error")
      setEnrollmentMessage("Failed to enroll student")
    }
  }

  const trainModel = async () => {
    if (!faceRecognitionService) {
      setTrainingMessage("Face recognition service not available")
      setTrainingStatus("error")
      return
    }

    setTrainingStatus("training")
    setTrainingMessage("Training face recognition model...")

    try {
      const result = await faceRecognitionService.trainModel()
      
      if (result.success) {
        setTrainingStatus("success")
        setTrainingMessage(result.message)
      } else {
        setTrainingStatus("error")
        setTrainingMessage(result.message)
      }
    } catch (error) {
      setTrainingStatus("error")
      setTrainingMessage("Failed to train model")
    }
  }

  const resetForm = () => {
    setStudentId("")
    setStudentName("")
    setCapturedImage(null)
    setEnrollmentStatus("idle")
    setEnrollmentMessage("")
  }

  return (
    <div className="space-y-6">
      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Face Recognition System Status
          </CardTitle>
          <CardDescription>System health and enrolled students overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${apiHealth ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm font-medium">
                  {apiHealth ? "API Connected" : "API Disconnected"}
                </span>
              </div>
              <Badge variant="secondary">
                {enrolledStudents.length} Students Enrolled
              </Badge>
            </div>
            <Button onClick={loadEnrolledStudents} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="enrollment" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="enrollment">Student Enrollment</TabsTrigger>
          <TabsTrigger value="training">Model Training</TabsTrigger>
          <TabsTrigger value="students">Enrolled Students</TabsTrigger>
        </TabsList>

        {/* Student Enrollment Tab */}
        <TabsContent value="enrollment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Camera Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Capture Student Photo
                </CardTitle>
                <CardDescription>Take a clear photo of the student's face for enrollment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={isActive ? stopCamera : startCamera}
                    variant={isActive ? "destructive" : "default"}
                    className="gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : isActive ? (
                      <>
                        <CameraOff className="w-4 h-4" />
                        Stop Camera
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        Start Camera
                      </>
                    )}
                  </Button>

                  {isActive && (
                    <Button onClick={captureImage} variant="outline" className="gap-2">
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </Button>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="text-sm text-destructive">{error}</span>
                  </div>
                )}

                <div className="relative bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-auto max-h-64 object-cover"
                    style={{ display: isActive ? "block" : "none" }}
                    muted
                    playsInline
                    autoPlay
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ display: "none" }}
                  />

                  {!isActive && !isLoading && (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      <div className="text-center space-y-2">
                        <Camera className="w-12 h-12 mx-auto" />
                        <p>Click "Start Camera" to begin</p>
                      </div>
                    </div>
                  )}

                  {isLoading && (
                    <div className="flex items-center justify-center h-48 text-muted-foreground">
                      <div className="text-center space-y-2">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p>Initializing camera...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Or upload an image file:</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enrollment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Student Information
                </CardTitle>
                <CardDescription>Enter student details for face enrollment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input
                    id="studentId"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g., STU001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input
                    id="studentName"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g., John Doe"
                  />
                </div>

                {capturedImage && (
                  <div className="space-y-2">
                    <Label>Captured Image</Label>
                    <div className="relative">
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        onClick={() => setCapturedImage(null)}
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={enrollStudent}
                    disabled={!capturedImage || !studentId || !studentName || enrollmentStatus === "processing"}
                    className="w-full gap-2"
                  >
                    {enrollmentStatus === "processing" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4" />
                        Enroll Student
                      </>
                    )}
                  </Button>

                  {enrollmentMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      enrollmentStatus === "success" 
                        ? "bg-green-50 border border-green-200 text-green-800" 
                        : enrollmentStatus === "error"
                        ? "bg-red-50 border border-red-200 text-red-800"
                        : "bg-blue-50 border border-blue-200 text-blue-800"
                    }`}>
                      {enrollmentMessage}
                    </div>
                  )}

                  {enrollmentStatus === "success" && (
                    <Button onClick={resetForm} variant="outline" className="w-full gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Enroll Another Student
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Model Training Tab */}
        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Train Face Recognition Model
              </CardTitle>
              <CardDescription>
                Train the AI model to recognize enrolled students. This should be done after adding new students.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Enrolled Students</p>
                  <p className="text-sm text-muted-foreground">
                    {enrolledStudents.length} students ready for training
                  </p>
                </div>
                <Badge variant="secondary">
                  {enrolledStudents.length} Students
                </Badge>
              </div>

              <Button
                onClick={trainModel}
                disabled={enrolledStudents.length === 0 || trainingStatus === "training"}
                className="w-full gap-2"
              >
                {trainingStatus === "training" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Training Model...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Train Model
                  </>
                )}
              </Button>

              {trainingMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  trainingStatus === "success" 
                    ? "bg-green-50 border border-green-200 text-green-800" 
                    : trainingStatus === "error"
                    ? "bg-red-50 border border-red-200 text-red-800"
                    : "bg-blue-50 border border-blue-200 text-blue-800"
                }`}>
                  {trainingMessage}
                </div>
              )}

              {trainingStatus === "success" && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">
                    Model trained successfully! Face recognition is now ready to use.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrolled Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Enrolled Students
              </CardTitle>
              <CardDescription>List of all students enrolled in the face recognition system</CardDescription>
            </CardHeader>
            <CardContent>
              {enrolledStudents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrolledStudents.map((student, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{student.student_name}</p>
                        <p className="text-sm text-muted-foreground">{student.student_id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No students enrolled yet</p>
                  <p className="text-sm">Use the enrollment tab to add students</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
