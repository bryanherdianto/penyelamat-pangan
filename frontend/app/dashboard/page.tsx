"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";

interface BoxData {
  id: number;
  description: string;
  humidity: number;
  temperature: number;
  co2: number;
  methane: number;
  alcohol: number;
  freshness: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Dashboard() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [showBoxDropdown, setShowBoxDropdown] = useState(false);
  const [boxes, setBoxes] = useState<BoxData[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedBox, setSelectedBox] = useState<BoxData | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const [newBoxDescription, setNewBoxDescription] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showChatbot, setShowChatbot] = useState(false);
  
  // Chatbot states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! 👋 I'm your AI Assistant. How can I help you with your food safety monitoring today?",
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddBox = () => {
    if (boxes.length < 4) {
      setShowAddModal(true);
    }
  };

  const handleSaveBox = () => {
    const newBox: BoxData = {
      id: boxes.length + 1,
      description: newBoxDescription,
      humidity: Math.random() * 100,
      temperature: 20 + Math.random() * 15,
      co2: Math.random() * 1000,
      methane: Math.random() * 100,
      alcohol: Math.random() * 50,
      freshness: 90 + Math.random() * 10,
    };
    setBoxes([...boxes, newBox]);
    setNewBoxDescription("");
    setShowAddModal(false);
  };

  const handleBoxClick = (box: BoxData) => {
    setSelectedBox(box);
    setShowDetailModal(true);
  };

  const handleManageBox = () => {
    setShowManageModal(true);
    setSelectedBoxId(null);
    setEditDescription("");
  };

  const handleDeleteBox = () => {
    if (selectedBoxId === null) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete Box ${selectedBoxId}?`);
    if (confirmDelete) {
      setBoxes(boxes.filter(box => box.id !== selectedBoxId));
      setSelectedBoxId(null);
      setShowManageModal(false);
    }
  };

  const handleEditBox = () => {
    if (selectedBoxId === null) return;

    const boxToEdit = boxes.find(box => box.id === selectedBoxId);
    if (boxToEdit) {
      setEditDescription(boxToEdit.description);
    }
  };

  const handleSaveEdit = () => {
    if (selectedBoxId === null) return;

    setBoxes(boxes.map(box =>
      box.id === selectedBoxId
        ? { ...box, description: editDescription }
        : box
    ));
    setEditDescription("");
    setSelectedBoxId(null);
    setShowManageModal(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsLoading(true);

    try {
      const conversationHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await axios.post('/api/chat', {
        message: chatInput,
        conversationHistory
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting to the AI service. Please make sure Ollama is running in Docker.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setChatInput(question);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
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
            onClick={() => setActiveMenu("Dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${activeMenu === "Dashboard"
              ? "bg-white text-green-700 border rounded-3xl"
              : "text-gray-600"
              }`}
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
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${activeMenu === "Box Detail"
                ? "bg-white text-green-700 border rounded-3xl"
                : "text-gray-600"
                }`}
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

            {/* Dropdown List */}
            {showBoxDropdown && boxes.length > 0 && (
              <div className="ml-8 mt-1 space-y-1">
                {boxes.map((box) => (
                  <button
                    key={box.id}
                    onClick={() => router.push(`/dashboard/box-detail/${box.id}`)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:text-green-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Box {box.id}
                  </button>
                ))}
              </div>
            )}

            {showBoxDropdown && boxes.length === 0 && (
              <div className="ml-8 mt-1 px-3 py-1.5 text-xs text-gray-400 italic">
                No boxes yet
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveMenu("Route")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${activeMenu === "Route"
              ? "bg-white text-green-700 border rounded-3xl"
              : "text-gray-600"
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-sm font-medium">Route</span>
          </button>

          <button
            onClick={() => setActiveMenu("Help")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${activeMenu === "Help"
              ? "bg-white text-green-700 border rounded-3xl"
              : "text-gray-600"
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">Help</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-3 lg:p-5">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8 bg-[#F7F7F7] p-4 lg:p-5 rounded-2xl">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Search task"
                className="w-full sm:w-auto pl-10 pr-4 py-2 bg-white rounded-3xl focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="flex items-center gap-2 lg:gap-3">
              <Image
                src="https://picsum.dev/100"
                alt="Profile"
                width={40}
                height={40}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover"
              />
              <div className="hidden sm:block">
                <p className="text-xs lg:text-sm font-medium">Penyelamat Pangan</p>
                <p className="text-xs text-gray-500">penyelamatpangan@gmail.com</p>
              </div>
            </div>
          </div>
        </header>

        {/* On Going Routes, Status and Condition - Grid in one row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
          {/* On Going Routes Section - Takes 2 columns */}
          <section className="lg:col-span-2 bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg lg:text-xl font-semibold">On Going Routes</h2>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                On Delivery
              </span>
            </div>

            <div className="mb-4">
              <div className="flex flex-col lg:flex-row lg:justify-between items-start gap-3 lg:gap-0 mb-4">
                <div>
                  <p className="font-medium text-sm">PT. Super Unggas Jaya</p>
                  <p className="text-xs text-gray-500">Jalan Jend. Gatot Subroto, RT.6/RW.1, Kuningan Barat</p>
                </div>
                <div className="lg:text-right">
                  <p className="font-medium text-sm">Ranch Market Grand Indonesia</p>
                  <p className="text-xs text-gray-500">Jl. MH Thamrin No.1 Lantai LG, RT.1/RW.5, Menteng</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative mb-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "65%" }}></div>
                </div>
                <div className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2" style={{ left: "65%" }}>
                  <Image
                    src="/Images/truk-icon-final.png"
                    alt="Truck icon"
                    width={100}
                    height={50}
                    className="w-6 h-6 lg:w-8 lg:h-8"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-green-600 font-medium">Estimation arrival in</p>
                  <p className="text-xs font-semibold">2 hours 31 minutes</p>
                </div>
              </div>
            </div>
          </section>

          {/* Status */}
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-semibold">Status</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-4xl lg:text-5xl font-bold mb-1">10</p>
              <p className="text-sm text-gray-500">from 10 boxes</p>
              <p className="text-xs text-green-600 font-medium mt-1">are on 100% fresh condition</p>
            </div>
          </div>

          {/* Condition */}
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base lg:text-lg font-semibold">Condition</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mx-auto mb-1 relative">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold">100%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">Fresh Condition</p>
            </div>
          </div>
        </div>

        {/* Box Configuration */}
        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Box Configuration</h2>
            <div className="flex gap-3">
              <button
                onClick={handleAddBox}
                disabled={boxes.length >= 4}
                className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 text-sm lg:text-base ${boxes.length >= 4
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden sm:inline">Add Box</span>
                <span className="sm:hidden">Add</span>
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm lg:text-base" onClick={handleManageBox}>
                <span className="hidden sm:inline">Manage Box</span>
                <span className="sm:hidden">Manage</span>
              </button>
            </div>
          </div>

          {/* Truck Illustration with Boxes - Only show if boxes < 4 and on desktop (hidden on mobile) */}
          {boxes.length < 4 && (
          <div className="relative hidden lg:flex justify-center items-center mt-4">
            {/* Empty Truck Background */}
            <Image
              src="/Images/truk-final.png"
              alt="Truck with boxes"
              width={800}
              height={400}
              className="w-full h-auto max-w-4xl"
            />

            {/* Container area for boxes - positioned absolutely over truck container */}
            <div className="absolute inset-0 flex items-center justify-end pr-[23%] pb-[10%]">
              <div className="relative w-[50%] h-[60%] flex flex-wrap items-end justify-center gap-2 pb-4">
                {boxes.map((box, index) => (
                  <div
                    key={box.id}
                    className="relative cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      animation: `dropIn 0.3s ease-out`,
                      animationDelay: `${index * 0.1}s`
                    }}
                    onClick={() => handleBoxClick(box)}
                  >
                    <Image
                      src="/Images/box.png"
                      alt={`Box ${box.id}`}
                      width={100}
                      height={80}
                      className="w-16 h-16 xl:w-20 xl:h-20 object-contain"
                    />
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {box.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Boxes Table View - Show on mobile and when there are boxes */}
          {boxes.length > 0 && (
            <div className="mt-6 lg:hidden">
              <h3 className="text-lg font-semibold mb-3">Your Boxes</h3>
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fresh</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {boxes.map((box) => (
                      <tr key={box.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full text-sm font-semibold">
                            {box.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{box.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{box.temperature.toFixed(1)}°C</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                            {box.freshness.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleBoxClick(box)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {boxes.length} of 4 boxes • Tap eye icon to view details
              </p>
            </div>
          )}

          {/* Desktop: Also show table below truck for better UX */}
          {boxes.length > 0 && (
            <div className="mt-6 hidden lg:block">
              <h3 className="text-lg font-semibold mb-3">Box Overview</h3>
              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-lg overflow-hidden border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Box ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temperature</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Humidity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Freshness</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {boxes.map((box) => (
                      <tr key={box.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-10 h-10 bg-green-100 text-green-600 rounded-full text-sm font-bold">
                              {box.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{box.description}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{box.temperature.toFixed(1)}°C</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{box.humidity.toFixed(1)}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-600">
                            {box.freshness.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleBoxClick(box)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {boxes.length} of 4 boxes configured • Click &quot;View Details&quot; to see full box information
              </p>
            </div>
          )}

          {/* Message when truck is full (4 boxes) */}
          {boxes.length >= 4 && (
            <div className="text-center py-12 hidden lg:block">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Truck is Full!</h3>
              <p className="text-gray-500">Maximum capacity of 4 boxes reached. Please manage existing boxes.</p>
            </div>
          )}
        </section>

        {/* Add Box Modal */}
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" onClick={() => {
              setShowAddModal(false);
              setNewBoxDescription("");
            }}></div>
            <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md shadow-2xl border border-gray-200 relative z-10">
              <h3 className="text-lg sm:text-xl font-semibold mb-4">Add New Box</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Box ID (Auto-generated)
                </label>
                <input
                  type="text"
                  value={`ID ${boxes.length + 1}`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newBoxDescription}
                  onChange={(e) => setNewBoxDescription(e.target.value)}
                  placeholder="Enter box description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewBoxDescription("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBox}
                  disabled={!newBoxDescription.trim()}
                  className={`px-4 py-2 rounded-lg text-sm ${newBoxDescription.trim()
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
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
            <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}></div>
            <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md shadow-2xl border border-gray-200 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold">Box Details</h3>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    router.push(`/dashboard/box-detail/${selectedBox.id}`);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                  title="View Full Details"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-semibold">{selectedBox.id}</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b">
                  <span className="text-gray-600">Description:</span>
                  <span className="font-semibold text-right max-w-[60%]">{selectedBox.description}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Humidity:</span>
                  <span className="font-semibold">{selectedBox.humidity.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Temperature:</span>
                  <span className="font-semibold">{selectedBox.temperature.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">CO₂:</span>
                  <span className="font-semibold">{selectedBox.co2.toFixed(1)} ppm</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Methane:</span>
                  <span className="font-semibold">{selectedBox.methane.toFixed(1)} ppm</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Alcohol:</span>
                  <span className="font-semibold">{selectedBox.alcohol.toFixed(1)} ppm</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Freshness:</span>
                  <span className="font-semibold text-green-600">{selectedBox.freshness.toFixed(1)}%</span>
                </div>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="mt-6 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Manage Box Modal */}
        {showManageModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" onClick={() => setShowManageModal(false)}></div>
            <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md shadow-2xl border border-gray-200 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold">Manage Box</h3>
                <button
                  onClick={() => setShowManageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Dropdown for Box Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Box ID
                </label>
                <select
                  value={selectedBoxId || ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    setSelectedBoxId(id);
                    setEditDescription('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">-- Select Box ID --</option>
                  {boxes.map((box) => (
                    <option key={box.id} value={box.id}>
                      Box {box.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Edit Form (shows when editing) */}
              {editDescription !== '' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Edit Description
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="Enter new description"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {editDescription === '' ? (
                  <>
                    <button
                      onClick={handleEditBox}
                      disabled={selectedBoxId === null}
                      className={`w-full px-4 py-2 text-white rounded-lg transition-colors text-sm ${selectedBoxId === null
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-400 hover:bg-blue-500'
                        }`}
                    >
                      Edit Box
                    </button>
                    <button
                      onClick={handleDeleteBox}
                      disabled={selectedBoxId === null}
                      className={`w-full px-4 py-2 text-white rounded-lg transition-colors text-sm ${selectedBoxId === null
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-400 hover:bg-red-500'
                        }`}
                    >
                      Delete Box
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditDescription('');
                        setSelectedBoxId(null);
                      }}
                      className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedBoxId(null);
                  setEditDescription('');
                }}
                className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Floating Chatbot Button */}
        <button
          onClick={() => setShowChatbot(!showChatbot)}
          className="fixed bottom-6 right-6 w-14 h-14 lg:w-16 lg:h-16 bg-linear-to-br from-green-500 to-green-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center z-40 group"
          aria-label="Open AI Chatbot"
        >
          {showChatbot ? (
            <svg className="w-7 h-7 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-7 h-7 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
        </button>

        {/* Chatbot Window */}
        {showChatbot && (
          <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 z-40 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-linear-to-r from-green-500 to-green-700 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-xs opacity-90">Online • Ready to help</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatbot(false)}
                  className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              <div className="space-y-3">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-blue-500' : 'bg-green-500'
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {msg.role === 'user' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        )}
                      </svg>
                    </div>
                    <div className={`p-3 rounded-lg shadow-sm max-w-[80%] ${
                      msg.role === 'user' 
                        ? 'bg-blue-500 text-white rounded-tr-none' 
                        : 'bg-white text-gray-800 rounded-tl-none'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm">
                      <p className="text-sm text-gray-600">Thinking...</p>
                    </div>
                  </div>
                )}

                {/* Suggested Questions - Only show at start */}
                {chatMessages.length === 1 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button 
                      onClick={() => handleQuickQuestion("What is the current status of all boxes?")}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-full text-xs hover:bg-gray-50 transition-colors"
                    >
                      📊 Show box status
                    </button>
                    <button 
                      onClick={() => handleQuickQuestion("What are the ideal temperature ranges for food storage?")}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-full text-xs hover:bg-gray-50 transition-colors"
                    >
                      🌡️ Temperature ranges
                    </button>
                    <button 
                      onClick={() => handleQuickQuestion("What are the best practices for food freshness monitoring?")}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-full text-xs hover:bg-gray-50 transition-colors"
                    >
                      💡 Best practices
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isLoading}
                  className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shrink-0 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5l0 14m0 0l-7-7m7 7l7-7" transform="rotate(45 12 12)" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes dropIn {
            from {
              opacity: 0;
              transform: translateY(-20px) scale(0.8);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </main>
    </div>
  );
}
