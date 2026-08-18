'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowRight, Bot, Droplets, MessageSquare, Plus, Send, Thermometer, TrendingUp, X } from 'lucide-react';

import Sidebar from '../components/sidebar';
import Topbar from '../components/topbar';
import { useSensorFeed } from '../lib/api';
import { MAX_BOXES, useBoxes, type Box } from '../lib/boxes';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 40;

export default function Dashboard() {
  const router = useRouter();
  const { boxes, addBox, updateBox, removeBox } = useBoxes();
  const { latest, predict, loadingRows, loadingPredict, rowsError, predictError, refresh } =
    useSensorFeed(50);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const [newBoxDescription, setNewBoxDescription] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showChatbot, setShowChatbot] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI Assistant. How can I help you with your food safety monitoring today?",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const classification = predict?.prediction?.classification ?? null;
  const isFresh = predict?.prediction?.label === 1;
  const freshnessPct = predict ? Math.round((predict.prediction.probability ?? 0) * 100) : null;

  const handleSaveBox = () => {
    addBox(newBoxDescription.trim());
    setNewBoxDescription('');
    setShowAddModal(false);
  };

  const handleDeleteBox = () => {
    if (selectedBoxId === null) return;
    if (window.confirm(`Are you sure you want to delete Box ${selectedBoxId}?`)) {
      removeBox(selectedBoxId);
      setSelectedBoxId(null);
      setShowManageModal(false);
    }
  };

  const handleSaveEdit = () => {
    if (selectedBoxId === null) return;
    updateBox(selectedBoxId, editDescription);
    setEditDescription('');
    setSelectedBoxId(null);
    setShowManageModal(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput, timestamp: new Date() };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setIsLoading(true);

    try {
      const conversationHistory = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      const response = await axios.post('/api/chat', { message: chatInput, conversationHistory });
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data.response, timestamp: new Date() },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting to the AI service. Please make sure Ollama is running.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-page">
      <Sidebar active="dashboard" boxes={boxes} />

      <main className="flex-1 min-w-0 p-3 lg:p-5">
        <Topbar
          title="Dashboard"
          subtitle="Live cold-chain monitoring"
          lastUpdated={latest?.timestamp ?? null}
          online={!rowsError}
          onRefresh={refresh}
          busy={loadingRows || loadingPredict}
        />

        {rowsError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-alert-soft text-alert text-sm">{rowsError}</div>
        )}

        {/* Live readings - every card below is sourced from sensor-api */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded-xl border border-line p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-ink-muted">Temperature</h3>
              <Thermometer size={18} className="text-ink-faint" />
            </div>
            <p className="text-3xl lg:text-4xl font-bold wrap-break-word">
              {loadingRows ? '...' : latest ? `${latest.temperatureC.toFixed(1)}°C` : '-'}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {latest ? `${latest.temperatureF.toFixed(1)}°F` : 'No readings yet'}
            </p>
          </div>

          <div className="bg-surface rounded-xl border border-line p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-ink-muted">Humidity</h3>
              <Droplets size={18} className="text-ink-faint" />
            </div>
            <p className="text-3xl lg:text-4xl font-bold wrap-break-word">
              {loadingRows ? '...' : latest ? `${latest.humidity.toFixed(1)}%` : '-'}
            </p>
            <p className="text-xs text-ink-muted mt-1">Relative humidity</p>
          </div>

          {/* Status */}
          <div className="bg-surface rounded-xl border border-line p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-ink-muted">Status</h3>
              <span className={`p-2 rounded-lg ${isFresh ? 'bg-brand-soft text-brand' : 'bg-surface-muted text-ink-muted'}`}>
                <TrendingUp size={18} />
              </span>
            </div>
            <p
              className={`text-3xl lg:text-4xl font-bold wrap-break-word ${
                classification == null ? '' : isFresh ? 'text-brand' : 'text-alert'
              }`}
            >
              {loadingPredict ? '...' : classification ?? '-'}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {predictError ? 'Needs 10 readings to predict' : `${boxes.length} of ${MAX_BOXES} boxes configured`}
            </p>
          </div>

          {/* Condition gauge */}
          <div className="bg-surface rounded-xl border border-line p-4 lg:p-6">
            <h3 className="text-sm font-medium text-ink-muted mb-2">Condition</h3>
            <div className="text-center">
              <div className="w-24 h-24 lg:w-28 lg:h-28 mx-auto mb-1 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-line)" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={isFresh ? 'var(--color-brand)' : 'var(--color-alert)'}
                    strokeWidth="8"
                    strokeDasharray={GAUGE_CIRCUMFERENCE}
                    strokeDashoffset={
                      freshnessPct == null
                        ? GAUGE_CIRCUMFERENCE
                        : GAUGE_CIRCUMFERENCE * (1 - freshnessPct / 100)
                    }
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{freshnessPct == null ? '-' : `${freshnessPct}%`}</span>
                </div>
              </div>
              <p className="text-xs text-ink-muted">Freshness probability</p>
            </div>
          </div>
        </div>

        {/* Box Configuration */}
        <section className="bg-surface rounded-xl border border-line p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-lg lg:text-xl font-semibold">Box Configuration</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                disabled={boxes.length >= MAX_BOXES}
                className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 text-sm ${
                  boxes.length >= MAX_BOXES ? 'bg-ink-faint cursor-not-allowed' : 'bg-brand hover:bg-brand-dark'
                }`}
              >
                <Plus size={16} />
                Add Box
              </button>
              <button
                onClick={() => {
                  setShowManageModal(true);
                  setSelectedBoxId(null);
                  setEditDescription('');
                }}
                className="px-4 py-2 border border-line rounded-lg hover:bg-surface-muted transition-colors text-sm"
              >
                Manage Box
              </button>
            </div>
          </div>

          {boxes.length === 0 && (
            <div className="text-center py-10">
              <p className="text-ink-muted text-sm">No boxes configured yet. Add one to start tracking.</p>
            </div>
          )}

          {boxes.length > 0 && boxes.length < MAX_BOXES && (
            <div className="relative hidden lg:flex justify-center items-center mt-4">
              <Image src="/truk-final.png" alt="" width={800} height={400} className="w-full h-auto max-w-4xl" />
              <div className="absolute inset-0 flex items-center justify-end pr-[23%] pb-[10%]">
                <div className="relative w-[50%] h-[60%] flex flex-wrap items-end justify-center gap-2 pb-4">
                  {boxes.map((box, index) => (
                    <button
                      key={box.id}
                      className="relative cursor-pointer hover:scale-110 transition-transform"
                      style={{ animation: 'dropIn 0.3s ease-out', animationDelay: `${index * 0.1}s` }}
                      onClick={() => {
                        setSelectedBox(box);
                        setShowDetailModal(true);
                      }}
                    >
                      <Image
                        src="/box.png"
                        alt={`Box ${box.id}`}
                        width={100}
                        height={80}
                        className="w-16 h-16 xl:w-20 xl:h-20 object-contain"
                      />
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-brand text-white text-xs px-2 py-0.5 rounded-full">
                        {box.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {boxes.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-ink-muted mb-3">
                Readings are shared across boxes - sensor-api exposes a single device stream.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-lg border border-line rounded-lg overflow-hidden">
                  <thead className="bg-surface-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Box</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Temp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Humidity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-ink-muted uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-ink-muted uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {boxes.map((box) => (
                      <tr key={box.id} className="hover:bg-surface-muted transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-9 h-9 bg-brand-soft text-brand-dark rounded-full text-sm font-bold">
                            {box.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium max-w-[16rem] truncate">{box.description || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-ink-muted">
                          {latest ? `${latest.temperatureC.toFixed(1)}°C` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink-muted">
                          {latest ? `${latest.humidity.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              classification == null
                                ? 'bg-surface-muted text-ink-muted'
                                : isFresh
                                  ? 'bg-brand-soft text-brand-dark'
                                  : 'bg-alert-soft text-alert'
                            }`}
                          >
                            {classification ?? '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => router.push(`/dashboard/box-detail/${box.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Add Box Modal */}
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
              onClick={() => {
                setShowAddModal(false);
                setNewBoxDescription('');
              }}
            />
            <div className="bg-surface rounded-xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-line relative z-10">
              <h3 className="text-lg font-semibold mb-4">Add New Box</h3>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={newBoxDescription}
                onChange={(e) => setNewBoxDescription(e.target.value)}
                placeholder="e.g. 5kg raw chicken, 40 pcs"
                className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm"
                rows={3}
              />
              <div className="flex gap-3 justify-end mt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewBoxDescription('');
                  }}
                  className="px-4 py-2 border border-line rounded-lg hover:bg-surface-muted text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBox}
                  disabled={!newBoxDescription.trim()}
                  className="px-4 py-2 rounded-lg text-sm bg-brand text-white hover:bg-brand-dark disabled:bg-ink-faint disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Box Detail Modal */}
        {showDetailModal && selectedBox && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
            <div className="bg-surface rounded-xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-line relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Box {selectedBox.id}</h3>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    router.push(`/dashboard/box-detail/${selectedBox.id}`);
                  }}
                  className="inline-flex items-center gap-1 text-brand hover:text-brand-dark text-sm font-medium"
                >
                  Full details
                  <ArrowRight size={16} />
                </button>
              </div>

              <dl className="space-y-2 text-sm">
                {[
                  ['Description', selectedBox.description || '-'],
                  ['Humidity', latest ? `${latest.humidity.toFixed(1)}%` : '-'],
                  ['Temperature', latest ? `${latest.temperatureC.toFixed(1)}°C` : '-'],
                  ['CO₂', latest ? `${latest.ppm_co2} ppm` : '-'],
                  ['NH₃', latest ? `${latest.ppm_nh3} ppm` : '-'],
                  ['Ethanol', latest ? `${latest.ppm_c2h5oh} ppm` : '-'],
                  ['Status', classification ?? '-'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-start gap-4 py-2 border-b border-line">
                    <dt className="text-ink-muted shrink-0">{label}</dt>
                    <dd className="font-semibold text-right wrap-break-word">{value}</dd>
                  </div>
                ))}
              </dl>

              <button
                onClick={() => setShowDetailModal(false)}
                className="mt-6 w-full px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Manage Box Modal */}
        {showManageModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setShowManageModal(false)} />
            <div className="bg-surface rounded-xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-line relative z-10">
              <h3 className="text-lg font-semibold mb-4">Manage Box</h3>

              <label className="block text-sm font-medium mb-2">Select Box</label>
              <select
                value={selectedBoxId ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setSelectedBoxId(id);
                  setEditDescription(id ? (boxes.find((b) => b.id === id)?.description ?? '') : '');
                }}
                className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm mb-4"
              >
                <option value="">-- Select Box --</option>
                {boxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    Box {box.id}
                  </option>
                ))}
              </select>

              {selectedBoxId !== null && (
                <>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-sm mb-4"
                  />
                  <div className="space-y-2">
                    <button
                      onClick={handleSaveEdit}
                      className="w-full px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleDeleteBox}
                      className="w-full px-4 py-2 bg-alert text-white rounded-lg hover:opacity-90 text-sm"
                    >
                      Delete Box
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedBoxId(null);
                  setEditDescription('');
                }}
                className="w-full mt-4 px-4 py-2 border border-line rounded-lg hover:bg-surface-muted text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Chatbot */}
        <button
          onClick={() => setShowChatbot((v) => !v)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-lg hover:bg-brand-dark hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-40"
          aria-label={showChatbot ? 'Close AI assistant' : 'Open AI assistant'}
        >
          {showChatbot ? <X size={26} /> : <MessageSquare size={26} />}
        </button>

        {showChatbot && (
          <div className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-h-[calc(100vh-8rem)] h-[500px] bg-surface rounded-2xl shadow-2xl border border-line z-40 flex flex-col overflow-hidden">
            <div className="bg-brand-deep p-4 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot size={22} />
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-xs opacity-90">Powered by Ollama</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatbot(false)}
                  className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-page">
              <div className="space-y-3">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`p-3 rounded-lg shadow-sm max-w-[85%] ${
                        msg.role === 'user'
                          ? 'bg-brand text-white rounded-tr-none'
                          : 'bg-surface text-ink rounded-tl-none border border-line'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/70' : 'text-ink-faint'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="bg-surface border border-line p-3 rounded-lg rounded-tl-none shadow-sm inline-block">
                    <p className="text-sm text-ink-muted">Thinking...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-line bg-surface shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 min-w-0 px-4 py-2 border border-line rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-surface-muted"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isLoading}
                  className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center hover:bg-brand-dark transition-colors shrink-0 disabled:bg-ink-faint disabled:cursor-not-allowed"
                  aria-label="Send"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
