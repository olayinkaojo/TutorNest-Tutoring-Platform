import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface Annotation {
  id: string;
  type: string;
  color: string;
  points?: { x: number; y: number }[];
  text?: string;
  x?: number;
  y?: number;
}

export interface LiveTutoringSessionProps {
  sessionId: string;
  collaborationId?: string;
  tutorName?: string;
  studentNames?: string[];
  onSessionEnd?: () => void;
  isStudent?: boolean;
}

export default function LiveTutoringSession({
  sessionId,
  collaborationId,
  tutorName = 'Ms. Johnson',
  studentNames = ['Alice', 'Bob', 'Charlie'],
  onSessionEnd,
  isStudent = false,
}: LiveTutoringSessionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'text' | 'line' | 'shape'>('brush');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [remainingTime, setRemainingTime] = useState(3600); // 1 hour in seconds
  const [isPaused, setIsPaused] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(true);
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: tutorName, text: 'Welcome! Let\'s get started', time: new Date().toLocaleTimeString() },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isStudent) return; // Students can't draw
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'brush') {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.clearRect(x - 10, y - 10, 20, 20);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    // In a real implementation, this would undo the last stroke
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const handleClearAll = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setAnnotations([]);
  };

  const handleAddMessage = () => {
    if (chatInput.trim()) {
      const newMessage = {
        sender: isStudent ? (studentNames?.[0] || 'Student') : tutorName,
        text: chatInput,
        time: new Date().toLocaleTimeString(),
      };
      setMessages([...messages, newMessage]);
      setChatInput('');
    }
  };

  const handleEndSession = () => {
    if (confirm('Are you sure you want to end the session?')) {
      onSessionEnd?.();
    }
  };

  return (
    <div className="w-full h-screen flex bg-gray-50">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Tutoring Session</h1>
            <p className="text-sm text-gray-600">Session ID: {sessionId}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{formatTime(remainingTime)}</p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-4 py-2 rounded-lg transition ${
                isPaused ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={handleEndSession}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Canvas and Toolbar */}
        <div className="flex-1 flex flex-col gap-4 p-6">
          {/* Toolbar (Tutor Only) */}
          {!isStudent && (
            <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3 border-b-4 border-blue-500">
              {/* Tool Selection */}
              <div className="flex gap-2">
                <button
                  onClick={() => setTool('brush')}
                  className={`px-3 py-2 rounded ${tool === 'brush' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  🖌️ Brush
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={`px-3 py-2 rounded ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  🧹 Eraser
                </button>
                <button
                  onClick={() => setTool('text')}
                  className={`px-3 py-2 rounded ${tool === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                >
                  📝 Text
                </button>
              </div>

              <div className="w-px h-8 bg-gray-300" />

              {/* Color Picker */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Color:</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer"
                />
              </div>

              {/* Stroke Width */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Width:</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">{strokeWidth}px</span>
              </div>

              <div className="w-px h-8 bg-gray-300" />

              {/* Action Buttons */}
              <button
                onClick={handleUndo}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
              >
                ↶ Undo
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-2 bg-red-200 hover:bg-red-300 text-red-700 rounded transition"
              >
                🗑️ Clear All
              </button>
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-300">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className={`w-full h-full ${!isStudent ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ display: 'block' }}
            />
          </div>

          {/* Student List (Tutor View) */}
          {!isStudent && (
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Students in Session ({studentNames.length})</p>
              <div className="flex gap-2">
                {studentNames.map((name, idx) => (
                  <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    ✓ {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`${showChatPanel ? 'w-80' : 'w-20'} bg-white border-l flex flex-col transition-all`}>
        {/* Chat Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h3 className={`font-semibold ${!showChatPanel && 'hidden'}`}>Chat</h3>
          <button
            onClick={() => setShowChatPanel(!showChatPanel)}
            className="p-1 hover:bg-blue-700 rounded"
          >
            {showChatPanel ? '→' : '←'}
          </button>
        </div>

        {/* Chat Messages */}
        {showChatPanel && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${isStudent && msg.sender === studentNames?.[0] ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs rounded-lg p-3 ${
                      isStudent && msg.sender === studentNames?.[0]
                        ? 'bg-blue-100 text-gray-900'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-600">{msg.sender}</p>
                    <p className="text-sm mt-1">{msg.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{msg.time}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="border-t p-3 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMessage()}
                placeholder="Type message..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddMessage}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
