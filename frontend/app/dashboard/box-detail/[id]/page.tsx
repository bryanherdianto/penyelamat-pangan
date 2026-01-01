'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios, { AxiosError } from 'axios';

interface SensorRow {
  id: number;
  temperatureC: number;
  temperatureF: number;
  humidity: number;
  ppm_nh3: number;
  ppm_co2: number;
  ppm_c2h5oh: number;
  timestamp: string; // ISO string
}

interface DataResponse {
  count: number;
  data: SensorRow[];
}

interface RawPrediction {
  classification_text: 'Fresh' | 'Spoiled' | string;
  classification_prob: number; // 0..1
  confidence: number; // 0..100
  rsl_hours: number; // remaining shelf life in hours
  status: 'success' | 'error' | string;
}

interface PredictResponse {
  status: 'success' | 'error' | string;
  prediction: {
    classification: 'Fresh' | 'Spoiled' | string;
    probability: number; // 0..1
    confidence: number; // 0..100
    raw_prediction: RawPrediction;
  };
  blynk_updated?: boolean;
  blynk_pin?: string;
  blynk_value?: number;
  data_points_used?: number;
}

// =============================
// 2) Axios instance
//    Use env when available (NEXT_PUBLIC_API_BASE_URL), fallback to localhost:8001
//    Optional k parameter can be passed via NEXT_PUBLIC_K (client-exposed) for dev only.
// =============================
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001',
  timeout: 10_000,
});
const K_PARAM = process.env.NEXT_PUBLIC_K || 'ggodjob gpt terbaik, i trust you';

