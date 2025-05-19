import mqtt from 'mqtt';

class MQTTService {
  constructor() {
    this.client = null;
    this.subscribers = new Map();
    this.isConnected = false;
  }

  connect() {
    // Connect to MQTT broker
    this.client = mqtt.connect('mqtt://localhost:1883', {
      clientId: `smart-misting-${Math.random().toString(16).slice(3)}`,
      clean: true
    });

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.isConnected = true;
      this.subscribeToTopics();
    });

    this.client.on('message', (topic, message) => {
      const subscribers = this.subscribers.get(topic);
      if (subscribers) {
        const data = JSON.parse(message.toString());
        subscribers.forEach(callback => callback(data));
      }
    });

    this.client.on('error', (error) => {
      console.error('MQTT Error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('Disconnected from MQTT broker');
      this.isConnected = false;
    });
  }

  subscribeToTopics() {
    // Subscribe to sensor data topic
    this.client.subscribe('smart-misting/sensor-data', (err) => {
      if (err) {
        console.error('Error subscribing to sensor data:', err);
      }
    });

    // Subscribe to misting status topic
    this.client.subscribe('smart-misting/status', (err) => {
      if (err) {
        console.error('Error subscribing to misting status:', err);
      }
    });
  }

  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic).add(callback);
  }

  unsubscribe(topic, callback) {
    if (this.subscribers.has(topic)) {
      this.subscribers.get(topic).delete(callback);
    }
  }

  publish(topic, message) {
    if (this.client && this.isConnected) {
      this.client.publish(topic, JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}

// Create a singleton instance
const mqttService = new MQTTService();
export default mqttService; 