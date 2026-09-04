# Build Notes

## Design Goal

The goal of the reader is to provide a simple physical interface for manually requesting and observing legacy Mercedes-Benz blink-code diagnostics.

The design intentionally keeps the hardware simple.

The diagnostic intelligence — vehicle selection, subsystem mapping, and fault interpretation — is handled separately by SmartOBD1.com.

## Recommended Build Approach

1. Mount the momentary switch and indicator in a small enclosure.
2. Use clearly identified insulated leads.
3. Protect all solder joints with heat-shrink tubing.
4. Label each lead according to its purpose.
5. Add strain relief where wires leave the enclosure.
6. Test continuity before connecting the reader to a vehicle.
7. Verify that no unintended short exists between leads.

## Verification

Before first vehicle use:

- check continuity
- check for shorts
- verify polarity
- verify the selected diagnostic connection
- compare the retrieved blink sequence against reliable diagnostic documentation

## Documentation To Add Later

This repository will be stronger if you add:

- a wiring diagram
- photos of the completed reader
- close-up photos of the leads/connectors
- an example diagnostic session
- a link to the build video
