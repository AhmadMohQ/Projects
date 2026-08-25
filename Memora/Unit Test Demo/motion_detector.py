# motion_detector.py

import cv2
import numpy as np
import time
import os
from picamera2 import Picamera2
from PIL import Image

def countdown(seconds, msg=""):
    for i in range(seconds, 0, -1):
        print(f"{msg} {i}...")
        time.sleep(1)

def get_camera():
    cam = Picamera2()
    cam.configure(cam.create_still_configuration())
    cam.start()
    return cam

def capture_image(camera, filepath):
    camera.capture_file(filepath)
    print(f"Captured image: {filepath}")

def person_detected_cv(background_path, current_path, pixel_threshold=5000):
    bg = cv2.imread(background_path)
    frame = cv2.imread(current_path)

    # Convert to grayscale
    bg_gray = cv2.cvtColor(bg, cv2.COLOR_BGR2GRAY)
    frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Blur to reduce camera noise
    bg_blur = cv2.GaussianBlur(bg_gray, (21, 21), 0)
    frame_blur = cv2.GaussianBlur(frame_gray, (21, 21), 0)

    # Compute absolute difference
    delta = cv2.absdiff(bg_blur, frame_blur)

    # Threshold the difference image
    thresh = cv2.threshold(delta, 25, 255, cv2.THRESH_BINARY)[1]

    # Dilate to fill small holes
    thresh = cv2.dilate(thresh, None, iterations=2)

    # Count how many pixels have changed
    changed_pixels = cv2.countNonZero(thresh)
    print(f"Changed Pixels: {changed_pixels}")

    return changed_pixels > pixel_threshold

def main():
    os.makedirs("data/images", exist_ok=True)
    cam = get_camera()

    print("Preparing to take background image...")
    countdown(5, "Capturing background in")
    bg_path = "data/images/background.jpg"
    capture_image(cam, bg_path)

    print("Motion detection started...")
    interval = 3  # seconds between checks
    count = 0

    while True:
        img_path = f"data/images/frame{count}.jpg"
        capture_image(cam, img_path)

        if person_detected_cv(bg_path, img_path):
            print("Motion Detected")
        else:
            print("No motion")

        count += 1
        time.sleep(interval)

if __name__ == "__main__":
    main()
# motion_detector.py
