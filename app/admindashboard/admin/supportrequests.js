"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Mail, Search, MessageSquare, Calendar, User, AlertCircle, Send, RefreshCw, Filter, Headphones, MessageCircle, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const SupportRequests = () => {
  const [tickets, setTickets] = useState([])
  const [filteredTickets, setFilteredTickets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("in_progress") // Default to "in_progress" instead of "all"
  const [activeTab, setActiveTab] = useState("in_progress") // Tab for "In Progress" and "Resolved"
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [userId, setUserId] = useState(null)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Get userId from sessionStorage
    const storedUserId = sessionStorage.getItem("user_id")
    if (storedUserId) {
      setUserId(parseInt(storedUserId))
    }
    fetchSupportTickets()
  }, [])

  useEffect(() => {
    // Filter tickets based on search query and active tab
    let filtered = tickets

    // Filter by active tab (in_progress or resolved)
    if (activeTab === "in_progress") {
      filtered = filtered.filter(ticket => ticket.status === "in_progress")
    } else if (activeTab === "resolved") {
      filtered = filtered.filter(ticket => ticket.status === "resolved")
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (ticket) =>
          ticket.ticket_number?.toLowerCase().includes(query) ||
          ticket.user_name?.toLowerCase().includes(query) ||
          ticket.user_email?.toLowerCase().includes(query) ||
          ticket.subject?.toLowerCase().includes(query) ||
          ticket.message?.toLowerCase().includes(query) ||
          ticket.source?.toLowerCase().includes(query)
      )
    }

    setFilteredTickets(filtered)
  }, [searchQuery, activeTab, tickets])

  const fetchSupportTickets = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("https://api.cnergy.site/support_requests.php?action=get_all_tickets")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      // Sort by created_at descending (newest first)
      const sortedData = Array.isArray(data) 
        ? data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        : []
      setTickets(sortedData)
      setFilteredTickets(sortedData)
    } catch (error) {
      console.error("Error fetching support tickets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch support tickets. Please try again.",
        variant: "destructive",
      })
      setTickets([])
      setFilteredTickets([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewTicket = async (ticket) => {
    console.log("🔍 [handleViewTicket] Clicked ticket:", ticket)
    console.log("🔍 [handleViewTicket] Ticket ID:", ticket.id)
    console.log("🔍 [handleViewTicket] Ticket created_at:", ticket.created_at)
    setSelectedTicket(ticket)
    setIsViewDialogOpen(true)
    await fetchTicketMessages(ticket.id)
  }

  const fetchTicketMessages = async (ticketId) => {
    console.log("🔍 [fetchTicketMessages] Fetching messages for ticket ID:", ticketId)
    try {
      setIsLoadingMessages(true)
      const adminIdParam = userId ? `&admin_id=${userId}` : ''
      const response = await fetch(`https://api.cnergy.site/support_requests.php?action=get_ticket_messages&ticket_id=${ticketId}${adminIdParam}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log("🔍 [fetchTicketMessages] API response:", data)
      
      if (data.success && data.messages) {
        console.log("🔍 [fetchTicketMessages] Messages received:", data.messages)
        console.log("🔍 [fetchTicketMessages] Number of messages:", data.messages.length)
        data.messages.forEach((msg, index) => {
          console.log(`🔍 [fetchTicketMessages] Message ${index + 1}:`, {
            id: msg.id,
            created_at: msg.created_at,
            message: msg.message?.substring(0, 50) + "...",
            sender_name: msg.sender_name,
            user_type_id: msg.user_type_id
          })
        })
        setMessages(data.messages)
      } else {
        console.log("🔍 [fetchTicketMessages] No messages or failed response")
        setMessages([])
      }
    } catch (error) {
      console.error("🔍 [fetchTicketMessages] Error:", error)
      toast({
        title: "Error",
        description: "Failed to fetch messages. Please try again.",
        variant: "destructive",
      })
      setMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message.",
        variant: "destructive",
      })
      return
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "User session not found. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    if (!selectedTicket) {
      return
    }

    try {
      setIsSendingMessage(true)
      const response = await fetch("https://api.cnergy.site/support_requests.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send_message",
          ticket_id: selectedTicket.id,
          sender_id: userId,
          message: newMessage.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNewMessage("")
        // Refresh messages
        await fetchTicketMessages(selectedTicket.id)
        // Refresh tickets list to update message count
        await fetchSupportTickets()
        toast({
          title: "Success",
          description: "Message sent successfully.",
        })
      } else {
        throw new Error(data.error || "Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleResolveTicket = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User session not found. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    if (!selectedTicket) {
      return
    }

    try {
      const response = await fetch("https://api.cnergy.site/support_requests.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_status",
          ticket_id: selectedTicket.id,
          status: "resolved",
          admin_id: userId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Close the dialog
        setIsViewDialogOpen(false)
        setIsResolveDialogOpen(false)
        setSelectedTicket(null)
        setMessages([])
        setNewMessage("")
        // Refresh tickets list
        await fetchSupportTickets()
        // Switch to resolved tab
        setActiveTab("resolved")
        toast({
          title: "Ticket Resolved",
          description: "The support ticket has been marked as resolved and moved to the resolved tab.",
        })
      } else {
        throw new Error(data.error || "Failed to resolve ticket")
      }
    } catch (error) {
      console.error("Error resolving ticket:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to resolve ticket. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString) => {
    console.log("🔍 [formatDate] Input dateString:", dateString)
    if (!dateString) {
      console.log("🔍 [formatDate] No dateString, returning N/A")
      return "N/A"
    }
    try {
      const date = new Date(dateString)
      console.log("🔍 [formatDate] Parsed Date object:", date)
      console.log("🔍 [formatDate] Date UTC string:", date.toUTCString())
      console.log("🔍 [formatDate] Date ISO string:", date.toISOString())
      
      if (isNaN(date.getTime())) {
        console.log("🔍 [formatDate] Invalid date, returning N/A")
        return "N/A"
      }
      
      // Get Philippine time
      const phTime = date.toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      console.log("🔍 [formatDate] Philippine time formatted:", phTime)
      console.log("🔍 [formatDate] Current local time:", new Date().toLocaleString())
      console.log("🔍 [formatDate] Current PH time:", new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
      
      return phTime
    } catch (error) {
      console.error("🔍 [formatDate] Error:", error)
      return dateString
    }
  }

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    }
    const color = colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    const label = status?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown"
    
    return (
      <Badge className={color} variant="outline">
        {label}
      </Badge>
    )
  }

  const getSourceBadge = (source) => {
    const colors = {
      mobile_app_deactivation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      mobile_app: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      web: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    }
    const color = colors[source] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    const label = source?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown"
    
    return (
      <Badge className={color} variant="outline">
        {label}
      </Badge>
    )
  }

  const isAdminMessage = (message) => {
    return message.user_type_id === 1 || message.user_type_id === 2
  }

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-orange-500 shadow-sm">
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  Support Tickets
                  {tickets.filter(t => t.status === 'in_progress').length > 0 && (
                    <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                      {tickets.filter(t => t.status === 'in_progress').length} active
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-0.5">View and manage support tickets from users</CardDescription>
              </div>
            </div>
            <Button onClick={fetchSupportTickets} variant="outline" size="sm" className="bg-white hover:bg-gray-50">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by ticket number, name, email, subject..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs for In Progress and Resolved */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
              <TabsTrigger value="in_progress">
                In Progress
                {tickets.filter(t => t.status === 'in_progress').length > 0 && (
                  <Badge className="ml-2 bg-orange-500 text-white">
                    {tickets.filter(t => t.status === 'in_progress').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved
                {tickets.filter(t => t.status === 'resolved').length > 0 && (
                  <Badge className="ml-2 bg-green-500 text-white">
                    {tickets.filter(t => t.status === 'resolved').length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="in_progress" className="mt-0">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery 
                    ? "No in-progress tickets found matching your search." 
                    : "No in-progress support tickets found."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-md bg-white transition-all cursor-pointer group"
                  onClick={() => handleViewTicket(ticket)}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 group-hover:from-orange-200 group-hover:to-orange-300 transition-colors">
                      <User className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-bold text-base text-gray-900">{ticket.ticket_number}</span>
                        {getStatusBadge(ticket.status)}
                        {getSourceBadge(ticket.source)}
                        {ticket.message_count > 0 && (
                          <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-xs">
                            {ticket.message_count} {ticket.message_count === 1 ? 'message' : 'messages'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-base text-gray-900">
                          {ticket.user_name || ticket.user_email || 'Unknown User'}
                        </span>
                      </div>
                      {ticket.user_email && ticket.user_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{ticket.user_email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                        <Mail className="h-3.5 w-3.5 text-orange-500" />
                        <span>{ticket.subject}</span>
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {ticket.message}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Created: {formatDate(ticket.created_at)}</span>
                        </div>
                        {ticket.last_message_at && (
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Latest: {formatDate(ticket.last_message_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resolved" className="mt-0">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery 
                    ? "No resolved tickets found matching your search." 
                    : "No resolved support tickets found."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-5 border-2 border-gray-200 rounded-xl hover:border-green-300 hover:shadow-md bg-white transition-all cursor-pointer group"
                      onClick={() => handleViewTicket(ticket)}
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-green-100 to-green-200 group-hover:from-green-200 group-hover:to-green-300 transition-colors">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-bold text-base text-gray-900">{ticket.ticket_number}</span>
                            {getStatusBadge(ticket.status)}
                            {getSourceBadge(ticket.source)}
                            {ticket.message_count > 0 && (
                              <Badge className="bg-green-500 text-white hover:bg-green-600 text-xs">
                                {ticket.message_count} {ticket.message_count === 1 ? 'message' : 'messages'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-base text-gray-900">
                              {ticket.user_name || ticket.user_email || 'Unknown User'}
                            </span>
                          </div>
                          {ticket.user_email && ticket.user_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <Mail className="h-3.5 w-3.5" />
                              <span>{ticket.user_email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                            <Mail className="h-3.5 w-3.5 text-green-500" />
                            <span>{ticket.subject}</span>
                          </div>
                          <div className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {ticket.message}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Created: {formatDate(ticket.created_at)}</span>
                            </div>
                            {ticket.last_message_at && (
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Latest: {formatDate(ticket.last_message_at)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Ticket Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
        setIsViewDialogOpen(open)
        if (!open) {
          setSelectedTicket(null)
          setMessages([])
          setNewMessage("")
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] !bg-white border-2 border-gray-300 shadow-2xl p-0 overflow-hidden [&>button]:hidden">
          <DialogHeader className="pb-4 pt-6 px-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500 shadow-md">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold text-gray-900">Ticket {selectedTicket?.ticket_number}</span>
                  <DialogDescription className="text-sm text-gray-600 mt-1">View and respond to support ticket</DialogDescription>
                </div>
              </DialogTitle>
              <div className="flex items-center gap-2">
                {selectedTicket && (
                  <>
                    {getStatusBadge(selectedTicket.status)}
                    {getSourceBadge(selectedTicket.source)}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsViewDialogOpen(false)}
                  className="h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-5 p-6 bg-white" onClick={(e) => {
              console.log("🔍 [Dialog Click] Clicked inside dialog:", e.target)
              console.log("🔍 [Dialog Click] Selected ticket:", selectedTicket)
            }}>
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4 p-5 bg-gray-50 border border-gray-200 rounded-lg" onClick={(e) => {
                console.log("🔍 [Ticket Info Click] Clicked ticket info section")
                e.stopPropagation()
              }}>
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">User</Label>
                  <div className="font-semibold text-gray-900">
                    {selectedTicket.user_name || selectedTicket.user_email || 'Unknown User'}
                  </div>
                  {selectedTicket.user_email && (
                    <div className="text-sm text-gray-600 mt-0.5">{selectedTicket.user_email}</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Subject</Label>
                  <div className="font-semibold text-gray-900">{selectedTicket.subject}</div>
                </div>
                <div onClick={(e) => {
                  e.stopPropagation()
                  console.log("🔍 [Created Date Click] Clicked created date")
                  console.log("🔍 [Created Date Click] Raw created_at:", selectedTicket.created_at)
                  console.log("🔍 [Created Date Click] Formatted:", formatDate(selectedTicket.created_at))
                }}>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Created</Label>
                  <div className="text-sm text-gray-700">{formatDate(selectedTicket.created_at)}</div>
                </div>
                <div onClick={(e) => {
                  e.stopPropagation()
                  console.log("🔍 [Updated Date Click] Clicked updated date")
                  console.log("🔍 [Updated Date Click] Raw updated_at:", selectedTicket.updated_at)
                  console.log("🔍 [Updated Date Click] Formatted:", formatDate(selectedTicket.updated_at))
                }}>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Last Updated</Label>
                  <div className="text-sm text-gray-700">{formatDate(selectedTicket.updated_at)}</div>
                </div>
              </div>

              {/* Resolve Button - Only show for in_progress tickets */}
              {selectedTicket.status === 'in_progress' && (
                <div className="flex items-center justify-end gap-2 pb-2 border-b border-gray-200">
                  <Button
                    onClick={() => setIsResolveDialogOpen(true)}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Resolved
                  </Button>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Conversation</Label>
                <ScrollArea className="h-80 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {isLoadingMessages ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      No messages yet. Start the conversation below.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isAdmin = isAdminMessage(message)
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                                isAdmin
                                  ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm'
                                  : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
                              }`}
                            >
                              <div className={`flex items-center gap-2 mb-1.5 ${isAdmin ? 'text-orange-50' : 'text-gray-700'}`}>
                                <span className="text-xs font-semibold">
                                  {isAdmin ? 'Support Team' : (message.sender_name || 'User')}
                                </span>
                              </div>
                              <div className={`text-sm whitespace-pre-wrap leading-relaxed ${isAdmin ? 'text-white' : 'text-gray-800'}`}>
                                {message.message}
                              </div>
                              <div className={`text-xs mt-2 ${isAdmin ? 'text-orange-100' : 'text-gray-500'}`}>
                                {formatDate(message.created_at)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Reply Section - Only show for in_progress tickets */}
              {selectedTicket.status === 'in_progress' && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <Label htmlFor="message" className="text-sm font-semibold text-gray-700">Reply</Label>
                  <div className="flex gap-2">
                    <Textarea
                      id="message"
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      className="resize-none border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isSendingMessage || !newMessage.trim()}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md"
                  >
                    {isSendingMessage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              )}
              {selectedTicket.status === 'resolved' && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-700 mb-1">This ticket has been resolved.</p>
                    <p className="text-xs text-green-600">The conversation is closed and no further messages can be sent.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Ticket Confirmation Dialog */}
      <AlertDialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Mark Ticket as Resolved?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2 space-y-2">
              <p>
                Are you sure you want to mark this ticket as resolved?
              </p>
              <p className="font-semibold text-gray-900">
                Ticket: {selectedTicket?.ticket_number}
              </p>
              <p className="text-sm text-gray-600">
                Once resolved, this ticket will be moved to the "Resolved" tab and the conversation will be closed. 
                You will no longer be able to send messages to this ticket.
              </p>
              <p className="text-sm font-medium text-orange-600 mt-3">
                This action cannot be undone. Please make sure all customer concerns have been addressed before resolving.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolveTicket}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Yes, Mark as Resolved
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SupportRequests
