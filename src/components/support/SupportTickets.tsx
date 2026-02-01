import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Paperclip,
  Loader2,
  User,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'waiting-customer' | 'resolved' | 'closed';
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages: TicketMessage[];
  attachments: string[];
}

interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'support';
  content: string;
  timestamp: string;
  attachments?: string[];
}

interface SupportTicketsProps {
  userId: string;
  accessToken: string;
  userName: string;
  userEmail: string;
  isSupport?: boolean;
}

const TICKET_CATEGORIES = [
  { value: 'account', label: 'Account & Login' },
  { value: 'booking', label: 'Booking & Sessions' },
  { value: 'payment', label: 'Payments & Billing' },
  { value: 'technical', label: 'Technical Issues' },
  { value: 'safety', label: 'Safety & Privacy' },
  { value: 'feedback', label: 'Feedback & Suggestions' },
  { value: 'other', label: 'Other' }
];

export function SupportTickets({ 
  userId, 
  accessToken, 
  userName, 
  userEmail,
  isSupport = false 
}: SupportTicketsProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // New ticket form
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  useEffect(() => {
    loadTickets();
  }, [userId]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const endpoint = isSupport
        ? '/support/tickets/all'
        : `/support/tickets/user/${userId}`;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!subject.trim() || !description.trim() || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/support/tickets`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject,
            description,
            category,
            priority,
            userId,
            userName,
            userEmail
          })
        }
      );

      if (response.ok) {
        toast.success('Support ticket created');
        setShowNewTicket(false);
        setSubject('');
        setDescription('');
        setCategory('');
        setPriority('medium');
        loadTickets();
      } else {
        toast.error('Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/support/tickets/${selectedTicket.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: newMessage,
            senderId: userId,
            senderName: userName,
            senderType: isSupport ? 'support' : 'user'
          })
        }
      );

      if (response.ok) {
        setNewMessage('');
        // Reload ticket to get new message
        loadTicketDetails(selectedTicket.id);
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/support/tickets/${ticketId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data.ticket);
      }
    } catch (error) {
      console.error('Error loading ticket details:', error);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/support/tickets/${ticketId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        }
      );

      if (response.ok) {
        toast.success('Ticket status updated');
        loadTickets();
        if (selectedTicket) {
          loadTicketDetails(selectedTicket.id);
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'waiting-customer':
        return 'bg-purple-100 text-purple-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <MessageSquare className="w-4 h-4" />;
      case 'in-progress':
        return <Clock className="w-4 h-4" />;
      case 'waiting-customer':
        return <AlertCircle className="w-4 h-4" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl">Support Tickets</h2>
          <p className="text-gray-600 mt-1">
            {isSupport ? 'Manage customer support requests' : 'View and manage your support tickets'}
          </p>
        </div>
        {!isSupport && (
          <Button
            onClick={() => setShowNewTicket(true)}
            className="bg-[#5d9827] hover:bg-[#4a7a1f]"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {tickets.filter(t => t.status === 'open').length}
          </div>
          <div className="text-sm text-gray-600">Open</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {tickets.filter(t => t.status === 'in-progress').length}
          </div>
          <div className="text-sm text-gray-600">In Progress</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">
            {tickets.filter(t => t.status === 'waiting-customer').length}
          </div>
          <div className="text-sm text-gray-600">Waiting</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {tickets.filter(t => t.status === 'resolved').length}
          </div>
          <div className="text-sm text-gray-600">Resolved</div>
        </Card>
      </div>

      {/* Tickets List and Detail */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <Card className="p-6">
          <h3 className="text-xl mb-4">Your Tickets ({tickets.length})</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                className={`p-4 cursor-pointer hover:border-[#625d9c] transition-colors ${
                  selectedTicket?.id === ticket.id ? 'border-[#625d9c] border-2' : ''
                }`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{ticket.subject}</h4>
                    </div>
                    {isSupport && (
                      <p className="text-sm text-gray-600 mb-1">
                        {ticket.userName} ({ticket.userEmail})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge className={getStatusColor(ticket.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </span>
                  </Badge>
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {ticket.category}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                  <span>{ticket.messages.length} messages</span>
                </div>
              </Card>
            ))}

            {tickets.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No tickets yet</p>
              </div>
            )}
          </div>
        </Card>

        {/* Ticket Detail */}
        <Card className="p-6">
          {selectedTicket ? (
            <div className="flex flex-col h-[600px]">
              {/* Ticket Header */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl mb-2">{selectedTicket.subject}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getStatusColor(selectedTicket.status)}>
                        {selectedTicket.status}
                      </Badge>
                      <Badge className={getPriorityColor(selectedTicket.priority)}>
                        {selectedTicket.priority}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {selectedTicket.category}
                      </Badge>
                    </div>
                  </div>
                </div>

                {isSupport && (
                  <div className="flex gap-2 mb-3">
                    <select
                      className="p-2 border rounded text-sm"
                      value={selectedTicket.status}
                      onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="waiting-customer">Waiting Customer</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {selectedTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.senderType === 'support'
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm">{message.senderName}</span>
                      {message.senderType === 'support' && (
                        <Badge className="bg-blue-600 text-white text-xs">Support</Badge>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}

                {selectedTicket.messages.length === 0 && (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    No messages yet
                  </p>
                )}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== 'closed' && (
                <div className="border-t pt-4">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <Button variant="outline" size="sm">
                      <Paperclip className="w-4 h-4 mr-2" />
                      Attach
                    </Button>
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      size="sm"
                      className="bg-[#5d9827] hover:bg-[#4a7a1f]"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              )}

              {selectedTicket.status === 'closed' && (
                <Card className="p-3 bg-gray-50 text-sm text-gray-600 text-center">
                  This ticket is closed. Create a new ticket if you need further assistance.
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Select a ticket to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* New Ticket Dialog */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl">Create Support Ticket</h3>
              <Button variant="outline" size="sm" onClick={() => setShowNewTicket(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  className="w-full p-2 border rounded-lg"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select a category</option>
                  {TICKET_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  className="w-full p-2 border rounded-lg"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about your issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                />
              </div>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Tip:</strong> Include as much detail as possible to help us resolve
                  your issue faster. Our support team typically responds within 24 hours.
                </p>
              </Card>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowNewTicket(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createTicket}
                  className="flex-1 bg-[#5d9827] hover:bg-[#4a7a1f]"
                >
                  Create Ticket
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
