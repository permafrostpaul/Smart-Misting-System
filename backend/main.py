from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # For request body
import paho.mqtt.client as mqtt
import json
from datetime import datetime, timedelta, timezone # Added timezone
import uvicorn
from typing import Dict, List, Optional
import sqlite3
from contextlib import contextmanager
import os # For environment variables

# --- Configuration ---
app = FastAPI(title="Smart Misting System API", version="1.1.0")

# CORS Configuration (Adjust allow_origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MQTT Configuration - Use Environment Variables for deployed settings
MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", 1883))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", None) 
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", None) 

MQTT_SUBSCRIBE_TOPICS = [
    ("misting/sensor/1/temperature", 0),
    ("misting/sensor/1/humidity", 0),
    ("misting/sensor/2/temperature", 0),
    ("misting/sensor/2/humidity", 0),
    ("misting/average/temperature", 0), 
    ("misting/average/humidity", 0),    
    ("misting/status", 0),              
    ("misting/mode", 0),                
    ("misting/event/activation", 0),    
    ("misting/event/human_detected", 0), 
    ("misting/detection/person", 0)
]

# Database Configuration
DATABASE_FILE = "misting_system.db"

class ControlActionPayload(BaseModel):
    action: str # "ON" or "OFF"
    mode: Optional[str] = "MANUAL" # "MANUAL", "AUTO", "CONTINUOUS"

# --- Global Variables ---
latest_data = {
    "sensor1": {"temperature": None, "humidity": None, "timestamp": None},
    "sensor2": {"temperature": None, "humidity": None, "timestamp": None},
    "average": {"temperature": None, "humidity": None, "timestamp": None},
    "misting_status": "OFF", # Actual status from ESP32's misting/status
    "mode": "AUTO",   
    "person_detection_status": "NO_PERSON", # Initial default
    "person_detection_timestamp": None,              # Current operational mode
    "human_detected": False,
    "last_event_trigger": None
    
}
last_sensor_db_insertion = {} 

# --- Database Setup ---
@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row # Access columns by name
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Sensor Data Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT NOT NULL,
                timestamp DATETIME NOT NULL, -- Store as UTC, or ensure server is PHT for 'now'
                temperature REAL,
                humidity REAL
            )
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_sensor_data_sensor_id_timestamp 
            ON sensor_data (sensor_id, timestamp)
        ''')
        
        # Misting Events Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS misting_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_timestamp DATETIME NOT NULL, -- Store as UTC
                trigger_type TEXT NOT NULL, 
                trigger_reason TEXT,      
                duration_seconds INTEGER  
            )
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_misting_events_timestamp 
            ON misting_events (event_timestamp)
        ''')
        conn.commit()
        print("Database initialized.")

# --- MQTT Client Setup ---
mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1) # Use VERSION1 for Paho V2+

def get_pht_time():
    # Helper to get current time in PHT (UTC+8)
    # For production, ensure server timezone is UTC and use pytz or zoneinfo for robust conversion
    # This example assumes server might be PHT or uses datetime('now', '+8 hours') in SQL.
    # For explicit PHT from UTC:
    # return datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=8)))
    return datetime.now() # If server is already in PHT, or for simplicity with DB default

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Successfully connected to MQTT broker")
        for topic, qos in MQTT_SUBSCRIBE_TOPICS:
            client.subscribe(topic, qos)
            print(f"Subscribed to topic: {topic} with QoS {qos}")
    else:
        print(f"Failed to connect to MQTT broker with code {rc}")
        # ... (error code details)

