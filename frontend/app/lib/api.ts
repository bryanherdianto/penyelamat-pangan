'use client';

import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001',
  timeout: 10_000,
});

export interface SensorRow {
  id: number;
  temperatureC: number;
  temperatureF: number;
  humidity: number;
  ppm_nh3: number;
  ppm_co2: number;
  ppm_c2h5oh: number;
  timestamp: string;
}

export interface DataResponse {
  count: number;
  data: SensorRow[];
}

/** Mirrors freshness-api's PredictionResponse. */
export interface RawPrediction {
  classification_text: 'Fresh' | 'Bad' | string;
  classification_prob: number; // sigmoid, 0..1
  classification_label: number; // 1 = Fresh, 0 = Bad
  confidence: number; // 0..100
  rsl_hours: number;
  status: string;
}

/** Mirrors sensor-api's GET /predict. */
export interface PredictResponse {
  status: string;
  prediction: {
    classification: 'Fresh' | 'Bad' | string;
    label: number;
    probability: number;
    confidence: number;
    raw_prediction: RawPrediction;
  };
  blynk_updated?: boolean;
  blynk_pin?: string;
  blynk_value?: number;
  data_points_used?: number;
}

function messageFor(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data as { error?: string; message?: string } | undefined;
    if (detail?.error) return detail.error;
    if (err.code === 'ECONNABORTED') return 'The sensor API timed out.';
    if (!err.response) return 'Cannot reach the sensor API. Is it running on port 8001?';
    return `Sensor API returned ${err.response.status}.`;
  }
  return 'Unexpected error talking to the sensor API.';
}

/**
 * Readings and prediction from sensor-api.
 *
 * The backend exposes a single sensor stream (one device, one `data` table),
 * so every box on screen reflects the same readings until per-device support
 * exists server-side.
 */
export function useSensorFeed(limit = 50, pollMs = 30_000) {
  const [rows, setRows] = useState<SensorRow[]>([]);
  const [predict, setPredict] = useState<PredictResponse | null>(null);
  const [loadingRows, setLoadingRows] = useState(true);
  const [loadingPredict, setLoadingPredict] = useState(true);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      const { data } = await api.get<DataResponse>('/data', { params: { limit } });
      setRows(data?.data ?? []);
      setRowsError(null);
    } catch (err) {
      setRowsError(messageFor(err));
    } finally {
      setLoadingRows(false);
    }
  }, [limit]);

  const fetchPredict = useCallback(async () => {
    try {
      const { data } = await api.get<PredictResponse>('/predict');
      setPredict(data);
      setPredictError(null);
    } catch (err) {
      // A 400 here is normal: sensor-api needs 10 rows before it can predict.
      setPredictError(messageFor(err));
      setPredict(null);
    } finally {
      setLoadingPredict(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
    fetchPredict();

    const interval = setInterval(() => {
      fetchRows();
      fetchPredict();
    }, pollMs);

    return () => clearInterval(interval);
  }, [fetchRows, fetchPredict, pollMs]);

  return {
    rows,
    latest: rows[0] ?? null,
    predict,
    loadingRows,
    loadingPredict,
    rowsError,
    predictError,
    refresh: () => {
      fetchRows();
      fetchPredict();
    },
  };
}
