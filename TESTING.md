# Hardware Testing Guide

This guide explains how to test the arcade middleware with real hardware components. The middleware integrates with physical NFC readers, serial communication, sensors, and arcade machines.

## Quick Start

### 1. Start Production Mode

```bash
# Start the application in production mode for real hardware
npm run start
```

### 2. Hardware Requirements

- NFC reader (PC/SC compatible or RS232)
- Controllino or compatible serial interface
- Arcade machines with serial communication
- LED status indicators
- Room sensors and access control hardware

## Hardware Configuration

### NFC Reader Setup

Configure the NFC reader type in your environment:

```bash
# For PC/SC readers (default)
NFC_READER_TYPE=PCSC

# For RS232 serial readers
NFC_READER_TYPE=RS232
```

### Serial Communication

The middleware communicates with arcade hardware via serial commands:

- Room lighting control
- Access latch management
- Arcade machine start/stop
- Timer management
- Score collection

## Hardware Workflow Testing

### Phase 1: Badge Scanning

**Hardware:** NFC reader detects team member badge
**Expected behavior:**

- NFC reader captures badge ID
- LED indicator changes to yellow (processing)
- System validates badge format
- Progression to authorization phase

### Phase 2: Team Authorization

**Hardware:** Network communication to backend API
**Expected behavior:**

- API call to validate team access
- LED indicator shows authorization status
- Access granted/denied response
- Progression to room access (if successful)

### Phase 3: Room Access Control

**Hardware:** Serial commands to room control systems
**Expected behavior:**

- Room lighting activated via serial command
- Access latch opened via serial command
- Display shows game instructions
- LED indicator changes to green (ready)

### Phase 4: Arcade Game Session

**Hardware:** Serial communication with arcade machines
**Expected behavior:**

- Arcade machines receive start command
- Room timer begins countdown
- Game session monitoring active
- Score collection system ready

### Phase 5: Score Collection

**Hardware:** Serial communication receives game scores
**Expected behavior:**

- Arcade machines send scores via serial
- System receives and validates score data
- Progression to result evaluation

### Phase 6: Result Evaluation

**Hardware:** Local processing with configurable thresholds
**Expected behavior:**

- Score evaluation against jackpot thresholds
- Win/loss/jackpot determination
- LED indicator shows result status
- Progression to backend submission

### Phase 7: Backend Score Submission

**Hardware:** Network communication to backend API
**Expected behavior:**

- API call submits team results
- Backend confirmation received
- Score data persisted in game management system
- Progression to end game effects

### Phase 8: End Game Effects

**Hardware:** Serial commands for visual/audio feedback
**Expected behavior:**

- Win/loss/jackpot animation via serial commands
- LED indicators show final result
- Audio/visual celebration effects (if applicable)
- Progression to cleanup

### Phase 9: Session Cleanup

**Hardware:** System reset and preparation for next session
**Expected behavior:**

- All hardware systems reset
- LED indicators return to standby
- Room access secured
- System ready for next badge scan

## Hardware Monitoring

### LED Status Indicators

- **Red:** Error or access denied
- **Yellow:** Processing or authorization in progress
- **Green:** Ready or successful operation
- **Blue:** Game session active

### Serial Communication Monitoring

Monitor serial communication for:

- Command acknowledgments
- Hardware status responses
- Error conditions
- Score data transmission

### Network Connectivity

Ensure stable connection to backend API:

- API endpoint: `https://vmi1015553.contaboserver.net:9010/`
- SSL/TLS certificate validation
- Network timeout handling
- Retry logic for failed requests

## Troubleshooting Hardware Issues

### NFC Reader Problems

- Check reader connection and drivers
- Verify badge format compatibility
- Test with known working badges
- Check for electromagnetic interference

### Serial Communication Issues

- Verify serial port configuration
- Check baud rate and protocol settings
- Test cable connections
- Monitor for hardware acknowledgments

### Network Connectivity

- Test API endpoint accessibility
- Check firewall and proxy settings
- Verify SSL certificate validity
- Monitor network latency

### LED Indicator Problems

- Check power supply to LED controllers
- Verify wiring connections
- Test individual LED channels
- Check for controller firmware issues

This hardware-focused testing approach ensures reliable operation with real arcade equipment and provides comprehensive monitoring of all system components.
