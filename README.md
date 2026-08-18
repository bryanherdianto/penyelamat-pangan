# Penyelamat Pangan

IoT food-freshness monitoring. An ESP32 reports gas and climate readings to Blynk, a backend collects them into PostgreSQL, and an LSTM model predicts spoilage and remaining shelf life.

## Data Flow

1. **ESP32 to Blynk** (push, ~1s). [`firmware/PenyelamatPangan.ino`](firmware/PenyelamatPangan.ino) reads DHT22 and the gas sensors and pushes each value to a virtual pin with `Blynk.virtualWrite()`. Blynk is just a key-value store for the latest value per pin — it never forwards anything.

2. **Blynk to sensor-api** (**poll**, 1s). This hop is commonly gotten backwards: Blynk does not push to the backend. A background thread in [`sensor-api/main.py`](sensor-api/main.py) calls `GET blynk.cloud/external/api/getAll?token=...` on a timer, maps `v0..v5` to columns, and inserts one row per poll. Nothing is event-driven, so a poll between two device writes duplicates the previous reading. At 1 row/sec that's ~86k rows/day.

3. **Prediction, on demand only.** Nothing predicts automatically. `GET /predict` on sensor-api reads the last 10 rows (fewer returns HTTP 400), maps `ppm_co2`→`mq135_values`, `ppm_c2h5oh`→`mq3_values`, `ppm_nh3`→`mics5524_values`, and POSTs them to freshness-api, which runs the ONNX LSTM over the 10x3 sequence.

4. **Back to the device.** sensor-api writes the returned `classification_prob` to Blynk V7 via the update API; Blynk pushes it down to the ESP32's `BLYNK_WRITE(V7)` handler. So Blynk carries traffic both ways — push up, poll out, push back down.

5. **Frontend.** Next.js, not in `docker-compose.yml`; run it separately. It calls sensor-api on `:8001` for dashboard data and Ollama on `:11434` for chat. It never calls freshness-api directly.

| Pin  | Value                      | Source                                    |
| ---- | -------------------------- | ----------------------------------------- |
| `V0` | Temperature (C)            | DHT22                                     |
| `V2` | Humidity (%)               | DHT22                                     |
| `V3` | CO2 / air quality          | MQ135, GPIO 34                            |
| `V4` | NH3                        | GPIO 35                                   |
| `V5` | C2H5OH                     | MQ3                                       |
| `V7` | Spoilage status (incoming) | written by sensor-api: 1 = fresh, 0 = bad |

## Structure

```
firmware/         ESP32 sketch (sensors, LCD, Blynk)
sensor-api/       Blynk poller + data API        :8001  (compose: backend_api)
freshness-api/    LSTM prediction service        :8000  (compose: lstm_api)
frontend/         Next.js dashboard + chatbot    :3000
docker-compose.yml
```

## Quick Start

Credentials come from a gitignored `.env`:

```powershell
cp .env.example .env    # then fill in BLYNK_TOKEN and POSTGRES_PASSWORD
docker-compose up -d
Invoke-RestMethod -Uri "http://localhost:8001/health"
Invoke-RestMethod -Uri "http://localhost:8000/health"
```

If freshness-api reports `model_not_loaded`, fetch the ONNX file from the repo root:

```powershell
python freshness-api/scripts/lstm/fetch-model.py
```

Frontend: `cd frontend; npm install; npm run dev`.
Firmware: `cp firmware/secrets.h.example firmware/secrets.h`, fill in the Blynk token and WiFi credentials, then open the sketch in Arduino IDE and flash. Needs the Blynk, DHT sensor, and LiquidCrystal_I2C libraries.

## API

**sensor-api :8001** — `/health`, `/latest`, `/data?limit=10` (max 1000), `/stats`, `/predict`. Interactive docs at `/docs`.

**freshness-api :8000** — `/health`, `/model/info`, `POST /predict`. The POST body needs exactly 10 values in each array:

```json
{ "mq135_values": [...10], "mq3_values": [...10], "mics5524_values": [...10] }
```

It returns `classification_text`, `classification_prob` (sigmoid, 0-1), `classification_label` (1 = Fresh, 0 = Bad, the value written to V7), `confidence`, `rsl_hours`, `status`.

**Ollama :11434** — `/api/tags`, `POST /api/generate` with `$OLLAMA_MODEL`, pulled on startup by `ollama-entrypoint.sh`.

Postgres is on `:5432`, credentials from `.env`.
