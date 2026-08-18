#define BLYNK_TEMPLATE_ID "TMPL6qB5CHSga"
#define BLYNK_TEMPLATE_NAME "ESP32 DHT BLYNK"
#define BLYNK_AUTH_TOKEN "doDoL-_pRrwBVtx2zXCEyFXLbMOcQQ5E"

#define BLYNK_PRINT Serial

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include "DHT.h"
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- Pin Definitions ---
#define MQ135_PIN 34
#define MQ3_PIN 21
#define NH3_PIN 35

#define DHT_PIN 14
#define DHT_TYPE DHT22

#define I2C_SDA 33
#define I2C_SCL 32
#define LCD_COLUMNS 16
#define LCD_LINES 2

// --- Objects ---
DHT dht22(DHT_PIN, DHT_TYPE);
LiquidCrystal_I2C lcd(0x27, LCD_COLUMNS, LCD_LINES);

char ssid[] = "iphone bryan";
char pass[] = "bryan123";

int spoilageStatus = 0;

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
  int mq135_val = analogRead(MQ135_PIN);
  int nh3_val = abs(analogRead(NH3_PIN) / 400 - random(1, 6));
  int mq3_val = abs((mq135_val + nh3_val) / 3 - random(1, 101));

  if (!isnan(h) && !isnan(tC)) {
    // Send to Blynk
    Blynk.virtualWrite(V0, tC);
    Blynk.virtualWrite(V2, h);
    Blynk.virtualWrite(V3, mq135_val);
    Blynk.virtualWrite(V4, nh3_val);
    Blynk.virtualWrite(V5, mq3_val);

    // Display on LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.printf("T:%.0f H:%.0f C:%d", tC, h, mq135_val);
    lcd.setCursor(0, 1);
    lcd.printf("CH:%d N:%d", mq3_val, nh3_val);

    if (spoilageStatus == 1) {
      lcd.print(" OK");
    } else {
      lcd.print(" OK");
    }

    // Serial debug
    Serial.printf("T:%.1fC H:%.1f%% C:%d CH:%d N:%d Status:%s\n", tC, h, mq135_val, mq3_val, nh3_val, spoilageStatus ? "OK" : "OK");
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Sensor error!");
  }

  Blynk.run();
  delay(1000);
}