def on_message(client, userdata, msg):
    topic = msg.topic
    payload_str = msg.payload.decode().strip()
    
    print(f"MQTT Received: [{topic}] {payload_str}")
    
    now_pht_dt = get_pht_time()
    try:
        sensor_id_affected = None
        is_sensor_data_topic = False 

        topic_parts = topic.split('/')
        if topic.startswith("misting/sensor/") and len(topic_parts) == 4:
            sensor_num = topic_parts[2]
            metric = topic_parts[3]
            if sensor_num in ["1", "2"]:
                sensor_id_affected = f"sensor{sensor_num}"
                is_sensor_data_topic = True
                if metric == "temperature":
                    latest_data[sensor_id_affected]["temperature"] = float(payload_str)
                elif metric == "humidity":
                    latest_data[sensor_id_affected]["humidity"] = float(payload_str)
                latest_data[sensor_id_affected]["timestamp"] = now_pht_dt.strftime('%Y-%m-%d %H:%M:%S')
        
        elif topic.startswith("misting/average/") and len(topic_parts) == 3:
            metric = topic_parts[2]
            is_sensor_data_topic = True 
            sensor_id_affected = "average" # Mark that an average value was affected
            if metric == "temperature":
                latest_data["average"]["temperature"] = float(payload_str)
            elif metric == "humidity":
                latest_data["average"]["humidity"] = float(payload_str)
            # Update timestamp when either average temp or hum is received
            latest_data["average"]["timestamp"] = now_pht_dt.strftime('%Y-%m-%d %H:%M:%S')

        elif topic == "misting/status":
            latest_data["misting_status"] = payload_str
        elif topic == "misting/mode":
            latest_data["mode"] = payload_str
        elif topic == "misting/event/human_detected":
            try:
                detection_data = json.loads(payload_str)
                if detection_data.get("detected"):
                    latest_data["human_detected"] = True
                    latest_data["last_event_trigger"] = "human_detected"
                    with get_db_connection() as conn:
                        conn.execute("""
                            INSERT INTO misting_events (event_timestamp, trigger_type, trigger_reason)
                            VALUES (?, ?, ?)
                        """, (now_pht_dt.strftime('%Y-%m-%d %H:%M:%S'), 'image_detection', 'person_sensed'))
                        conn.commit()
            except json.JSONDecodeError:
                latest_data["human_detected"] = (payload_str == "1" or payload_str.lower() == "true")
                if latest_data["human_detected"]: latest_data["last_event_trigger"] = "human_detected_simple"

        elif topic == "misting/event/activation":
            try:
                event_data = json.loads(payload_str)
                trigger = event_data.get("trigger", "unknown_esp32_trigger")
                reason = event_data.get("reason", payload_str)
                duration = event_data.get("duration_seconds")
                latest_data["last_event_trigger"] = trigger
                with get_db_connection() as conn:
                    conn.execute("""
                        INSERT INTO misting_events (event_timestamp, trigger_type, trigger_reason, duration_seconds)
                        VALUES (?, ?, ?, ?)
                    """, (now_pht_dt.strftime('%Y-%m-%d %H:%M:%S'), trigger, reason, duration))
                    conn.commit()
            except Exception as e:
                print(f"Error logging ESP32 activation event: {e}")
        elif topic == "misting/detection/person":
            try:       
                payload_data = json.loads(payload_str) # Assuming ESP32-CAM sends JSON
                status = payload_data.get("status", "UNKNOWN").upper()
                # confidence = payload_data.get("score") # Optional

                latest_data["person_detection_status"] = status
                latest_data["person_detection_timestamp"] = get_pht_time().strftime('%Y-%m-%d %H:%M:%S')
                print(f"Updated person detection status: {status} at {latest_data['person_detection_timestamp']}")

        # Optional: Log this event to your misting_events or a new person_detection_events table
        # with get_db_connection() as conn:
        #     conn.execute("INSERT INTO misting_events (event_timestamp, trigger_type, trigger_reason) VALUES (?, ?, ?)",
        #                  (latest_data["person_detection_timestamp"], 'image_detection', status))
        #     conn.commit()

            except json.JSONDecodeError: # Handle if ESP32-CAM sends a plain string
                if "PERSON_DETECTED" in payload_str.upper():
                    latest_data["person_detection_status"] = "PERSON_DETECTED"
                elif "NO_PERSON" in payload_str.upper():
                    latest_data["person_detection_status"] = "NO_PERSON"
                else:
                    latest_data["person_detection_status"] = "UNKNOWN_FORMAT"
                latest_data["person_detection_timestamp"] = get_pht_time().strftime('%Y-%m-%d %H:%M:%S')
                print(f"Updated person detection status (plain string): {latest_data['person_detection_status']}")
            except Exception as e:
                print(f"Error processing person detection message from topic '{topic}': {e}") 

        # --- Database insertion logic ---
        global last_sensor_db_insertion

        if is_sensor_data_topic:
            if sensor_id_affected in ["sensor1", "sensor2"]:
                s_temp = latest_data[sensor_id_affected]["temperature"]
                s_hum = latest_data[sensor_id_affected]["humidity"]
                s_timestamp_str = latest_data[sensor_id_affected]["timestamp"] # Use the sensor's specific timestamp

                can_insert = False
                if s_temp is not None and s_hum is not None:
                    if sensor_id_affected not in last_sensor_db_insertion or \
                       (now_pht_dt - last_sensor_db_insertion.get(sensor_id_affected, datetime.min)).total_seconds() >= 60:
                        can_insert = True
                
                if can_insert:
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute('''
                            INSERT INTO sensor_data (sensor_id, timestamp, temperature, humidity) 
                            VALUES (?, ?, ?, ?) 
                        ''', (sensor_id_affected, s_timestamp_str, s_temp, s_hum))
                        conn.commit()
                        last_sensor_db_insertion[sensor_id_affected] = now_pht_dt
                        print(f"DB INSERT: {sensor_id_affected} - T:{s_temp}, H:{s_hum} at {s_timestamp_str}")
                        
            
            elif sensor_id_affected == "average":
                avg_temp = latest_data["average"]["temperature"]
                avg_hum = latest_data["average"]["humidity"]
                avg_timestamp_str = latest_data["average"]["timestamp"] # Timestamp from when average MQTT message arrived

                can_insert_avg = False
                # Ensure both average T and H values are present before storing
                if avg_temp is not None and avg_hum is not None and avg_timestamp_str is not None:
                    # Apply rate limiting for 'average' DB writes if desired
                    avg_rate_limit_key = "average_db_insert" 
                    if avg_rate_limit_key not in last_sensor_db_insertion or \
                       (now_pht_dt - last_sensor_db_insertion.get(avg_rate_limit_key, datetime.min)).total_seconds() >= 60: # e.g., 1 min interval
                        can_insert_avg = True
                
                if can_insert_avg:
                    with get_db_connection() as conn:
                        cursor = conn.cursor()
                        cursor.execute('''
                            INSERT INTO sensor_data (sensor_id, timestamp, temperature, humidity) 
                            VALUES (?, ?, ?, ?) 
                        ''', ("average", avg_timestamp_str, avg_temp, avg_hum)) # Store with sensor_id 'average'
                        conn.commit()
                        last_sensor_db_insertion[avg_rate_limit_key] = now_pht_dt
                        print(f"DB INSERT: average - T:{avg_temp}, H:{avg_hum} at {avg_timestamp_str}")
                        # After successfully storing a complete average pair, reset them in latest_data
                        # This ensures the next DB entry for 'average' is also a complete new pair.
                        latest_data["average"]["temperature"] = None
                        latest_data["average"]["humidity"] = None
                        # latest_data["average"]["timestamp"] = None # Or keep latest MQTT update time
    
    except ValueError as e:
        print(f"ERROR: ValueError for topic '{topic}', payload '{payload_str}': {e}")
    except Exception as e:
        print(f"ERROR: General error in on_message for topic '{topic}', payload '{payload_str}': {e}")