export default function BoxDetailPage() {
  const router = useRouter();
  const params = useParams();
  const boxId = String(params.id);

  const [showBoxDropdown, setShowBoxDropdown] = useState(true);

  // from /data?limit=50
  const [dataRows, setDataRows] = useState<SensorRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // from /predict
  const [predict, setPredict] = useState<PredictResponse | null>(null);
  const [loadingPredict, setLoadingPredict] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mock boxes array (BX5161 - BX5167)
  const boxes = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({ id: 5161 + i, name: `BX${5161 + i}` })),
    []
  );

  // =============================
  // 3) Data fetching
  // =============================
  const fetchDataRows = useCallback(async () => {
    try {
      setLoadingData(true);
      const { data } = await api.get<DataResponse>('/data', {
        params: { limit: 50, k: K_PARAM },
      });
      setDataRows(data?.data ?? []);
    } catch (err) {
      const e = err as AxiosError;
      setErrorMsg(e.message);
      console.error('Data error:', e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const fetchPredict = useCallback(async () => {
    try {
      setLoadingPredict(true);
      const { data } = await api.get<PredictResponse>('/predict'); // GET; switch to POST if required
      setPredict(data);
    } catch (err) {
      const e = err as AxiosError;
      setErrorMsg(e.message);
      console.error('Predict error:', e);
    } finally {
      setLoadingPredict(false);
    }
  }, []);

  // Fetch once on mount and then poll every 30s (optional)
  useEffect(() => {
    fetchDataRows();
    fetchPredict();

    const interval = setInterval(() => {
      fetchDataRows();
      fetchPredict();
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetchDataRows, fetchPredict]);

  // =============================
  // 4) Derived helpers
  // =============================
  // API sample shows newest first. We'll treat index 0 as latest.
  const latest = dataRows[0] || null;

  const classification = predict?.prediction?.classification ?? '—';
  const probabilityPct = predict ? Math.round((predict.prediction.probability || 0) * 100) : null;
  const confidencePct = predict?.prediction?.confidence ?? null;

  // Remaining shelf life
  const rslHours = predict?.prediction?.raw_prediction?.rsl_hours ?? null;
  const rslDays = rslHours != null ? Math.floor(rslHours / 24) : null;
  const rslRemHours = rslHours != null ? Math.round(rslHours % 24) : null;
  const spoilDate = rslHours != null ? new Date(Date.now() + rslHours * 3600 * 1000) : null;

  // Build chart series from /data rows (reverse to show oldest -> newest on X axis)
  const rowsAsc = [...dataRows].reverse();
  const co2Series = rowsAsc.map((r) => ({ x: new Date(r.timestamp).toLocaleTimeString(), value: r.ppm_co2 }));
  const nh3Series = rowsAsc.map((r) => ({ x: new Date(r.timestamp).toLocaleTimeString(), value: r.ppm_nh3 }));
  const ethanolSeries = rowsAsc.map((r) => ({ x: new Date(r.timestamp).toLocaleTimeString(), value: r.ppm_c2h5oh }));

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#FAFAFA]">
      {/* Sidebar */}
      <aside className="w-full lg:w-48 bg-[#F7F7F7] p-4 lg:p-6 m-3 lg:m-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-6 lg:mb-10">
          <div className="w-8 h-8 rounded-lg">
            <Image src="/Images/logo-chain.png" width={40} height={15} alt="logo" />
          </div>
          <div>
            <h1 className="text-sm font-bold">Penyelamat</h1>
            <h1 className="text-sm font-bold">Pangan</h1>
          </div>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-sm font-medium">Dashboard</span>
          </button>

          {/* Box Detail with Dropdown */}
          <div>
            <button
              onClick={() => setShowBoxDropdown(!showBoxDropdown)}
              className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors bg-white text-green-700 border rounded-3xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-medium">Box Detail</span>
              <svg
                className={`w-4 h-4 ml-auto transition-transform ${showBoxDropdown ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {showBoxDropdown && (
              <div className="ml-8 mt-1 space-y-1">
                {boxes.map((box) => (
                  <button
                    key={box.id}
                    onClick={() => router.push(`/dashboard/box-detail/${box.id}`)}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors rounded-lg ${boxId === String(box.id)
                      ? 'text-green-700 font-medium bg-green-50'
                      : 'text-gray-600 hover:text-green-700 hover:bg-gray-100'
                      }`}
                  >
                    {box.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-sm font-medium">Route</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Help</span>
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 lg:p-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 lg:mb-6 bg-[#F7F7F7] rounded-3xl px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search task" className="bg-transparent outline-none text-gray-600 flex-1" />
          </div>

          <div className="flex items-center gap-3">
            <button className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-white rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-white rounded-full hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <Image
                src="https://picsum.dev/100"
                alt="Profile"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-medium">Penyelamat Pangan</p>
                <p className="text-xs text-gray-500">penyelamatpangan@gmail.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* Title & Export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 lg:mb-6">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-2xl lg:text-4xl font-semibold text-gray-900">BX{boxId}</h1>
              <span className="px-3 lg:px-4 py-1 lg:py-1.5 bg-orange-100 text-orange-600 rounded-lg text-xs lg:text-sm font-medium">Ayam Mentah</span>
            </div>
            <p className="text-sm lg:text-base text-gray-500">5kg Ayam mentah Total 40 pcs</p>
          </div>
          <button className="w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 bg-linear-to-r from-green-500 to-green-700 text-white rounded-full text-sm lg:text-base font-semibold hover:shadow-lg transition-all">
            Export Data
          </button>
        </div>

        {/* Top 4 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
          {/* Status */}
          <div className="col-span-2 lg:col-span-1 bg-linear-to-br from-green-500 to-green-800 rounded-2xl p-4 lg:p-6 text-white relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">Status</span>
              <svg className="w-5 h-5 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-5xl font-semibold mb-1">{loadingPredict ? '…' : classification}</p>
            <p className="text-xs opacity-85">
              {loadingPredict ? 'Calculating…' : (
                probabilityPct != null && confidencePct != null
                  ? `Prob: ${probabilityPct}% • Confidence: ${confidencePct}%`
                  : '—'
              )}
            </p>
            <svg className="absolute bottom-0 right-0 opacity-20" width="120" height="80" viewBox="0 0 120 80">
              <path d="M 0 40 Q 30 20, 60 40 T 120 40 L 120 80 L 0 80 Z" fill="white" />
            </svg>
          </div>

          {/* Shelf Life */}
          <div className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <span className="text-xs lg:text-sm text-gray-600">Shelf Life</span>
            </div>
            <p className="text-3xl lg:text-5xl font-semibold text-gray-900 mb-2">
              {loadingPredict
                ? '…'
                : rslHours != null
                  ? `${rslDays}d ${rslRemHours}h`
                  : '—'}
            </p>
            <p className="text-xs text-gray-500">
              {spoilDate ? (
                <>Food will be spoiled on <span className="text-green-600 font-medium">{spoilDate.toLocaleString()}</span></>
              ) : 'Waiting prediction…'}
            </p>
          </div>

          {/* Temperature */}
          <div className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <span className="text-xs lg:text-sm text-gray-600">Temperature</span>
            </div>
            <p className="text-3xl lg:text-5xl font-semibold text-gray-900 mb-2">
              {loadingData ? '…' : latest ? `${latest.temperatureC.toFixed(1)}°C` : '—'}
            </p>
            <p className="text-xs text-gray-500">Source: /data?limit=50</p>
          </div>

          {/* Humidity */}
          <div className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <span className="text-xs lg:text-sm text-gray-600">Humidity</span>
            </div>
            <p className="text-3xl lg:text-5xl font-semibold text-gray-900 mb-2">
              {loadingData ? '…' : latest ? `${latest.humidity}%` : '—'}
            </p>
            <p className="text-xs text-gray-500">Source: /data?limit=50</p>
          </div>
        </div>

        {/* Sensor data mini cards + CO2 chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 lg:mb-6">
          <div className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-200">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">Sensor Data</h3>
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Carbon Dioxide (CO₂)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {loadingData ? '…' : latest ? `${latest.ppm_co2} ppm` : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ammonia (NH₃)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {loadingData ? '…' : latest ? `${latest.ppm_nh3} ppm` : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-green-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Alcohol (C₂H₅OH)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {loadingData ? '…' : latest ? `${latest.ppm_c2h5oh} ppm` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CO2 Chart from /data history */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-4 lg:p-6 border border-gray-200">
            <h4 className="text-xs lg:text-sm font-medium text-gray-700 mb-3">CO₂ history (last {rowsAsc.length} points)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={co2Series.length ? co2Series : [{ x: 0, value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="x" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3, stroke: 'white' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom two charts from /data history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-200 h-56 lg:h-64">
            <h4 className="text-xs lg:text-sm font-medium text-gray-700 mb-3">NH₃ history</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={nh3Series.length ? nh3Series : [{ x: 0, value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="x" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3, stroke: 'white' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-4 lg:p-6 border border-gray-200 h-56 lg:h-64">
            <h4 className="text-xs lg:text-sm font-medium text-gray-700 mb-3">Ethanol history</h4>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ethanolSeries.length ? ethanolSeries : [{ x: 0, value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="x" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3, stroke: 'white' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 lg:mt-6 text-sm text-red-600">Error: {errorMsg}</div>
        )}
      </main>
    </div>
  );
}
