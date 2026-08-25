import RPi.GPIO as GPIO
import paho.mqtt.client as mqtt
from time import sleep
from buzz import *

# GPIO Pin for Buzzer
BUZZER = 21

# Setup GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(BUZZER, GPIO.OUT)

# MQTT Configuration
MQTT_BROKER = "test.mosquitto.org"  # Replace with your friend's Raspberry Pi IP
MQTT_TOPIC = "alert/buzzer"

def on_message(client, userdata, message):
    msg = message.payload.decode("utf-8")
    if msg == "RING":
        print("Alert received! Activating buzzer...")
        play_song(SONG)

# Initialize MQTT client
client = mqtt.Client()
client.on_message = on_message

client.connect(MQTT_BROKER, 1883, 60)
client.subscribe(MQTT_TOPIC)

try:
    print("Waiting for alert...")
    client.loop_forever()

except KeyboardInterrupt:
    print("Stopped by user")
    GPIO.cleanup()
    client.disconnect()
