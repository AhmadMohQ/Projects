import RPi.GPIO as GPIO
import logging
import threading
import json
import socket
from time import sleep, time

from flask import Flask, jsonify, request
from flask_cors import CORS

import paho.mqtt.client as mqtt

# ----------------------- Configuration & Setup -----------------------

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app and enable CORS for cross-origin requests
app = Flask(__name__)
CORS(app)

# Set up GPIO mode and pins
GPIO.setmode(GPIO.BCM)
TRIG = 4
ECHO = 12
GPIO.setup(TRIG, GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)

# Attempt to initialize the LCD display (if connected)
LCD_ENABLED = False
try:
    from RPLCD.gpio import CharLCD
    lcd = CharLCD(pin_rs=12, pin_e=16, pins_data=[21, 6, 19, 22],
                  numbering_mode=GPIO.BCM, cols=16, rows=2, dotsize=8)
    LCD_ENABLED = True
    logger.info("LCD display initialized")
except ImportError:
    logger.warning("LCD module not available, running without display")
except Exception as e:
    logger.warning(f"Error initializing LCD: {e}")

# MQTT Configuration
MQTT_BROKER = "test.mosquitto.org"  # Replace with your friend's Pi IP or your MQTT broker
MQTT_TOPIC = "alert/buzzer"
client = mqtt.Client()
try:
    client.connect(MQTT_BROKER, 1883, 60)
    client.loop_start()  # Start network loop in the background
    logger.info("Connected to MQTT broker")
except Exception as e:
    logger.error(f"Error connecting to MQTT broker: {e}")

# Global variables for sensor state
sensor_triggered = False
sensor_lock = threading.Lock()
last_distance = 0

# ----------------------- Helper Functions -----------------------

def log_network_info():
    """Log network information to help with debugging connections."""
    try:
        hostname = socket.gethostname()
        ip_address = socket.gethostbyname(hostname)
        logger.info(f"Hostname: {hostname}")
        logger.info(f"IP Address: {ip_address}")
        
        interfaces = socket.getaddrinfo(host=socket.gethostname(), port=None, family=socket.AF_INET)
        all_ips = set(i[4][0] for i in interfaces)
        logger.info(f"All possible IP addresses: {all_ips}")
        logger.info(f"Server will be accessible at: http://{ip_address}:5002/")
    except Exception as e:
        logger.error(f"Error getting network info: {e}")

def measure_distance():
    """
    Measure distance using the HC-SR04 ultrasonic sensor.
    Uses a 10s pulse on TRIG and calculates the echo return time.
    Includes timeout handling.
    """
    # Ensure trigger is low before sending the pulse
    GPIO.output(TRIG, False)
    sleep(0.002)
    
    # Send a 10s pulse
    GPIO.output(TRIG, True)
    sleep(0.00001)  # 10 microseconds
    GPIO.output(TRIG, False)
    
    # Measure the time until the echo is received with timeout
    start_time = time()
    timeout = start_time + 0.1  # 100ms timeout for echo to go high
    while GPIO.input(ECHO) == 0:
        start_time = time()
        if time() > timeout:
            return float('inf')  # Timeout returns infinity
    
    end_time = time()
    timeout = end_time + 0.1  # 100ms timeout for echo to go low
    while GPIO.input(ECHO) == 1:
        end_time = time()
        if time() > timeout:
            return float('inf')
    
    # Calculate the distance: (duration * speed of sound) / 2
    duration = end_time - start_time
    distance = (duration * 34300) / 2
    return round(distance, 2)

# ----------------------- Sensor Monitoring Thread -----------------------

def ultrasonic_monitoring_thread():
    """
    Background thread that continuously measures distance,
    updates the LCD display (if enabled), logs the sensor state,
    and publishes an MQTT alert when an object is too close.
    """
    global sensor_triggered, last_distance
    
    if LCD_ENABLED:
        lcd.clear()
        lcd.write_string("Measuring...")
    
    logger.info("Starting ultrasonic sensor monitoring...")
    
    try:
        while True:
            dist = measure_distance()
            last_distance = dist  # Update the latest measured distance
            
            # Update the LCD display if available
            if LCD_ENABLED:
                lcd.clear()
                lcd.write_string(f"Dist: {dist} cm")
            
            with sensor_lock:
                if dist < 5:
                    # Only send an MQTT alert if the sensor is not already triggered
                    if not sensor_triggered:
                        sensor_triggered = True
                        logger.info(f"Object detected at {dist} cm! Sensor state: TRIGGERED")
                        try:
                            client.publish(MQTT_TOPIC, "RING")
                            logger.info("MQTT alert sent.")
                        except Exception as e:
                            logger.error(f"Error publishing MQTT alert: {e}")
                elif dist >= 5 and sensor_triggered:
                    sensor_triggered = False
                    logger.info(f"Distance now {dist} cm. Resetting triggered state.")
                
                # Optionally log the sensor status every 10 seconds
                if int(time()) % 10 == 0:
                    logger.info(f"Sensor check - Distance: {dist} cm, Triggered: {sensor_triggered}")
            
            sleep(0.5)  # Update the sensor reading twice per second
    
    except KeyboardInterrupt:
        logger.info("Measurement stopped by user")
    except Exception as e:
        logger.error(f"Error in ultrasonic monitoring: {e}")
    finally:
        if LCD_ENABLED:
            lcd.clear()

