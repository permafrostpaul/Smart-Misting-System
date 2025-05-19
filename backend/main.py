from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import paho.mqtt.client as mqtt
import json
from datetime import datetime
import uvicorn
from typing import Dict, List
import sqlite3
from contextlib import contextmanager

app = FastAPI(title="Smart Misting System API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MQTT Configuration
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPICS = [
    "misting/temperature",
    "misting/humidity",
    "misting/status"
]

# Database configuration
DATABASE = "misting_system.db"

@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                temperature REAL,
                humidity REAL
            )
        ''')
        conn.commit()

# Initialize database
init_db()

# Global variables to store latest sensor data
latest_data = {
    "temperature": None,
    "humidity": None,
    "misting_status": "OFF"
}

# MQTT Client setup
mqtt_client = mqtt.Client()

def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    for topic in MQTT_TOPICS:
        client.subscribe(topic)

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode()
    
    if topic == "misting/temperature":
        latest_data["temperature"] = float(payload)
    elif topic == "misting/humidity":
        latest_data["humidity"] = float(payload)
    elif topic == "misting/status":
        latest_data["misting_status"] = payload
    
    # Store temperature and humidity data in database
    if topic in ["misting/temperature", "misting/humidity"]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO sensor_data (temperature, humidity)
                VALUES (?, ?)
            ''', (latest_data["temperature"], latest_data["humidity"]))
            conn.commit()

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Connect to MQTT broker
mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
mqtt_client.loop_start()

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Smart Misting System API"}

@app.get("/sensor-data")
async def get_sensor_data():
    return latest_data

@app.get("/historical-data")
async def get_historical_data(limit: int = 100):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT timestamp, temperature, humidity
            FROM sensor_data
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (limit,))
        data = cursor.fetchall()
        return [{"timestamp": row[0], "temperature": row[1], "humidity": row[2]} for row in data]

@app.post("/control-misting")
async def control_misting(action: str):
    if action not in ["ON", "OFF"]:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'ON' or 'OFF'")
    
    mqtt_client.publish("misting/control", action)
    return {"status": "success", "message": f"Misting system turned {action}"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 