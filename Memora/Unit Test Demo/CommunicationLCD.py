import RPi.GPIO as GPIO
import paho.mqtt.client as mqtt
from RPLCD.gpio import CharLCD
from time import sleep, time

# MQTT Configuration
MQTT_BROKER = "test.mosquitto.org"  # Replace with your friend's Raspberry Pi IP or your MQTT broker's IP
MQTT_TOPIC = "alert/buzzer"

# Initialize MQTT client and connect to broker
client = mqtt.Client()
client.connect(MQTT_BROKER, 1883, 60)

# Set up GPIO mode
GPIO.setmode(GPIO.BCM)

# Define GPIO pins for the ultrasonic sensor
TRIG = 4
ECHO = 18

# Configure the sensor pins
GPIO.setup(TRIG, GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)

# Define the LCD (using your existing wiring)
lcd = CharLCD(pin_rs=12, pin_e=16, pins_data=[21, 6, 19, 22],
              numbering_mode=GPIO.BCM, cols=16, rows=2, dotsize=8)

def measure_distance():
    """Measure distance using the HC-SR04 sensor."""
    # Ensure trigger is low before sending the pulse
    GPIO.output(TRIG, False)
    sleep(0.002)
    
    # Send a 10µs pulse to the TRIG pin
    GPIO.output(TRIG, True)
    sleep(0.00001)  # 10 microseconds
    GPIO.output(TRIG, False)
    
    # Measure the time until the echo is received
    start_time = time()
    while GPIO.input(ECHO) == 0:
        start_time = time()
    
    end_time = time()
    while GPIO.input(ECHO) == 1:
        end_time = time()
    
    # Calculate the distance (speed of sound = 34300 cm/s)
    duration = end_time - start_time
    distance = (duration * 34300) / 2
    return round(distance, 2)

try:
    lcd.clear()
    lcd.write_string("Measuring...")
    while True:
        dist = measure_distance()
        lcd.clear()
        lcd.write_string(f"Dist: {dist} cm")
        
        # Check if the object is closer than 5 cm
        if dist < 5:
            print("Object too close! Sending MQTT alert...")
            client.publish(MQTT_TOPIC, "RING")
        
        sleep(1)  # Update every second

except KeyboardInterrupt:
    print("Measurement stopped by user")
    GPIO.cleanup()
    client.disconnect()
