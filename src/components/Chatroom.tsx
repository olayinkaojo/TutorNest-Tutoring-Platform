import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  Send, 
  MessageSquare,
  AlertCircle,
  Users,
  Search,
  Shield,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from './ui/alert';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  type: 'text';
  read: boolean;
  createdAt: string;
  deletable: false; // Messages are NEVER deletable
}

interface Conversation {
  id: string;
  participants: string[];
  participantRoles: Record<string, string>;
  participantNames: Record<string, string>;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

interface ChatroomProps {
  session: any;
  userId: string;
  userName: string;
  userRole: string;
}

export function Chatroom({ session, userId, userName, userRole }: ChatroomProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout>();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    
    // Poll for new messages every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      if (selectedConversation) {
        loadMessages(selectedConversation.id, true); // Silent reload
      }
      loadConversations(); // Update conversation list
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/conversations`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        console.error('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string, silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error('Failed to load messages');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newMessage,
            senderName: userName,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setNewMessage('');
        loadConversations(); // Refresh conversation list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reportMessage = async (messageId: string) => {
    const reason = prompt('Please describe why you are reporting this message:');
    if (!reason) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/conversations/messages/${messageId}/report`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reportReason: reason }),
        }
      );

      if (response.ok) {
        toast.success('Message reported to administrators');
      } else {
        toast.error('Failed to report message');
      }
    } catch (error) {
      console.error('Error reporting message:', error);
      toast.error('Failed to report message');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const otherParticipantId = conv.participants.find(p => p !== userId);
    const otherParticipantName = otherParticipantId ? conv.participantNames[otherParticipantId] : '';
    return otherParticipantName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" style={{ color: '#625d9c' }} />
              Messages
            </CardTitle>
            <CardDescription>
              Secure communication with tutors, students, and parents
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Monitored for Safety
          </Badge>
        </div>
        
        {/* Important Notice */}
        <Alert className="mt-4 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            <strong>Important:</strong> Messages are permanently stored and cannot be deleted. 
            This ensures accountability and safety for all users. 
            Please do not share personal contact information.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {loading && !selectedConversation ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-1">No conversations yet</p>
                <p className="text-xs text-gray-400">
                  Start a conversation with a tutor, student, or parent
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map((conv) => {
                  const otherParticipantId = conv.participants.find(p => p !== userId);
                  const otherParticipantName = otherParticipantId 
                    ? conv.participantNames[otherParticipantId] || 'Unknown User'
                    : 'Unknown User';
                  const otherParticipantRole = otherParticipantId
                    ? conv.participantRoles[otherParticipantId]
                    : '';
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv);
                        loadMessages(conv.id);
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                            {otherParticipantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm truncate">{otherParticipantName}</h4>
                            {conv.unreadCount > 0 && (
                              <Badge 
                                className="text-white ml-2" 
                                style={{ backgroundColor: '#625d9c' }}
                              >
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 capitalize mb-1">{otherParticipantRole}</p>
                          {conv.lastMessage && (
                            <p className="text-xs text-gray-600 truncate">
                              {conv.lastMessage.senderId === userId ? 'You: ' : ''}
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                      {(() => {
                        const otherParticipantId = selectedConversation.participants.find(p => p !== userId);
                        const name = otherParticipantId 
                          ? selectedConversation.participantNames[otherParticipantId] || 'U'
                          : 'U';
                        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-sm">
                      {(() => {
                        const otherParticipantId = selectedConversation.participants.find(p => p !== userId);
                        return otherParticipantId 
                          ? selectedConversation.participantNames[otherParticipantId] || 'Unknown User'
                          : 'Unknown User';
                      })()}
                    </h3>
                    <p className="text-xs text-gray-500 capitalize">
                      {(() => {
                        const otherParticipantId = selectedConversation.participants.find(p => p !== userId);
                        return otherParticipantId 
                          ? selectedConversation.participantRoles[otherParticipantId]
                          : '';
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No messages yet</p>
                      <p className="text-xs text-gray-400 mt-1">Send a message to start the conversation</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.senderId === userId;
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwn
                                ? 'text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                            style={isOwn ? { backgroundColor: '#625d9c' } : {}}
                          >
                            {!isOwn && (
                              <p className="text-xs mb-1 opacity-75">{message.senderName}</p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <div className="flex items-center justify-between mt-2 gap-2">
                              <p className={`text-xs ${isOwn ? 'text-purple-200' : 'text-gray-500'}`}>
                                {new Date(message.createdAt).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                              {!isOwn && (
                                <button
                                  onClick={() => reportMessage(message.id)}
                                  className="text-xs text-red-600 hover:text-red-800 underline"
                                >
                                  Report
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message... (No personal contact info)"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="text-white"
                    style={{ backgroundColor: '#625d9c' }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ Messages are permanent and monitored. Do not share phone numbers, emails, or social media.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="mb-1">Select a conversation</p>
                <p className="text-sm text-gray-400">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
