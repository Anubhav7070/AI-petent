from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from qr_scanner_engine import qr_scanner_engine

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/qr-scanner/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "QR Scanner API is running",
        "students_count": len(qr_scanner_engine.students),
        "attendance_records": len(qr_scanner_engine.attendance_records)
    })

@app.route('/api/qr-scanner/add-student', methods=['POST'])
def add_student():
    """Add a new student to the QR system"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        student_id = data.get('student_id')
        student_name = data.get('student_name')
        email = data.get('email', '')
        department = data.get('department', '')
        
        if not all([student_id, student_name]):
            return jsonify({
                "success": False, 
                "message": "Missing required fields: student_id, student_name"
            }), 400
        
        # Add student to QR system
        result = qr_scanner_engine.add_student(student_id, student_name, email, department)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/qr-scanner/create-session', methods=['POST'])
def create_session():
    """Create a new attendance session"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        session_name = data.get('session_name')
        class_id = data.get('class_id')
        duration_hours = data.get('duration_hours', 24)
        
        if not all([session_name, class_id]):
            return jsonify({
                "success": False,
                "message": "Missing required fields: session_name, class_id"
            }), 400
        
        # Create attendance session
        result = qr_scanner_engine.create_attendance_session(session_name, class_id, duration_hours)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/qr-scanner/scan', methods=['POST'])
def scan_qr_code():
    """Scan QR code from image"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        image_data = data.get('image_data')
        
        if not image_data:
            return jsonify({
                "success": False,
                "message": "Missing required field: image_data"
            }), 400
        
        # Scan QR code
        result = qr_scanner_engine.scan_qr_code(image_data)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/qr-scanner/mark-attendance', methods=['POST'])
def mark_attendance():
    """Mark attendance for a student"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        student_id = data.get('student_id')
        session_id = data.get('session_id')
        method = data.get('method', 'qr')
        
        if not student_id:
            return jsonify({
                "success": False,
                "message": "Missing required field: student_id"
            }), 400
        
        # Mark attendance
        result = qr_scanner_engine.mark_attendance(student_id, session_id, method)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/qr-scanner/students', methods=['GET'])
def get_students():
    """Get list of all students"""
    try:
        result = qr_scanner_engine.get_students_list()
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/qr-scanner/sessions', methods=['GET'])
def get_sessions():
    """Get list of all sessions"""
    try:
        result = qr_scanner_engine.get_sessions_list()
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/qr-scanner/attendance-report', methods=['GET'])
def get_attendance_report():
    """Get attendance report"""
    try:
        date = request.args.get('date')
        student_id = request.args.get('student_id')
        session_id = request.args.get('session_id')
        
        result = qr_scanner_engine.get_attendance_report(date, student_id, session_id)
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/qr-scanner/student-qr/<student_id>', methods=['GET'])
def get_student_qr(student_id):
    """Get QR code data for a specific student"""
    try:
        if student_id not in qr_scanner_engine.students:
            return jsonify({
                "success": False,
                "message": f"Student {student_id} not found"
            }), 404
        
        student = qr_scanner_engine.students[student_id]
        
        return jsonify({
            "success": True,
            "student_id": student_id,
            "student_name": student["student_name"],
            "qr_data": student["qr_code"]
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/qr-scanner/status', methods=['GET'])
def get_status():
    """Get system status and statistics"""
    try:
        students_list = qr_scanner_engine.get_students_list()
        sessions_list = qr_scanner_engine.get_sessions_list()
        
        status = {
            "success": True,
            "system_status": "operational",
            "students_count": len(qr_scanner_engine.students),
            "sessions_count": len(qr_scanner_engine.sessions),
            "attendance_records": len(qr_scanner_engine.attendance_records),
            "students": students_list.get("students", []) if students_list["success"] else [],
            "sessions": sessions_list.get("sessions", []) if sessions_list["success"] else []
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("Starting QR Scanner API Server...")
    print(f"Initial students count: {len(qr_scanner_engine.students)}")
    print(f"Initial attendance records: {len(qr_scanner_engine.attendance_records)}")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=5001,  # Different port from face recognition API
        debug=True,
        threaded=True
    )
