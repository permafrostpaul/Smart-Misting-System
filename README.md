# Smart Misting System

A comprehensive system for monitoring and controlling environmental conditions using ESP32, MQTT, and a native desktop application.

## Components

1. **ESP32 Controller**
   - Reads temperature and humidity from DHT11 sensor
   - Controls misting system
   - Communicates via MQTT

2. **Backend Server**
   - MQTT Broker (Mosquitto)
   - REST API (FastAPI)
   - Data storage and management

3. **Desktop Application**
   - Real-time monitoring of temperature and humidity
   - Control interface for misting system
   - Data visualization

## Setup Instructions

### Prerequisites
- Python 3.8+
- Arduino IDE with ESP32 board support
- Mosquitto MQTT Broker
- Required Python packages (see requirements.txt)

### Installation
1. Install Mosquitto MQTT Broker
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Upload ESP32 code using Arduino IDE
4. Start the backend server:
   ```bash
   python backend/main.py
   ```
5. Launch the desktop application:
   ```bash
   python frontend/main.py
   ```

## Project Structure
```
smart-misting-system/
├── esp32/
│   └── smart_misting.ino
├── backend/
│   ├── main.py
│   ├── mqtt_handler.py
│   └── database.py
├── frontend/
│   ├── main.py
│   └── ui/
│       └── main_window.py
├── requirements.txt
└── README.md
``` 