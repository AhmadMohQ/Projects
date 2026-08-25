import unittest
from gpiozero import DistanceSensor
from time import sleep

# The function to be tested
sensor = DistanceSensor(echo=12, trigger=4)

def detect_motion():
    if sensor.distance * 100 < 100:
        return True
    return False

# Test case class
class TestDetectMotionManual(unittest.TestCase):
    def test_manual_motion_detected(self):
        print("Place your hand within 100 cm of the sensor.")
        sleep(5)  # Allow 5 seconds for manual setup
        result = detect_motion()
        self.assertTrue(result, "Failed to detect motion manually.")
        print("Motion detected successfully!")

    def test_manual_no_motion_detected(self):
        print("Ensure there are no objects within 100 cm of the sensor.")
        sleep(5)  # Allow 5 seconds for manual setup
        result = detect_motion()
        self.assertFalse(result, "Motion was detected even though no object was close.")
        print("No motion detected successfully!")

if __name__ == "__main__":
    unittest.main()