import random
import time
from typing import Dict, List
import signal
import sys
import os
import paho.mqtt.client as mqtt

BROKER_HOST = os.getenv("MQTT_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_PORT", "1883"))
CITIES: List[str] = ["Athens", "Larissa"]
SPOT_ID_MIN = 1
SPOT_ID_MAX = 24

INTERVAL_SECONDS = 3
BATCH_SIZE = 3

STATUSES: List[str] = ["Available", "Occupied", "Reserved", "Maintenance"]

USE_JSON_PAYLOAD = False

QOS = 0
RETAIN = False

rng = random.Random()
last_status: Dict[int, str] = {}

def choose_new_status(spot_id: int) -> str:
    prev = last_status.get(spot_id)
    choices = [s for s in STATUSES if s != prev] if prev in STATUSES else STATUSES
    if prev in STATUSES and rng.random() < 0.2:
        return prev
    return rng.choice(choices)

def build_payload(status: str) -> str:
    if USE_JSON_PAYLOAD:
        return f'{{"status":"{status}"}}'
    return status

def on_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected (rc={rc})" if rc == 0 else f"[MQTT] Connect failed (rc={rc})")

def on_disconnect(client, userdata, rc):
    print(f"[MQTT] Disconnected (rc={rc})")

def run():
    client = mqtt.Client()
    client.on_connect = on_connect

    max_retries = 10
    retry_delay = 2
    for attempt in range(max_retries):
        try:
            print(f"[MQTT] Attempting to connect to {BROKER_HOST}:{BROKER_PORT} (attempt {attempt + 1}/{max_retries})...")
            client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
            client.loop_start()
            print(f"[MQTT] Connection successful!")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"[MQTT] Connection failed: {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 30)
            else:
                print(f"[MQTT] Failed to connect after {max_retries} attempts. Exiting.")
                sys.exit(1)
    client.loop_start()

    def stop(signum, frame):
        print("\nStopping publisher...")
        client.loop_stop()
        client.disconnect()
        sys.exit(0)

    signal.signal(signal.SIGINT, stop)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, stop)

    print(f"Publishing {BATCH_SIZE} updates every {INTERVAL_SECONDS}s to "
          f"'parking/<City>/<SpotId>/status' (IDs {SPOT_ID_MIN}-{SPOT_ID_MAX})")
    print(f"Broker: {BROKER_HOST}:{BROKER_PORT} | Payload mode: "
          f"{'JSON' if USE_JSON_PAYLOAD else 'plain-text'} | QoS={QOS} retain={RETAIN}")

    try:
        while True:
            spot_ids = rng.sample(range(SPOT_ID_MIN, SPOT_ID_MAX + 1),
                                  k=min(BATCH_SIZE, SPOT_ID_MAX - SPOT_ID_MIN + 1))
            for spot_id in spot_ids:
                city = rng.choice(CITIES)
                status = choose_new_status(spot_id)
                payload = build_payload(status)
                topic = f"parking/{city}/{spot_id}/status"

                result = client.publish(topic, payload=payload, qos=QOS, retain=RETAIN)
                if result.rc != mqtt.MQTT_ERR_SUCCESS:
                    print(f"[MQTT] Publish failed rc={result.rc} topic={topic}")
                else:
                    print(f"[PUB] {topic} -> {payload}")

                last_status[spot_id] = status

            time.sleep(INTERVAL_SECONDS)
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    run()
