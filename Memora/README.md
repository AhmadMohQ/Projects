# Memora

A mobile application for reminders, weather updates, maps, and security monitoring with Raspberry Pi sensors.

## Features

- **Reminders**: Create and manage reminders with notifications
- **Weather**: View current weather information and forecasts
- **Maps**: Explore locations and set location-based reminders
- **Security**: Monitor camera feed and ultrasonic sensor data from Raspberry Pi

## Setup and Installation

### Mobile App Setup

1. Navigate to project [directory](./FinalProject/).

2. Install dependencies:
   `npm install`

3. Start the development server:
   `npx expo start`

4. Run on a device or emulator:
   - Scan the QR code with the Expo Go app

### Raspberry Pi Setup

1. Copy the scripts at [this directory](./FinalProject/pythonScripts/) to your Raspberry Pis:
   - You'll need to have 4 Rpi's all on the same network for this setup to work properly.
   - Each RPi need specific scripts based on the circuit they are connected to:
      - UltraSonic RPi: the RPi connected to the ultrasonic module needs the [UltraSonic](./FinalProject/pythonScripts/ultrasonicBuzzer.py) script.
      - Buzzer RPi: the RPi connected to the buzzer needs the [Buzzer](./FinalProject/pythonScripts/BuzzerTest.py) script.
      - Weather RPi: the RPi doing all the weather handling needs the [Weather](./FinalProject/pythonScripts/weatherData.py) script.
      - Camera and LCD: this RPi requires two scripts: [LCD](./FinalProject/pythonScripts/DisplayReminders.py) and [PiCam](./FinalProject/pythonScripts/piCam.py).
   
2. Install required dependencies for each Raspberry Pi.

3. Run the python scripts.

## Configuration
Update the IP address in the app's settings to match your Raspberry Pi's IP address:
1. Open the app
2. Go to the Security tab and Weather Tab
3. Click on Settings
4. Enter your Raspberry Pi's IP address

## Repository File Structure
```
Docs # Contains all documents related to the project
   - Detailed Design Doc
   - Draft Project Proposal
   - Final Project Report Draft
End to End Demo #Files showcasing the End to End Communication
FinalProject #Final Project Submission
Unit Test Demo #Unit Test modules for each component involved in project
WeeklyUpdates #WIPURS for all weeks from each team member
```