# ----------------------- Flask API Endpoints -----------------------

@app.route('/sensor_status', methods=['GET', 'POST'])
def get_sensor_status():
    """
    API endpoint to get the current sensor status.
    On POST, it simulates a trigger (with auto-reset after 5 seconds).
    """
    global sensor_triggered
    
    logger.info(f"Received {request.method} request to /sensor_status from {request.remote_addr}")
    
    # Handle POST requests to simulate a trigger
    if request.method == 'POST':
        try:
            data = request.get_json(silent=True)
            if data:
                with sensor_lock:
                    sensor_triggered = data.get('triggered', True)
                logger.info(f"Simulated trigger: {data}")
                
                # Auto-reset after 5 seconds
                def reset_trigger():
                    global sensor_triggered
                    sleep(5)
                    with sensor_lock:
                        sensor_triggered = False
                        logger.info("Trigger auto-reset")
                
                reset_thread = threading.Thread(target=reset_trigger)
                reset_thread.daemon = True
                reset_thread.start()
                
                return jsonify({"success": True, "message": "Trigger simulated"})
        except Exception as e:
            logger.error(f"Error in simulate_trigger: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # For GET requests, measure current sensor status and distance
    with sensor_lock:
        status = sensor_triggered
    current_distance = measure_distance()
    
    # Auto-trigger if the measured distance is below threshold
    if current_distance < 5:
        with sensor_lock:
            if not sensor_triggered:
                logger.info(f"Auto-triggering sensor - Distance: {current_distance} cm is less than threshold")
                sensor_triggered = True
    
    response_data = {
        "triggered": sensor_triggered,
        "distance": current_distance,
        "timestamp": time()
    }
    
    logger.info(f"Sending sensor status: {json.dumps(response_data)}")
    return jsonify(response_data)

@app.route('/')
def index():
    """Simple status page for browser-based monitoring."""
    return """
    <html>
        <head>
            <title>Ultrasonic Sensor Server</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; margin: 20px; }
                .status { font-size: 1.2em; margin: 20px 0; }
                .triggered { color: red; font-weight: bold; }
                .normal { color: green; }
                .distance { font-size: 2em; margin: 30px 0; }
            </style>
        </head>
        <body>
            <h1>Ultrasonic Sensor</h1>
            <div class="status">Status: <span id="status" class="normal">Checking...</span></div>
            <div class="distance">Distance: <span id="distance">--</span> cm</div>
            
            <script>
                // Update sensor status every second
                setInterval(async () => {
                    try {
                        const response = await fetch('/sensor_status');
                        const data = await response.json();
                        
                        document.getElementById('distance').innerText = data.distance;
                        
                        const statusElement = document.getElementById('status');
                        if (data.triggered) {
                            statusElement.innerText = 'TRIGGERED!';
                            statusElement.className = 'triggered';
                        } else {
                            statusElement.innerText = 'Normal';
                            statusElement.className = 'normal';
                        }
                    } catch (e) {
                        console.error('Error fetching sensor status:', e);
                    }
                }, 1000);
            </script>
        </body>
    </html>
    """

# Add CORS headers to each response
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# ----------------------- Main Entry Point -----------------------

if __name__ == "__main__":
    # Log network information for debugging
    log_network_info()
    
    # Start the sensor monitoring thread
    sensor_thread = threading.Thread(target=ultrasonic_monitoring_thread)
    sensor_thread.daemon = True
    sensor_thread.start()
    
    logger.info("Starting Flask server on port 5002...")
    
    try:
        # Start the Flask server (accessible on all interfaces)
        app.run(host='0.0.0.0', port=5002, threaded=True)
    except KeyboardInterrupt:
        logger.info("Flask server stopped by user")
    finally:
        # Cleanup GPIO and MQTT client on exit
        GPIO.cleanup()
        client.disconnect()
        logger.info("Cleaned up GPIO and MQTT client disconnected.")