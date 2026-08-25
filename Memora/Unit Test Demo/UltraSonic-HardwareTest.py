from gpiozero import DistanceSensor
from time import sleep

sensor = DistanceSensor(echo=12, trigger=4)

def detect_motion(): 
    if sensor.distance * 100 < 100:
        return True
    return False
    
    
while True:
    print('Distance: ', sensor.distance * 100, detect_motion())
    sleep(1)