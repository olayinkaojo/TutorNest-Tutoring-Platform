import { useState, useEffect, useRef } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  MessageSquare, 
  Send,
  Paperclip,
  AlertTriangle,
  Flag,
  Shield,
  CheckCircle,
  X,
  Download,
  Image as ImageIcon,
  FileText
} from 'lucide-react';

interface MessageThreadProps {
  session: any;
  bookingId: string;
  currentUserId: string;
  currentUserRole: 'parent' | 'tutor';
}

interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: 'parent' | 'tutor';
  senderName: string;
  content: string;
  attachments?: Attachment[];
  createdAt: string;
  reportedByUserId?: string;
  reportReason?: string;
  reportedAt?: string;
}

interface Attachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  url: string;
}

export function MessageThread({ session, bookingId, currentUserId, currentUserRole }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [bookingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/messages/${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file size (max 10MB per file)
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });

    // Max 3 attachments
    if (attachments.length + validFiles.length > 3) {
      setError('Maximum 3 attachments allowed');
      return;
    }

    setAttachments([...attachments, ...validFiles]);
    setError('');
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) {
      setError('Please enter a message or attach a file');
      return;
    }

    // Check for personal contact info (basic detection)
    const contactInfoPattern = /\b(\d{10,}|[\w.-]+@[\w.-]+\.\w+|(?:whatsapp|telegram|facebook|instagram|twitter)\b)/gi;
    if (contactInfoPattern.test(newMessage)) {
      setError('Please do not share personal contact information. Use the in-app messaging system.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('bookingId', bookingId);
      formData.append('content', newMessage);
      formData.append('senderId', currentUserId);
      formData.append('senderRole', currentUserRole);

      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const data = await response.json();
      setMessages([...messages, data.message]);
      setNewMessage('');
      setAttachments([]);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const reportMessage = async (messageId: string) => {
    if (!reportReason.trim()) {
      setError('Please provide a reason for reporting');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/messages/${messageId}/report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            reportedByUserId: currentUserId,
            reportReason,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to report message');
      }

      setReportingMessageId(null);
      setReportReason('');
      alert('Message reported successfully. Our team will review it.');
      fetchMessages();
    } catch (err: any) {
      console.error('Error reporting message:', err);
      setError(err.message);
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const response = await fetch(attachment.url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading attachment:', err);
      setError('Failed to download attachment');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading messages...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Secure Messaging
          </CardTitle>
          <CardDescription>
            Messages are scoped to this booking and monitored for safety
          </CardDescription>
        </CardHeader>
      </Card>

      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Privacy & Safety:</strong> Do not share personal contact information (phone, email, social media).
          All messages are logged and can be reported for abuse. Personal details are masked for your protection.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.senderId === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isOwnMessage ? 'bg-purple-100' : 'bg-gray-100'} rounded-lg p-3`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {isOwnMessage ? 'You' : message.senderName}
                        </span>
                        {!isOwnMessage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReportingMessageId(message.id)}
                            className="h-5 w-5 p-0 ml-2"
                          >
                            <Flag className="w-3 h-3 text-gray-500" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-2 p-2 bg-white rounded border text-xs"
                            >
                              {attachment.fileType.startsWith('image/') ? (
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                              ) : (
                                <FileText className="w-4 h-4 text-gray-600" />
                              )}
                              <span className="flex-1 truncate">{attachment.filename}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadAttachment(attachment)}
                                className="h-6 w-6 p-0"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <span className="text-xs text-gray-500 mt-1 block">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>

                      {message.reportedByUserId && (
                        <Badge variant="destructive" className="mt-2 text-xs">
                          Reported - Under Review
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Report Dialog */}
          {reportingMessageId && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Report Message</h4>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Please describe why you're reporting this message..."
                className="w-full p-2 border rounded-lg resize-none"
                rows={3}
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => reportMessage(reportingMessageId)}
                  className="bg-red-600 text-white"
                >
                  Submit Report
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReportingMessageId(null);
                    setReportReason('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="mt-4 space-y-3">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || attachments.length >= 3}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message... (Press Enter to send)"
                className="flex-1 p-2 border rounded-lg resize-none"
                rows={2}
                disabled={sending}
              />
              <Button
                onClick={sendMessage}
                disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                className="text-white"
                style={{ backgroundColor: '#5d9827' }}
              >
                {sending ? 'Sending...' : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Max 3 attachments, 10MB each. Supported: images, PDF, Word, text files.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}