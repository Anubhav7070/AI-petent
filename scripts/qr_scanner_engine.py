import cv2
import numpy as np
import json
import base64
from datetime import datetime, timedelta
from pyzbar import pyzbar
from PIL import Image
import io
import os

class QRScannerEngine:
    def __init__(self):
        self.attendance_records = []
        self.sessions = {}
        self.students_data_path = "qr_students_data.json"
        self.attendance_data_path = "qr_attendance_data.json"
        
        # Create directories if they don't exist
        os.makedirs("qr_data", exist_ok=True)
        
        # Load existing data
        self.load_students_data()
        self.load_attendance_data()
    
    def load_students_data(self):
        """Load students data from JSON file"""
        try:
            if os.path.exists(self.students_data_path):
                with open(self.students_data_path, 'r') as f:
                    self.students = json.load(f)
                print(f"Loaded {len(self.students)} students from QR database")
            else:
                self.students = {}
                print("No existing students data found")
        except Exception as e:
            print(f"Error loading students data: {e}")
            self.students = {}
    
    def save_students_data(self):
        """Save students data to JSON file"""
        try:
            with open(self.students_data_path, 'w') as f:
                json.dump(self.students, f, indent=2)
            print("Students data saved successfully")
        except Exception as e:
            print(f"Error saving students data: {e}")
    
    def load_attendance_data(self):
        """Load attendance data from JSON file"""
        try:
            if os.path.exists(self.attendance_data_path):
                with open(self.attendance_data_path, 'r') as f:
                    self.attendance_records = json.load(f)
                print(f"Loaded {len(self.attendance_records)} attendance records")
            else:
                self.attendance_records = []
                print("No existing attendance data found")
        except Exception as e:
            print(f"Error loading attendance data: {e}")
            self.attendance_records = []
    
    def save_attendance_data(self):
        """Save attendance data to JSON file"""
        try:
            with open(self.attendance_data_path, 'w') as f:
                json.dump(self.attendance_records, f, indent=2)
            print("Attendance data saved successfully")
        except Exception as e:
            print(f"Error saving attendance data: {e}")
    
    def add_student(self, student_id, student_name, email="", department=""):
        """Add a new student to the system"""
        try:
            student_data = {
                "student_id": student_id,
                "student_name": student_name,
                "email": email,
                "department": department,
                "created_at": datetime.now().isoformat(),
                "qr_code": self.generate_student_qr(student_id, student_name)
            }
            
            self.students[student_id] = student_data
            self.save_students_data()
            
            return {
                "success": True,
                "message": f"Student {student_name} added successfully",
                "student_data": student_data
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error adding student: {str(e)}"
            }
    
    def generate_student_qr(self, student_id, student_name):
        """Generate QR code data for a student"""
        qr_data = {
            "type": "student_id",
            "student_id": student_id,
            "student_name": student_name,
            "timestamp": datetime.now().isoformat()
        }
        return json.dumps(qr_data)
    
    def create_attendance_session(self, session_name, class_id, duration_hours=24):
        """Create a new attendance session"""
        try:
            session_id = f"session_{int(datetime.now().timestamp())}"
            created_at = datetime.now()
            expires_at = created_at + timedelta(hours=duration_hours)
            
            session_data = {
                "session_id": session_id,
                "session_name": session_name,
                "class_id": class_id,
                "created_at": created_at.isoformat(),
                "expires_at": expires_at.isoformat(),
                "is_active": True,
                "attendance_count": 0
            }
            
            self.sessions[session_id] = session_data
            
            # Generate QR code data for the session
            qr_data = {
                "type": "attendance_session",
                "session_id": session_id,
                "session_name": session_name,
                "class_id": class_id,
                "timestamp": created_at.isoformat(),
                "expires_at": expires_at.isoformat()
            }
            
            return {
                "success": True,
                "session": session_data,
                "qr_data": json.dumps(qr_data)
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error creating session: {str(e)}"
            }
    
    def scan_qr_code(self, image_data):
        """Scan QR code from image data"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data.split(',')[1])
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Detect QR codes
            qr_codes = pyzbar.decode(opencv_image)
            
            results = []
            
            for qr_code in qr_codes:
                # Decode QR code data
                qr_data = qr_code.data.decode('utf-8')
                
                try:
                    # Parse JSON data
                    parsed_data = json.loads(qr_data)
                    
                    # Process based on QR code type
                    if parsed_data.get("type") == "student_id":
                        result = self.process_student_qr(parsed_data)
                    elif parsed_data.get("type") == "attendance_session":
                        result = self.process_session_qr(parsed_data)
                    else:
                        result = {
                            "success": False,
                            "message": "Unknown QR code type",
                            "qr_data": qr_data
                        }
                    
                    results.append(result)
                    
                except json.JSONDecodeError:
                    # Handle non-JSON QR codes (legacy format)
                    result = self.process_legacy_qr(qr_data)
                    results.append(result)
            
            if not results:
                return {
                    "success": False,
                    "message": "No QR codes detected in the image"
                }
            
            return {
                "success": True,
                "qr_codes_found": len(results),
                "results": results
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error scanning QR code: {str(e)}"
            }
    
    def process_student_qr(self, qr_data):
        """Process student ID QR code"""
        student_id = qr_data.get("student_id")
        student_name = qr_data.get("student_name")
        
        if not student_id or not student_name:
            return {
                "success": False,
                "message": "Invalid student QR code format"
            }
        
        # Check if student exists
        if student_id not in self.students:
            return {
                "success": False,
                "message": f"Student {student_name} not found in database"
            }
        
        return {
            "success": True,
            "type": "student_id",
            "student_id": student_id,
            "student_name": student_name,
            "message": f"Student {student_name} identified successfully"
        }
    
    def process_session_qr(self, qr_data):
        """Process attendance session QR code"""
        session_id = qr_data.get("session_id")
        session_name = qr_data.get("session_name")
        class_id = qr_data.get("class_id")
        expires_at = qr_data.get("expires_at")
        
        if not session_id:
            return {
                "success": False,
                "message": "Invalid session QR code format"
            }
        
        # Check if session is still valid
        try:
            expires_datetime = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.now() > expires_datetime:
                return {
                    "success": False,
                    "message": "This QR code has expired"
                }
        except:
            pass
        
        return {
            "success": True,
            "type": "attendance_session",
            "session_id": session_id,
            "session_name": session_name,
            "class_id": class_id,
            "expires_at": expires_at,
            "message": f"Session {session_name} identified successfully"
        }
    
    def process_legacy_qr(self, qr_data):
        """Process legacy QR code format (simple student ID)"""
        # Try to find student by ID
        student_id = qr_data.strip()
        
        if student_id in self.students:
            student = self.students[student_id]
            return {
                "success": True,
                "type": "student_id",
                "student_id": student_id,
                "student_name": student["student_name"],
                "message": f"Student {student['student_name']} identified successfully"
            }
        else:
            return {
                "success": False,
                "message": f"Student ID {student_id} not found"
            }
    
    def mark_attendance(self, student_id, session_id=None, method="qr"):
        """Mark attendance for a student"""
        try:
            # Check if student exists
            if student_id not in self.students:
                return {
                    "success": False,
                    "message": f"Student {student_id} not found"
                }
            
            student = self.students[student_id]
            today = datetime.now().strftime("%Y-%m-%d")
            
            # Check if already marked today
            existing_attendance = [
                record for record in self.attendance_records
                if (record["student_id"] == student_id and 
                    record["date"] == today)
            ]
            
            if existing_attendance:
                return {
                    "success": False,
                    "message": f"{student['student_name']} is already marked present for today"
                }
            
            # Create attendance record
            attendance_record = {
                "id": f"att_{int(datetime.now().timestamp())}",
                "student_id": student_id,
                "student_name": student["student_name"],
                "date": today,
                "time": datetime.now().strftime("%H:%M:%S"),
                "method": method,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            }
            
            self.attendance_records.append(attendance_record)
            self.save_attendance_data()
            
            # Update session attendance count if session exists
            if session_id and session_id in self.sessions:
                self.sessions[session_id]["attendance_count"] += 1
            
            return {
                "success": True,
                "message": f"Attendance marked successfully for {student['student_name']}",
                "attendance_record": attendance_record
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error marking attendance: {str(e)}"
            }
    
    def get_attendance_report(self, date=None, student_id=None, session_id=None):
        """Get attendance report"""
        try:
            filtered_records = self.attendance_records.copy()
            
            if date:
                filtered_records = [
                    record for record in filtered_records
                    if record["date"] == date
                ]
            
            if student_id:
                filtered_records = [
                    record for record in filtered_records
                    if record["student_id"] == student_id
                ]
            
            if session_id:
                filtered_records = [
                    record for record in filtered_records
                    if record.get("session_id") == session_id
                ]
            
            return {
                "success": True,
                "records": filtered_records,
                "total_records": len(filtered_records)
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error generating report: {str(e)}"
            }
    
    def get_students_list(self):
        """Get list of all students"""
        try:
            students_list = []
            for student_id, student_data in self.students.items():
                students_list.append({
                    "student_id": student_id,
                    "student_name": student_data["student_name"],
                    "email": student_data.get("email", ""),
                    "department": student_data.get("department", ""),
                    "created_at": student_data["created_at"]
                })
            
            return {
                "success": True,
                "students": students_list,
                "count": len(students_list)
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error getting students list: {str(e)}"
            }
    
    def get_sessions_list(self):
        """Get list of all sessions"""
        try:
            sessions_list = []
            for session_id, session_data in self.sessions.items():
                sessions_list.append({
                    "session_id": session_id,
                    "session_name": session_data["session_name"],
                    "class_id": session_data["class_id"],
                    "created_at": session_data["created_at"],
                    "expires_at": session_data["expires_at"],
                    "is_active": session_data["is_active"],
                    "attendance_count": session_data["attendance_count"]
                })
            
            return {
                "success": True,
                "sessions": sessions_list,
                "count": len(sessions_list)
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error getting sessions list: {str(e)}"
            }

# Global instance
qr_scanner_engine = QRScannerEngine()

def main():
    """Test the QR scanner engine"""
    print("QR Scanner Engine initialized")
    print(f"Known students: {len(qr_scanner_engine.students)}")
    print(f"Attendance records: {len(qr_scanner_engine.attendance_records)}")
    
    # Test with sample data
    students = qr_scanner_engine.get_students_list()
    print(f"Students list: {students}")

if __name__ == "__main__":
    main()
