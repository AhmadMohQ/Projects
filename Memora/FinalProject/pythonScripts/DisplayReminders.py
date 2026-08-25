import RPi.GPIO as GPIO
from RPLCD.gpio import CharLCD
from time import sleep

import firebase_admin
from firebase_admin import credentials, firestore

#Initialize LCD
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
        lcd.clear()
        lcd.write_string(title)
        sleep(3)

if __name__ == '__main__':

    cred = credentials.Certificate(".../firebaseConfig.json") #Replace with your own firebase credentials
    firebase_admin.initialize_app(cred)

    db = firestore.client() 
    try:
        reminders_ref = db.collection(u'reminders')
        docs = reminders_ref.stream()
        reminders = []
        for doc in docs:
            data = doc.to_dict()
            title = data.get('title', 'No Title')
            reminders.append(title)

        #Display each reminder's title on the LCD
        print_reminders(reminders)

    except KeyboardInterrupt:
        print("Stopping...")
    finally:
        GPIO.cleanup()

