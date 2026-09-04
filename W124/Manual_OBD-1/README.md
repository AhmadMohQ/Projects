# Mercedes-Benz OBD-1 Manual Diagnostic Reader

A simple manual diagnostic tool for retrieving **blink-code fault information** from supported older Mercedes-Benz vehicles.

This project was built as the hardware companion to **[SmartOBD1.com](https://smartobd1.com)**, a diagnostic website that helps users identify the correct vehicle configuration, diagnostic connector, subsystem, and blink-code meaning.

> **Current version:** Manual blink-code reader  
> **Future direction:** Automated pulse detection and mobile integration

---

## Overview

Many older Mercedes-Benz vehicles use pre-OBD-II diagnostic systems where faults are retrieved as a sequence of LED flashes ("blink codes").

This reader provides a simple way to:

1. Connect to a supported diagnostic socket.
2. Trigger the diagnostic system manually.
3. Count the returned LED flashes.
4. Enter the blink count into **SmartOBD1.com** to retrieve the corresponding fault information.

The reader is intended for supported Mercedes-Benz vehicles using legacy **8-pin, 16-pin, or 38-pin diagnostic interfaces**.

**Important:** Connector availability, active diagnostic pins, and subsystem assignments vary by chassis, model year, engine, market, and equipment. Always verify the correct connection for the specific vehicle before use.

---

## Features

- Manual blink-code retrieval
- Simple, low-cost hardware
- Designed for legacy Mercedes-Benz diagnostics
- Works as a companion to SmartOBD1.com
- No proprietary scan tool required
- Easy to reproduce and modify
- Useful for learning basic automotive diagnostics and electrical troubleshooting

---

## How It Works

The reader uses a momentary input to request diagnostic information from the selected diagnostic line.

The vehicle responds with a sequence of pulses that can be observed as LED flashes.

For example:

```text
Flash  Flash  Flash  Flash  Flash
  1      2      3      4      5
```

This would be interpreted as **blink code 5**.

The retrieved blink count is then entered into SmartOBD1.com along with the correct:

- chassis
- model year
- connector type
- diagnostic subsystem / pin

The website returns the associated diagnostic information.

---

## Parts

A basic manual reader can be built using:

- Momentary push button
- Indicator LED / suitable automotive indicator
- Appropriate resistor(s) where required
- Insulated wire
- Connectors / test leads suitable for the vehicle diagnostic socket
- Enclosure (optional)
- Heat-shrink tubing or other insulation

### Recommended additions

- Fused lead
- Clearly labelled test leads
- Strain relief
- Insulated connectors
- Small project enclosure

See [`BOM.md`](BOM.md) for a simple bill of materials.

---

## Basic Workflow

```text
Vehicle diagnostic socket
        │
        ▼
Manual OBD-1 reader
        │
        ▼
Trigger diagnostic request
        │
        ▼
Observe LED blink sequence
        │
        ▼
Count flashes
        │
        ▼
Enter result into SmartOBD1.com
        │
        ▼
Fault information + optional troubleshooting assistance
```

---

## Build Notes

The exact diagnostic connection depends on the vehicle.

Do **not** assume that the same pin performs the same function across every Mercedes-Benz chassis or model year.

Before connecting the reader:

1. Identify the vehicle chassis and model year.
2. Identify the diagnostic connector type.
3. Confirm the correct diagnostic subsystem / pin.
4. Confirm ground and power connections.
5. Inspect the reader for exposed conductors or shorts.
6. Only then connect the reader to the vehicle.

For vehicle-specific diagnostic information, use:

**https://smartobd1.com**

---

## Using the Reader

A typical manual diagnostic process is:

1. Switch the vehicle ignition to the required diagnostic position.
2. Connect the reader to the correct diagnostic connections.
3. Press the momentary button for the required request interval.
4. Release the button.
5. Observe the LED.
6. Count the flashes.
7. Record the blink count.
8. Look up the result on SmartOBD1.com.
9. Repeat as required to retrieve additional stored faults.

> Procedures can differ between systems and vehicles. Always follow the correct diagnostic procedure for the specific vehicle.

---

## Repository Structure

```text
mercedes-obd1-reader/
├── README.md
├── BOM.md
├── SAFETY.md
├── LICENSE
├── docs/
│   └── BUILD_NOTES.md
└── images/
    └── README.md
```

---

## Photos / Video

Add your own build photos to the `/images` directory.

Suggested images:

- completed reader
- internal wiring
- connector leads
- reader connected to the vehicle
- example blink-code sequence

If you have a build/tutorial video, add it here:

**Build Video:** `ADD_YOUR_VIDEO_LINK_HERE`

---

## SmartOBD1

The hardware reader is only one part of the project.

**SmartOBD1.com** provides the software workflow for:

- vehicle selection
- connector selection
- subsystem identification
- blink-code lookup
- fault-code descriptions
- optional AI-assisted troubleshooting

Visit:

**https://smartobd1.com**

---

## Future Development

Possible future improvements include:

- automatic pulse detection
- microcontroller-based blink-code decoding
- Bluetooth communication
- mobile application
- automatic vehicle/subsystem selection
- direct integration with SmartOBD1
- diagnostic history and saved reports

The current repository documents the **manual reader only**.

---

## Safety

Working around automotive electrical systems can damage vehicle electronics if incorrect connections are made.

Before building or using this project, read [`SAFETY.md`](SAFETY.md).

This project is provided for educational and informational purposes. Verify all connections against reliable documentation for the exact vehicle being tested.

---

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Mercedes-Benz Group AG.

Mercedes-Benz and related marks are trademarks of their respective owners.

The information in this repository is provided without warranty. Use at your own risk.

---

## Author

**Ahmad Mohamad**

Computer Systems Engineering  
Automotive diagnostics, embedded systems, and hardware/software projects

- Website: https://smartobd1.com
- GitHub: Add your GitHub profile link
- LinkedIn: Add your LinkedIn profile link
