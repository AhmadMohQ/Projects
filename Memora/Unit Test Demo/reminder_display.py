import RPi.GPIO as GPIO
from RPLCD.gpio import CharLCD
from time import sleep

import firebase_admin
from firebase_admin import credentials, firestore

# 1. Initialize LCD
lcd = CharLCD(
    pin_rs=12, pin_e=16, pins_data=[21, 6, 19, 22],
    numbering_mode=GPIO.BCM,
    cols=16, rows=2, dotsize=8
)

def print_reminders(reminders):
    """
    Displays each reminder's title on the LCD.
    """
    for title in reminders:
        # Clear LCD and display the title
        lcd.clear()
        lcd.write_string(title)
        # Wait a bit before showing the next reminder
        sleep(3)

if __name__ == '__main__':
    # 2. Initialize Firebase
    # Replace the path with where you placed your service account key JSON
    cred = credentials.Certificate("/home/roninvPI/firebaseConfig.json")
    firebase_admin.initialize_app(cred)

    db = firestore.client()  # Create Firestore client

    try:
        # 3. Read from "reminders" collection
        reminders_ref = db.collection(u'reminders')
        docs = reminders_ref.stream()

        # 4. Collect each reminder's title into a list
        reminders = []
        for doc in docs:
            data = doc.to_dict()
            title = data.get('title', 'No Title')
            reminders.append(title)

        # 5. Display each reminder's title on the LCD
        print_reminders(reminders)

    except KeyboardInterrupt:
        print("Stopping...")
    finally:
        GPIO.cleanup()
