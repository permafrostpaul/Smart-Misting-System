#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// WiFi credentials
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// MQTT Broker settings
const char *mqtt_server = "YOUR_MQTT_BROKER_IP";
const int mqtt_port = 1883;
const char *mqtt_client_id = "esp32_misting_system";

// MQTT Topics
const char *temp_topic = "misting/temperature";
const char *humidity_topic = "misting/humidity";
const char *misting_status_topic = "misting/status";
const char *misting_control_topic = "misting/control";

// Pin definitions
#define DHT_PIN 4  // DHT11 data pin
#define MIST_PIN 5 // Misting system control pin
#define DHT_TYPE DHT11

// Initialize objects
WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

// Variables
float temperature = 0;
float humidity = 0;
bool misting_active = false;
unsigned long last_sensor_read = 0;
const long sensor_interval = 2000; // Read sensor every 2 seconds

void setup()
{
    Serial.begin(115200);

    // Initialize DHT sensor
    dht.begin();

    // Initialize misting control pin
    pinMode(MIST_PIN, OUTPUT);
    digitalWrite(MIST_PIN, LOW);

    setup_wifi();
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
}

void setup_wifi()
{
    delay(10);
    Serial.println("Connecting to WiFi...");
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\nWiFi connected");
    Serial.println("IP address: ");
    Serial.println(WiFi.localIP());
}

void callback(char *topic, byte *payload, unsigned int length)
{
    String message;
    for (int i = 0; i < length; i++)
    {
        message += (char)payload[i];
    }

    if (String(topic) == misting_control_topic)
    {
        if (message == "ON")
        {
            misting_active = true;
            digitalWrite(MIST_PIN, HIGH);
        }
        else if (message == "OFF")
        {
            misting_active = false;
            digitalWrite(MIST_PIN, LOW);
        }
        // Publish current status
        client.publish(misting_status_topic, misting_active ? "ON" : "OFF");
    }
}

void reconnect()
{
    while (!client.connected())
    {
        Serial.print("Attempting MQTT connection...");
        if (client.connect(mqtt_client_id))
        {
            Serial.println("connected");
            client.subscribe(misting_control_topic);
        }
        else
        {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            Serial.println(" retrying in 5 seconds");
            delay(5000);
        }
    }
}

void read_sensor()
{
    temperature = dht.readTemperature();
    humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity))
    {
        Serial.println("Failed to read from DHT sensor!");
        return;
    }

    // Publish sensor data
    char temp_str[10];
    char hum_str[10];

    dtostrf(temperature, 6, 2, temp_str);
    dtostrf(humidity, 6, 2, hum_str);

    client.publish(temp_topic, temp_str);
    client.publish(humidity_topic, hum_str);

    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.print("°C, Humidity: ");
    Serial.print(humidity);
    Serial.println("%");
}

void loop()
{
    if (!client.connected())
    {
        reconnect();
    }
    client.loop();

    unsigned long currentMillis = millis();
    if (currentMillis - last_sensor_read >= sensor_interval)
    {
        last_sensor_read = currentMillis;
        read_sensor();
    }
}