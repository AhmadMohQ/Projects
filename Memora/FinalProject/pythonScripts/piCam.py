import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
logging.getLogger('picamera2').setLevel(logging.WARNING)
logging.getLogger('picamera2.request').setLevel(logging.ERROR)

import time
import threading
import argparse
import io
import socket
import os
import json
import paho.mqtt.client as mqtt
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS to allow requests from the mobile app

# Global variables
motion_detected = False
last_motion_time = 0
frame_buffer = None
lock = threading.Lock()

# MQTT config
MQTT_BROKER = "test.mosquitto.org"
MQTT_TOPIC = "sensor/motion"
MQTT_PORT = 1883
MQTT_WS_PORT = 8081  #WebSocket port for browser/mobile clients

mqtt_client = None

try:
    import picamera
    CAMERA_MODE = "legacy"
    logger.info("Using legacy PiCamera library")
except ImportError:
    try:
        from picamera2 import Picamera2
        CAMERA_MODE = "picamera2"
        logger.info("Using Picamera2 library")
    except ImportError:
        CAMERA_MODE = "simulation"
        logger.info("No camera library available, using simulation mode")

# Check if GPIO is available for PIR sensor
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
    logger.info("GPIO available for motion detection")
except ImportError:
    GPIO_AVAILABLE = False
    logger.info("GPIO not available, will use simulated motion detection")

# PIR Sensor setup
PIR_PIN = 17  

