'use client';

import { useParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import Sidebar from '../../../components/sidebar';
import Topbar from '../../../components/topbar';
import { useSensorFeed, type SensorRow } from '../../../lib/api';
import { useBoxes } from '../../../lib/boxes';

const SERIES = [
  { key: 'ppm_co2', label: 'CO₂', unit: 'ppm', color: 'var(--color-brand)', dot: 'bg-brand' },
  { key: 'ppm_nh3', label: 'NH₃', unit: 'ppm', color: 'var(--color-brand-light)', dot: 'bg-brand-light' },
  { key: 'ppm_c2h5oh', label: 'Ethanol', unit: 'ppm', color: 'var(--color-brand-deep)', dot: 'bg-brand-deep' },
] as const;

/**
 * Charts need a container with a definite height. `flex-1` alone resolves to 0
 * on first paint, which makes ResponsiveContainer warn about width(-1)/height(-1),
 * so every chart gets a fixed-height wrapper instead.
 */
function SensorChart({ data, color }: { data: { x: string; value: number }[]; color: string }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
          <XAxis dataKey="x" stroke="var(--color-ink-faint)" fontSize={10} minTickGap={24} />
          <YAxis stroke="var(--color-ink-faint)" fontSize={10} width={40} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-line)',
              borderRadius: '8px',
            }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function BoxDetailPage() {
  const params = useParams();
  const boxId = String(params.id);

  const { boxes } = useBoxes();
  const box = boxes.find((b) => String(b.id) === boxId) ?? null;

  const { rows, latest, predict, loadingRows, loadingPredict, rowsError, predictError, refresh } =
    useSensorFeed(50);

  const classification = predict?.prediction?.classification ?? null;
  const isFresh = predict?.prediction?.label === 1;
  const probabilityPct = predict ? Math.round((predict.prediction.probability ?? 0) * 100) : null;
  const confidencePct = predict?.prediction?.confidence ?? null;

  const rslHours = predict?.prediction?.raw_prediction?.rsl_hours ?? null;
  const rslDays = rslHours != null ? Math.floor(rslHours / 24) : null;
  const rslRemHours = rslHours != null ? Math.round(rslHours % 24) : null;
  // Anchored to the newest reading rather than Date.now(): the shelf life was
  // predicted from data ending at that timestamp, and it keeps render pure.
  const spoilDate =
    rslHours != null && latest
      ? new Date(new Date(latest.timestamp).getTime() + rslHours * 3600 * 1000)
      : null;

  // Oldest -> newest for the X axis.
  const rowsAsc = [...rows].reverse();
  const seriesFor = (key: keyof SensorRow) =>
    rowsAsc.map((r) => ({ x: new Date(r.timestamp).toLocaleTimeString(), value: Number(r[key]) }));

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-page">
      <Sidebar active="box-detail" boxes={boxes} activeBoxId={boxId} />

      <main className="flex-1 min-w-0 p-3 lg:p-5">
        <Topbar
          title={`Box ${boxId}`}
          subtitle={box?.description || 'No description'}
          lastUpdated={latest?.timestamp ?? null}
          online={!rowsError}
          onRefresh={refresh}
          busy={loadingRows || loadingPredict}
        />

        {rowsError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-alert-soft text-alert text-sm">{rowsError}</div>
        )}
        {!box && boxes.length > 0 && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-surface-muted text-ink-muted text-sm">
            Box {boxId} is not in your configured boxes.
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
          {/* Three states, not two: no prediction yet is neutral, not an alert. */}
          <div
            className={`rounded-2xl p-4 lg:p-6 border ${
              classification == null
                ? 'bg-surface border-line text-ink'
                : isFresh
                  ? 'bg-brand-deep border-brand-deep text-white'
                  : 'bg-alert border-alert text-white'
            }`}
          >
            <span className={`text-sm ${classification == null ? 'text-ink-muted' : 'opacity-90'}`}>Status</span>
            <p className="text-4xl font-semibold mb-1 mt-2 wrap-break-word">
              {loadingPredict ? '...' : classification ?? 'Unknown'}
            </p>
            <p className={`text-xs ${classification == null ? 'text-ink-muted' : 'opacity-85'}`}>
              {predictError
                ? 'Waiting for 10 readings'
                : probabilityPct != null && confidencePct != null
                  ? `Prob ${probabilityPct}% / Confidence ${confidencePct.toFixed(0)}%`
                  : 'No prediction yet'}
            </p>
          </div>

          <div className="bg-surface rounded-2xl p-4 lg:p-6 border border-line">
            <span className="text-xs lg:text-sm text-ink-muted">Shelf Life</span>
            <p className="text-3xl lg:text-4xl font-semibold mb-2 mt-2 wrap-break-word">
              {loadingPredict ? '...' : rslHours != null ? `${rslDays}d ${rslRemHours}h` : '-'}
            </p>
            <p className="text-xs text-ink-muted">
              {spoilDate ? (
                <>
                  Spoils around <span className="text-brand font-medium">{spoilDate.toLocaleString()}</span>
                </>
              ) : (
                'Waiting for prediction'
              )}
            </p>
          </div>

          <div className="bg-surface rounded-2xl p-4 lg:p-6 border border-line">
            <span className="text-xs lg:text-sm text-ink-muted">Temperature</span>
            <p className="text-3xl lg:text-4xl font-semibold mb-2 mt-2 wrap-break-word">
              {loadingRows ? '...' : latest ? `${latest.temperatureC.toFixed(1)}°C` : '-'}
            </p>
            <p className="text-xs text-ink-muted">
              {latest ? `${latest.temperatureF.toFixed(1)}°F` : 'No readings'}
            </p>
          </div>

          <div className="bg-surface rounded-2xl p-4 lg:p-6 border border-line">
            <span className="text-xs lg:text-sm text-ink-muted">Humidity</span>
            <p className="text-3xl lg:text-4xl font-semibold mb-2 mt-2 wrap-break-word">
              {loadingRows ? '...' : latest ? `${latest.humidity.toFixed(1)}%` : '-'}
            </p>
            <p className="text-xs text-ink-muted">Relative humidity</p>
          </div>
        </div>

        {/* Latest gas readings + CO2 history */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 lg:mb-6">
          <div className="bg-surface rounded-2xl p-4 lg:p-6 border border-line">
            <h3 className="text-base font-semibold mb-4">Sensor Data</h3>
            <div className="space-y-4">
              {SERIES.map((s) => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full shrink-0 ${s.dot}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-xs text-ink-muted">{s.label}</p>
                    <p className="text-sm font-semibold">
                      {loadingRows ? '...' : latest ? `${latest[s.key]} ${s.unit}` : '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-surface rounded-2xl p-4 lg:p-6 border border-line">
            <h4 className="text-sm font-medium text-ink-muted mb-3">
              CO₂ history (last {rowsAsc.length} readings)
            </h4>
            <SensorChart data={seriesFor('ppm_co2')} color={SERIES[0].color} />
          </div>
        </div>

        {/* NH3 + Ethanol history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SERIES.filter((s) => s.key !== 'ppm_co2').map((s) => (
            <div key={s.key} className="bg-surface rounded-2xl p-4 lg:p-6 border border-line">
              <h4 className="text-sm font-medium text-ink-muted mb-3">{s.label} history</h4>
              <SensorChart data={seriesFor(s.key)} color={s.color} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
