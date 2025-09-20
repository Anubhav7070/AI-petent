from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import json
from face_recognition_engine import face_engine
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/face-recognition/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Face Recognition API is running",
        "students_count": len(face_engine.known_face_names)
    })

@app.route('/api/face-recognition/add-student', methods=['POST'])
def add_student():
    """Add a new student to the face recognition system"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        student_id = data.get('student_id')
        student_name = data.get('student_name')
        image_data = data.get('image_data')
        
        if not all([student_id, student_name, image_data]):
            return jsonify({
                "success": False, 
                "message": "Missing required fields: student_id, student_name, image_data"
            }), 400
        
        # Add student to face recognition system
        result = face_engine.add_student(student_id, student_name, image_data)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/face-recognition/train-model', methods=['POST'])
def train_model():
    """Train the face recognition model"""
    try:
        result = face_engine.train_model()
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/face-recognition/recognize', methods=['POST'])
def recognize_faces():
    """Recognize faces in the provided image"""
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
        
        # Recognize faces
        result = face_engine.recognize_faces(image_data)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/face-recognition/students', methods=['GET'])
def get_students():
    """Get list of all enrolled students"""
    try:
        result = face_engine.get_students_list()
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/face-recognition/remove-student', methods=['DELETE'])
def remove_student():
    """Remove a student from the face recognition system"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
        
        student_id = data.get('student_id')
        
        if not student_id:
            return jsonify({
                "success": False,
                "message": "Missing required field: student_id"
            }), 400
        
        result = face_engine.remove_student(student_id)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/api/face-recognition/status', methods=['GET'])
def get_status():
    """Get system status and statistics"""
    try:
        students_list = face_engine.get_students_list()
        
        status = {
            "success": True,
            "system_status": "operational",
            "students_count": len(face_engine.known_face_names),
            "model_trained": os.path.exists(face_engine.model_path),
            "students": students_list.get("students", []) if students_list["success"] else []
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Server error: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("Starting Face Recognition API Server...")
    print(f"Initial students count: {len(face_engine.known_face_names)}")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )
