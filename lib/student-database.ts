export interface Student {
  id: string
  name: string
  rollNumber: string
  email?: string
  class?: string
  section?: string
  faceImageUrl?: string
  faceDescriptor?: number[] // Face recognition descriptor
  createdAt: Date
  updatedAt: Date
}

export interface AttendanceRecord {
  id: string
  studentId: string
  date: string
  time: string
  method: "face" | "qr"
  confidence?: number
  status: "present" | "absent" | "late"
}

class StudentDatabase {
  private students: Map<string, Student> = new Map()
  private attendance: AttendanceRecord[] = []

  // Initialize with sample data
  constructor() {
    this.loadSampleData()
  }

  private loadSampleData() {
    const sampleStudents: Student[] = [
      {
        id: "1",
        name: "John Doe",
        rollNumber: "CS001",
        email: "john.doe@school.edu",
        class: "10th",
        section: "A",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        name: "Jane Smith",
        rollNumber: "CS002",
        email: "jane.smith@school.edu",
        class: "10th",
        section: "A",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    sampleStudents.forEach((student) => {
      this.students.set(student.id, student)
    })
  }

  // Student management methods
  addStudent(student: Omit<Student, "id" | "createdAt" | "updatedAt">): Student {
    const newStudent: Student = {
      ...student,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.students.set(newStudent.id, newStudent)
    return newStudent
  }

  updateStudent(id: string, updates: Partial<Student>): Student | null {
    const student = this.students.get(id)
    if (!student) return null

    const updatedStudent = {
      ...student,
      ...updates,
      updatedAt: new Date(),
    }

    this.students.set(id, updatedStudent)
    return updatedStudent
  }

  deleteStudent(id: string): boolean {
    return this.students.delete(id)
  }

  getStudent(id: string): Student | null {
    return this.students.get(id) || null
  }

  getStudentByRollNumber(rollNumber: string): Student | null {
    for (const student of this.students.values()) {
      if (student.rollNumber === rollNumber) {
        return student
      }
    }
    return null
  }

  getAllStudents(): Student[] {
    return Array.from(this.students.values())
  }

  searchStudents(query: string): Student[] {
    const lowercaseQuery = query.toLowerCase()
    return Array.from(this.students.values()).filter(
      (student) =>
        student.name.toLowerCase().includes(lowercaseQuery) ||
        student.rollNumber.toLowerCase().includes(lowercaseQuery) ||
        student.email?.toLowerCase().includes(lowercaseQuery),
    )
  }

  // Face recognition methods
  updateStudentFaceData(id: string, faceImageUrl: string, faceDescriptor: number[]): boolean {
    const student = this.students.get(id)
    if (!student) return false

    this.updateStudent(id, { faceImageUrl, faceDescriptor })
    return true
  }

  findStudentByFaceDescriptor(descriptor: number[], threshold = 0.6): Student | null {
    // Simple euclidean distance matching (in real app, use more sophisticated matching)
    let bestMatch: Student | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const student of this.students.values()) {
      if (!student.faceDescriptor) continue

      const distance = this.calculateEuclideanDistance(descriptor, student.faceDescriptor)
      if (distance < threshold && distance < bestDistance) {
        bestDistance = distance
        bestMatch = student
      }
    }

    return bestMatch
  }

  private calculateEuclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Number.POSITIVE_INFINITY

    let sum = 0
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2)
    }
    return Math.sqrt(sum)
  }

  // Attendance methods
  markAttendance(studentId: string, method: "face" | "qr", confidence?: number): AttendanceRecord {
    const now = new Date()
    const record: AttendanceRecord = {
      id: Date.now().toString(),
      studentId,
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().split(" ")[0],
      method,
      confidence,
      status: "present",
    }

    this.attendance.push(record)
    return record
  }

  getAttendanceByDate(date: string): AttendanceRecord[] {
    return this.attendance.filter((record) => record.date === date)
  }

  getStudentAttendance(studentId: string): AttendanceRecord[] {
    return this.attendance.filter((record) => record.studentId === studentId)
  }

  getAttendanceStats(date?: string): {
    total: number
    present: number
    absent: number
    percentage: number
  } {
    const targetDate = date || new Date().toISOString().split("T")[0]
    const todayAttendance = this.getAttendanceByDate(targetDate)
    const totalStudents = this.students.size
    const presentStudents = todayAttendance.length

    return {
      total: totalStudents,
      present: presentStudents,
      absent: totalStudents - presentStudents,
      percentage: totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0,
    }
  }
}

// Singleton instance
export const studentDB = new StudentDatabase()
