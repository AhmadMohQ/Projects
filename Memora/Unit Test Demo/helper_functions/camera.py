from picamera2 import Picamera2
import time

# returns camera instance
def get_camera():
    camera = Picamera2()
    camera.configure(camera.create_still_configuration())
    camera.start()
    return camera

# Takes in camera instance and preview time
# displays camera preview for the indicated amount of time
def camera_preview(camera, preview_time):
    camera.start_preview()
    time.sleep(preview_time)
    camera.stop_preview()

# Takes in camera instance, output image location, countdown time and preview Boolean
# If preview is true, preview is started
# The code waits the indicated countdown time before the image is taken and stored in the indicated location
# the preview is stopped if it was started
def capture_image(camera,image_out_location, countdown_time = 0, preview = False ):
    if preview:
        print("Starting preview...")

    if countdown_time > 0:
        for i in range(countdown_time,0,-1):
            print(f"Capturing in {i} seconds...")
            time.sleep(1)

    camera.capture_file(image_out_location)
    print(f"Image captured and saved to {image_out_location}")

# Takes in camera instance, output video location, video length, countdown time and preview Boolean
# If preview is true, preview is started
# The code waits the indicated countdown time before the video is taken for the indicated amount of time 
# and stored in the indicated location
# the preview is stopped if it was started
def capture_video(camera,video_out_location, video_length, countdown_time = 0, preview = False):
    if preview:
        camera_preview(camera,preview_time=3)
    if countdown_time > 0:
        for i in range(countdown_time,0,-1):
            print(f"Starting video recording in {i} seconds...")
            time.sleep(1) #Wait for countdown 
              
    camera.start_recording(video_out_location)
    print("Recording video...")
    time.sleep(video_length) #record for specified duration
    camera.stop_recording()
    print(f"Video saved to {video_out_location}")
