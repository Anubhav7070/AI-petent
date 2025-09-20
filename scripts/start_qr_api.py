#!/usr/bin/env python3
"""
Startup script for the QR Scanner API
This script initializes and starts the Flask API server for QR code scanning
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'flask',
        'flask_cors',
        'opencv-python',
        'pyzbar',
        'Pillow',
        'numpy'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   - {package}")
        print("\n📦 Install missing packages with:")
        print("   pip install -r requirements.txt")
        return False
    
    print("✅ All required packages are installed")
    return True

def create_directories():
    """Create necessary directories"""
    directories = [
        "qr_data",
        "qr_sessions",
        "qr_attendance"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"📁 Created directory: {directory}")

def start_api_server():
    """Start the Flask API server"""
    print("🚀 Starting QR Scanner API Server...")
    print("📍 Server will be available at: http://localhost:5001")
    print("🔗 API endpoints:")
    print("   - GET  /api/qr-scanner/health")
    print("   - POST /api/qr-scanner/add-student")
    print("   - POST /api/qr-scanner/create-session")
    print("   - POST /api/qr-scanner/scan")
    print("   - POST /api/qr-scanner/mark-attendance")
    print("   - GET  /api/qr-scanner/students")
    print("   - GET  /api/qr-scanner/sessions")
    print("   - GET  /api/qr-scanner/attendance-report")
    print("\n⏹️  Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        # Import and run the Flask app
        from qr_scanner_api import app
        app.run(
            host='0.0.0.0',
            port=5001,
            debug=True,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return False
    
    return True

def main():
    """Main function"""
    print("🎯 QR Scanner API Startup Script")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("qr_scanner_api.py"):
        print("❌ Error: qr_scanner_api.py not found")
        print("   Please run this script from the scripts directory")
        return False
    
    # Check dependencies
    if not check_dependencies():
        return False
    
    # Create directories
    create_directories()
    
    # Start the API server
    return start_api_server()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