# Assign callbacks and connect
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

@app.get("/debug/set_person_status", tags=["Debug"])
async def set_person_status_debug(status: str = Query(..., pattern="^(PERSON_DETECTED|NO_PERSON)$")):
    global latest_data
    status_upper = status.upper()
    
    previous_status = latest_data.get("person_detection_status")
    latest_data["person_detection_status"] = status_upper
    latest_data["person_detection_timestamp"] = get_pht_time().strftime('%Y-%m-%d %H:%M:%S')
    
    message = f"Debug: Person detection status set to {status_upper}"
    print(message)

    # --- ADD THIS LOGIC TO AUTOMATICALLY START MISTING ---
    if status_upper == "PERSON_DETECTED" and previous_status != "PERSON_DETECTED":
        try:
           
            control_action = "ON" 
            control_mode = "AUTO" # Or a dedicated mode if your ESP32 supports it

            if mqtt_client_handle: # Check if MQTT client is initialized (from FastAPI startup)
                
                
                # Then, send the ON command
                msg_id = esp_mqtt_client_publish(mqtt_client_handle, "misting/control", control_action, 0, 0, 0)
                if msg_id != -1:
                    print(f"Backend: Published '{control_action}' to misting/control due to person detection.")
                    latest_data["last_event_trigger"] = "image_detection_simulated_mist_on"
                    
                else:
                    print("Backend: FAILED to publish misting command for human detection.")
            else:
                print("Backend: MQTT client not available to send misting command.")
        except Exception as e:
            print(f"Backend: Error trying to publish misting command: {e}")
    # --- END OF AUTOMATIC MISTING LOGIC ---
    
    return {"message": message, "new_status": status_upper, "timestamp": latest_data["person_detection_timestamp"]}

