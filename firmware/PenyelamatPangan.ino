// Blynk template IDs, auth token and WiFi credentials live in secrets.h,
// which is gitignored. Copy secrets.h.example to secrets.h and fill it in.
#include "secrets.h"

#define BLYNK_PRINT Serial

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include "DHT.h"
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- Pin Definitions ---
// Only ADC1 pins (32-39) can be used for analogRead() while WiFi is active.
// 32/33 are taken by I2C, so the three gas sensors use 34, 39 and 35.
#define MQ135_PIN 34  // ADC1_CH6
#define MQ3_PIN 39    // ADC1_CH3 (VN) - was GPIO 21, which has no ADC at all
#define NH3_PIN 35    // ADC1_CH7

#define DHT_PIN 14
#define DHT_TYPE DHT22

#define I2C_SDA 33
#define I2C_SCL 32
#define LCD_COLUMNS 16
#define LCD_LINES 2

// --- Objects ---
DHT dht22(DHT_PIN, DHT_TYPE);
LiquidCrystal_I2C lcd(0x27, LCD_COLUMNS, LCD_LINES);

char ssid[] = WIFI_SSID;
char pass[] = WIFI_PASS;

// -1 = no prediction received yet, 0 = spoiled, 1 = fresh
int spoilageStatus = -1;

BLYNK_WRITE(V7) {
  spoilageStatus = param.asInt();
}

// --- Setup ---
void setup() {
  Serial.begin(115200);

  // Initialize I2C FIRST with custom pins
  Wire.begin(I2C_SDA, I2C_SCL);

  // Then initialize LCD
  lcd.init();
  lcd.backlight();

  dht22.begin();

  lcd.setCursor(0, 0);
  lcd.print("Connecting...");

  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);
}

// --- Main Loop ---
void loop() {
  float h = dht22.readHumidity();
  float tC = dht22.readTemperature();

  // Each sensor is read from its own pin - no derived or randomised values.
  int mq135_val = analogRead(MQ135_PIN);
  int mq3_val = analogRead(MQ3_PIN);
  int nh3_val = analogRead(NH3_PIN);

  const char *statusText = (spoilageStatus < 0) ? "?" : (spoilageStatus == 1 ? "OK" : "BAD");

  if (!isnan(h) && !isnan(tC)) {
    // Send to Blynk
    Blynk.virtualWrite(V0, tC);
    Blynk.virtualWrite(V2, h);
    Blynk.virtualWrite(V3, mq135_val);
    Blynk.virtualWrite(V4, nh3_val);
    Blynk.virtualWrite(V5, mq3_val);

    // Display on LCD (16 columns - raw ADC values go up to 4095)
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.printf("T:%.0fC H:%.0f%% %s", tC, h, statusText);
    lcd.setCursor(0, 1);
    lcd.printf("C%4d E%4d N%4d", mq135_val, mq3_val, nh3_val);

    // Serial debug
    Serial.printf("T:%.1fC H:%.1f%% CO2:%d EtOH:%d NH3:%d Status:%s\n", tC, h, mq135_val, mq3_val, nh3_val, statusText);
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Sensor error!");
  }

  Blynk.run();
  delay(1000);
}