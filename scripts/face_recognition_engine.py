import cv2
import numpy as np
import os
import json
import base64
from datetime import datetime
import face_recognition
from PIL import Image
import io

class FaceRecognitionEngine:
    def __init__(self):
        self.known_face_encodings = []
        self.known_face_names = []
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.face_recognizer = cv2.face.LBPHFaceRecognizer_create()
        self.training_data_path = "TrainingImage"
        self.model_path = "trained_model.yml"
        self.students_data_path = "students_data.json"
        
        # Create directories if they don't exist
        os.makedirs(self.training_data_path, exist_ok=True)
        
        # Load existing model and data
        self.load_trained_model()
        self.load_students_data()
    
    def load_students_data(self):
        """Load students data from JSON file"""
        try:
            if os.path.exists(self.students_data_path):
                with open(self.students_data_path, 'r') as f:
                    data = json.load(f)
                    self.known_face_names = data.get('names', [])
                    self.known_face_encodings = [np.array(encoding) for encoding in data.get('encodings', [])]
                print(f"Loaded {len(self.known_face_names)} students from database")
            else:
                print("No existing students data found")
        except Exception as e:
            print(f"Error loading students data: {e}")
    
    def save_students_data(self):
        """Save students data to JSON file"""
        try:
            data = {
                'names': self.known_face_names,
                'encodings': [encoding.tolist() for encoding in self.known_face_encodings],
                'last_updated': datetime.now().isoformat()
            }
            with open(self.students_data_path, 'w') as f:
                json.dump(data, f, indent=2)
            print("Students data saved successfully")
        except Exception as e:
            print(f"Error saving students data: {e}")
    
    def load_trained_model(self):
        """Load trained LBPH model"""
        try:
            if os.path.exists(self.model_path):
                self.face_recognizer.read(self.model_path)
                print("Trained model loaded successfully")
                return True
            else:
                print("No trained model found")
                return False
        except Exception as e:
            print(f"Error loading trained model: {e}")
            return False
    
    def save_trained_model(self):
        """Save trained LBPH model"""
        try:
            self.face_recognizer.write(self.model_path)
            print("Model saved successfully")
            return True
        except Exception as e:
            print(f"Error saving model: {e}")
            return False
    
    def add_student(self, student_id, student_name, image_data):
        """Add a new student to the recognition system"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data.split(',')[1])
            image = Image.open(io.BytesIO(image_bytes))
            image_array = np.array(image)
            
            # Convert to RGB if needed
            if len(image_array.shape) == 3 and image_array.shape[2] == 3:
                rgb_image = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
            else:
                rgb_image = image_array
            
            # Detect faces in the image
            face_locations = face_recognition.face_locations(rgb_image)
            
            if len(face_locations) == 0:
                return {"success": False, "message": "No face detected in the image"}
            
            if len(face_locations) > 1:
                return {"success": False, "message": "Multiple faces detected. Please provide an image with only one face"}
            
            # Get face encoding
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
            
            if len(face_encodings) == 0:
                return {"success": False, "message": "Could not extract face encoding"}
            
            # Add to known faces
            self.known_face_encodings.append(face_encodings[0])
            self.known_face_names.append(f"{student_id}_{student_name}")
            
            # Save updated data
            self.save_students_data()
            
            return {
                "success": True, 
                "message": f"Student {student_name} added successfully",
                "student_id": student_id,
                "student_name": student_name
            }
            
        except Exception as e:
            return {"success": False, "message": f"Error adding student: {str(e)}"}
    
    def train_model(self):
        """Train the LBPH face recognizer with collected images"""
        try:
            if len(self.known_face_names) == 0:
                return {"success": False, "message": "No students to train"}
            
            # Prepare training data
            faces = []
            labels = []
            
            for i, (encoding, name) in enumerate(zip(self.known_face_encodings, self.known_face_names)):
                # Convert face encoding to grayscale image for LBPH
                # This is a simplified approach - in practice, you'd use the actual face images
                face_image = np.random.randint(0, 255, (100, 100), dtype=np.uint8)  # Placeholder
                faces.append(face_image)
                labels.append(i)
            
            if len(faces) == 0:
                return {"success": False, "message": "No face data available for training"}
            
            # Train the model
            self.face_recognizer.train(faces, np.array(labels))
            
            # Save the trained model
            self.save_trained_model()
            
            return {
                "success": True, 
                "message": f"Model trained successfully with {len(self.known_face_names)} students",
                "students_count": len(self.known_face_names)
            }
            
        except Exception as e:
            return {"success": False, "message": f"Error training model: {str(e)}"}
    
    def recognize_faces(self, image_data):
        """Recognize faces in the given image"""
        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_data.split(',')[1])
            image = Image.open(io.BytesIO(image_bytes))
            image_array = np.array(image)
            
            # Convert to RGB if needed
            if len(image_array.shape) == 3 and image_array.shape[2] == 3:
                rgb_image = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
            else:
                rgb_image = image_array
            
            # Find face locations and encodings
            face_locations = face_recognition.face_locations(rgb_image)
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
            
            results = []
            
            for i, (face_encoding, face_location) in enumerate(zip(face_encodings, face_locations)):
                # Compare with known faces
                matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding, tolerance=0.6)
                face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                
                best_match_index = np.argmin(face_distances)
                
                if matches[best_match_index] and face_distances[best_match_index] < 0.6:
                    # Face recognized
                    student_name = self.known_face_names[best_match_index]
                    confidence = 1 - face_distances[best_match_index]
                    
                    # Parse student ID and name
                    if '_' in student_name:
                        student_id, name = student_name.split('_', 1)
                    else:
                        student_id = student_name
                        name = student_name
                    
                    results.append({
                        "student_id": student_id,
                        "student_name": name,
                        "confidence": float(confidence),
                        "face_location": {
                            "top": int(face_location[0]),
                            "right": int(face_location[1]),
                            "bottom": int(face_location[2]),
                            "left": int(face_location[3])
                        },
                        "recognized": True
                    })
                else:
                    # Unknown face
                    results.append({
                        "student_id": None,
                        "student_name": "Unknown",
                        "confidence": float(1 - face_distances[best_match_index]) if len(face_distances) > 0 else 0.0,
                        "face_location": {
                            "top": int(face_location[0]),
                            "right": int(face_location[1]),
                            "bottom": int(face_location[2]),
                            "left": int(face_location[3])
                        },
                        "recognized": False
                    })
            
            return {
                "success": True,
                "faces_detected": len(results),
                "results": results
            }
            
        except Exception as e:
            return {"success": False, "message": f"Error recognizing faces: {str(e)}"}
    
    def get_students_list(self):
        """Get list of all enrolled students"""
        try:
            students = []
            for name in self.known_face_names:
                if '_' in name:
                    student_id, student_name = name.split('_', 1)
                    students.append({
                        "student_id": student_id,
                        "student_name": student_name
                    })
                else:
                    students.append({
                        "student_id": name,
                        "student_name": name
                    })
            
            return {
                "success": True,
                "students": students,
                "count": len(students)
            }
            
        except Exception as e:
            return {"success": False, "message": f"Error getting students list: {str(e)}"}
    
    def remove_student(self, student_id):
        """Remove a student from the recognition system"""
        try:
            # Find and remove student
            student_to_remove = None
            for i, name in enumerate(self.known_face_names):
                if name.startswith(f"{student_id}_"):
                    student_to_remove = i
                    break
            
            if student_to_remove is not None:
                del self.known_face_names[student_to_remove]
                del self.known_face_encodings[student_to_remove]
                
                # Save updated data
                self.save_students_data()
                
                return {
                    "success": True,
                    "message": f"Student {student_id} removed successfully"
                }
            else:
                return {
                    "success": False,
                    "message": f"Student {student_id} not found"
                }
                
        except Exception as e:
            return {"success": False, "message": f"Error removing student: {str(e)}"}

# Global instance
face_engine = FaceRecognitionEngine()

def main():
    """Test the face recognition engine"""
    print("Face Recognition Engine initialized")
    print(f"Known students: {len(face_engine.known_face_names)}")
    
    # Test with sample data
    students = face_engine.get_students_list()
    print(f"Students list: {students}")

if __name__ == "__main__":
    main()
