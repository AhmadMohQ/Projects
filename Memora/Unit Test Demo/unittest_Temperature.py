from sense_hat import SenseHat
import requests
import time
from datetime import datetime

# Initialize SenseHat
sense = SenseHat()

# Firebase URL (replace with your own if needed)
firebase_url = "https://temperature-sensor-6ee44-default-rtdb.firebaseio.com/readings.json"

# Define colors
red = (255, 0, 0)
green = (0, 255, 0)

while True:
    # Take readings
    t = round(sense.get_temperature(), 1)
    h = round(sense.get_humidity(), 1)

    # Create message for Sense HAT
    message = f"Temp: {t}°C Hum: {h}%"
    
    bg = green if 18.3 <= t <= 26.7 else red
    sense.show_message(message, scroll_speed=0.09, back_colour=bg)

    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    data = {
        "timestamp": timestamp,
        "temperature": t,
        "humidity": h
    }

    # Send data to Firebase
    try:
        response = requests.post(firebase_url, json=data)  # POST appends new data
        if response.status_code == 200:
            print(f"Data sent: {data}")
        else:
            print(f"Failed to send data, status code: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

    time.sleep(5)
