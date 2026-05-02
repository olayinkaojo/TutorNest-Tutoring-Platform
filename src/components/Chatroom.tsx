import { useState, useEffect, useRef } from 'react';
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
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from './ui/alert';
import { edgeFunctionBaseUrl, edgeFunctionHeaders } from '../utils/supabase-edge-fetch';

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
  /** When set, separates parent-home vs tutor-home threads for the same two user IDs */
  channel?: string;
  participantRoles: Record<string, string>;
  participantNames: Record<string, string>;
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

const ACTIVE_BOOKING = new Set(['confirmed', 'completed', 'scheduled']);

/** Must match Edge `messaging-access` channel names */
function messagingChannelForContact(
  dashboardRole: string,
  contactRole: string,
): 'parent-tutor' | 'tutor-parent' | 'tutor-student' | null {
  const d = dashboardRole.toLowerCase();
  const c = contactRole.toLowerCase();
  if (d === 'parent' && c === 'tutor') return 'parent-tutor';
  if (d === 'tutor' && c === 'parent') return 'tutor-parent';
  if (d === 'tutor' && c === 'student') return 'tutor-student';
  if (d === 'student' && c === 'tutor') return 'tutor-student';
  return null;
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
  const [paymentExpired, setPaymentExpired] = useState(false);
  const [paymentExpiresAt, setPaymentExpiresAt] = useState<string | null>(null);
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
      const expected = initialContactRole
        ? messagingChannelForContact(userRole, initialContactRole)
        : null;
      const existingConv = conversations.find((conv) => {
        const other = conv.participants.find((p) => p !== userId);
        if (other !== initialContactId) return false;
        if (!expected) return true;
        return !conv.channel || conv.channel === expected;
      });
      if (existingConv) {
        setSelectedConversation(existingConv);
        loadMessages(existingConv.id);
      } else if (initialContactName && initialContactRole) {
        startConversation({
          id: initialContactId,
          name: initialContactName,
          role: initialContactRole,
        });
      }
    }
  }, [initialContactId, conversations, initialContactName, initialContactRole, userId, userRole]);

  useEffect(() => {
    setSelectedConversation(null);
    setMessages([]);
    setSearchQuery('');
    hasInitiatedRef.current = false;
  }, [userRole]);

  useEffect(() => {
    loadConversations();
    const id = window.setInterval(loadConversations, 30000);
    return () => window.clearInterval(id);
  }, [session?.access_token, userRole]);

  // Messages live in KV (not Postgres Realtime) — poll while a thread is open
  useEffect(() => {
    if (!selectedConversation?.id) return;
    const t = window.setInterval(() => {
      loadMessages(selectedConversation.id, true);
    }, 8000);
    return () => window.clearInterval(t);
  }, [selectedConversation?.id, session?.access_token]);

  const loadConversations = async () => {
    try {
      const url = `${edgeFunctionBaseUrl()}/conversations?persona=${encodeURIComponent(userRole)}`;
      const response = await fetch(url, {
        headers: edgeFunctionHeaders(session.access_token),
      });

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
      const enc = encodeURIComponent(conversationId);
      await fetch(`${edgeFunctionBaseUrl()}/conversations/${enc}/read`, {
        method: 'POST',
        headers: edgeFunctionHeaders(session.access_token),
      });
      // Zero out unread locally immediately
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c));
    } catch (_) {}
  };

  const loadMessages = async (conversationId: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const enc = encodeURIComponent(conversationId);
      const response = await fetch(`${edgeFunctionBaseUrl()}/conversations/${enc}/messages`, {
        headers: edgeFunctionHeaders(session.access_token),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setPaymentExpired(false);
        setPaymentExpiresAt(null);
      } else if (response.status === 403) {
        // Check if it's a payment expiration error
        const error = await response.json();
        if (error.errorCode === 'PAYMENT_EXPIRED') {
          setPaymentExpired(true);
          setPaymentExpiresAt(error.expiresAt || null);
          setMessages([]);
          toast.error('Chat access ended: Payment duration expired');
        } else {
          toast.error(error.error || 'Access denied');
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    
    // Check if payment has expired
    if (paymentExpired) {
      toast.error('Cannot send message: Payment duration has expired. Please renew your subscription.');
      return;
    }

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
      const enc = encodeURIComponent(selectedConversation.id);
      const response = await fetch(`${edgeFunctionBaseUrl()}/conversations/${enc}/messages`, {
        method: 'POST',
        headers: {
          ...edgeFunctionHeaders(session.access_token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, senderName: userName }),
      });
      if (response.ok) {
        const data = await response.json();
        // Replace optimistic message with real one
        setMessages(prev => prev.map(m => m.id === optimisticId ? data.message : m));
        loadConversations();
      } else if (response.status === 403) {
        // Check if it's a payment expiration error
        const error = await response.json();
        if (error.errorCode === 'PAYMENT_EXPIRED') {
          setPaymentExpired(true);
          setPaymentExpiresAt(error.expiresAt || null);
          setMessages(prev => prev.filter(m => m.id !== optimisticId));
          toast.error('Cannot send message: Payment duration has expired.');
        } else {
          setMessages(prev => prev.filter(m => m.id !== optimisticId));
          toast.error(error.error || 'Failed to send message');
          setNewMessage(content); // restore draft
        }
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
        `${edgeFunctionBaseUrl()}/conversations/messages/${encodeURIComponent(messageId)}/report`,
        {
          method: 'POST',
          headers: {
            ...edgeFunctionHeaders(session.access_token),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reportReason: reason }),
        },
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
      const res = await fetch(
        `${edgeFunctionBaseUrl()}/bookings?persona=${encodeURIComponent(userRole)}`,
        { headers: edgeFunctionHeaders(session.access_token) },
      );
      if (!res.ok) return;
      const data = await res.json();
      if (userRole === 'parent') {
        const bookings: any[] = data.bookings || [];
        const seen = new Set<string>();
        const tutors: Contact[] = [];
        for (const b of bookings) {
          if (!ACTIVE_BOOKING.has(String(b.status || '').toLowerCase())) continue;
          const tutorId = b.tutorId;
          if (tutorId && tutorId !== userId && !seen.has(tutorId)) {
            seen.add(tutorId);
            tutors.push({
              id: tutorId,
              name:
                b.tutorFullName ||
                b.tutorName ||
                (b.tutorFirstName ? `${b.tutorFirstName} ${b.tutorLastName || ''}`.trim() : 'Tutor'),
              role: 'tutor',
            });
          }
        }
        setContacts(tutors);
      } else if (userRole === 'student') {
        const bookings: any[] = data.bookings || [];
        const seen = new Set<string>();
        const tutors: Contact[] = [];
        for (const b of bookings) {
          if (!ACTIVE_BOOKING.has(String(b.status || '').toLowerCase())) continue;
          const tutorId = b.tutorId;
          if (tutorId && tutorId !== userId && !seen.has(tutorId)) {
            seen.add(tutorId);
            tutors.push({
              id: tutorId,
              name: b.tutorName || b.tutorFullName || 'Tutor',
              role: 'tutor',
            });
          }
        }
        setContacts(tutors);
      } else {
        const bookings: any[] = data.bookings || [];
        const seen = new Set<string>();
        const contacts: Contact[] = [];
        for (const b of bookings) {
          if (!ACTIVE_BOOKING.has(String(b.status || '').toLowerCase())) continue;
          if (b.parentId && b.parentId !== userId && !seen.has(`p:${b.parentId}`)) {
            seen.add(`p:${b.parentId}`);
            contacts.push({
              id: b.parentId,
              name: b.parentName || b.userName || 'Parent',
              role: 'parent',
            });
          }
          if (b.studentId && b.studentId !== userId && !seen.has(`s:${b.studentId}`)) {
            seen.add(`s:${b.studentId}`);
            contacts.push({
              id: b.studentId,
              name: b.studentName || b.studentFullName || 'Student',
              role: 'student',
            });
          }
        }
        setContacts(contacts);
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
      const channel = messagingChannelForContact(userRole, contact.role);
      if (!channel) {
        toast.error('You cannot message this contact from your current role.');
        return;
      }
      const res = await fetch(`${edgeFunctionBaseUrl()}/conversations/get-or-create`, {
        method: 'POST',
        headers: {
          ...edgeFunctionHeaders(session.access_token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: contact.id,
          participantName: contact.name,
          participantRole: contact.role,
          channel,
          dashboardRole: userRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error || 'Failed to start conversation');
        return;
      }
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
          <DialogTitle>
            {userRole === 'student' ? 'Message a Tutor' : 'Start a New Conversation'}
          </DialogTitle>
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
              <p className="text-sm text-center py-4 text-gray-500">
                {userRole === 'student'
                  ? 'No tutors found. Book a session to start messaging your tutor.'
                  : 'No contacts found'}
              </p>
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
                  {userRole === 'student'
                    ? 'Start a conversation with one of your tutors'
                    : 'Start a conversation with a tutor, student, or parent'}
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

              {/* Payment Expired Alert */}
              {paymentExpired && (
                <Alert className="m-4 bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-900">
                    <strong>Chat Access Ended:</strong> The payment duration for this booking has expired. 
                    {paymentExpiresAt && ` Expired on ${new Date(paymentExpiresAt).toLocaleDateString()}.`}
                    Please purchase a new plan to continue messaging.
                  </AlertDescription>
                </Alert>
              )}

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
                {paymentExpired ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                      <p className="text-sm text-red-900 font-medium">
                        ❌ Chat access has ended
                      </p>
                      <p className="text-xs text-red-800 mt-1">
                        The payment duration for this booking has expired. 
                        You cannot send or receive messages until you purchase a new plan.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
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
                )}
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
