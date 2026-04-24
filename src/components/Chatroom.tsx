import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import {
  Send,
  MessageSquare,
  AlertCircle,
  Users,
  Search,
  Shield,
  Plus,
  Check,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from './ui/alert';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for Realtime
const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

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
  initialContactId?: string;
  initialContactName?: string;
  initialContactRole?: string;
}

interface Contact {
  id: string;
  name: string;
  role: string;
}

export function Chatroom({ session, userId, userName, userRole, initialContactId, initialContactName, initialContactRole }: ChatroomProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConvDialog, setShowNewConvDialog] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const [startingConv, setStartingConv] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitiatedRef = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start conversation with initial contact if provided
  useEffect(() => {
    if (initialContactId && !hasInitiatedRef.current && conversations.length > 0) {
      hasInitiatedRef.current = true;
      // Find existing conversation with this contact or create new one
      const existingConv = conversations.find(conv => 
        conv.participants.includes(initialContactId)
      );
      if (existingConv) {
        setSelectedConversation(existingConv);
        loadMessages(existingConv.id);
      } else if (initialContactName && initialContactRole) {
        // Start new conversation
        startConversation({
          id: initialContactId,
          name: initialContactName,
          role: initialContactRole,
        });
      }
    }
  }, [initialContactId, conversations]);

  // Real-time subscription logic
  useEffect(() => {
    loadConversations();

    if (!selectedConversation) return;

    // Subscribe to new messages for the selected conversation
    const messageChannel = supabase
      .channel(`room:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversationId=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((current) => {
            // Avoid duplicates from optimistic updates
            if (current.some((m) => m.id === newMessage.id)) return current;
            return [...current, newMessage];
          });
          loadConversations(); // Refresh list to update last message preview
        }
      )
      .subscribe();

    // Subscribe to conversation updates (unread counts, etc.)
    const convChannel = supabase
      .channel('conversations_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(convChannel);
    };
  }, [selectedConversation?.id]);

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

  const markConversationRead = async (conversationId: string) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/conversations/${conversationId}/read`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      // Zero out unread locally immediately
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
    } catch (_) {}
  };

  const loadMessages = async (conversationId: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/conversations/${conversationId}/messages`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    const content = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      conversationId: selectedConversation.id,
      senderId: userId,
      senderName: userName,
      receiverId: selectedConversation.participants.find(p => p !== userId) || '',
      content,
      type: 'text',
      read: false,
      createdAt: new Date().toISOString(),
      deletable: false,
    };
    setMessages(prev => [...prev, optimistic]);
    setSending(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, senderName: userName }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Replace optimistic message with real one
        setMessages(prev => prev.map(m => m.id === optimisticId ? data.message : m));
        loadConversations();
      } else {
        // Roll back optimistic
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        const error = await response.json();
        toast.error(error.error || 'Failed to send message');
        setNewMessage(content); // restore draft
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error('Failed to send message');
      setNewMessage(content);
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
    if (!searchQuery.trim()) return true;
    
    // Get the other participant's name
    const otherParticipantId = conv.participants.find(p => p !== userId);
    if (!otherParticipantId) return false;
    
    // Try multiple sources for the name
    const otherParticipantName = 
      conv.participantNames?.[otherParticipantId] || 
      conv.lastMessage?.senderName || 
      'Unknown';
    
    return otherParticipantName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const url = userRole === 'parent'
        ? `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutors`
        : `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (userRole === 'parent') {
        const tutors: Contact[] = (data.tutors || data || []).map((t: any) => ({
          id: t.userId || t.id,
          name: t.fullName || t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Tutor',
          role: 'tutor',
        })).filter((c: Contact) => c.id && c.id !== userId);
        setContacts(tutors);
      } else {
        // For tutors: extract unique parents from bookings
        const bookings: any[] = data.bookings || data || [];
        const seen = new Set<string>();
        const parents: Contact[] = [];
        for (const b of bookings) {
          const parentId = b.parentId || b.userId;
          if (parentId && parentId !== userId && !seen.has(parentId)) {
            seen.add(parentId);
            parents.push({ id: parentId, name: b.parentName || b.userName || 'Parent', role: 'parent' });
          }
        }
        setContacts(parents);
      }
    } catch (err) {
      console.error('Error loading contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  const startConversation = async (contact: Contact) => {
    setStartingConv(true);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/conversations/get-or-create`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: contact.id, participantName: contact.name, participantRole: contact.role }),
        }
      );
      if (!res.ok) { toast.error('Failed to start conversation'); return; }
      const data = await res.json();
      setShowNewConvDialog(false);
      setContactSearch('');
      await loadConversations();
      if (data.conversation) {
        setSelectedConversation(data.conversation);
        loadMessages(data.conversation.id);
      }
    } catch (err) {
      toast.error('Failed to start conversation');
    } finally {
      setStartingConv(false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase())
  );

  return (
    <>
    <Dialog open={showNewConvDialog} onOpenChange={(open) => { setShowNewConvDialog(open); if (!open) setContactSearch(''); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a New Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-60">
            {contactsLoading ? (
              <p className="text-sm text-center py-4 text-gray-500">Loading contacts...</p>
            ) : filteredContacts.length === 0 ? (
              <p className="text-sm text-center py-4 text-gray-500">No contacts found</p>
            ) : (
              <div className="divide-y">
                {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => startConversation(contact)}
                    disabled={startingConv}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    <Avatar>
                      <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">{contact.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{contact.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
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
          <div className="p-4 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              size="sm"
              className="w-full text-white"
              style={{ backgroundColor: '#625d9c' }}
              onClick={() => { setShowNewConvDialog(true); loadContacts(); }}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Conversation
            </Button>
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
                        if (conv.unreadCount > 0) markConversationRead(conv.id);
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === conv.id ? 'bg-purple-50 border-l-2' : ''
                      }`}
                      style={selectedConversation?.id === conv.id ? { borderLeftColor: '#625d9c' } : {}}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar>
                            <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                              {otherParticipantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {conv.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center" style={{ backgroundColor: '#625d9c' }}>
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold' : ''}`}>{otherParticipantName}</h4>
                            {conv.updatedAt && (
                              <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
                                {new Date(conv.updatedAt).toLocaleDateString() === new Date().toLocaleDateString()
                                  ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : new Date(conv.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 capitalize mb-1">{otherParticipantRole}</p>
                          {conv.lastMessage && (
                            <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
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
                  <div className="space-y-1 py-2">
                    {messages.map((message, idx) => {
                      const isOwn = message.senderId === userId;
                      const isOptimistic = message.id.startsWith('optimistic-');
                      const msgDate = new Date(message.createdAt);
                      const prevDate = idx > 0 ? new Date(messages[idx - 1].createdAt) : null;
                      const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
                      return (
                        <div key={message.id}>
                          {showDateSep && (
                            <div className="flex items-center gap-2 my-3">
                              <div className="flex-1 h-px bg-gray-200" />
                              <span className="text-xs text-gray-400 px-2">
                                {msgDate.toDateString() === new Date().toDateString() ? 'Today' :
                                  msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <div className="flex-1 h-px bg-gray-200" />
                            </div>
                          )}
                          <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                                isOwn ? 'text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                              } ${isOptimistic ? 'opacity-70' : ''}`}
                              style={isOwn ? { backgroundColor: '#625d9c' } : {}}
                            >
                              {!isOwn && (
                                <p className="text-xs mb-1 font-semibold opacity-75">{message.senderName}</p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                              <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-between'}`}>
                                <p className={`text-[10px] ${isOwn ? 'text-purple-200' : 'text-gray-400'}`}>
                                  {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {isOwn && (
                                  <span className="text-purple-200">
                                    {isOptimistic
                                      ? <Loader2 className="w-3 h-3 animate-spin inline" />
                                      : message.read
                                        ? <CheckCheck className="w-3 h-3 inline" />
                                        : <Check className="w-3 h-3 inline" />}
                                  </span>
                                )}
                                {!isOwn && !isOptimistic && (
                                  <button
                                    onClick={() => reportMessage(message.id)}
                                    className="text-[10px] text-red-500 hover:text-red-700"
                                  >
                                    Report
                                  </button>
                                )}
                              </div>
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
    </>
  );
}