def setup_mqtt():
    """Setup MQTT client for publishing motion events"""
    global mqtt_client
    
    try:
        # Create MQTT client
        client_id = f'pi-camera-{socket.gethostname()}-{os.getpid()}'
        mqtt_client = mqtt.Client(client_id=client_id)
        
        # Connect to broker
        logger.info(f"Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
                mqtt_client.publish(f"{MQTT_TOPIC}/status", json.dumps({
            "status": "online",
            "device": socket.gethostname(),
            "timestamp": time.time()
        }))
        
        logger.info("MQTT client initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to setup MQTT: {e}")
        mqtt_client = None
        return False

def send_motion_alert():
    """Send motion alert via MQTT"""
    global mqtt_client, last_motion_time
    
    current_time = time.time()
    if current_time - last_motion_time < 5:  # Only send alert every 5 seconds max
        return
        
    last_motion_time = current_time
    
    # Log the alert
    logger.info("Sending motion alert via MQTT")
    
    # Send via MQTT 
    if mqtt_client:
        try:
            payload = json.dumps({
                "motion_detected": True,
                "timestamp": current_time,
                "device": socket.gethostname()
            })
            mqtt_client.publish(MQTT_TOPIC, payload)
            logger.info("Motion alert sent via MQTT")
        except Exception as e:
            logger.error(f"Failed to send MQTT alert: {e}")

# Check if GPIO is available for PIR sensor
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
    logger.info("GPIO available for motion detection")
except ImportError:
    GPIO_AVAILABLE = False
    logger.info("GPIO not available, will use simulated motion detection")

def setup_pir_sensor():
    """Setup the PIR motion sensor if GPIO is available"""
    if not GPIO_AVAILABLE:
        return False
        
    try:
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(PIR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        logger.info(f"PIR sensor initialized on GPIO {PIR_PIN} with pull-down resistor")
        return True
    except Exception as e:
        logger.error(f"Failed to setup PIR sensor: {e}")
        return False

def monitor_pir_sensor():
    """Monitor the PIR sensor for motion detection"""
    global motion_detected
    
    if not GPIO_AVAILABLE:
        return
    
    logger.info("Starting motion detection with PIR sensor...")
    
    try:
        # Set GPIO mode
        GPIO.setmode(GPIO.BCM)
                WARMUP_TIME = 30
        logger.info(f"Allowing PIR sensor warm-up time: {WARMUP_TIME} seconds...")
        time.sleep(WARMUP_TIME)
        
        while True:
            sensor_value = GPIO.input(PIR_PIN)
            logger.debug(f"GPIO PIR sensor reading: {sensor_value}")
            
            if sensor_value:  # When PIR output is HIGH, motion is detected
                if not motion_detected:
                    motion_detected = False
                    logger.info("Motion detected!")
                    send_motion_alert()
                    # Wait 5 seconds to avoid repeated triggers
                    time.sleep(5)
            else:
                motion_detected = True
            
            # Short delay between checks
            time.sleep(0.5)
    except Exception as e:
        logger.error(f"Error in PIR monitoring: {e}")
        
def simulate_motion_detection():
    """Simulate motion detection for testing"""
    global motion_detected
    
    logger.info("Starting simulated motion detection...")
    
    import random
    while True:
        # Random motion detection
        motion_detected = random.random() < 0.1
        if motion_detected:
            logger.info("Motion detected (simulated)!")
            send_motion_alert()
            # Keep motion detected for a few seconds
            time.sleep(3)
        
        # Wait between checks
        time.sleep(random.uniform(2, 10))

def setup_camera_legacy():
    """Setup camera using legacy PiCamera library"""
    try:
        camera = picamera.PiCamera()
        camera.resolution = (640, 480)
        camera.framerate = 24
        # Allow camera to warm up
        time.sleep(2)
        logger.info("Legacy camera initialized successfully")
        return camera
    except Exception as e:
        logger.error(f"Error initializing legacy camera: {e}")
        return None

def setup_camera_picamera2():
    """Setup camera using Picamera2 library"""
    try:
        camera = Picamera2()
        camera_config = camera.create_preview_configuration(main={"size": (640, 480)})
        camera.configure(camera_config)
        camera.start()
        logger.info("Picamera2 initialized successfully")
        return camera
    except Exception as e:
        logger.error(f"Error initializing Picamera2: {e}")
        return None

def camera_stream_legacy(camera):
    """Capture frames from legacy PiCamera"""
    global frame_buffer
    
    if camera is None:
        logger.error("Legacy camera not initialized")
        return

    stream = io.BytesIO()
    try:
        # Continuous capture loop
        for _ in camera.capture_continuous(stream, format='jpeg', use_video_port=True):
            # Store the frame
            with lock:
                stream.seek(0)
                frame_buffer = stream.read()
            
            stream.seek(0)
            stream.truncate()
            
            # Short delay between frames
            time.sleep(0.04) 
    except Exception as e:
        logger.error(f"Error in legacy camera stream: {e}")
    finally:
        camera.close()
        logger.info("Legacy camera stopped")

def camera_stream_picamera2(camera):
    """Capture frames from Picamera2"""
    global frame_buffer
    
    if camera is None:
        logger.error("Picamera2 not initialized")
        return
    
    try:
        from picamera2.encoders import JpegEncoder
        from picamera2.outputs import FileOutput
        
        # Create a JPEG encoder
        encoder = JpegEncoder()
        
        while True:
            # Create an in-memory stream
            stream = io.BytesIO()
            output = FileOutput(stream)
            encoder.output = output
            
            # Capture a frame
            camera.capture_file(stream, format='jpeg')
            
            # Store the frame
            with lock:
                stream.seek(0)
                frame_buffer = stream.read()
            
            # Short delay between frames
            time.sleep(0.04)  # ~25 FPS
    except Exception as e:
        logger.error(f"Error in Picamera2 stream: {e}")
    finally:
        camera.stop()
        logger.info("Picamera2 stopped")

def simulate_camera_stream():
    """Simulate camera stream with a static test image"""
    global frame_buffer
    
    logger.info("Starting simulated camera stream...")
    
    # Try to create a simple test image
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        while True:
            # Create a new image
            img = Image.new('RGB', (640, 480), color=(73, 109, 137))
            d = ImageDraw.Draw(img)
            
            # Add some text with timestamp
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            d.text((10, 10), f"Test Camera - {timestamp}", fill=(255, 255, 0))
            d.text((10, 50), "No real camera available", fill=(255, 255, 0))
            d.text((10, 90), "Simulated Mode", fill=(255, 255, 0))
            
            # Convert to JPEG
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG')
            
            # Store the frame
            with lock:
                frame_buffer = img_byte_arr.getvalue()
            
            # Short delay between frames
            time.sleep(0.1)
    except ImportError:
        # If PIL is not available, create an even simpler fallback
        logger.warning("PIL not available, using basic simulation")
        while True:
            # Very simple colored square (10x10 red JPEG)
            with lock:
                frame_buffer = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xdb\x00C\x01\t\t\t\x0c\x0b\x0c\x18\r\r\x182!\x1c!22222222222222222222222222222222222222222222222222\xff\xc0\x00\x11\x08\x00\n\x00\n\x03\x01"\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xc4\x00\x1f\x01\x00\x03\x01\x01\x01\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x11\x00\x02\x01\x02\x04\x04\x03\x04\x07\x05\x04\x04\x00\x01\x02w\x00\x01\x02\x03\x11\x04\x05!1\x06\x12AQ\x07aq\x13"2\x81\x08\x14B\x91\xa1\xb1\xc1\t#3R\xf0\x15br\xd1\n\x16$4\xe1%\xf1\x17\x18\x19\x1a&\'()*56789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x82\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00?\x00\xfe\xfe(\xa2\x8a\x00\xff\xd9'
            time.sleep(0.1)
    except Exception as e:
        logger.error(f"Error in simulated camera stream: {e}")

def generate_frames():
    """Generate frames for streaming over HTTP"""
    global frame_buffer
    
    while True:
        with lock:
            if frame_buffer is None:
                # If no frame is available, wait
                time.sleep(0.1)
                continue
            else:
                frame_bytes = frame_buffer
                
        # Yield the frame in HTTP multipart response
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        # Short delay
        time.sleep(0.04)  # ~25 FPS

@app.route('/')
def index():
    """Home page"""
    return """
    <html>
      <head>
        <title>Raspberry Pi Camera Server</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 20px; }
          img { max-width: 100%; border-radius: 10px; }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { color: #333; }
          .status-bar { 
            background-color: #f0f0f0; 
            padding: 10px; 
            margin-top: 15px;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
          }
          .status-item {
            display: inline-block;
            margin: 0 10px;
          }
          .motion-status {
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            font-size: 0.8em;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Raspberry Pi Camera</h1>
          <img src="/stream" alt="Live Camera Feed">
          
          <div class="status-bar">
            <div class="status-item">
              Mode: <span id="camera-mode">""" + CAMERA_MODE + """</span>
            </div>
            <div class="status-item">
              Motion Detection: <span id="motion-status" class="motion-status">Checking...</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Server is running and accessible from your MyReminders app</p>
          </div>
        </div>
        
        <script>
          // Update motion status every 2 seconds
          setInterval(async () => {
            try {
              const response = await fetch('/motion_status');
              const data = await response.json();
              
              document.getElementById('motion-status').innerText = 
                data.motion_detected ? '?? MOTION DETECTED' : 'No Motion';
              document.getElementById('motion-status').style.color = 
                data.motion_detected ? 'red' : 'green';
            } catch (e) {
              console.error('Error fetching motion status:', e);
              document.getElementById('motion-status').innerText = 'Error';
              document.getElementById('motion-status').style.color = 'orange';
            }
          }, 2000);
        </script>
      </body>
    </html>
    """

@app.route('/stream')
def video_stream():
    """Video streaming route"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/motion_status')
def get_motion_status():
    """API endpoint to get motion detection status"""
    global motion_detected
    
    response = jsonify({
        "motion_detected": motion_detected,
        "timestamp": time.time()
    })
    
    # If motion is detected, also send an alert
    if motion_detected:
        # This enables clients to get an alert even if they're just polling
        send_motion_alert()
        
    return response

@app.route('/info')
def get_info():
    """Get server information"""
    return jsonify({
        "camera_mode": CAMERA_MODE,
        "gpio_available": GPIO_AVAILABLE,
        "uptime": time.time() - start_time,
        "mqtt_enabled": mqtt_client is not None
    })

def get_ip_address():
    """Get the server's IP address"""
    try:
        # Create a socket connection to determine the IP address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
        return ip_address
    except Exception:
        # Fallback to hostname
        try:
            import socket
            return socket.gethostbyname(socket.gethostname())
        except:
            return "Unknown"

if __name__ == '__main__':
    # Record start time
    start_time = time.time()
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Raspberry Pi Camera Server')
    parser.add_argument('--port', type=int, default=5000, help='Port for the web server (default: 5000)')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host for the web server (default: 0.0.0.0)')
    parser.add_argument('--pir-pin', type=int, default=17, help='GPIO pin for PIR sensor (default: 17, BCM numbering)')
    parser.add_argument('--mode', type=str, choices=['auto', 'legacy', 'picamera2', 'simulation'], 
                       default='auto', help='Camera mode to use (default: auto)')
    parser.add_argument('--no-mqtt', action='store_true', help='Disable MQTT messaging')
    args = parser.parse_args()
    

    PIR_PIN = args.pir_pin
    
    if args.mode != 'auto':
        CAMERA_MODE = args.mode
        logger.info(f"Camera mode overridden to: {CAMERA_MODE}")
    
    pir_enabled = setup_pir_sensor()
        if not args.no_mqtt:
        setup_mqtt()
    
    # Initialize camera 
    camera = None
    if CAMERA_MODE == "legacy":
        camera = setup_camera_legacy()
    elif CAMERA_MODE == "picamera2":
        camera = setup_camera_picamera2()
    
    # Print IP address guidance
    ip_address = get_ip_address()
    logger.info("\n" + "="*50)
    logger.info(f"Raspberry Pi Camera Server")
    logger.info(f"Camera Mode: {CAMERA_MODE}")
    logger.info(f"Motion Detection: {'PIR Sensor' if pir_enabled else 'Simulated'}")
    logger.info(f"MQTT Alerts: {'Enabled' if mqtt_client else 'Disabled'}")
    logger.info(f"Server IP Address: {ip_address}")
    logger.info(f"Web Interface: http://{ip_address}:{args.port}")
    logger.info(f"Stream URL: http://{ip_address}:{args.port}/stream")
    logger.info("="*50 + "\n")
    
    # Start motion detection in a background thread
    if pir_enabled:
        motion_thread = threading.Thread(target=monitor_pir_sensor)
    else:
        motion_thread = threading.Thread(target=simulate_motion_detection)
    motion_thread.daemon = True
    motion_thread.start()
    
    if CAMERA_MODE == "legacy" and camera:
        camera_thread = threading.Thread(target=camera_stream_legacy, args=(camera,))
    elif CAMERA_MODE == "picamera2" and camera:
        camera_thread = threading.Thread(target=camera_stream_picamera2, args=(camera,))
    else:
        camera_thread = threading.Thread(target=simulate_camera_stream)
    camera_thread.daemon = True
    camera_thread.start()
    
    # Start Flask server
    try:
        logger.info(f"Starting web server on {args.host}:{args.port}")
        app.run(host=args.host, port=args.port, threaded=True)
    except KeyboardInterrupt:
        logger.info("\nShutting down...")
    finally:
        if GPIO_AVAILABLE:
            GPIO.cleanup()
        if mqtt_client:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()     
    
    
    
    
    
    
    
    
    
