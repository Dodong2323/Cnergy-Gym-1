"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    MessageCircle,
    X,
    Send,
    Search,
    Loader2,
    User,
    Clock,
    Check,
    CheckCheck,
    Ticket,
    AlertCircle,
    Headphones,
    CheckCircle2,
    ArrowLeft,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"
import { cn } from "@/lib/utils"
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

const SUPPORT_API_URL = "https://api.cnergy.site/support_tickets.php"

const TICKET_TOAST_STYLE = {
    position: "fixed",
    top: "1rem",
    right: "1rem",
    bottom: "auto",
    left: "auto",
    minWidth: "280px",
    zIndex: 9999,
}

const AdminChat = ({ userId: propUserId }) => {
    // Try to get userId from prop, sessionStorage, or state
    const [userId, setUserId] = useState(() => {
        // First try prop
        if (propUserId) {
            console.log("AdminChat: Initializing with userId from prop:", propUserId)
            return propUserId
        }
        // Then try sessionStorage (client-side only)
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem("user_id")
            if (stored) {
                console.log("AdminChat: Initializing with userId from sessionStorage:", stored)
                return parseInt(stored)
            }
            console.log("AdminChat: No userId found in prop or sessionStorage")
        }
        return null
    })

    const [isOpen, setIsOpen] = useState(false)
    const [supportTickets, setSupportTickets] = useState([])
    const [selectedTicket, setSelectedTicket] = useState(null)
    const [selectedUser, setSelectedUser] = useState(null) // Selected user for user detail view
    const [viewMode, setViewMode] = useState("users") // "users" | "user-tickets" | "conversation"
    const [messages, setMessages] = useState([])
    const [messageInput, setMessageInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [ticketCount, setTicketCount] = useState(0)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("all") // Keep for compatibility but not used for filtering
    const [activeTab, setActiveTab] = useState("pending") // Tab for "Pending", "In Progress", and "Resolved"
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [userIdLoadingTimeout, setUserIdLoadingTimeout] = useState(false)
    const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
    const messagesEndRef = useRef(null)
    const messageInputRef = useRef(null)
    const { toast } = useToast()

    // Sync userId from prop when it changes, and periodically check sessionStorage
    useEffect(() => {
        if (propUserId) {
            console.log("AdminChat: Received userId from prop:", propUserId)
            setUserId(propUserId)
        } else if (typeof window !== 'undefined') {
            // Try to get from sessionStorage if prop is not available
            const checkSessionStorage = () => {
                const stored = sessionStorage.getItem("user_id")
                if (stored) {
                    const parsed = parseInt(stored)
                    console.log("AdminChat: Found userId in sessionStorage:", parsed)
                    if (parsed && parsed !== userId) {
                        setUserId(parsed)
                    }
                }
            }

            // Check immediately
            checkSessionStorage()

            // Also check periodically (in case it gets set later)
            if (!userId) {
                const interval = setInterval(checkSessionStorage, 1000)
                return () => clearInterval(interval)
            }
        }
    }, [propUserId, userId])

    // Set timeout for userId loading
    useEffect(() => {
        if (!userId) {
            const timeout = setTimeout(() => {
                setUserIdLoadingTimeout(true)
            }, 3000) // Show timeout message after 3 seconds
            return () => clearTimeout(timeout)
        } else {
            setUserIdLoadingTimeout(false)
        }
    }, [userId])

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    // Fetch support tickets
    const fetchSupportTickets = async () => {
        if (!userId) {
            return
        }

        try {
            const response = await fetch(`${SUPPORT_API_URL}?action=get_all_tickets`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })
            
            if (!response.ok) {
                const errorText = await response.text()
                console.error("Error fetching tickets:", response.status, errorText)
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const data = await response.json()
            console.log("Support tickets response:", data)
            
            // Handle response - can be array directly or wrapped in success
            let tickets = []
            if (Array.isArray(data)) {
                tickets = data
            } else if (data.success && Array.isArray(data.tickets)) {
                tickets = data.tickets
            } else if (data.tickets && Array.isArray(data.tickets)) {
                tickets = data.tickets
            }
            
            // Sort by created_at descending (newest first)
            const sortedData = tickets.sort((a, b) => {
                const dateA = new Date(a.created_at || a.last_message_at || 0)
                const dateB = new Date(b.created_at || b.last_message_at || 0)
                return dateB - dateA
            })
            
            setSupportTickets(sortedData)
            
            // Count only in_progress tickets (excluding pending and resolved)
            const activeTickets = sortedData.filter(
                ticket => ticket.status === 'in_progress'
            ).length
            setTicketCount(activeTickets)
            
        } catch (error) {
            console.error("Error fetching support tickets:", error)
            setSupportTickets([])
            setTicketCount(0)
        }
    }

    // Fetch ticket messages
    const fetchTicketMessages = async (ticketId) => {
        if (!userId || !ticketId) {
            return
        }

        try {
            setIsLoadingMessages(true)
            const adminIdParam = userId ? `&admin_id=${userId}` : ''
            const url = `${SUPPORT_API_URL}?action=get_ticket_messages&ticket_id=${ticketId}${adminIdParam}`
            console.log("🔍 [fetchTicketMessages] Fetching from:", url)
            
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })
            
            if (!response.ok) {
                const errorText = await response.text()
                console.error("🔍 [fetchTicketMessages] Error:", response.status, errorText)
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const data = await response.json()
            console.log("🔍 [fetchTicketMessages] Response:", data)
            
            if (data.success && data.messages) {
                console.log("🔍 [fetchTicketMessages] Messages received:", data.messages)
                console.log("🔍 [fetchTicketMessages] Number of messages:", data.messages.length)
                data.messages.forEach((msg, index) => {
                    console.log(`🔍 [fetchTicketMessages] Message ${index + 1}:`, {
                        id: msg.id,
                        created_at: msg.created_at,
                        timestamp: msg.timestamp,
                        message: msg.message?.substring(0, 50) + "...",
                        sender_name: msg.sender_name,
                        user_type_id: msg.user_type_id
                    })
                })
                setMessages(data.messages)
                setTimeout(() => scrollToBottom(), 100)
            } else if (data.messages && Array.isArray(data.messages)) {
                console.log("🔍 [fetchTicketMessages] Messages array received:", data.messages)
                setMessages(data.messages)
                setTimeout(() => scrollToBottom(), 100)
            } else {
                console.log("🔍 [fetchTicketMessages] No messages found")
                setMessages([])
            }
        } catch (error) {
            console.error("🔍 [fetchTicketMessages] Error:", error)
            toast({
                title: "Error",
                description: `Failed to fetch messages: ${error.message}`,
                variant: "destructive",
            })
            setMessages([])
        } finally {
            setIsLoadingMessages(false)
        }
    }

    const updateTicketStatus = async (ticketId, status) => {
        if (!ticketId || !status) return

        try {
            const response = await fetch(SUPPORT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    action: "update_status",
                    ticket_id: ticketId,
                    status,
                    admin_id: userId,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error(`🔍 [updateTicketStatus] failed to set ${status}:`, response.status, errorText)
                return
            }

            const data = await response.json()
            if (data.success) {
                setSupportTickets(prev =>
                    prev.map(t => (t.id === ticketId ? { ...t, status } : t))
                )
                if (selectedTicket?.id === ticketId) {
                    setSelectedTicket(prev => prev ? { ...prev, status } : prev)
                }
            }
        } catch (error) {
            console.error("🔍 [updateTicketStatus] error:", error)
        }
    }

    // Send message
    const sendMessage = async () => {
        if (!messageInput.trim() || !userId || isSending) {
            return
        }

        const messageText = messageInput.trim()
        setMessageInput("")
        setIsSending(true)

        try {
            // If we have a selected ticket, send via support API
            if (selectedTicket) {
                const requestBody = {
                    action: "send_message",
                    ticket_id: selectedTicket.id,
                    sender_id: userId,
                    message: messageText,
                }
                
                console.log("Sending ticket message:", requestBody)
                
                const response = await fetch(SUPPORT_API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                })

                console.log("Send message response status:", response.status)

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error("Error sending message:", response.status, errorText)
                    let errorMessage = "Failed to send message"
                    try {
                        const errorData = JSON.parse(errorText)
                        errorMessage = errorData.error || errorData.message || errorMessage
                    } catch (e) {
                        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
                    }
                    throw new Error(errorMessage)
                }

                const data = await response.json()
                console.log("Send message response data:", data)

                if (data.success) {
                    // Mark ticket as in_progress since reply was sent
                    await updateTicketStatus(selectedTicket.id, "in_progress")
                    // Refresh messages
                    await fetchTicketMessages(selectedTicket.id)
                    // Refresh tickets list
                    await fetchSupportTickets()
                } else {
                    throw new Error(data.error || data.message || "Failed to send message")
                }
            }
        } catch (error) {
            console.error("Error sending message:", error)
            setMessageInput(messageText) // Restore message on error
            toast({
                title: "Error",
                description: error.message || "Failed to send message",
                variant: "destructive",
            })
        } finally {
            setIsSending(false)
        }
    }

    // Handle resolve ticket
    const handleResolveTicket = async () => {
        if (!userId || !selectedTicket) {
            return
        }

        try {
            const requestBody = {
                action: "update_status",
                ticket_id: selectedTicket.id,
                status: "resolved",
                admin_id: userId,
            }
            
            console.log("🔍 [handleResolveTicket] Resolving ticket:", requestBody)
            
            const response = await fetch(SUPPORT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(requestBody),
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error("🔍 [handleResolveTicket] Error:", response.status, errorText)
                let errorMessage = "Failed to resolve ticket"
                try {
                    const errorData = JSON.parse(errorText)
                    errorMessage = errorData.error || errorData.message || errorMessage
                } catch (e) {
                    errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
                }
                throw new Error(errorMessage)
            }

            const data = await response.json()
            console.log("🔍 [handleResolveTicket] Response:", data)

            if (data.success) {
                setSelectedTicket({ ...selectedTicket, status: "resolved" })
                await fetchSupportTickets()
                setIsResolveDialogOpen(false)
                // Switch to resolved tab
                setActiveTab("resolved")
                // Go back to user tickets view
                setViewMode("user-tickets")
                setSelectedTicket(null)
                toast({
                    title: "Ticket resolved",
                    description: "Conversation moved to the Resolved tab.",
                    duration: 4000,
                    style: TICKET_TOAST_STYLE,
                })
            } else {
                throw new Error(data.error || data.message || "Failed to resolve ticket")
            }
        } catch (error) {
            console.error("🔍 [handleResolveTicket] Error:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to resolve ticket. Please try again.",
                variant: "destructive",
            })
        }
    }


    // Handle user select (show user's tickets)
    const handleUserSelect = (user) => {
        setSelectedUser(user)
        setViewMode("user-tickets")
        setSelectedTicket(null)
        setMessages([])
        setMessageInput("")
    }

    // Handle ticket select (show conversation)
    const handleTicketSelect = async (ticket) => {
        console.log("🔍 [handleTicketSelect] Clicked ticket:", ticket)
        console.log("🔍 [handleTicketSelect] Ticket ID:", ticket.id)
        console.log("🔍 [handleTicketSelect] Ticket status:", ticket.status)
        
        // Update state with the ticket
        setSelectedTicket(ticket)
        setViewMode("conversation")
        setMessages([])
        setMessageInput("")
        if (ticket && userId) {
            fetchTicketMessages(ticket.id)
        }
    }
    
    // Get user initials from name
    const getUserInitials = (name) => {
        if (!name) return "U"
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
            return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
        }
        return name.charAt(0).toUpperCase() || "U"
    }

    // Handle back button
    const handleBack = () => {
        if (viewMode === "conversation") {
            // Go back to user tickets view
            setViewMode("user-tickets")
            setSelectedTicket(null)
            setMessages([])
            setMessageInput("")
        } else if (viewMode === "user-tickets") {
            // Go back to users list
            setViewMode("users")
            setSelectedUser(null)
            setSelectedTicket(null)
            setMessages([])
            setMessageInput("")
        }
    }

    // Handle open/close
    const handleToggle = () => {
        if (isOpen) {
            setIsOpen(false)
            setSelectedTicket(null)
            setSelectedUser(null)
            setViewMode("users")
            setMessages([])
        } else {
            setIsOpen(true)
            setSelectedTicket(null)
            setSelectedUser(null)
            setViewMode("users")
            if (userId) {
                fetchSupportTickets()
            } else {
                const checkUserId = setInterval(() => {
                    if (userId) {
                        clearInterval(checkUserId)
                        fetchSupportTickets()
                    }
                }, 500)
                setTimeout(() => clearInterval(checkUserId), 5000)
            }
        }
    }

    // Group tickets by user
    const groupTicketsByUser = (tickets) => {
        const userMap = new Map()
        
        tickets.forEach(ticket => {
            const userId = ticket.user_id
            const userName = ticket.user_name || ticket.user_email || 'Unknown User'
            const userEmail = ticket.user_email || ''
            
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    user_id: userId,
                    user_name: userName,
                    user_email: userEmail,
                    tickets: [],
                    activeTicketsCount: 0,
                    totalTicketsCount: 0,
                    latestTicketTime: null
                })
            }
            
            const userData = userMap.get(userId)
            userData.tickets.push(ticket)
            userData.totalTicketsCount++
            
            if (ticket.status === 'pending' || ticket.status === 'in_progress') {
                userData.activeTicketsCount++
            }
            
            // Track latest ticket time
            const ticketTime = new Date(ticket.last_message_at || ticket.created_at || 0)
            if (!userData.latestTicketTime || ticketTime > userData.latestTicketTime) {
                userData.latestTicketTime = ticketTime
            }
        })
        
        // Convert to array and sort by latest ticket time
        return Array.from(userMap.values()).sort((a, b) => {
            if (!a.latestTicketTime && !b.latestTicketTime) return 0
            if (!a.latestTicketTime) return 1
            if (!b.latestTicketTime) return -1
            return b.latestTicketTime - a.latestTicketTime
        })
    }

    // Filter and group users based on active tab
    const filteredUsers = () => {
        const filtered = supportTickets.filter((ticket) => {
            // Filter by active tab (all, in_progress, or resolved)
            if (activeTab === "pending" && ticket.status !== "pending") {
                return false
            }
            if (activeTab === "in_progress" && ticket.status !== "in_progress") {
                return false
            }
            if (activeTab === "resolved" && ticket.status !== "resolved") {
                return false
            }
            
            // Filter by search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                return (
                    ticket.ticket_number?.toLowerCase().includes(query) ||
                    ticket.user_name?.toLowerCase().includes(query) ||
                    ticket.user_email?.toLowerCase().includes(query) ||
                    ticket.subject?.toLowerCase().includes(query) ||
                    ticket.message?.toLowerCase().includes(query)
                )
            }
            
            return true
        })
        
        return groupTicketsByUser(filtered)
    }

    // Get user's tickets (filtered by active tab)
    const getUserTickets = () => {
        if (!selectedUser) return []
        
        const userTickets = supportTickets.filter(ticket => ticket.user_id === selectedUser.user_id)
        return userTickets.sort((a, b) => {
            const dateA = new Date(a.created_at || a.last_message_at || 0)
            const dateB = new Date(b.created_at || b.last_message_at || 0)
            return dateB - dateA
        })
    }

    // Initial load and periodic refresh
    useEffect(() => {
        if (!userId) return

        if (isOpen) {
            fetchSupportTickets()
            const interval = setInterval(() => {
                if (userId && isOpen) {
                    fetchSupportTickets()
                    if (selectedTicket) {
                        fetchTicketMessages(selectedTicket.id)
                    }
                }
            }, 10000)

            return () => clearInterval(interval)
        } else {
            fetchSupportTickets() // Fetch tickets when closed for count
            const interval = setInterval(() => {
                if (userId && !isOpen) {
                    fetchSupportTickets()
                }
            }, 30000)

            return () => clearInterval(interval)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, isOpen, selectedTicket?.id])

    // Handle Enter key to send message
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    // Format message time (Philippine time)
    const parsePHDate = (timestamp) => {
        if (!timestamp) return null
        let normalized = typeof timestamp === "string" ? timestamp.trim() : timestamp
        if (typeof normalized === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
            normalized = normalized.replace(" ", "T") + "+08:00"
        }
        if (typeof normalized === "string" && !normalized.endsWith("Z") && !normalized.includes("+")) {
            normalized = normalized + "+08:00"
        }
        const date = new Date(normalized)
        return isNaN(date.getTime()) ? null : date
    }

    const formatMessageTime = (timestamp) => {
        const date = parsePHDate(timestamp)
        if (!date) return ""

        const manilaNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }))
        const todayStr = manilaNow.toLocaleDateString("en-US", { timeZone: "Asia/Manila" })
        const yesterday = new Date(manilaNow)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toLocaleDateString("en-US", { timeZone: "Asia/Manila" })
        const messageDateStr = date.toLocaleDateString("en-US", { timeZone: "Asia/Manila" })

        const timeString = date.toLocaleTimeString("en-US", {
            timeZone: "Asia/Manila",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })

        if (messageDateStr === todayStr) {
            return timeString
        }
        if (messageDateStr === yesterdayStr) {
            return `Yesterday ${timeString}`
        }

        const dateString = date.toLocaleDateString("en-US", {
            timeZone: "Asia/Manila",
            month: "short",
            day: "numeric",
        })
        return `${dateString} ${timeString}`
    }


    // Get status badge
    const getStatusBadge = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
            in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
            resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        }
        const color = colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        const label = status?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Unknown"
        
        return (
            <Badge className={color} variant="outline" style={{ fontSize: '10px', padding: '2px 6px' }}>
                {label}
            </Badge>
        )
    }

    // Check if message is from admin
    const isAdminMessage = (message) => {
        return message.user_type_id === 1 || message.user_type_id === 2 || message.sender_type === 'admin' || message.sender_type === 'staff'
    }


    // Calculate total badge count (active tickets)
    const totalBadgeCount = ticketCount > 0 ? ticketCount : 0

    return (
        <>
            {/* Floating Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToggle()
                }}
                className={cn(
                    "fixed z-[100] flex items-center justify-center",
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-full",
                    "shadow-md transition-all duration-200 ease-in-out",
                    "bg-orange-500 hover:bg-orange-600",
                    "text-white hover:scale-105 active:scale-95",
                    "border-2 border-white dark:border-gray-800",
                    "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2",
                    "cursor-pointer select-none",
                    "mobile-safe-bottom",
                    "pointer-events-auto"
                )}
                style={{
                    bottom: '100px',
                    right: '24px',
                    zIndex: 100,
                    cursor: 'pointer',
                    pointerEvents: 'auto'
                }}
                aria-label="Support Tickets"
                title="Support Tickets"
            >
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
                {totalBadgeCount > 0 && (
                    <Badge
                        className={cn(
                            "absolute -top-1 -right-1 min-w-[18px] h-5 px-1.5 z-20",
                            "flex items-center justify-center",
                            "bg-red-500 text-white text-[10px] font-semibold",
                            "border-2 border-white dark:border-gray-800",
                            "rounded-full"
                        )}
                    >
                        {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
                    </Badge>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className={cn(
                        "fixed z-[100] transition-all duration-300 ease-in-out",
                        "w-[calc(100vw-1rem)] sm:w-[420px] h-[calc(100vh-4rem)] max-h-[90vh]",
                        "!bg-white dark:bg-gray-800 rounded-xl shadow-2xl",
                        "border-2 border-gray-300 dark:border-gray-700",
                        "flex flex-col overflow-hidden",
                        "max-w-full"
                    )}
                    style={{
                        bottom: '1rem',
                        right: '1rem',
                        top: 'auto',
                        zIndex: 100,
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500 to-orange-600 border-b border-orange-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
                                <MessageCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg text-white">
                                    Support Tickets
                                </h3>
                                {totalBadgeCount > 0 && (
                                    <Badge className="bg-white text-orange-600 hover:bg-orange-50 text-xs font-semibold px-2.5 py-1 shadow-sm">
                                        {totalBadgeCount} active
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white hover:bg-white/20 rounded-lg"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {viewMode === "conversation" && selectedTicket ? (
                        // Conversation View
                        <div className="flex flex-col h-full overflow-hidden min-h-0">
                            {/* Conversation Header */}
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleBack}
                                        className="h-8 w-8 p-0 hover:bg-gray-200 rounded-lg flex-shrink-0"
                                    >
                                        <ArrowLeft className="w-4 h-4 text-gray-600" />
                                    </Button>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                                {selectedTicket?.subject}
                                            </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {selectedTicket?.user_name || selectedTicket?.user_email || 'Unknown User'}
                                            </p>
                                        </div>
                                </div>
                                {selectedTicket && (
                                    <div className="flex items-center justify-between gap-2 mt-2">
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(selectedTicket.status)}
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {selectedTicket.ticket_number}
                                        </span>
                                        </div>
                                        {selectedTicket.status === 'in_progress' && (
                                            <Button
                                                onClick={() => setIsResolveDialogOpen(true)}
                                                className="h-7 text-xs bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
                                                size="sm"
                                            >
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                Mark as Resolved
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4 bg-gray-50 min-h-0">
                                {isLoadingMessages ? (
                                    <div className="flex items-center justify-center h-32">
                                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                                        <MessageCircle className="w-8 h-8 mb-2 text-gray-400" />
                                        <p className="text-sm">No messages yet</p>
                                        <p className="text-xs mt-1">Start the conversation</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map((message) => {
                                            const isAdmin = isAdminMessage(message)
                                            console.log("🔍 [Message Render] Rendering message:", {
                                                id: message.id,
                                                created_at: message.created_at,
                                                timestamp: message.timestamp,
                                                created_at_type: typeof message.created_at,
                                                formatted: formatMessageTime(message.created_at || message.timestamp),
                                                sender_name: message.sender_name,
                                                isAdmin: isAdmin
                                            })
                                            return (
                                                <div
                                                    key={message.id}
                                                    className={cn(
                                                        "flex gap-2",
                                                        isAdmin ? "justify-end" : "justify-start"
                                                    )}
                                                    onClick={() => {
                                                        console.log("🔍 [Message Click] Clicked on message:", message)
                                                        console.log("🔍 [Message Click] Message created_at raw:", message.created_at)
                                                        console.log("🔍 [Message Click] Message timestamp raw:", message.timestamp)
                                                        const testDate = new Date(message.created_at || message.timestamp)
                                                        console.log("🔍 [Message Click] Parsed Date object:", testDate)
                                                        console.log("🔍 [Message Click] UTC string:", testDate.toUTCString())
                                                        console.log("🔍 [Message Click] ISO string:", testDate.toISOString())
                                                        console.log("🔍 [Message Click] Local string:", testDate.toLocaleString())
                                                        console.log("🔍 [Message Click] PH string:", testDate.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                                                    }}
                                                >
                                                    {!isAdmin && selectedTicket && (
                                                        <Avatar className="w-7 h-7 flex-shrink-0">
                                                            <AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs">
                                                                {getUserInitials(selectedTicket.user_name || selectedTicket.user_email || '')}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <div
                                                        className={cn(
                                                            "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                                                            isAdmin
                                                                ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm"
                                                                : "bg-white text-gray-900 border border-gray-200 rounded-tl-sm"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "flex items-center gap-2 mb-1.5",
                                                            isAdmin ? "text-orange-50" : "text-gray-700"
                                                        )}>
                                                            <span className="text-xs font-semibold">
                                                                {isAdmin ? 'Support Team' : (message.sender_name || 'User')}
                                                            </span>
                                                        </div>
                                                        <p className={cn(
                                                            "text-sm whitespace-pre-wrap break-words leading-relaxed",
                                                            isAdmin ? "text-white" : "text-gray-800"
                                                        )}>
                                                            {message.message}
                                                        </p>
                                                        <div
                                                            className={cn(
                                                                "flex items-center gap-1 mt-2 text-xs",
                                                                isAdmin
                                                                    ? "text-orange-100"
                                                                    : "text-gray-500"
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                console.log("🔍 [Timestamp Click] Clicked timestamp for message:", message.id)
                                                                console.log("🔍 [Timestamp Click] Raw created_at:", message.created_at)
                                                                console.log("🔍 [Timestamp Click] Raw timestamp:", message.timestamp)
                                                                console.log("🔍 [Timestamp Click] Formatted result:", formatMessageTime(message.created_at || message.timestamp))
                                                            }}
                                                        >
                                                            <span>{formatMessageTime(message.created_at || message.timestamp)}</span>
                                                            {isAdmin && (
                                                                <span>
                                                                    {message.is_read ? (
                                                                        <CheckCheck className="w-3 h-3 inline" />
                                                                    ) : (
                                                                        <Check className="w-3 h-3 inline" />
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isAdmin && (
                                                        <Avatar className="w-7 h-7 flex-shrink-0">
                                                            <AvatarFallback className="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 text-xs">
                                                                A
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Message Input - Show for all non-resolved tickets */}
                            {selectedTicket && selectedTicket.status !== 'resolved' ? (
                            <div className="p-4 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white flex-shrink-0">
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <Input
                                            ref={messageInputRef}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Type your message..."
                                            className="w-full text-sm border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-lg px-4 py-2.5 bg-white"
                                            disabled={isSending}
                                        />
                                    </div>
                                    <Button
                                        onClick={sendMessage}
                                        disabled={!messageInput.trim() || isSending || !selectedTicket}
                                        size="default"
                                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl px-5 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" />
                                                Send
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            ) : selectedTicket && selectedTicket.status === 'resolved' ? (
                                <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                                        This ticket has been resolved. No further messages can be sent.
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : viewMode === "users" ? (
                        // Users List View
                        <div className="flex flex-col h-full overflow-hidden min-h-0">
                            {/* Filters */}
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2 flex-shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 h-9 text-sm"
                                    />
                                </div>
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="pending">Pending</TabsTrigger>
                                        <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                                        <TabsTrigger value="resolved">Resolved</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {/* Users List */}
                            <ScrollArea className="flex-1 min-h-0">
                                {!userId && !userIdLoadingTimeout ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 p-4">
                                        <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                                        <p className="text-xs opacity-75">Loading...</p>
                                    </div>
                                ) : isLoading ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 p-4">
                                        <Loader2 className="w-6 h-6 animate-spin text-orange-500 mb-2" />
                                        <p className="text-xs opacity-75">Loading...</p>
                                    </div>
                                ) : filteredUsers().length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 p-4">
                                        <User className="w-10 h-10 mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No users found</p>
                                        <p className="text-xs mt-2 opacity-75 text-center max-w-xs">
                                            {searchQuery
                                                ? "Try adjusting your search"
                                                : activeTab === "pending"
                                                    ? "No pending tickets"
                                                    : activeTab === "in_progress"
                                                        ? "No in-progress tickets"
                                                        : activeTab === "resolved"
                                                            ? "No resolved tickets"
                                                : "Support tickets will appear here"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-2 pb-3">
                                        {filteredUsers().map((user) => (
                                            <button
                                                key={`user-${user.user_id}`}
                                                onClick={() => handleUserSelect(user)}
                                                className={cn(
                                                    "w-full p-3 border-2 border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-md",
                                                    "transition-all text-left flex items-start gap-3 bg-white group",
                                                    user.activeTicketsCount > 0 && activeTab === "in_progress" && "bg-orange-50/50"
                                                )}
                                            >
                                                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 group-hover:from-orange-200 group-hover:to-orange-300 transition-colors flex-shrink-0">
                                                    <User className="w-4 h-4 text-orange-600" />
                                                </div>
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="flex items-center justify-between mb-1.5 gap-2">
                                                        <p className="font-semibold text-sm text-gray-900 truncate">
                                                            {user.user_name}
                                                        </p>
                                                        {user.activeTicketsCount > 0 && activeTab === "in_progress" && (
                                                            <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-xs px-1.5 py-0.5 flex-shrink-0">
                                                                {user.activeTicketsCount} active
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600 truncate mb-1.5">
                                                        {user.user_email}
                                                    </p>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-medium text-gray-700 truncate">
                                                            {user.totalTicketsCount} {user.totalTicketsCount === 1 ? 'ticket' : 'tickets'}
                                                        </span>
                                                        {user.latestTicketTime && (
                                                            <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                                                                Latest: {formatDistanceToNow(user.latestTicketTime, { addSuffix: true })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    ) : viewMode === "user-tickets" ? (
                        // User Tickets View
                        <div className="flex flex-col h-full">
                            {/* User Info Header */}
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                    onClick={handleBack}
                                        className="h-8 w-8 p-0 hover:bg-gray-200 rounded-lg flex-shrink-0"
                                    >
                                        <ArrowLeft className="w-4 h-4 text-gray-600" />
                                    </Button>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                            {selectedUser?.user_name || 'Unknown User'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {selectedUser?.user_email}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* User's Tickets List */}
                            <ScrollArea className="flex-1">
                                {getUserTickets().length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 p-4">
                                        <Ticket className="w-10 h-10 mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No tickets found</p>
                                        <p className="text-xs mt-2 opacity-75 text-center max-w-xs">
                                            {statusFilter !== "all"
                                                ? "Try adjusting the status filter"
                                                : "This user has no tickets"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {getUserTickets().map((ticket) => (
                                            <button
                                                key={`ticket-${ticket.id}`}
                                                onClick={() => handleTicketSelect(ticket)}
                                                className={cn(
                                                    "w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                                                    "transition-colors text-left flex items-start gap-3",
                                                    (ticket.status === 'pending' || ticket.status === 'in_progress') &&
                                                    "bg-orange-50 dark:bg-orange-900/10"
                                                )}
                                            >
                                                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                                    <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1 gap-2">
                                                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                                            {ticket.subject}
                                                        </p>
                                                        {getStatusBadge(ticket.status)}
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1">
                                                        {ticket.message}
                                                    </p>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {ticket.ticket_number}
                                                        </span>
                                                        {ticket.last_message_at && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                                {formatDistanceToNow(new Date(ticket.last_message_at), { addSuffix: true })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Resolve Confirmation Dialog */}
            <AlertDialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            Mark Ticket as Resolved
                        </AlertDialogTitle>
                        <AlertDialogDescription className="pt-2 space-y-2">
                            <p>
                                Are you sure you want to mark ticket <span className="font-semibold">#{selectedTicket?.ticket_number}</span> as resolved?
                            </p>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
                                <p className="text-sm text-orange-900 font-semibold mb-1">Warning:</p>
                                <p className="text-sm text-orange-800">
                                    Once resolved, this ticket will be moved to the "Resolved" tab and no further messages can be sent. This action cannot be undone.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResolveTicket}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Mark as Resolved
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default AdminChat