# Your /sensor-data endpoint should already be returning:
# "person_detection_status": latest_data["person_detection_status"],
# "person_detection_timestamp": latest_data["person_detection_timestamp"],
# "misting_status": latest_data["misting_status"], // This will be updated by the main ESP32

# --- FastAPI Event Handlers for Startup/Shutdown ---
@app.on_event("startup")
async def startup_event():
    init_db() # Ensure DB is ready
    if MQTT_USERNAME and MQTT_PASSWORD:
        mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    # If using TLS with HiveMQ or other broker:
    # if MQTT_BROKER_PORT == 8883:
    #    mqtt_client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT) # import ssl
    try:
        mqtt_client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
        mqtt_client.loop_start() # Starts a background thread for MQTT
        print(f"MQTT client connected to {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT} and loop started.")
    except Exception as e:
        print(f"Failed to connect MQTT client on startup: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    mqtt_client.loop_stop()
    mqtt_client.disconnect()
    print("MQTT client disconnected.")


# --- API Endpoints ---
@app.get("/")
async def root():
    return {"message": "Smart Misting System API Operational"}

@app.get("/sensor-data")
async def get_sensor_data_api(): 
    s1_temp, s1_hum = latest_data["sensor1"]["temperature"], latest_data["sensor1"]["humidity"]
    s2_temp, s2_hum = latest_data["sensor2"]["temperature"], latest_data["sensor2"]["humidity"]
    
    avg_temp, avg_hum = None, None
    valid_temps = [t for t in [s1_temp, s2_temp] if t is not None]
    valid_hums = [h for h in [s1_hum, s2_hum] if h is not None]

    if valid_temps: avg_temp = sum(valid_temps) / len(valid_temps)
    if valid_hums: avg_hum = sum(valid_hums) / len(valid_hums)

    now_pht_str = get_pht_time().strftime('%Y-%m-%d %H:%M:%S')
    latest_data["average"]["temperature"] = avg_temp
    latest_data["average"]["humidity"] = avg_hum
    if avg_temp is not None or avg_hum is not None: # Update timestamp only if there's some average data
        latest_data["average"]["timestamp"] = now_pht_str
    
    return {
        "sensor1": latest_data["sensor1"],
        "sensor2": latest_data["sensor2"],
        "average": latest_data["average"],
        "misting_status": latest_data["misting_status"],
        "person_detection_status": latest_data["person_detection_status"],
        "person_detection_timestamp": latest_data["person_detection_timestamp"],
        "mode": latest_data["mode"],
        "human_detected": latest_data["human_detected"],
        "last_event_trigger": latest_data["last_event_trigger"],
        "current_server_time_pht": now_pht_str,
    }

@app.get("/historical-data")
async def get_historical_data_api( # Renamed function
    limit: int = Query(100, ge=1, le=1000), 
    sensor_ids: str = Query("sensor1,sensor2") # Default to both individual sensors
):
    ids_to_fetch = [s_id.strip() for s_id in sensor_ids.split(',')]
    results = {}
    allowed_ids = ["sensor1", "sensor2", "average"] # "average" if ESP32 stores it with this ID

    with get_db_connection() as conn:
        for s_id in ids_to_fetch:
            if s_id not in allowed_ids: continue
            cursor = conn.cursor()
            cursor.execute(f'''
                SELECT timestamp, temperature, humidity FROM sensor_data
                WHERE sensor_id = ? 
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (s_id, limit)) # Use safe parameter binding
            
            data_for_sensor = [{"timestamp": r["timestamp"], "temperature": r["temperature"], "humidity": r["humidity"]} for r in cursor.fetchall()]
            results[s_id] = data_for_sensor
    return results

@app.get("/analytics/misting_summary")
async def get_misting_summary_api(time_range_hours: int = 24): # Renamed function
    summary = {
        "time_range_hours": time_range_hours,
        "total_activations": 0,
        "activations_by_trigger": {},
    }
    # Ensure server uses PHT or convert start_time/end_time to PHT if DB stores PHT
    end_time_dt = get_pht_time()
    start_time_dt = end_time_dt - timedelta(hours=time_range_hours)
    start_time_str = start_time_dt.strftime('%Y-%m-%d %H:%M:%S')
    end_time_str = end_time_dt.strftime('%Y-%m-%d %H:%M:%S')

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT trigger_type, COUNT(*) as count
            FROM misting_events
            WHERE event_timestamp >= ? AND event_timestamp <= ?
            GROUP BY trigger_type
        """, (start_time_str, end_time_str))
        
        for row in cursor.fetchall():
            summary["activations_by_trigger"][row["trigger_type"]] = row["count"]
            summary["total_activations"] += row["count"]
    return summary


@app.get("/analytics/misting_events_log")
async def get_misting_events_log_api( # Renamed function
    time_range_hours: int = Query(24, ge=1), 
    page: int = Query(1, ge=1), 
    page_size: int = Query(25, ge=1, le=100)
):
    offset = (page - 1) * page_size
    end_time_dt = get_pht_time()
    start_time_dt = end_time_dt - timedelta(hours=time_range_hours)
    start_time_str = start_time_dt.strftime('%Y-%m-%d %H:%M:%S')
    end_time_str = end_time_dt.strftime('%Y-%m-%d %H:%M:%S')

    events = []
    total_events = 0
    total_pages = 0

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM misting_events
            WHERE event_timestamp >= ? AND event_timestamp <= ?
        """, (start_time_str, end_time_str))
        count_result = cursor.fetchone()
        if count_result: total_events = count_result[0]
        
        if total_events > 0:
            total_pages = (total_events + page_size - 1) // page_size
            cursor.execute("""
                SELECT event_timestamp, trigger_type, trigger_reason, duration_seconds 
                FROM misting_events
                WHERE event_timestamp >= ? AND event_timestamp <= ?
                ORDER BY event_timestamp DESC
                LIMIT ? OFFSET ?
            """, (start_time_str, end_time_str, page_size, offset))
            
            for row in cursor.fetchall():
                events.append({
                    "timestamp": row["event_timestamp"], "trigger_type": row["trigger_type"],
                    "reason": row["trigger_reason"], "duration": row["duration_seconds"]
                })
    return {
        "total_events": total_events, "events": events, "page": page, 
        "page_size": page_size, "total_pages": total_pages
    }

@app.post("/control-misting")
async def control_misting_api(payload: ControlActionPayload): 
    action = payload.action.upper()
    mode = payload.mode.upper()

    # Publish the desired mode first
    mqtt_client.publish("misting/mode", mode)
    print(f"Published desired mode: {mode} to misting/mode")
    
    # Then publish the action (ON/OFF)
    mqtt_client.publish("misting/control", action) # ESP32 receives ON/OFF on misting/control
    print(f"Published action: {action} to misting/control")
    

    latest_data["mode"] = mode 
    if mode != "AUTO": # 
        latest_data["misting_status"] = action 
    
    # Log manual control event if action is ON
    if action == "ON":
        now_pht_str = get_pht_time().strftime('%Y-%m-%d %H:%M:%S')
        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO misting_events (event_timestamp, trigger_type, trigger_reason)
                VALUES (?, ?, ?)
            """, (now_pht_str, 'manual_website', f'user_set_{mode.lower()}_{action.lower()}'))
            conn.commit()
            latest_data["last_event_trigger"] = f'manual_website_{mode.lower()}_{action.lower()}'

    return {
        "status": "success", 
        "message": f"Command '{action}' for mode '{mode}' sent to misting system.",
        "sent_mode": mode,
        "sent_action": action
    }

# --- Main Execution Guard ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)