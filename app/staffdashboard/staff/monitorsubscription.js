"use client"

import React, { useState, useEffect, useContext } from "react"
import axios from "axios"
// No UserContext available - will get userId from props
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import {
  Search,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Plus,
  User,
  CreditCard,
  Receipt,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  UserCircle,
  Eye,
} from "lucide-react"

const API_URL = "https://api.cnergy.site/monitor_subscription.php"

const SubscriptionMonitor = ({ userId }) => {
  // Helper function to normalize profile photo URLs
  const normalizeProfilePhotoUrl = (url) => {
    if (!url || typeof url !== 'string') return undefined

    try {
      // If it's already a full URL with serve_image.php, return as is
      if (url.includes('serve_image.php')) {
        return url
      }

      // If it's already a full HTTP/HTTPS URL, return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      }

      // If it's a relative path (uploads/profile/... or uploads%2Fprofile%2F...)
      if (url.startsWith('uploads/') || url.startsWith('uploads%2F')) {
        // Normalize the path - replace / with %2F
        const normalizedPath = url.replace(/\//g, '%2F')
        return `https://api.cnergy.site/serve_image.php?path=${normalizedPath}`
      }

      // If it's just a filename, assume it's in uploads/profile/
      if (url.match(/^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|gif|webp)$/i)) {
        const encodedPath = `uploads%2Fprofile%2F${encodeURIComponent(url)}`
        return `https://api.cnergy.site/serve_image.php?path=${encodedPath}`
      }

      return url
    } catch (error) {
      console.error('Error normalizing profile photo URL:', error)
      return undefined
    }
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("active")
  const [statusFilter, setStatusFilter] = useState("all")
  const [planFilter, setPlanFilter] = useState("all")
  const [subscriptionTypeFilter, setSubscriptionTypeFilter] = useState("all") // all, regular, guest
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [subscriptions, setSubscriptions] = useState([])
  const [pendingSubscriptions, setPendingSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [message, setMessage] = useState(null)

  // New states for manual subscription creation
  const [isCreateSubscriptionDialogOpen, setIsCreateSubscriptionDialogOpen] = useState(false)
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUserInfo, setSelectedUserInfo] = useState(null)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [userActiveDiscount, setUserActiveDiscount] = useState(null) // Track user's active discount
  const [userActiveSubscriptions, setUserActiveSubscriptions] = useState([]) // Track user's active subscriptions
  const [planQuantities, setPlanQuantities] = useState({}) // Object to store quantity per plan: { planId: quantity }
  const [subscriptionForm, setSubscriptionForm] = useState({
    user_id: "",
    selected_plan_ids: [], // Changed from plan_id to array
    start_date: new Date().toISOString().split("T")[0],
    discount_type: "none",
    amount_paid: "",
    payment_method: "cash",
    amount_received: "",
    notes: ""
  })

  // Pagination state for each tab
  const [currentPage, setCurrentPage] = useState({
    pending: 1,
    active: 1,
    upcoming: 1,
    expired: 1,
    cancelled: 1,
    all: 1
  })
  const [itemsPerPage] = useState(15) // 15 entries per page

  // Discount configuration - load from localStorage
  const [discountConfig, setDiscountConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gym-discounts')
      if (saved) {
        try {
          const discounts = JSON.parse(saved)
          const config = {}
          discounts.forEach((discount, index) => {
            // Use original keys for compatibility
            let key
            if (discount.name.toLowerCase().includes('regular')) {
              key = 'regular'
            } else if (discount.name.toLowerCase().includes('student')) {
              key = 'student'
            } else if (discount.name.toLowerCase().includes('senior')) {
              key = 'senior'
            } else {
              // For custom discounts, create a safe key
              key = discount.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            }

            config[key] = {
              name: discount.name,
              discount: discount.amount,
              description: discount.amount === 0 ? "No discount" : `${discount.name} - &#8369;${discount.amount} off`
            }
          })
          return config
        } catch (e) {
          console.error('Error parsing saved discounts:', e)
        }
      }
    }
    // Fallback to default discounts with original keys
    return {
      regular: { name: "Regular Rate", discount: 0, description: "No discount" },
      student: { name: "Student Discount", discount: 150, description: "Student discount - &#8369;150 off" },
      senior: { name: "Senior Discount", discount: 200, description: "Senior citizen discount - &#8369;200 off" }
    }
  })

  // Decline dialog state
  const [declineDialog, setDeclineDialog] = useState({
    open: false,
    subscription: null,
  })
  const [declineReason, setDeclineReason] = useState("")

  // POS state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [changeGiven, setChangeGiven] = useState(0)
  const [referenceNumber, setReferenceNumber] = useState("")
  const [receiptNumber, setReceiptNumber] = useState("")
  const [transactionNotes, setTransactionNotes] = useState("")
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [confirmationData, setConfirmationData] = useState(null)

  // Guest Session Creation State
  const [isCreateGuestSessionDialogOpen, setIsCreateGuestSessionDialogOpen] = useState(false)
  const [guestSessionForm, setGuestSessionForm] = useState({
    guest_name: "",
    payment_method: "cash",
    amount_received: "",
    gcash_reference: "",
    notes: ""
  })
  const [gymSessionPlan, setGymSessionPlan] = useState(null)
  const [guestSessionChangeGiven, setGuestSessionChangeGiven] = useState(0)
  const [guestSessionLoading, setGuestSessionLoading] = useState(false)
  const [showGuestReceipt, setShowGuestReceipt] = useState(false)
  const [lastGuestTransaction, setLastGuestTransaction] = useState(null)

  // Details Modal State
  const [viewDetailsModal, setViewDetailsModal] = useState({
    open: false,
    user: null,
    subscriptions: []
  })
  const [allUserSubscriptionHistory, setAllUserSubscriptionHistory] = useState([]) // Store all subscription history for the user in modal
  const [allUserSales, setAllUserSales] = useState([]) // Store all sales for the user in modal
  const [transactionHistoryPage, setTransactionHistoryPage] = useState(1) // Pagination for transaction history
  const [transactionHistoryPlanFilter, setTransactionHistoryPlanFilter] = useState("all") // Filter by plan
  const transactionsPerPage = 5 // Show 5 transactions per page

  // Fetch all sales for a user
  const fetchAllUserSales = async (userId) => {
    if (!userId) return []

    try {
      const response = await axios.get(`${API_URL}?action=get-user-sales&user_id=${userId}`)
      if (response.data && response.data.success) {
        const sales = response.data.sales || []
        setAllUserSales(sales)
        return sales
      }
      return []
    } catch (error) {
      console.error(`Error fetching all sales for user ${userId}:`, error)
      return []
    }
  }

  // Fetch all subscription history for a user (all plans)
  const fetchAllUserSubscriptionHistory = async (userId) => {
    if (!userId) return []

    try {
      // Get all unique plan IDs for this user from current subscriptions
      const userSubscriptions = viewDetailsModal.subscriptions || []
      const uniquePlanIds = [...new Set(userSubscriptions.map(sub => sub.plan_id).filter(Boolean))]

      // Fetch history for each plan
      const allHistory = []
      for (const planId of uniquePlanIds) {
        try {
          const response = await axios.get(`${API_URL}?action=get-subscription-history&user_id=${userId}&plan_id=${planId}`)
          if (response.data && response.data.success) {
            const subscriptions = response.data.subscriptions || []
            allHistory.push(...subscriptions)
          }
        } catch (error) {
          console.error(`Error fetching subscription history for user ${userId}, plan ${planId}:`, error)
        }
      }

      // Sort by start_date descending (most recent first)
      allHistory.sort((a, b) => {
        const dateA = new Date(a.start_date || 0)
        const dateB = new Date(b.start_date || 0)
        return dateB - dateA
      })

      setAllUserSubscriptionHistory(allHistory)
      return allHistory
    } catch (error) {
      console.error(`Error fetching all subscription history for user ${userId}:`, error)
      return []
    }
  }

  useEffect(() => {
    fetchAllData()
    fetchSubscriptionPlans()
    fetchAvailableUsers()
    fetchGymSessionPlan()

    // Check for navigation parameters from home page
    const navParams = localStorage.getItem('adminNavParams')
    if (navParams) {
      try {
        const params = JSON.parse(navParams)
        if (params.tab) {
          setActiveTab(params.tab)
        }
        // Clear the navigation params after using them
        localStorage.removeItem('adminNavParams')
        localStorage.removeItem('adminNavTarget')
      } catch (e) {
        console.error('Error parsing nav params:', e)
      }
    }
  }, [])

  // Fetch guest session sales
  const fetchGuestSessionSales = async (guestSessionId) => {
    if (!guestSessionId) return []

    try {
      const response = await axios.get(`${API_URL}?action=get-guest-sales&guest_session_id=${guestSessionId}`)
      if (response.data && response.data.success) {
        const sales = response.data.sales || []
        setAllUserSales(sales)
        return sales
      }
      return []
    } catch (error) {
      console.error(`Error fetching guest session sales for ${guestSessionId}:`, error)
      return []
    }
  }

  // Fetch history and sales when modal opens
  useEffect(() => {
    if (viewDetailsModal.open && viewDetailsModal.user) {
      if (viewDetailsModal.user.is_guest_session) {
        // For guest sessions, fetch sales by guest_session_id
        const guestSessionId = viewDetailsModal.user.id || viewDetailsModal.user.guest_session_id
        if (guestSessionId) {
          fetchGuestSessionSales(guestSessionId)
        }
      } else {
        // For regular users, fetch by user_id
        const userId = viewDetailsModal.user.user_id || viewDetailsModal.user.id
        if (userId) {
          fetchAllUserSubscriptionHistory(userId)
          fetchAllUserSales(userId)
        }
      }
    } else if (!viewDetailsModal.open) {
      setAllUserSubscriptionHistory([])
      setAllUserSales([])
    }
  }, [viewDetailsModal.open, viewDetailsModal.user])

  // Fetch Gym Session plan details
  const fetchGymSessionPlan = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=plans`)
      if (response.data.success && response.data.plans) {
        // Find Gym Session, Day Pass, or Walk In plan
        const gymPlan = response.data.plans.find(plan =>
          plan.plan_name?.toLowerCase() === 'gym session' ||
          plan.plan_name?.toLowerCase() === 'day pass' ||
          plan.plan_name?.toLowerCase() === 'walk in' ||
          plan.id === 6
        )
        if (gymPlan) {
          setGymSessionPlan(gymPlan)
        }
      }
    } catch (error) {
      console.error("Error fetching Gym Session plan:", error)
    }
  }

  // Calculate change for guest session
  useEffect(() => {
    if (guestSessionForm.amount_received && gymSessionPlan?.price) {
      const received = parseFloat(guestSessionForm.amount_received) || 0
      const price = parseFloat(gymSessionPlan.price) || 0
      setGuestSessionChangeGiven(Math.max(0, received - price))
    } else {
      setGuestSessionChangeGiven(0)
    }
  }, [guestSessionForm.amount_received, gymSessionPlan])

  // Calculate change when amount received changes
  useEffect(() => {
    if (amountReceived && subscriptionForm.amount_paid) {
      const received = parseFloat(amountReceived) || 0;
      const amount = parseFloat(subscriptionForm.amount_paid) || 0;
      setChangeGiven(received - amount);
    } else {
      setChangeGiven(0);
    }
  }, [amountReceived, subscriptionForm.amount_paid]);

  // Calculate discounted price
  const calculateDiscountedPrice = (originalPrice, discountType) => {
    const discount = discountConfig[discountType]?.discount || 0;
    return Math.max(0, originalPrice - discount);
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchSubscriptions(), fetchPendingSubscriptions()])
    } catch (error) {
      console.error("Error fetching data:", error)
      setMessage({ type: "error", text: "Failed to load subscription data" })
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(API_URL)
      if (response.data.success && Array.isArray(response.data.subscriptions)) {
        console.log("🔍 DEBUG - All subscriptions received:", response.data.subscriptions.length)
        if (response.data.subscriptions.length > 0) {
          const firstSub = response.data.subscriptions[0]
          console.log("🔍 DEBUG - First subscription:")
          console.log("  - ID:", firstSub.id)
          console.log("  - created_at:", firstSub.created_at)
          console.log("  - start_date:", firstSub.start_date)
          console.log("  - end_date:", firstSub.end_date)
          console.log("  - plan_name:", firstSub.plan_name)
          console.log("  - status_name:", firstSub.status_name)
          console.log("  - Full object:", firstSub)
        }
        // Sort by subscription ID descending (newest first) - IDs are auto-incrementing so higher ID = newer
        // Use created_at as secondary sort for consistency
        const sortedSubscriptions = [...response.data.subscriptions].sort((a, b) => {
          // Primary sort: by created_at descending (newest first)
          // This ensures guest sessions and subscriptions are sorted by actual creation time
          const dateA = new Date(a.created_at || a.start_date || '1970-01-01').getTime()
          const dateB = new Date(b.created_at || b.start_date || '1970-01-01').getTime()

          if (dateB !== dateA) {
            return dateB - dateA
          }

          // Secondary sort: by ID descending (higher ID = newer)
          // Extract numeric ID (handle guest_ prefix and guest_session_id)
          let idA = 0
          let idB = 0

          // For guest sessions, use guest_session_id (the actual database ID)
          if (a.is_guest_session || a.subscription_type === 'guest') {
            idA = a.guest_session_id ? parseInt(a.guest_session_id) : (a.id && typeof a.id === 'string' && a.id.startsWith('guest_') ? parseInt(a.id.replace('guest_', '')) : 0)
          } else {
            idA = isNaN(parseInt(a.id)) ? parseInt(a.id?.toString().replace('guest_', '') || '0') : parseInt(a.id)
          }

          if (b.is_guest_session || b.subscription_type === 'guest') {
            idB = b.guest_session_id ? parseInt(b.guest_session_id) : (b.id && typeof b.id === 'string' && b.id.startsWith('guest_') ? parseInt(b.id.replace('guest_', '')) : 0)
          } else {
            idB = isNaN(parseInt(b.id)) ? parseInt(b.id?.toString().replace('guest_', '') || '0') : parseInt(b.id)
          }

          return idB - idA
        })
        setSubscriptions(sortedSubscriptions)
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    }
  }

  const fetchPendingSubscriptions = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=pending`)
      if (response.data.success) {
        console.log("🔍 DEBUG - Pending subscriptions received:", response.data.data?.length || 0)
        if (response.data.data && response.data.data.length > 0) {
          const firstPending = response.data.data[0]
          console.log("🔍 DEBUG - First pending subscription:")
          console.log("  - Subscription ID:", firstPending.subscription_id)
          console.log("  - created_at:", firstPending.created_at)
          console.log("  - start_date:", firstPending.start_date)
          console.log("  - end_date:", firstPending.end_date)
          console.log("  - plan_name:", firstPending.plan_name)
          console.log("  - status_name:", firstPending.status_name)
          console.log("  - Full object:", firstPending)
        }
        setPendingSubscriptions(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching pending subscriptions:", error)
    }
  }

  const fetchSubscriptionPlans = async () => {
    try {
      console.log("=== FETCHING SUBSCRIPTION PLANS ===");
      const response = await axios.get(`${API_URL}?action=plans`)
      console.log("Subscription plans API response:", response.data);
      if (response.data.success) {
        setSubscriptionPlans(response.data.plans)
        console.log("âœ… Successfully set subscription plans:", response.data.plans)
      } else {
        console.error("âŒ Failed to fetch subscription plans:", response.data)
        setMessage({ type: "error", text: "Failed to load subscription plans" })
      }
    } catch (error) {
      console.error("âŒ Error fetching subscription plans:", error)
      setMessage({ type: "error", text: "Failed to load subscription plans" })
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=users`)
      if (response.data.success) {
        setAvailableUsers(response.data.users)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const fetchAvailablePlansForUser = async (userId) => {
    try {
      const apiUrl = `${API_URL}?action=available-plans&user_id=${userId}`
      console.log("Making API call to:", apiUrl)
      console.log("API_URL constant:", API_URL)

      const response = await axios.get(apiUrl)

      console.log("=== FULL API RESPONSE ===")
      console.log("Response status:", response.status)
      console.log("Response data:", response.data)
      console.log("Response data type:", typeof response.data)
      console.log("Response data keys:", Object.keys(response.data || {}))

      // Check if response.data exists and has the expected structure
      if (response.data && response.data.success) {
        console.log("âœ… API call successful")
        console.log("Available plans:", response.data.plans)
        console.log("Active subscriptions:", response.data.active_subscriptions)
        console.log("Has active member fee:", response.data.has_active_member_fee)
        console.log("Active plan IDs:", response.data.active_plan_ids)

        setSubscriptionPlans(response.data.plans || [])
        // Store active subscriptions for display
        setUserActiveSubscriptions(response.data.active_subscriptions || [])
        return {
          availablePlans: response.data.plans || [],
          existingSubscriptions: response.data.active_subscriptions || [],
          hasActiveMemberFee: response.data.has_active_member_fee || false
        }
      } else {
        console.error("âŒ API response not successful or no data:", response.data)
        setSubscriptionPlans([])
        return {
          availablePlans: [],
          existingSubscriptions: [],
          hasActiveMemberFee: false
        }
      }
    } catch (error) {
      console.error("âŒ Error fetching available plans:", error)
      console.error("Error message:", error.message)
      console.error("Error response:", error.response)
      if (error.response) {
        console.error("Error response data:", error.response.data)
        console.error("Error response status:", error.response.status)
      }
      setSubscriptionPlans([])
      return {
        availablePlans: [],
        existingSubscriptions: [],
        hasActiveMemberFee: false
      }
    }
  }

  const handleApprove = async (subscriptionId) => {
    console.log("=== HANDLE APPROVE DEBUG ===");
    console.log("Subscription ID:", subscriptionId);

    // Store the subscription ID for later use
    setCurrentSubscriptionId(subscriptionId);

    // Auto-generate receipt number with format SUB202509284924
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const autoReceiptNumber = `SUB${year}${month}${day}${hour}${minute}`;

    // Reset POS fields
    setPaymentMethod("cash");
    setAmountReceived("");
    setChangeGiven(0);
    setReceiptNumber(autoReceiptNumber);
    setTransactionNotes("");

    // Set up basic form data - we'll fetch the full details when the modal opens
    setSubscriptionForm({
      user_id: "",
      plan_id: "",
      start_date: new Date().toISOString().split("T")[0],
      discount_type: "none",
      amount_paid: "",
      payment_method: "cash",
      amount_received: "",
      notes: ""
    });

    // Show POS dialog immediately - let the modal handle fetching the data
    setIsCreateSubscriptionDialogOpen(true);
  }

  // Fetch subscription details for the POS modal
  const fetchSubscriptionDetails = async (subscriptionId) => {
    try {
      console.log("Fetching subscription details for ID:", subscriptionId);
      const response = await axios.get(`${API_URL}?action=get-subscription&id=${subscriptionId}`);

      if (response.data.success && response.data.subscription) {
        const sub = response.data.subscription;
        console.log("Fetched subscription details:", sub);

        // Update the form with the fetched data
        setSubscriptionForm(prev => ({
          ...prev,
          user_id: sub.user_id,
          plan_id: sub.plan_id,
          plan_name: sub.plan_name,
          amount_paid: sub.amount_paid || sub.price || "0"
        }));

        console.log("Updated subscription form:", {
          user_id: sub.user_id,
          plan_id: sub.plan_id,
          plan_name: sub.plan_name,
          amount_paid: sub.amount_paid || sub.price || "0"
        });

        // Set user info for display
        setSelectedUserInfo({
          fname: sub.fname,
          lname: sub.lname,
          email: sub.email
        });

        return sub;
      } else {
        console.error("Failed to fetch subscription details:", response.data);
        return null;
      }
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      return null;
    }
  }

  const handleDecline = async () => {
    if (!declineDialog.subscription) return
    setActionLoading(declineDialog.subscription.subscription_id)
    setMessage(null)
    try {
      const response = await axios.post(`${API_URL}?action=decline`, {
        subscription_id: declineDialog.subscription.subscription_id,
        declined_by: "Admin",
        decline_reason: declineReason,
        staff_id: userId
      })
      if (response.data.success) {
        setMessage({ type: "success", text: response.data.message })
        setDeclineDialog({ open: false, subscription: null })
        setDeclineReason("")
        await fetchAllData()
      } else {
        setMessage({ type: "error", text: response.data.message })
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to decline subscription"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateManualSubscription = async () => {
    setMessage(null)

    if (!userId) {
      setMessage({ type: "error", text: "User session not found. Please log in again." })
      return
    }

    try {
      console.log("=== PROCESS PAYMENT BUTTON CLICKED ===");
      console.log("Current subscription form:", subscriptionForm);
      console.log("Payment method:", paymentMethod);
      console.log("Amount received:", amountReceived);
      console.log("Current subscription ID:", currentSubscriptionId);
      console.log("Current user ID:", userId);
      console.log("User ID type:", typeof userId);
      console.log("User ID is null/undefined:", userId === null || userId === undefined);

      const totalAmount = parseFloat(subscriptionForm.amount_paid)
      const receivedAmount = parseFloat(amountReceived) || totalAmount

      if (paymentMethod === "cash" && receivedAmount < totalAmount) {
        setMessage({
          type: "error",
          text: `Insufficient Payment: Amount received (â‚±${receivedAmount.toFixed(2)}) is less than required amount (â‚±${totalAmount.toFixed(2)}). Please collect â‚±${(totalAmount - receivedAmount).toFixed(2)} more.`
        })
        return
      }

      if (currentSubscriptionId) {
        // Approve existing subscription
        await confirmSubscriptionTransaction()
      } else {
        // Create new manual subscription
        await createNewManualSubscription()
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create subscription"
      setMessage({ type: "error", text: errorMessage })
    }
  }

  const createNewManualSubscription = async () => {
    setActionLoading("create")
    setMessage(null)

    // Validate that at least one plan is selected
    if (!subscriptionForm.selected_plan_ids || subscriptionForm.selected_plan_ids.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one plan."
      })
      setActionLoading(null)
      return
    }

    // Ensure userId is available
    let currentUserId = userId
    if (!currentUserId) {
      // Try to get from sessionStorage as fallback
      const storedUserId = sessionStorage.getItem("user_id")
      if (storedUserId) {
        currentUserId = parseInt(storedUserId)
        console.log("Using user_id from sessionStorage:", currentUserId)
      } else {
        setMessage({
          type: "error",
          text: "User session not found. Please refresh the page and try again. If the problem persists, please log out and log back in."
        })
        setActionLoading(null)
        return
      }
    }

    try {
      const totalAmount = parseFloat(subscriptionForm.amount_paid)
      const receivedAmount = parseFloat(amountReceived) || totalAmount
      const change = Math.max(0, receivedAmount - totalAmount)

      // CRITICAL: Validate payment before creating subscription
      if (totalAmount <= 0) {
        setMessage({
          type: "error",
          text: "Invalid payment amount. Amount must be greater than 0."
        })
        return
      }

      if (paymentMethod === "cash" && receivedAmount < totalAmount) {
        setMessage({
          type: "error",
          text: `Insufficient Payment: Amount received (₱${receivedAmount.toFixed(2)}) is less than required amount (₱${totalAmount.toFixed(2)}). Please collect ₱${(totalAmount - receivedAmount).toFixed(2)} more.`
        })
        return
      }

      // Auto-generate base receipt number (will be made unique for each subscription)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      const baseReceiptNumber = `SUB${year}${month}${day}${hour}${minute}`;

      // Create subscriptions for each selected plan
      // First, calculate total expected amount and payment distribution
      let totalExpectedAmount = 0
      const planDataArray = subscriptionForm.selected_plan_ids.map((planIdStr) => {
        const planId = parseInt(planIdStr)
        if (isNaN(planId) || planId <= 0) {
          throw new Error(`Invalid plan ID: ${planIdStr}`)
        }

        const quantity = planQuantities[planIdStr] || 1
        if (quantity <= 0) {
          throw new Error(`Invalid quantity for plan ${planIdStr}: ${quantity}`)
        }

        // Calculate price for this specific plan
        const plan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
        if (!plan) {
          throw new Error(`Plan not found: ${planIdStr}`)
        }
        let planPrice = parseFloat(plan?.price || 0)
        if (isNaN(planPrice) || planPrice <= 0) {
          throw new Error(`Invalid price for plan ${planIdStr}: ${planPrice}`)
        }

        // Apply discount if applicable
        let discountType = subscriptionForm.discount_type || "none"
        if ((planId == 2 || planId == 3 || planId == 5) && userActiveDiscount) {
          discountType = userActiveDiscount
          planPrice = calculateDiscountedPrice(planPrice, discountType)
        }

        const planTotalPrice = planPrice * quantity
        totalExpectedAmount += planTotalPrice

        return {
          planId,
          planIdStr,
          quantity,
          planTotalPrice,
          discountType
        }
      })

      // Distribute payment proportionally across subscriptions
      const subscriptionPromises = planDataArray.map(async (planData, index) => {
        const { planId, planIdStr, quantity, planTotalPrice, discountType } = planData

        // Generate unique receipt number for each subscription
        // Add seconds, milliseconds, and index to ensure uniqueness
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
        const uniqueReceiptNumber = `${baseReceiptNumber}${seconds}${milliseconds}${String(index + 1).padStart(2, '0')}`;

        // Calculate proportional amount received for this plan
        let amountReceivedForPlan = planTotalPrice
        let changeForPlan = 0

        if (paymentMethod === 'cash') {
          // Distribute amount_received proportionally
          const proportion = planTotalPrice / totalExpectedAmount
          amountReceivedForPlan = receivedAmount * proportion

          // Apply all change to the first subscription
          if (index === 0) {
            changeForPlan = change
            // Adjust amount_received to account for change
            amountReceivedForPlan = planTotalPrice + change
          }
        } else {
          // For GCash, amount received equals amount paid (no change)
          amountReceivedForPlan = planTotalPrice
        }

        // Validate required fields before creating request
        if (!subscriptionForm.user_id || !subscriptionForm.start_date) {
          throw new Error(`Missing required fields: user_id=${subscriptionForm.user_id}, start_date=${subscriptionForm.start_date}`)
        }

        // Ensure all values are properly set (not null/undefined)
        const requestData = {
          user_id: String(subscriptionForm.user_id || '').trim(),
          plan_id: parseInt(planId),
          start_date: String(subscriptionForm.start_date || '').trim(),
          amount_paid: String(planTotalPrice.toFixed(2)), // Keep as string
          quantity: parseInt(quantity) || 1,
          payment_method: String(paymentMethod || 'cash'),
          amount_received: String(amountReceivedForPlan.toFixed(2)),
          change_given: String(changeForPlan.toFixed(2)),
          receipt_number: uniqueReceiptNumber,
          reference_number: paymentMethod === "gcash" ? (String(referenceNumber || '').trim() || null) : null,
          notes: String(subscriptionForm.notes || ''),
          created_by: "Admin",
          staff_id: parseInt(currentUserId) || null,
          transaction_status: "confirmed",
          discount_type: String(discountType || "none")
        };

        // Double-check required fields are not empty
        if (!requestData.user_id || requestData.user_id === '') {
          throw new Error(`user_id is required but got: "${subscriptionForm.user_id}"`)
        }
        if (!requestData.plan_id || isNaN(requestData.plan_id)) {
          throw new Error(`plan_id is required but got: "${planId}"`)
        }
        if (!requestData.start_date || requestData.start_date === '') {
          throw new Error(`start_date is required but got: "${subscriptionForm.start_date}"`)
        }
        if (!requestData.amount_paid || requestData.amount_paid === '' || parseFloat(requestData.amount_paid) <= 0) {
          throw new Error(`amount_paid is required and must be > 0 but got: "${planTotalPrice}"`)
        }

        console.log(`Creating subscription ${index + 1}/${planDataArray.length}:`, JSON.stringify(requestData, null, 2));

        // Validate all required fields are present and not empty
        const requiredFields = ['user_id', 'plan_id', 'start_date', 'amount_paid'];
        const missingFields = requiredFields.filter(field => !requestData[field] || requestData[field] === '');
        if (missingFields.length > 0) {
          console.error(`Missing required fields for subscription ${index + 1}:`, missingFields);
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        return axios.post(`${API_URL}?action=create_manual`, requestData).catch(error => {
          console.error(`=== Error creating subscription ${index + 1} ===`);
          console.error("Status:", error?.response?.status);
          console.error("Status Text:", error?.response?.statusText);
          console.error("Response Data:", JSON.stringify(error?.response?.data, null, 2));
          console.error("Request Data:", JSON.stringify(requestData, null, 2));
          if (error?.response?.data?.error) {
            console.error("Backend Error:", error.response.data.error);
          }
          if (error?.response?.data?.message) {
            console.error("Backend Message:", error.response.data.message);
          }
          console.error("=====================================");
          throw error;
        });
      });

      console.log("Creating multiple subscriptions:", planDataArray.length);

      const responses = await Promise.allSettled(subscriptionPromises);

      // Check for any failures
      const failures = responses.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && (!r.value?.data || !r.value.data.success)));

      if (failures.length > 0) {
        console.error("Subscription creation failures:", failures);
        const errorMessages = failures.map((f, idx) => {
          let errorMsg = "Unknown error";
          let errorDetails = null;

          if (f.status === 'rejected') {
            const error = f.reason;
            errorDetails = {
              error: error,
              response: error?.response,
              responseData: error?.response?.data,
              status: error?.response?.status,
              statusText: error?.response?.statusText
            };

            errorMsg = error?.response?.data?.error ||
              error?.response?.data?.message ||
              error?.message ||
              (error?.response?.status ? `HTTP ${error.response.status}: ${error.response.statusText || 'Bad Request'}` : '') ||
              "Unknown error";

            // Log detailed error information
            console.error(`=== Subscription ${idx + 1} Failed ===`);
            console.error("Error Message:", errorMsg);
            console.error("Request Data:", JSON.stringify(planDataArray[idx], null, 2));
            console.error("Response Status:", error?.response?.status);
            console.error("Response Data:", JSON.stringify(error?.response?.data, null, 2));
            console.error("Response Headers:", error?.response?.headers);
            if (error?.response?.data?.error) {
              console.error("Backend Error:", error.response.data.error);
            }
            if (error?.response?.data?.message) {
              console.error("Backend Message:", error.response.data.message);
            }
            console.error("Full Error Object:", error);
            console.error("================================");
          } else {
            // Fulfilled but API returned error
            errorDetails = {
              response: f.value?.data,
              success: f.value?.data?.success
            };

            errorMsg = f.value?.data?.error || f.value?.data?.message || "API returned error";

            console.error(`Subscription ${idx + 1} failed (API error):`, {
              error: errorMsg,
              errorDetails: errorDetails,
              request: planDataArray[idx],
              fullResponse: f.value
            });
          }
          return errorMsg;
        });
        throw new Error(`Failed to create ${failures.length} subscription(s): ${errorMessages.join(", ")}`);
      }

      // All succeeded
      const allSuccess = true;

      // Extract successful responses
      const successfulResponses = responses.filter(r => r.status === 'fulfilled' && r.value?.data?.success);

      if (successfulResponses.length === 0) {
        throw new Error("All subscription creation requests failed");
      }

      // Use the first successful response for confirmation data
      const response = successfulResponses[0].value;

      console.log("Response received:", response.data);
      if (response.data.data) {
        console.log("Response payment_method:", response.data.data.payment_method);
      }

      if (allSuccess) {
        // Use the first response for confirmation data, but include count of subscriptions
        const confirmationData = {
          ...response.data.data,
          change_given: change,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          amount_received: receivedAmount,
          receipt_number: response.data.data.receipt_number,
          reference_number: paymentMethod === "gcash" ? referenceNumber : null,
          subscription_count: planDataArray.length
        };

        setConfirmationData(confirmationData);
        setShowConfirmationModal(true);
      } else {
        throw new Error("Failed to create one or more subscriptions");
      }

      setIsCreateSubscriptionDialogOpen(false)
      resetSubscriptionForm()
      await fetchAllData()

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create manual subscription"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  // Create Guest Session Handler
  const handleCreateGuestSession = async () => {
    if (!guestSessionForm.guest_name || !gymSessionPlan) {
      setMessage({
        type: "error",
        text: "Please fill in the guest name"
      })
      return
    }

    const totalAmount = parseFloat(gymSessionPlan.price) || 0
    const receivedAmount = parseFloat(guestSessionForm.amount_received) || totalAmount

    if (guestSessionForm.payment_method === "cash" && receivedAmount < totalAmount) {
      setMessage({
        type: "error",
        text: `Insufficient Payment: Amount received (₱${receivedAmount.toFixed(2)}) is less than required amount (₱${totalAmount.toFixed(2)}). Please collect ₱${(totalAmount - receivedAmount).toFixed(2)} more.`
      })
      return
    }

    setGuestSessionLoading(true)
    setMessage(null)

    try {
      // Get current user ID
      let currentUserId = userId
      if (!currentUserId) {
        const storedUserId = sessionStorage.getItem("user_id")
        if (storedUserId) {
          currentUserId = parseInt(storedUserId)
        }
      }

      const change = Math.max(0, receivedAmount - totalAmount)

      // Keep payment method as is (cash or digital for GCash)
      const apiPaymentMethod = guestSessionForm.payment_method

      // Call guest session API
      const response = await axios.post('https://api.cnergy.site/guest_session_admin.php', {
        action: 'create_guest_session',
        guest_name: guestSessionForm.guest_name,
        guest_type: 'walkin',
        staff_id: currentUserId,
        amount_paid: totalAmount,
        payment_method: apiPaymentMethod,
        amount_received: receivedAmount,
        gcash_reference: (apiPaymentMethod === "gcash" || apiPaymentMethod === "digital") ? (guestSessionForm.gcash_reference || "") : "",
        reference_number: (apiPaymentMethod === "gcash" || apiPaymentMethod === "digital") ? (guestSessionForm.gcash_reference || "") : null,
        notes: guestSessionForm.notes || ""
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      if (response.data.success) {
        const transactionData = {
          ...response.data,
          change_given: change,
          total_amount: totalAmount,
          payment_method: guestSessionForm.payment_method,
          amount_received: receivedAmount,
          guest_name: guestSessionForm.guest_name,
          reference_number: response.data.reference_number || guestSessionForm.gcash_reference || null
        }

        setLastGuestTransaction(transactionData)
        setShowGuestReceipt(true)

        // Reset form and close dialog
        setGuestSessionForm({
          guest_name: "",
          payment_method: "cash",
          amount_received: "",
          gcash_reference: "",
          notes: ""
        })
        setIsCreateGuestSessionDialogOpen(false)
        await fetchAllData()
      } else {
        throw new Error(response.data.message || "Failed to create guest session")
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create guest session"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setGuestSessionLoading(false)
    }
  }

  const confirmSubscriptionTransaction = async () => {
    setShowConfirmDialog(false)
    setActionLoading("create")
    setMessage(null)
    try {
      const selectedPlan = subscriptionPlans && Array.isArray(subscriptionPlans) ? subscriptionPlans.find((plan) => plan.id == subscriptionForm.plan_id) : null
      const totalAmount = parseFloat(subscriptionForm.amount_paid)
      const receivedAmount = parseFloat(amountReceived) || totalAmount
      const change = Math.max(0, receivedAmount - totalAmount)

      // Use the stored subscription ID
      if (!currentSubscriptionId) {
        setMessage({ type: "error", text: "No subscription selected for approval" });
        return;
      }

      // CRITICAL: Validate payment before approving subscription
      if (totalAmount <= 0) {
        setMessage({
          type: "error",
          text: "Invalid payment amount. Amount must be greater than 0."
        })
        return
      }

      if (paymentMethod === "cash" && receivedAmount < totalAmount) {
        setMessage({
          type: "error",
          text: `Insufficient Payment: Amount received (₱${receivedAmount.toFixed(2)}) is less than required amount (₱${totalAmount.toFixed(2)}). Please collect ₱${(totalAmount - receivedAmount).toFixed(2)} more.`
        })
        return
      }

      // Process payment and approve the existing subscription
      const response = await axios.post(`${API_URL}?action=approve_with_payment`, {
        subscription_id: currentSubscriptionId,
        payment_method: paymentMethod,
        amount_received: receivedAmount,
        notes: "",
        receipt_number: receiptNumber || undefined,
        approved_by: "Admin",
        staff_id: userId,
        transaction_status: "confirmed" // CRITICAL: Mark transaction as confirmed
      });

      if (response.data.success) {
        const confirmationData = {
          ...response.data.data,
          change_given: change,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          amount_received: receivedAmount,
          receipt_number: response.data.receipt_number,
          is_approval: true
        };

        setConfirmationData(confirmationData);
        setShowConfirmationModal(true);
        setMessage({ type: "success", text: "Subscription approved and POS payment processed successfully!" });
      } else {
        throw new Error(response.data.message || "Failed to approve subscription with payment");
      }

      setIsCreateSubscriptionDialogOpen(false)
      resetSubscriptionForm()
      await fetchAllData()

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to process subscription payment"
      setMessage({ type: "error", text: errorMessage })
    } finally {
      setActionLoading(null)
    }
  }

  const resetSubscriptionForm = () => {
    setSubscriptionForm({
      user_id: "",
      selected_plan_ids: [],
      start_date: new Date().toISOString().split("T")[0],
      discount_type: "none",
      amount_paid: "",
      payment_method: "cash",
      amount_received: "",
      notes: ""
    })
    setSelectedUserInfo(null)
    setUserSearchQuery("")
    setShowUserDropdown(false)
    setUserActiveDiscount(null)
    setPlanQuantities({})
    // Reset to all plans
    fetchSubscriptionPlans()
  }

  // Handle plan selection (toggle) for multiple plans
  const handlePlanToggle = (planId) => {
    const planIdStr = planId.toString()
    setSubscriptionForm(prev => {
      const currentPlans = prev.selected_plan_ids || []
      const isSelected = currentPlans.includes(planIdStr)

      let newPlans
      if (isSelected) {
        // Remove plan
        newPlans = currentPlans.filter(id => id !== planIdStr)
        // Remove quantity for this plan
        setPlanQuantities(prevQty => {
          const newQty = { ...prevQty }
          delete newQty[planIdStr]
          return newQty
        })
      } else {
        // Add plan
        newPlans = [...currentPlans, planIdStr]
        // Set default quantity to 1 for this plan
        setPlanQuantities(prevQty => ({
          ...prevQty,
          [planIdStr]: 1
        }))
      }

      // Calculate total price for all selected plans
      let totalPrice = 0
      newPlans.forEach(selectedPlanId => {
        const plan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
        if (plan) {
          const basePrice = parseFloat(plan.price || 0)
          const quantity = planQuantities[selectedPlanId] || (selectedPlanId === planIdStr ? 1 : (planQuantities[selectedPlanId] || 1))

          let pricePerUnit = basePrice
          // Apply discount if applicable
          let discountType = prev.discount_type || "none"
          if ((selectedPlanId == 2 || selectedPlanId == 3 || selectedPlanId == 5) && userActiveDiscount) {
            discountType = userActiveDiscount
            pricePerUnit = calculateDiscountedPrice(basePrice, discountType)
          }

          totalPrice += pricePerUnit * quantity
        }
      })

      return {
        ...prev,
        selected_plan_ids: newPlans,
        amount_paid: totalPrice.toFixed(2)
      }
    })
  }

  // Handle quantity change for a specific plan
  const handleQuantityChange = (planId, value) => {
    const quantity = Math.max(1, parseInt(value) || 1)
    const planIdStr = planId.toString()

    setPlanQuantities(prev => ({
      ...prev,
      [planIdStr]: quantity
    }))

    // Recalculate total price
    setSubscriptionForm(prev => {
      let totalPrice = 0
      prev.selected_plan_ids.forEach(selectedPlanId => {
        const plan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
        if (plan) {
          const basePrice = parseFloat(plan.price || 0)
          const qty = selectedPlanId === planIdStr ? quantity : (planQuantities[selectedPlanId] || 1)

          let pricePerUnit = basePrice
          // Apply discount if applicable
          let discountType = prev.discount_type || "none"
          if ((selectedPlanId == 2 || selectedPlanId == 3 || selectedPlanId == 5) && userActiveDiscount) {
            discountType = userActiveDiscount
            pricePerUnit = calculateDiscountedPrice(basePrice, discountType)
          }

          totalPrice += pricePerUnit * qty
        }
      })

      return {
        ...prev,
        amount_paid: totalPrice.toFixed(2)
      }
    })
  }


  // Fetch user's active discount eligibility
  const fetchUserDiscount = async (userId) => {
    try {
      const response = await fetch(`https://api.cnergy.site/user_discount.php?action=get_active&user_id=${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user discount')
      const result = await response.json()
      if (result.success && result.discount_type) {
        setUserActiveDiscount(result.discount_type)
        return result.discount_type
      } else {
        setUserActiveDiscount(null)
        return null
      }
    } catch (error) {
      console.error('Error fetching user discount:', error)
      setUserActiveDiscount(null)
      return null
    }
  }

  const handleUserSelection = async (userId) => {
    try {
      setSubscriptionForm((prev) => ({
        ...prev,
        user_id: userId,
        selected_plan_ids: [], // Reset plan selection
        discount_type: "none", // Reset discount
        amount_paid: "", // Reset amount
      }))
      setUserActiveDiscount(null) // Reset discount
      setUserActiveSubscriptions([]) // Reset active subscriptions
      setPlanQuantities({}) // Reset quantities

      if (userId) {
        // Find the user from availableUsers array
        const user = availableUsers.find(u => u.id.toString() === userId.toString())
        if (user) {
          setSelectedUserInfo(user)
          // Update search query to show selected user's name
          setUserSearchQuery(`${user.fname || ''} ${user.lname || ''}`.trim())
        } else {
          // If user not found in availableUsers, try to fetch it
          setSelectedUserInfo(null)
          setUserSearchQuery("")
        }

        // Fetch user's active discount
        await fetchUserDiscount(userId)

        // Fetch available plans for the user
        await fetchAvailablePlansForUser(userId)
      } else {
        setSelectedUserInfo(null)
        setUserSearchQuery("")
        setUserActiveDiscount(null)
        setUserActiveSubscriptions([])
        // Reset to all plans if no user selected
        fetchSubscriptionPlans()
      }
    } catch (error) {
      console.error("Error in handleUserSelection:", error)
      setSelectedUserInfo(null)
      setUserSearchQuery("")
      setUserActiveDiscount(null)
      setMessage({ type: "error", text: "Failed to load user information" })
    }
  }

  // POS Functions
  const calculateChange = () => {
    const total = parseFloat(subscriptionForm.amount_paid) || 0
    const received = parseFloat(subscriptionForm.amount_received) || 0
    const change = Math.max(0, received - total)
    setChangeGiven(change)
    return change
  }

  // Calculate change whenever amount received or amount paid changes
  useEffect(() => {
    if (subscriptionForm.payment_method === "cash" && subscriptionForm.amount_received) {
      calculateChange()
    }
  }, [subscriptionForm.amount_received, subscriptionForm.amount_paid, subscriptionForm.payment_method])

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending_approval":
      case "pending approval":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "approved":
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "declined":
        return "bg-red-100 text-red-800 border-red-200"
      case "expired":
        return "bg-red-100 text-red-700 border-red-300"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  // Calculate quantity/months based on payment amount
  const calculateMonths = (subscription) => {
    const amountPaid = parseFloat(subscription.amount_paid || subscription.discounted_price || 0)
    const planPrice = parseFloat(subscription.price || 0)

    if (planPrice > 0 && amountPaid > 0) {
      const months = Math.floor(amountPaid / planPrice)
      return months > 0 ? months : 1
    }
    return 1 // Default to 1 month if calculation fails
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "pending_approval":
      case "pending approval":
        return <Clock className="h-3 w-3" />
      case "approved":
      case "active":
        return <CheckCircle className="h-3 w-3" />
      case "declined":
        return <XCircle className="h-3 w-3" />
      case "expired":
        return <XCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"
    // Format date only in Philippines timezone
    return date.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A"
    // Handle both date strings and timestamps
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"

    // Format in Philippines timezone
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  // Helper function to format names properly (capitalize first letter of each word)
  const formatName = (name) => {
    if (!name) return ''
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim()
  }

  // Helper function to get display name (handles guest sessions)
  const getDisplayName = (subscription) => {
    if (subscription.is_guest_session || subscription.subscription_type === 'guest') {
      const guestName = subscription.guest_name || 'Guest'
      return formatName(guestName)
    }
    const fname = formatName(subscription.fname || '')
    const mname = formatName(subscription.mname || '')
    const lname = formatName(subscription.lname || '')
    const fullName = `${fname} ${mname} ${lname}`.trim()
    return fullName || 'Unknown'
  }

  // Helper function to get display email/info (handles guest sessions)
  const getDisplayEmail = (subscription) => {
    if (subscription.is_guest_session || subscription.subscription_type === 'guest') {
      return 'Guest Session'
    }
    return subscription.email || 'No email'
  }

  // Helper function to get avatar initials (handles guest sessions)
  const getAvatarInitials = (subscription) => {
    if (subscription.is_guest_session || subscription.subscription_type === 'guest') {
      const name = subscription.guest_name || 'Guest'
      const parts = name.trim().split(' ').filter(part => part.length > 0)
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    const fname = (subscription.fname || '').trim()
    const lname = (subscription.lname || '').trim()
    return `${fname[0] || ''}${lname[0] || ''}`.toUpperCase()
  }

  // Calculate days left until end date
  const calculateDaysLeft = (endDate) => {
    if (!endDate) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Calculate time remaining with hours when 1 day or less, minutes when less than 1 hour, months and days when beyond 1 month
  const calculateTimeRemaining = (endDate) => {
    if (!endDate) return null
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()

    if (diffTime < 0) {
      // Expired - calculate hours, minutes and days
      const hoursAgo = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60))
      const minutesAgo = Math.floor(Math.abs(diffTime) / (1000 * 60))
      const daysAgo = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24))

      // If expired less than 1 hour ago, show minutes
      if (hoursAgo < 1) {
        return { type: 'expired_minutes', minutes: minutesAgo }
      }
      // If expired less than 24 hours ago, show hours
      if (hoursAgo < 24) {
        return { type: 'expired_hours', hours: hoursAgo }
      }
      // Otherwise show days
      return { type: 'expired', days: daysAgo }
    }

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const totalHours = Math.floor(diffTime / (1000 * 60 * 60))
    const totalMinutes = Math.floor(diffTime / (1000 * 60))

    // If less than 1 hour, show minutes (59 minutes max)
    if (totalHours < 1) {
      return { type: 'minutes', minutes: totalMinutes }
    }

    // If less than 1 day (24 hours), show hours (23 hours max)
    if (diffDays < 1) {
      return { type: 'hours', hours: totalHours }
    }

    // If 365 days or more (1 year or more), show years and months
    if (diffDays >= 365) {
      const years = Math.floor(diffDays / 365)
      const remainingDaysAfterYears = diffDays % 365
      const months = Math.floor(remainingDaysAfterYears / 30)
      return { type: 'years_months', years, months, totalDays: diffDays }
    }

    // If 30 days or more (1 month or more), show months and days
    if (diffDays >= 30) {
      const months = Math.floor(diffDays / 30)
      const remainingDays = diffDays % 30
      return { type: 'months_days', months, days: remainingDays, totalDays: diffDays }
    }

    return { type: 'days', days: diffDays }
  }

  // Helper function to check if subscription matches date range filter
  const matchesDateRangeFilter = (subscription) => {
    if (!subscription.start_date) return true
    
    // If no date filters are set, show all subscriptions
    if (!startDate && !endDate) return true

    const subscriptionDate = new Date(subscription.start_date)
    subscriptionDate.setHours(0, 0, 0, 0) // Normalize to start of day
    
    let matchesStart = true
    let matchesEnd = true
    
    // Check start date filter
    if (startDate) {
      const filterStartDate = new Date(startDate)
      filterStartDate.setHours(0, 0, 0, 0)
      matchesStart = subscriptionDate >= filterStartDate
    }
    
    // Check end date filter
    if (endDate) {
      const filterEndDate = new Date(endDate)
      filterEndDate.setHours(0, 0, 0, 0)
      matchesEnd = subscriptionDate <= filterEndDate
    }
    
    return matchesStart && matchesEnd
  }

  // Group subscriptions by user_id
  const groupSubscriptionsByUser = (subscriptionList) => {
    const grouped = {}

    subscriptionList.forEach((subscription) => {
      // For guest sessions, use guest_name as the key (they don't have user_id)
      const key = subscription.is_guest_session || subscription.subscription_type === 'guest'
        ? `guest_${subscription.guest_name || subscription.id}`
        : subscription.user_id || `unknown_${subscription.id}`

      if (!grouped[key]) {
        grouped[key] = {
          user_id: subscription.user_id,
          fname: subscription.fname,
          mname: subscription.mname,
          lname: subscription.lname,
          email: subscription.email,
          guest_name: subscription.guest_name,
          is_guest_session: subscription.is_guest_session,
          subscription_type: subscription.subscription_type,
          session_code: subscription.session_code || null,
          guest_session_id: subscription.guest_session_id || null,
          subscriptions: []
        }
      } else {
        // Update session_code if it's not set but available in this subscription
        if (!grouped[key].session_code && subscription.session_code) {
          grouped[key].session_code = subscription.session_code
        }
        // Update guest_session_id if it's not set but available in this subscription
        if (!grouped[key].guest_session_id && subscription.guest_session_id) {
          grouped[key].guest_session_id = subscription.guest_session_id
        }
      }

      grouped[key].subscriptions.push(subscription)
    })

    // Convert to array and calculate totals
    const userArray = Object.values(grouped).map((user) => {
      // Calculate total paid across all subscriptions
      const totalPaid = user.subscriptions.reduce((sum, sub) => {
        return sum + (parseFloat(sub.total_paid) || 0)
      }, 0)

      // Get the earliest start date and latest end date
      const startDates = user.subscriptions.map(s => new Date(s.start_date)).filter(d => !isNaN(d))
      const endDates = user.subscriptions.map(s => new Date(s.end_date)).filter(d => !isNaN(d))

      const earliestStart = startDates.length > 0 ? new Date(Math.min(...startDates)) : null
      const latestEnd = endDates.length > 0 ? new Date(Math.max(...endDates)) : null

      // Get the newest created_at and subscription ID for sorting
      // Use created_at as primary sort since guest sessions and subscriptions have different ID ranges
      let newestCreatedAt = null
      let newestSubscriptionId = 0

      user.subscriptions.forEach(sub => {
        // Track newest created_at (primary sort)
        const createdAt = sub.created_at || sub.start_date
        if (createdAt) {
          const date = new Date(createdAt).getTime()
          if (!newestCreatedAt || date > newestCreatedAt) {
            newestCreatedAt = date
          }
        }

        // Extract numeric ID (handle guest_ prefix and guest_session_id) for secondary sort
        let id = 0
        if (sub.is_guest_session || sub.subscription_type === 'guest') {
          // For guest sessions, prioritize guest_session_id (the actual database ID)
          if (sub.guest_session_id) {
            id = parseInt(sub.guest_session_id) || 0
          } else if (sub.id && typeof sub.id === 'string' && sub.id.startsWith('guest_')) {
            // Fallback: extract from 'guest_123' format
            id = parseInt(sub.id.replace('guest_', '')) || 0
          } else {
            id = parseInt(sub.id) || 0
          }
        } else {
          // For regular subscriptions, use the subscription ID
          id = isNaN(parseInt(sub.id)) ? parseInt(sub.id?.toString().replace('guest_', '') || '0') : parseInt(sub.id)
        }

        if (id > newestSubscriptionId) {
          newestSubscriptionId = id
        }
      })

      return {
        ...user,
        total_paid: totalPaid,
        earliest_start_date: earliestStart,
        latest_end_date: latestEnd,
        subscription_count: user.subscriptions.length,
        newest_created_at: newestCreatedAt, // Primary sort
        newest_subscription_id: newestSubscriptionId // Secondary sort
      }
    })

    // Sort by newest created_at descending (newest accounts first)
    // This ensures guest sessions and subscriptions are sorted by actual creation time
    userArray.sort((a, b) => {
      // Primary sort: by created_at (newest first)
      const dateA = a.newest_created_at || 0
      const dateB = b.newest_created_at || 0

      if (dateB !== dateA) {
        return dateB - dateA
      }

      // Secondary sort: by subscription ID (higher ID = newer)
      // Guest sessions use guest_session_id, regular subscriptions use subscription id
      return b.newest_subscription_id - a.newest_subscription_id
    })

    return userArray
  }

  // Get analytics - filter by plan if planFilter is set
  const getActiveSubscriptions = () => {
    const now = new Date()
    return (subscriptions || []).filter((s) => {
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false

      // Apply subscription type filter
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = s.is_guest_session === true || s.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = s.is_guest_session !== true && s.subscription_type !== 'guest'
      }
      if (!matchesType) return false

      // Apply date range filter
      if (!matchesDateRangeFilter(s)) return false

      // Check if subscription is expired (end_date is in the past)
      const endDate = new Date(s.end_date)
      if (endDate < now) return false

      // Only show if status is Active or approved and not expired
      return s.display_status === "Active" || s.status_name === "approved"
    })
  }

  const getExpiringSoonSubscriptions = () => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    sevenDaysFromNow.setHours(23, 59, 59, 999)

    return (subscriptions || []).filter((s) => {
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false

      // Apply subscription type filter
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = s.is_guest_session === true || s.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = s.is_guest_session !== true && s.subscription_type !== 'guest'
      }
      if (!matchesType) return false

      // Apply date range filter
      if (!matchesDateRangeFilter(s)) return false

      const endDate = new Date(s.end_date)
      // Check if subscription is already expired (end_date is in the past)
      if (endDate < now) return false

      endDate.setHours(0, 0, 0, 0)
      return (s.display_status === "Active" || s.status_name === "approved") &&
        endDate >= today &&
        endDate <= sevenDaysFromNow
    })
  }

  const getExpiredSubscriptions = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (subscriptions || []).filter((s) => {
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false

      // Apply subscription type filter
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = s.is_guest_session === true || s.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = s.is_guest_session !== true && s.subscription_type !== 'guest'
      }
      if (!matchesType) return false

      // Apply date range filter
      if (!matchesDateRangeFilter(s)) return false

      const endDate = new Date(s.end_date)
      endDate.setHours(0, 0, 0, 0)
      return s.display_status === "Expired" || (s.status_name === "approved" && endDate < today)
    })
  }

  const getCancelledSubscriptions = () => {
    return (subscriptions || []).filter((s) => {
      // Apply plan filter
      const matchesPlan = planFilter === "all" || s.plan_name === planFilter
      if (!matchesPlan) return false

      // Apply subscription type filter
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = s.is_guest_session === true || s.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = s.is_guest_session !== true && s.subscription_type !== 'guest'
      }
      if (!matchesType) return false

      // Apply date range filter
      if (!matchesDateRangeFilter(s)) return false

      // Check if subscription is cancelled
      return s.status_name?.toLowerCase() === "cancelled" ||
        s.display_status?.toLowerCase() === "cancelled" ||
        s.status_name?.toLowerCase() === "canceled" ||
        s.display_status?.toLowerCase() === "canceled"
    })
  }

  // Filter subscriptions
  const filterSubscriptions = (subscriptionList) => {
    return (subscriptionList || []).filter((subscription) => {
      // Search filter - include guest_name for guest sessions
      const searchText = searchQuery.toLowerCase()
      const matchesSearch =
        `${subscription.fname || ''} ${subscription.mname || ''} ${subscription.lname || ''}`
          .toLowerCase()
          .includes(searchText) ||
        (subscription.email || '').toLowerCase().includes(searchText) ||
        (subscription.plan_name || '').toLowerCase().includes(searchText) ||
        (subscription.guest_name || '').toLowerCase().includes(searchText) ||
        (subscription.receipt_number || '').toLowerCase().includes(searchText)

      const matchesStatus = statusFilter === "all" || subscription.status_name === statusFilter
      const matchesPlan = planFilter === "all" || subscription.plan_name === planFilter

      // Subscription type filter (Guest Session vs Regular)
      let matchesType = true
      if (subscriptionTypeFilter === "guest") {
        matchesType = subscription.is_guest_session === true || subscription.subscription_type === 'guest'
      } else if (subscriptionTypeFilter === "regular") {
        matchesType = subscription.is_guest_session !== true && subscription.subscription_type !== 'guest'
      } else {
        matchesType = true // "all" - show both
      }

      // Date range filter logic
      let matchesDateRange = true
      if (subscription.start_date) {
        const subscriptionDate = new Date(subscription.start_date)
        subscriptionDate.setHours(0, 0, 0, 0) // Normalize to start of day
        
        let matchesStart = true
        let matchesEnd = true
        
        // Check start date filter
        if (startDate) {
          const filterStartDate = new Date(startDate)
          filterStartDate.setHours(0, 0, 0, 0)
          matchesStart = subscriptionDate >= filterStartDate
        }
        
        // Check end date filter
        if (endDate) {
          const filterEndDate = new Date(endDate)
          filterEndDate.setHours(0, 0, 0, 0)
          matchesEnd = subscriptionDate <= filterEndDate
        }
        
        matchesDateRange = matchesStart && matchesEnd
      }

      return matchesSearch && matchesStatus && matchesPlan && matchesType && matchesDateRange
    })
  }

  const filteredSubscriptions = filterSubscriptions(subscriptions)
  const activeSubscriptions = getActiveSubscriptions()
  const expiringSoonSubscriptions = getExpiringSoonSubscriptions()
  const expiredSubscriptions = getExpiredSubscriptions()
  const cancelledSubscriptions = getCancelledSubscriptions()

  // Helper functions for analytics - get subscriptions WITH date range filter applied
  const getAllActiveSubscriptions = () => {
    const now = new Date()
    return (subscriptions || []).filter((s) => {
      // Apply date range filter first
      if (!matchesDateRangeFilter(s)) return false
      
      // Check if subscription is expired (end_date is in the past)
      const endDate = new Date(s.end_date)
      if (endDate < now) return false
      // Only show if status is Active or approved and not expired
      return s.display_status === "Active" || s.status_name === "approved"
    })
  }

  const getAllExpiringSoonSubscriptions = () => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    sevenDaysFromNow.setHours(23, 59, 59, 999)

    return (subscriptions || []).filter((s) => {
      // Apply date range filter first
      if (!matchesDateRangeFilter(s)) return false
      
      const endDate = new Date(s.end_date)
      // Check if subscription is already expired (end_date is in the past)
      if (endDate < now) return false

      endDate.setHours(0, 0, 0, 0)
      return endDate >= today && endDate <= sevenDaysFromNow &&
        (s.display_status === "Active" || s.status_name === "approved")
    })
  }

  const getAllExpiredSubscriptions = () => {
    const now = new Date()
    return (subscriptions || []).filter((s) => {
      // Apply date range filter first
      if (!matchesDateRangeFilter(s)) return false
      
      const endDate = new Date(s.end_date)
      return endDate < now && (s.display_status === "Active" || s.status_name === "approved")
    })
  }

  const getAllCancelledSubscriptions = () => {
    return (subscriptions || []).filter((s) => {
      // Apply date range filter first
      if (!matchesDateRangeFilter(s)) return false
      
      return s.status_name === "cancelled" || s.display_status === "Cancelled"
    })
  }

  // Pagination helper function
  const getPaginatedData = (data, tabKey) => {
    const page = currentPage[tabKey] || 1
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return {
      paginated: data.slice(startIndex, endIndex),
      totalPages: Math.max(1, Math.ceil(data.length / itemsPerPage)),
      currentPage: page,
      totalItems: data.length
    }
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage({
      pending: 1,
      active: 1,
      upcoming: 1,
      expired: 1,
      cancelled: 1
    })
  }, [searchQuery, statusFilter, planFilter, subscriptionTypeFilter, startDate, endDate])

  // Get analytics - filtered by plan and subscription type if filters are set
  const getFilteredSubscriptionsByPlan = () => {
    let filtered = subscriptions || []

    // Apply plan filter
    if (planFilter !== "all") {
      filtered = filtered.filter((s) => s.plan_name === planFilter)
    }

    // Apply subscription type filter
    if (subscriptionTypeFilter === "guest") {
      filtered = filtered.filter((s) => s.is_guest_session === true || s.subscription_type === 'guest')
    } else if (subscriptionTypeFilter === "regular") {
      filtered = filtered.filter((s) => s.is_guest_session !== true && s.subscription_type !== 'guest')
    }

    // Apply date range filter
    filtered = filtered.filter((s) => matchesDateRangeFilter(s))

    return filtered
  }

  const getFilteredPendingByPlan = () => {
    let filtered = pendingSubscriptions || []

    // Apply plan filter
    if (planFilter !== "all") {
      filtered = filtered.filter((s) => s.plan_name === planFilter)
    }

    // Apply subscription type filter
    if (subscriptionTypeFilter === "guest") {
      filtered = filtered.filter((s) => s.is_guest_session === true || s.subscription_type === 'guest')
    } else if (subscriptionTypeFilter === "regular") {
      filtered = filtered.filter((s) => s.is_guest_session !== true && s.subscription_type !== 'guest')
    }

    // Apply date range filter
    filtered = filtered.filter((s) => matchesDateRangeFilter(s))

    return filtered
  }

  const filteredByPlan = getFilteredSubscriptionsByPlan()
  const filteredPendingByPlan = getFilteredPendingByPlan()

  // Get analytics - use grouped subscriptions to count users (matching staff dashboard)
  // For total, group ALL subscriptions (not filtered) to get the total user count
  // For active/expiring/expired/cancelled, use unfiltered data for accurate counts
  const groupedAllSubscriptions = groupSubscriptionsByUser(subscriptions || [])
  const groupedActive = groupSubscriptionsByUser(getAllActiveSubscriptions())
  const groupedExpiring = groupSubscriptionsByUser(getAllExpiringSoonSubscriptions())
  const groupedExpired = groupSubscriptionsByUser(getAllExpiredSubscriptions())
  const groupedCancelled = groupSubscriptionsByUser(getAllCancelledSubscriptions())

  const analytics = {
    total: groupedAllSubscriptions.length,
    pending: filteredPendingByPlan?.length || 0,
    approved: filteredByPlan?.filter((s) => s.status_name === "approved" || s.status_name === "active")?.length || 0,
    declined: filteredByPlan?.filter((s) => s.status_name === "declined")?.length || 0,
    active: groupedActive.length,
    expiringSoon: groupedExpiring.length,
    expired: groupedExpired.length,
    cancelled: groupedCancelled.length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading subscription data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-white overflow-hidden group cursor-pointer"
          onClick={() => setActiveTab("active")}
        >
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-100 to-green-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <CheckCircle className="h-6 w-6 text-green-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Active</p>
              <p className="text-3xl font-bold text-green-700">{analytics.active}</p>
              {planFilter !== "all" && (
                <p className="text-xs text-slate-500 mt-1 truncate">{planFilter}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-white overflow-hidden group cursor-pointer"
          onClick={() => setActiveTab("upcoming")}
        >
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <Clock className="h-6 w-6 text-orange-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Expiring Soon</p>
              <p className="text-3xl font-bold text-orange-700">{analytics.expiringSoon}</p>
              {planFilter !== "all" && (
                <p className="text-xs text-slate-500 mt-1 truncate">{planFilter}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-white overflow-hidden group cursor-pointer"
          onClick={() => setActiveTab("expired")}
        >
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-100 to-red-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <XCircle className="h-6 w-6 text-red-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Expired</p>
              <p className="text-3xl font-bold text-red-700">{analytics.expired}</p>
              {planFilter !== "all" && (
                <p className="text-xs text-slate-500 mt-1 truncate">{planFilter}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card
          className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-gray-50 to-white overflow-hidden group cursor-pointer"
          onClick={() => setActiveTab("cancelled")}
        >
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <XCircle className="h-6 w-6 text-gray-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cancelled</p>
              <p className="text-3xl font-bold text-gray-700">{analytics.cancelled}</p>
              {planFilter !== "all" && (
                <p className="text-xs text-slate-500 mt-1 truncate">{planFilter}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Messages */}
      {message && (
        <Alert className={message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
          {message.type === "error" ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/60 px-6 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-md">
                <CreditCard className="h-6 w-6 text-slate-700" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900 mb-1">
                  Monitor Subscription
                </CardTitle>
                <CardDescription className="text-slate-600 font-medium">Monitor subscription status and track upcoming expirations</CardDescription>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={fetchAllData} variant="outline" size="sm" className="h-9 w-9 p-0 shadow-md hover:shadow-lg hover:bg-slate-50 transition-all border-slate-300" title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <button
                onClick={() => {
                  setGuestSessionForm({
                    guest_name: "",
                    payment_method: "cash",
                    amount_received: "",
                    notes: ""
                  })
                  setIsCreateGuestSessionDialogOpen(true)
                }}
                style={{
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                  border: 'none'
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold h-9 px-4 shadow-lg hover:shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7280'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Plus className="h-4 w-4" />
                Guest Session
              </button>
              <button
                onClick={() => {
                  resetSubscriptionForm()
                  setIsCreateSubscriptionDialogOpen(true)
                }}
                style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  border: 'none'
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold h-9 px-4 shadow-lg hover:shadow-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#111827'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#000000'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Plus className="h-4 w-4" />
                Assign Subscription
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-slate-50/30">
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-12 bg-white p-1.5 rounded-xl border border-slate-200 shadow-inner">
              <TabsTrigger value="active" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-green-100/50 data-[state=active]:shadow-md data-[state=active]:text-green-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-green-200">
                Active ({analytics.active})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-orange-100/50 data-[state=active]:shadow-md data-[state=active]:text-orange-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-orange-200">
                Upcoming ({analytics.expiringSoon})
              </TabsTrigger>
              <TabsTrigger value="expired" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-50 data-[state=active]:to-red-100/50 data-[state=active]:shadow-md data-[state=active]:text-red-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-red-200">
                Expired ({analytics.expired})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-50 data-[state=active]:to-gray-100/50 data-[state=active]:shadow-md data-[state=active]:text-gray-900 font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900 data-[state=active]:border data-[state=active]:border-gray-200">
                Cancelled ({analytics.cancelled})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left side - Search and Plan */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search members, emails, or plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                      />
                    </div>
                    <Label htmlFor="active-plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={(value) => {
                      setPlanFilter(value)
                      // Reset type filter when plan filter changes away from Gym Session/Day Pass
                      if (value !== "Gym Session" && value !== "Day Pass" && value !== "Walk In") {
                        setSubscriptionTypeFilter("all")
                      }
                    }}>
                      <SelectTrigger className="w-40" id="active-plan-filter">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.plan_name}>
                            {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Only show Type filter when Gym Session/Day Pass is selected */}
                    {(planFilter === "Gym Session" || planFilter === "Day Pass" || planFilter === "Walk In") && (
                      <>
                        <Label htmlFor="active-subscription-type-filter">Type:</Label>
                        <Select value={subscriptionTypeFilter} onValueChange={setSubscriptionTypeFilter}>
                          <SelectTrigger className="w-40" id="active-subscription-type-filter">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="regular">Session</SelectItem>
                            <SelectItem value="guest">Guest Session</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* Right side - Date Range Filter */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Label htmlFor="active-start-date-filter" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      Start Date:
                    </Label>
                    <Input
                      type="date"
                      id="active-start-date-filter"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40 h-10 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      max={endDate || undefined}
                    />
                    <Label htmlFor="active-end-date-filter" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      End Date:
                    </Label>
                    <Input
                      type="date"
                      id="active-end-date-filter"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40 h-10 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      min={startDate || undefined}
                    />
                    {(startDate || endDate) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStartDate("")
                          setEndDate("")
                        }}
                        className="h-10 px-3 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Subscriptions Table */}
              {(() => {
                const filteredActive = filterSubscriptions(activeSubscriptions)
                const groupedActive = groupSubscriptionsByUser(filteredActive)
                const activePagination = getPaginatedData(groupedActive, 'active')

                return groupedActive.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active subscriptions found</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-green-50 to-green-100/50 hover:bg-green-100 border-b-2 border-green-200">
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider text-right w-auto pr-0">Status</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider text-right w-auto pl-1">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activePagination.paginated.map((user) => {
                            // Get the primary subscription (most recent or active)
                            const primarySub = user.subscriptions[0]
                            const timeRemaining = primarySub ? calculateTimeRemaining(primarySub.end_date) : null
                            const daysLeft = primarySub ? calculateDaysLeft(primarySub.end_date) : null

                            return (
                              <TableRow key={user.user_id || `guest_${user.guest_name}`} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={normalizeProfilePhotoUrl(primarySub?.profile_photo_url)} alt={primarySub ? getDisplayName(primarySub) : 'User'} />
                                      <AvatarFallback>
                                        {primarySub ? getAvatarInitials(primarySub) : 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        {primarySub ? getDisplayName(primarySub) : (user.guest_name || 'Unknown')}
                                        {user.is_guest_session && (
                                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                            Guest
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {primarySub ? getDisplayEmail(primarySub) : (user.email || 'No email')}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right pr-0">
                                  {primarySub && (
                                    <div className="flex justify-end">
                                      <Badge
                                        className={`${getStatusColor(primarySub.display_status || primarySub.status_name)} flex items-center gap-1 min-w-[90px] justify-center px-3 py-1.5 text-sm font-medium`}
                                      >
                                        {getStatusIcon(primarySub.status_name)}
                                        {primarySub.display_status || primarySub.status_name}
                                      </Badge>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right pl-1">
                                  <div className="flex justify-end">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => setViewDetailsModal({
                                        open: true,
                                        user: user,
                                        subscriptions: user.subscriptions
                                      })}
                                      className="h-9 px-4 text-sm font-medium bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View Details
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    {groupedActive.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-0">
                        <div className="text-sm text-slate-500">
                          {groupedActive.length} {groupedActive.length === 1 ? 'user' : 'users'} total
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, active: Math.max(1, prev.active - 1) }))}
                            disabled={activePagination.currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                            Page {activePagination.currentPage} of {activePagination.totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, active: Math.min(activePagination.totalPages, prev.active + 1) }))}
                            disabled={activePagination.currentPage === activePagination.totalPages}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4 mt-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left side - Search and Plan */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search members, emails, or plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                      />
                    </div>
                    <Label htmlFor="upcoming-plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={(value) => {
                      setPlanFilter(value)
                      // Reset type filter when plan filter changes away from Gym Session/Day Pass
                      if (value !== "Gym Session" && value !== "Day Pass" && value !== "Walk In") {
                        setSubscriptionTypeFilter("all")
                      }
                    }}>
                      <SelectTrigger className="w-40" id="upcoming-plan-filter">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.plan_name}>
                            {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Only show Type filter when Gym Session/Day Pass is selected */}
                    {(planFilter === "Gym Session" || planFilter === "Day Pass" || planFilter === "Walk In") && (
                      <>
                        <Label htmlFor="upcoming-subscription-type-filter">Type:</Label>
                        <Select value={subscriptionTypeFilter} onValueChange={setSubscriptionTypeFilter}>
                          <SelectTrigger className="w-40" id="upcoming-subscription-type-filter">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="regular">Session</SelectItem>
                            <SelectItem value="guest">Guest Session</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* Right side - Date Range Filter */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Label htmlFor="upcoming-start-date-filter" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      Start Date:
                    </Label>
                    <Input
                      type="date"
                      id="upcoming-start-date-filter"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40 h-10 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      max={endDate || undefined}
                    />
                    <Label htmlFor="upcoming-end-date-filter" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      End Date:
                    </Label>
                    <Input
                      type="date"
                      id="upcoming-end-date-filter"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40 h-10 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      min={startDate || undefined}
                    />
                    {(startDate || endDate) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStartDate("")
                          setEndDate("")
                        }}
                        className="h-10 px-3 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Upcoming Expiration Subscriptions Table */}
              {(() => {
                const filteredExpiring = filterSubscriptions(expiringSoonSubscriptions)
                const groupedExpiring = groupSubscriptionsByUser(filteredExpiring)
                const expiringPagination = getPaginatedData(groupedExpiring, 'upcoming')

                return groupedExpiring.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subscriptions expiring within 7 days</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-orange-50 to-orange-100/50 hover:bg-orange-100 border-b-2 border-orange-200">
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider text-right w-auto pr-0">Status</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider text-right w-auto pl-1">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expiringPagination.paginated.map((user) => {
                            const primarySub = user.subscriptions[0]
                            const timeRemaining = primarySub ? calculateTimeRemaining(primarySub.end_date) : null
                            const daysLeft = primarySub ? calculateDaysLeft(primarySub.end_date) : null

                            return (
                              <TableRow key={user.user_id || `guest_${user.guest_name}`} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback>
                                        {primarySub ? getAvatarInitials(primarySub) : 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        {primarySub ? getDisplayName(primarySub) : (user.guest_name || 'Unknown')}
                                        {user.is_guest_session && (
                                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                            Guest
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {primarySub ? getDisplayEmail(primarySub) : (user.email || 'No email')}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right pr-0">
                                  {primarySub && (
                                    <div className="flex justify-end">
                                      <Badge
                                        className="bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1 min-w-[90px] justify-center px-3 py-1.5 text-sm font-medium"
                                      >
                                        <AlertTriangle className="h-3 w-3" />
                                        {primarySub.display_status || primarySub.status_name}
                                      </Badge>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right pl-1">
                                  <div className="flex justify-end">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        setViewDetailsModal({
                                          open: true,
                                          user: user,
                                          subscriptions: user.subscriptions
                                        })
                                      }}
                                      className="h-9 px-4 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View Details
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    {groupedExpiring.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-0">
                        <div className="text-sm text-slate-500">
                          {groupedExpiring.length} {groupedExpiring.length === 1 ? 'user' : 'users'} total
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, upcoming: Math.max(1, prev.upcoming - 1) }))}
                            disabled={expiringPagination.currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                            Page {expiringPagination.currentPage} of {expiringPagination.totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, upcoming: Math.min(expiringPagination.totalPages, prev.upcoming + 1) }))}
                            disabled={expiringPagination.currentPage === expiringPagination.totalPages}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="expired" className="space-y-4 mt-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left side - Search and Plan */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search members, emails, or plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                      />
                    </div>
                    <Label htmlFor="expired-plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={(value) => {
                      setPlanFilter(value)
                      // Reset type filter when plan filter changes away from Gym Session/Day Pass
                      if (value !== "Gym Session" && value !== "Day Pass" && value !== "Walk In") {
                        setSubscriptionTypeFilter("all")
                      }
                    }}>
                      <SelectTrigger className="w-40" id="expired-plan-filter">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.plan_name}>
                            {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Only show Type filter when Gym Session/Day Pass is selected */}
                    {(planFilter === "Gym Session" || planFilter === "Day Pass" || planFilter === "Walk In") && (
                      <>
                        <Label htmlFor="expired-subscription-type-filter">Type:</Label>
                        <Select value={subscriptionTypeFilter} onValueChange={setSubscriptionTypeFilter}>
                          <SelectTrigger className="w-40" id="expired-subscription-type-filter">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="regular">Session</SelectItem>
                            <SelectItem value="guest">Guest Session</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* Right side - Date Range Filter */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Label htmlFor="expired-start-date-filter" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      Start Date:
                    </Label>
                    <Input
                      type="date"
                      id="expired-start-date-filter"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40 h-10 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      max={endDate || undefined}
                    />
                    <Label htmlFor="expired-end-date-filter" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      End Date:
                    </Label>
                    <Input
                      type="date"
                      id="expired-end-date-filter"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40 h-10 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      min={startDate || undefined}
                    />
                    {(startDate || endDate) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStartDate("")
                          setEndDate("")
                        }}
                        className="h-10 px-3 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expired Subscriptions Table */}
              {(() => {
                const filteredExpired = filterSubscriptions(expiredSubscriptions)
                const groupedExpired = groupSubscriptionsByUser(filteredExpired)
                const expiredPagination = getPaginatedData(groupedExpired, 'expired')

                return groupedExpired.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No expired subscriptions found</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-red-50 to-red-100/50 hover:bg-red-100 border-b-2 border-red-200">
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider text-right w-auto pr-0">Status</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider text-right w-auto pl-1">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expiredPagination.paginated.map((user) => {
                            const primarySub = user.subscriptions[0]
                            const timeRemaining = primarySub ? calculateTimeRemaining(primarySub.end_date) : null
                            const daysLeft = primarySub ? calculateDaysLeft(primarySub.end_date) : null

                            return (
                              <TableRow key={user.user_id || `guest_${user.guest_name}`} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback>
                                        {primarySub ? getAvatarInitials(primarySub) : 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        {primarySub ? getDisplayName(primarySub) : (user.guest_name || 'Unknown')}
                                        {user.is_guest_session && (
                                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                            Guest
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {primarySub ? getDisplayEmail(primarySub) : (user.email || 'No email')}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right pr-0">
                                  {primarySub && (
                                    <div className="flex justify-end">
                                      <Badge
                                        className="bg-gray-100 text-gray-800 border-gray-200 flex items-center gap-1 min-w-[90px] justify-center px-3 py-1.5 text-sm font-medium"
                                      >
                                        {getStatusIcon(primarySub.status_name)}
                                        {primarySub.display_status || primarySub.status_name}
                                      </Badge>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right pl-1">
                                  <div className="flex justify-end">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        setViewDetailsModal({
                                          open: true,
                                          user: user,
                                          subscriptions: user.subscriptions
                                        })
                                      }}
                                      className="h-9 px-4 text-sm font-medium bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View Details
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    {groupedExpired.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-0">
                        <div className="text-sm text-slate-500">
                          {groupedExpired.length} {groupedExpired.length === 1 ? 'user' : 'users'} total
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, expired: Math.max(1, prev.expired - 1) }))}
                            disabled={expiredPagination.currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                            Page {expiredPagination.currentPage} of {expiredPagination.totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, expired: Math.min(expiredPagination.totalPages, prev.expired + 1) }))}
                            disabled={expiredPagination.currentPage === expiredPagination.totalPages}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-4 mt-6">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left side - Search and Plan */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search members, emails, or plans..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64 border-slate-300 focus:border-slate-400 focus:ring-slate-400 shadow-sm"
                      />
                    </div>
                    <Label htmlFor="cancelled-plan-filter">Plan:</Label>
                    <Select value={planFilter} onValueChange={(value) => {
                      setPlanFilter(value)
                      // Reset type filter when plan filter changes away from Gym Session/Day Pass
                      if (value !== "Gym Session" && value !== "Day Pass" && value !== "Walk In") {
                        setSubscriptionTypeFilter("all")
                      }
                    }}>
                      <SelectTrigger className="w-40" id="cancelled-plan-filter">
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.plan_name}>
                            {plan.plan_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Only show Type filter when Gym Session/Day Pass is selected */}
                    {(planFilter === "Gym Session" || planFilter === "Day Pass" || planFilter === "Walk In") && (
                      <>
                        <Label htmlFor="cancelled-subscription-type-filter">Type:</Label>
                        <Select value={subscriptionTypeFilter} onValueChange={setSubscriptionTypeFilter}>
                          <SelectTrigger className="w-40" id="cancelled-subscription-type-filter">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="regular">Session</SelectItem>
                            <SelectItem value="guest">Guest Session</SelectItem>
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>

                  {/* Right side - Date Range Filter */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Label htmlFor="cancelled-start-date-filter" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      Start Date:
                    </Label>
                    <Input
                      type="date"
                      id="cancelled-start-date-filter"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40 h-10 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      max={endDate || undefined}
                    />
                    <Label htmlFor="cancelled-end-date-filter" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-600" />
                      End Date:
                    </Label>
                    <Input
                      type="date"
                      id="cancelled-end-date-filter"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40 h-10 border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      min={startDate || undefined}
                    />
                    {(startDate || endDate) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStartDate("")
                          setEndDate("")
                        }}
                        className="h-10 px-3 text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cancelled Subscriptions Table */}
              {(() => {
                const filteredCancelled = filterSubscriptions(cancelledSubscriptions)
                const groupedCancelled = groupSubscriptionsByUser(filteredCancelled)
                const cancelledPagination = getPaginatedData(groupedCancelled, 'cancelled')

                return groupedCancelled.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No cancelled subscriptions found</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 hover:bg-gray-100 border-b-2 border-gray-200">
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider">Name</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider text-right w-auto pr-0">Status</TableHead>
                            <TableHead className="font-bold text-slate-800 text-sm uppercase tracking-wider text-right w-auto pl-1">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cancelledPagination.paginated.map((user) => {
                            const primarySub = user.subscriptions[0]

                            return (
                              <TableRow key={user.user_id || `guest_${user.guest_name}`} className="hover:bg-slate-50/80 transition-all border-b border-slate-100">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback>
                                        {primarySub ? getAvatarInitials(primarySub) : 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium flex items-center gap-2">
                                        {primarySub ? getDisplayName(primarySub) : (user.guest_name || 'Unknown')}
                                        {user.is_guest_session && (
                                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                            Guest
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {primarySub ? getDisplayEmail(primarySub) : (user.email || 'No email')}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right pr-0">
                                  {primarySub && (
                                    <div className="flex justify-end">
                                      <Badge
                                        className="bg-gray-100 text-gray-800 border-gray-200 flex items-center gap-1 min-w-[90px] justify-center px-3 py-1.5 text-sm font-medium"
                                      >
                                        {getStatusIcon(primarySub.status_name)}
                                        {primarySub.display_status || primarySub.status_name}
                                      </Badge>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right pl-1">
                                  <div className="flex justify-end">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        setViewDetailsModal({
                                          open: true,
                                          user: user,
                                          subscriptions: user.subscriptions
                                        })
                                      }}
                                      className="h-9 px-4 text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                                    >
                                      <Eye className="h-4 w-4" />
                                      View Details
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Pagination Controls */}
                    {groupedCancelled.length > 0 && (
                      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-0">
                        <div className="text-sm text-slate-500">
                          {groupedCancelled.length} {groupedCancelled.length === 1 ? 'user' : 'users'} total
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, cancelled: Math.max(1, prev.cancelled - 1) }))}
                            disabled={cancelledPagination.currentPage === 1}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 py-1 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md min-w-[100px] text-center">
                            Page {cancelledPagination.currentPage} of {cancelledPagination.totalPages}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => ({ ...prev, cancelled: Math.min(cancelledPagination.totalPages, prev.cancelled + 1) }))}
                            disabled={cancelledPagination.currentPage === cancelledPagination.totalPages}
                            className="h-8 px-3 flex items-center gap-1 border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      {/* Manual Subscription Creation Dialog */}
      <Dialog open={isCreateSubscriptionDialogOpen} onOpenChange={(open) => {
        setIsCreateSubscriptionDialogOpen(open)
        if (!open) {
          // Reset search when dialog closes
          setUserSearchQuery("")
          setShowUserDropdown(false)
        }
      }}>
        <DialogContent
          className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden"
          onOpenAutoFocus={async (e) => {
            // Fetch subscription details when modal opens for approval
            if (currentSubscriptionId) {
              e.preventDefault();
              await fetchSubscriptionDetails(currentSubscriptionId);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {currentSubscriptionId ? "Process Payment & Approve Subscription" : "Assign Subscription"}
            </DialogTitle>
            <DialogDescription>
              {currentSubscriptionId
                ? "Process payment to approve this subscription request"
                : "Assign a subscription to a member with discount options"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* First Row: User Name and Plan Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label className="text-sm text-gray-700 font-semibold">User Name</Label>
                {currentSubscriptionId ? (
                  <Input
                    value={selectedUserInfo ? `${selectedUserInfo.fname || ''} ${selectedUserInfo.lname || ''}`.trim() : 'Loading...'}
                    disabled
                    placeholder="Loading user details..."
                    className="h-10 text-sm border border-gray-300 bg-gray-50"
                  />
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        value={userSearchQuery || (selectedUserInfo ? `${selectedUserInfo.fname || ''} ${selectedUserInfo.lname || ''}`.trim() : "")}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value)
                          setShowUserDropdown(true)
                          // Clear user selection if user starts typing
                          if (e.target.value !== userSearchQuery && subscriptionForm.user_id) {
                            setSubscriptionForm(prev => ({ ...prev, user_id: "" }))
                            setSelectedUserInfo(null)
                          }
                        }}
                        onFocus={() => setShowUserDropdown(true)}
                        placeholder="Search user by name or email..."
                        className="h-10 text-sm border border-gray-300 pl-10"
                      />
                    </div>
                    {showUserDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowUserDropdown(false)}
                        />
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {(() => {
                            const filteredUsers = availableUsers.filter((user) => {
                              const searchLower = userSearchQuery.toLowerCase()
                              const fullName = `${user.fname} ${user.lname}`.toLowerCase()
                              const email = (user.email || '').toLowerCase()
                              return fullName.includes(searchLower) || email.includes(searchLower)
                            })

                            if (filteredUsers.length === 0) {
                              return (
                                <div className="p-3 text-sm text-gray-500 text-center">
                                  No users found
                                </div>
                              )
                            }

                            return filteredUsers.map((user) => (
                              <div
                                key={user.id}
                                onClick={() => {
                                  handleUserSelection(user.id.toString())
                                  setShowUserDropdown(false)
                                }}
                                className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-sm text-gray-900">
                                  {user.fname || ''} {user.lname || ''}
                                </div>
                                {user.email && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {user.email}
                                  </div>
                                )}
                              </div>
                            ))
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 font-semibold">Select Plan(s)</Label>
                <p className="text-xs text-gray-600">
                  {currentSubscriptionId ? "Plan details for this subscription" : "You can select multiple plans to assign to this user"}
                </p>
                {currentSubscriptionId ? (
                  <Input
                    value={subscriptionForm.plan_name || 'Loading...'}
                    disabled
                    placeholder="Loading plan details..."
                    className="h-10 text-sm border border-gray-300 bg-gray-50"
                  />
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {subscriptionPlans.map((plan) => {
                      const isAvailable = plan.is_available !== false
                      const planIdStr = plan.id.toString()
                      const isSelected = subscriptionForm.selected_plan_ids?.includes(planIdStr) || false
                      const quantity = planQuantities[planIdStr] || 1
                      const isActivePlan = userActiveSubscriptions.some(sub => parseInt(sub.plan_id) === parseInt(plan.id))

                      return (
                        <div
                          key={plan.id}
                          className={`p-3 rounded-lg border-2 transition-all ${isSelected
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                            } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          onClick={(e) => {
                            // Don't trigger if clicking on input field (quantity)
                            if (e.target.type === 'number' || e.target.tagName === 'INPUT') {
                              return
                            }
                            // Toggle the plan when clicking on the card
                            if (isAvailable) {
                              handlePlanToggle(plan.id)
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                                  {plan.plan_name}
                                  {isActivePlan && (
                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs ml-2">
                                      Active
                                    </Badge>
                                  )}
                                </Label>
                                <span className="text-sm font-semibold text-gray-700">
                                  ₱{parseFloat(plan.price || 0).toFixed(2)}
                                </span>
                              </div>
                              {isActivePlan && isAvailable && (
                                <p className="text-xs text-gray-600 mt-0.5">
                                  Renewal/Advance Payment - Will extend existing subscription
                                </p>
                              )}
                              {isSelected && (plan.id == 1 || plan.id == 2 || plan.id == 3) && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Label className="text-xs text-gray-600">
                                    {plan.id == 1 ? "Years:" : "Months:"}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      handleQuantityChange(plan.id, e.target.value)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 w-20 text-xs border border-gray-300"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Second Row: Amount to Pay and Payment Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 font-semibold">Amount to Pay</Label>
                <Input
                  value={subscriptionForm.amount_paid || '0.00'}
                  disabled
                  placeholder="Amount to pay"
                  className="h-10 text-sm border border-gray-300 bg-gray-50 text-gray-900 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 font-semibold">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value) => {
                  setPaymentMethod(value)
                  // Clear reference number when switching away from GCash
                  if (value !== "gcash") {
                    setReferenceNumber("")
                  }
                  // Clear amount received when switching to GCash
                  if (value === "gcash") {
                    setAmountReceived("")
                  }
                }}>
                  <SelectTrigger className="h-10 text-sm border border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* GCash Reference Number Input */}
            {paymentMethod === "gcash" && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 font-semibold">GCash Reference Number <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Enter GCash reference number"
                  className="h-10 text-sm border border-gray-300"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500">Enter the transaction reference number from GCash</p>
              </div>
            )}

            {/* Active Subscriptions Indicator */}
            {selectedUserInfo && userActiveSubscriptions.length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">Active Subscriptions</span>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                        {userActiveSubscriptions.length} Active
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      This member has active subscription(s). Selecting the same plan will extend/renew their subscription.
                    </p>
                    <div className="mt-3 space-y-2">
                      {userActiveSubscriptions.map((sub, index) => {
                        const endDate = new Date(sub.end_date)
                        const isExpiringSoon = endDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                        const isSelectedPlan = subscriptionForm.selected_plan_ids?.some(pid => parseInt(pid) === parseInt(sub.plan_id))

                        return (
                          <div
                            key={index}
                            className={`p-3 rounded-md border ${isSelectedPlan
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-green-200'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle className={`h-4 w-4 ${isSelectedPlan ? 'text-blue-600' : 'text-green-600'}`} />
                                <span className="text-sm font-medium text-gray-900">{sub.plan_name}</span>
                                {isSelectedPlan && (
                                  <Badge className="bg-blue-600 text-white text-xs ml-2">
                                    Selected Plan - This will extend/renew
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Expires: {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                              {isExpiringSoon && (
                                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                                  Expiring Soon
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Discount Section */}
            {/* User Discount Status */}
            {selectedUserInfo && userActiveDiscount && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-md text-sm font-semibold ${userActiveDiscount === 'student'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-purple-100 text-purple-700 border border-purple-300'
                    }`}>
                    {userActiveDiscount === 'student' ? '🎓 Student' : '👤 Senior (55+)'}
                  </div>
                  <span className="text-sm text-gray-600">
                    {subscriptionForm.selected_plan_ids?.some(pid => pid == 2 || pid == 3 || pid == 5)
                      ? 'Discount will be automatically applied to eligible plans'
                      : 'Discount is available for Monthly Access plans'}
                  </span>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            {subscriptionForm.selected_plan_ids && subscriptionForm.selected_plan_ids.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-gray-700 mb-2 text-sm font-semibold">Price Breakdown</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  {subscriptionForm.selected_plan_ids.map((planIdStr, index) => {
                    const selectedPlan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
                    if (!selectedPlan) return null
                    const planPrice = parseFloat(selectedPlan?.price || 0)
                    const quantity = planQuantities[planIdStr] || 1
                    const planId = parseInt(planIdStr)

                    // Apply discount if applicable
                    let pricePerUnit = planPrice
                    let discount = 0
                    let hasDiscount = false
                    if ((planId == 2 || planId == 3 || planId == 5) && userActiveDiscount) {
                      discount = discountConfig[userActiveDiscount]?.discount || 0
                      if (discount > 0) {
                        hasDiscount = true
                        pricePerUnit = calculateDiscountedPrice(planPrice, userActiveDiscount)
                      }
                    }

                    const originalTotal = planPrice * quantity
                    const discountedTotal = pricePerUnit * quantity

                    return (
                      <div key={planIdStr} className={index > 0 ? "border-t border-gray-300 pt-2 mt-2" : ""}>
                        <div className="font-medium text-gray-900 mb-1">{selectedPlan.plan_name}</div>
                        <div className="flex justify-between">
                          <span>Original Price:</span>
                          <span className="font-medium text-gray-900">
                            {quantity > 1 ? (
                              <span>
                                ₱{planPrice.toFixed(2)} × {quantity} {planId == 1 ? 'year' : 'month'}{quantity > 1 ? 's' : ''} = ₱{originalTotal.toFixed(2)}
                              </span>
                            ) : (
                              `₱${planPrice.toFixed(2)}`
                            )}
                          </span>
                        </div>
                        {hasDiscount && (
                          <div className="flex justify-between text-blue-700">
                            <span>Discount ({discountConfig[userActiveDiscount]?.name}):</span>
                            <span className="font-medium">-₱{(discount * quantity).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium text-gray-900">
                          <span>Plan Total:</span>
                          <span>₱{discountedTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex justify-between font-semibold border-t border-gray-300 pt-2 mt-2">
                    <span className="text-gray-900">Total Amount:</span>
                    <span className="text-gray-900">₱{parseFloat(subscriptionForm.amount_paid || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "cash" && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="text-sm font-semibold text-gray-700">Amount Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Enter amount received"
                  className="h-10 text-sm border border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {amountReceived && (
                  <div className="mt-2 p-3 bg-white rounded-md border border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Change:</span>
                      <span className="text-base font-semibold text-gray-900">₱{changeGiven.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateSubscriptionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateManualSubscription}
              disabled={
                actionLoading === "create" ||
                !subscriptionForm.amount_paid ||
                !subscriptionForm.user_id ||
                !subscriptionForm.selected_plan_ids ||
                subscriptionForm.selected_plan_ids.length === 0 ||
                (paymentMethod === "cash" && (!amountReceived || parseFloat(amountReceived) < parseFloat(subscriptionForm.amount_paid))) ||
                (paymentMethod === "gcash" && !referenceNumber.trim())
              }
              className="bg-gray-800 hover:bg-gray-700 text-white"
            >
              {actionLoading === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="max-w-lg" hideClose>
          <DialogHeader>
            <DialogTitle className="sr-only">Subscription Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Transaction completed successfully. Receipt details are displayed below.
            </DialogDescription>
          </DialogHeader>
          {confirmationData && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="text-center space-y-4 pb-6 border-b-2 border-gray-200">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight">CNERGY GYM</h2>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Subscription Receipt</p>
                </div>
                <div className="pt-2 space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-700">Transaction Completed Successfully</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-xs font-medium text-gray-500">Receipt #</span>
                    <span className="text-sm font-bold text-gray-900 font-mono">{confirmationData.receipt_number}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 space-y-4 border border-gray-200">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-gray-600">User Name</span>
                    <span className="text-sm font-semibold text-gray-900">{confirmationData.user_name}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Subscription Plan</span>
                    <span className="text-sm font-semibold text-gray-900">{confirmationData.plan_name}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Payment Method</span>
                    <span className="text-sm font-semibold text-gray-900 capitalize px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full">
                      {confirmationData.payment_method}
                    </span>
                  </div>

                  {confirmationData.payment_method === 'cash' && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Amount Received</span>
                        <span className="text-sm font-semibold text-gray-900">₱{confirmationData.amount_received?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Change</span>
                        <span className="text-base font-bold text-gray-900">₱{confirmationData.change_given?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {confirmationData.payment_method === 'gcash' && confirmationData.reference_number && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">GCash Reference Number</span>
                        <span className="text-sm font-semibold text-gray-900 font-mono">{confirmationData.reference_number}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Section */}
                <div className="flex justify-between items-center py-4 px-2 border-t-2 border-gray-300">
                  <span className="text-lg font-semibold text-gray-900">Total Amount Paid</span>
                  <span className="text-2xl font-bold text-gray-900">₱{confirmationData.total_amount?.toFixed(2)}</span>
                </div>
              </div>

              {/* Footer Message */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">Subscription is now active and ready to use</p>
                <p className="text-xs text-gray-400 mt-2">Thank you for your business!</p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-6 border-t border-gray-200">
            <Button
              onClick={() => {
                setShowConfirmationModal(false)
                setConfirmationData(null)
              }}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineDialog.open} onOpenChange={(open) => setDeclineDialog({ open, subscription: open ? declineDialog.subscription : null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Subscription</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this subscription request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Decline Reason</Label>
              <Textarea
                placeholder="Enter reason for declining..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeclineDialog({ open: false, subscription: null })
                setDeclineReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={actionLoading === declineDialog.subscription?.subscription_id || !declineReason.trim()}
            >
              {actionLoading === declineDialog.subscription?.subscription_id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Decline Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Guest Session Dialog */}
      <Dialog open={isCreateGuestSessionDialogOpen} onOpenChange={setIsCreateGuestSessionDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] overflow-x-hidden" hideClose>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">Guest Session</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Name</Label>
              <Input
                value={guestSessionForm.guest_name}
                onChange={(e) => setGuestSessionForm(prev => ({ ...prev, guest_name: e.target.value }))}
                placeholder="Enter name"
                className="h-11 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
              />
            </div>

            {/* Plan and Price in Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Plan Display */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Plan</Label>
                <Input
                  value={gymSessionPlan?.plan_name || "Gym Session"}
                  disabled
                  className="h-11 text-sm border-gray-300 bg-gray-50 text-gray-700"
                />
              </div>

              {/* Price Display */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Price</Label>
                <Input
                  value={gymSessionPlan ? `₱${parseFloat(gymSessionPlan.price || 0).toFixed(2)}` : "₱0.00"}
                  disabled
                  className="h-11 text-sm border-gray-300 bg-gray-50 font-semibold text-gray-900"
                />
              </div>
            </div>

            {/* Payment Method - Cash and GCash buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGuestSessionForm(prev => ({ ...prev, payment_method: "cash", amount_received: prev.payment_method === "cash" ? prev.amount_received : "" }))}
                  className={`h-10 w-full rounded-lg border-2 transition-all font-medium text-sm ${guestSessionForm.payment_method === "cash"
                    ? "border-gray-900 bg-gray-900 text-white shadow-md"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setGuestSessionForm(prev => ({ ...prev, payment_method: "digital", amount_received: "", gcash_reference: prev.payment_method === "digital" ? prev.gcash_reference : "" }))}
                  className={`h-10 w-full rounded-lg border-2 transition-all font-medium text-sm ${guestSessionForm.payment_method === "digital"
                    ? "border-gray-900 bg-gray-900 text-white shadow-md"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                >
                  GCash
                </button>
              </div>
            </div>

            {/* GCash Reference Number (for GCash only) */}
            {guestSessionForm.payment_method === "digital" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Reference Number <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  value={guestSessionForm.gcash_reference}
                  onChange={(e) => setGuestSessionForm(prev => ({ ...prev, gcash_reference: e.target.value }))}
                  placeholder="Enter GCash reference number"
                  className="h-11 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
                  required
                />
                <p className="text-xs text-gray-500">Required for GCash transactions</p>
              </div>
            )}

            {/* Amount Received (for cash only) */}
            {guestSessionForm.payment_method === "cash" && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Amount Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={guestSessionForm.amount_received}
                  onChange={(e) => setGuestSessionForm(prev => ({ ...prev, amount_received: e.target.value }))}
                  placeholder="Enter amount received"
                  className="h-11 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {guestSessionForm.amount_received && gymSessionPlan && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Change:</span>
                      <span className="text-base font-bold text-gray-900">₱{guestSessionChangeGiven.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsCreateGuestSessionDialogOpen(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGuestSession}
              disabled={
                guestSessionLoading ||
                !guestSessionForm.guest_name ||
                !gymSessionPlan ||
                (guestSessionForm.payment_method === "cash" && (!guestSessionForm.amount_received || parseFloat(guestSessionForm.amount_received) < parseFloat(gymSessionPlan.price || 0))) ||
                (guestSessionForm.payment_method === "digital" && !guestSessionForm.gcash_reference)
              }
              className="bg-gray-900 hover:bg-gray-800 text-white font-semibold"
            >
              {guestSessionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Session Receipt Modal */}
      <Dialog open={showGuestReceipt} onOpenChange={setShowGuestReceipt}>
        <DialogContent className="max-w-lg" hideClose>
          <DialogHeader>
            <DialogTitle className="sr-only">Guest Session Receipt</DialogTitle>
            <DialogDescription className="sr-only">
              Transaction completed successfully. Receipt details are displayed below.
            </DialogDescription>
          </DialogHeader>
          {lastGuestTransaction && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="text-center space-y-4 pb-6 border-b-2 border-gray-200">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight">CNERGY GYM</h2>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Guest Session Receipt</p>
                </div>
                <div className="pt-2 space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-700">Transaction Completed Successfully</p>
                  </div>
                  {lastGuestTransaction.payment_method === "digital" && lastGuestTransaction.reference_number ? (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-xs font-medium text-gray-500">Reference:</span>
                      <span className="text-sm font-bold text-gray-900 font-mono">{lastGuestTransaction.reference_number}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-xs font-medium text-gray-500">Receipt #</span>
                      <span className="text-sm font-bold text-gray-900 font-mono">{lastGuestTransaction.receipt_number || "N/A"}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 space-y-4 border border-gray-200">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-gray-600">Guest Name</span>
                    <span className="text-sm font-semibold text-gray-900">{lastGuestTransaction.guest_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Plan</span>
                    <span className="text-sm font-semibold text-gray-900">Gym Session</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Payment Method</span>
                    <span className="text-sm font-semibold text-gray-900">{lastGuestTransaction.payment_method === "digital" ? "GCash" : lastGuestTransaction.payment_method.charAt(0).toUpperCase() + lastGuestTransaction.payment_method.slice(1)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Amount Paid</span>
                    <span className="text-base font-bold text-gray-900">₱{parseFloat(lastGuestTransaction.total_amount || 0).toFixed(2)}</span>
                  </div>
                  {lastGuestTransaction.payment_method === "cash" && lastGuestTransaction.amount_received && (
                    <>
                      <div className="flex justify-between items-center py-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-600">Amount Received</span>
                        <span className="text-sm font-semibold text-gray-900">₱{parseFloat(lastGuestTransaction.amount_received).toFixed(2)}</span>
                      </div>
                      {lastGuestTransaction.change_given > 0 && (
                        <div className="flex justify-between items-center py-2 border-t border-gray-200">
                          <span className="text-sm font-medium text-gray-600">Change</span>
                          <span className="text-sm font-semibold text-gray-900">₱{parseFloat(lastGuestTransaction.change_given).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-center text-gray-500">
                  Thank you for choosing CNERGY GYM!
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                setShowGuestReceipt(false)
                setLastGuestTransaction(null)
              }}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={viewDetailsModal.open} onOpenChange={(open) => {
        setViewDetailsModal({ ...viewDetailsModal, open })
        if (!open) {
          setAllUserSubscriptionHistory([])
          setTransactionHistoryPage(1) // Reset pagination when modal closes
          setTransactionHistoryPlanFilter("all") // Reset filter when modal closes
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" hideClose>
          <DialogHeader className="bg-gray-50/80 backdrop-blur-sm rounded-t-lg -m-6 mb-0 px-6 py-4 border-b border-gray-200">
            <div className="space-y-3">
              <DialogTitle className="text-xl font-semibold text-gray-900">Subscription Details</DialogTitle>
              {viewDetailsModal.user && (
                <div className="space-y-0.5">
                  <p className="text-base font-medium text-gray-900">
                    {viewDetailsModal.user.is_guest_session
                      ? viewDetailsModal.user.guest_name
                      : `${viewDetailsModal.user.fname || ''} ${viewDetailsModal.user.mname || ''} ${viewDetailsModal.user.lname || ''}`.trim() || 'Unknown User'}
                  </p>
                  {!viewDetailsModal.user.is_guest_session && viewDetailsModal.user.email && (
                    <p className="text-sm text-gray-500">{viewDetailsModal.user.email}</p>
                  )}
                  {viewDetailsModal.user.is_guest_session && (
                    (viewDetailsModal.user.session_code ||
                      (viewDetailsModal.subscriptions && viewDetailsModal.subscriptions.length > 0 && viewDetailsModal.subscriptions[0].session_code)) && (
                      <p className="text-sm font-mono font-semibold text-gray-700 mt-1">
                        Session Code: <span className="text-gray-900">
                          {viewDetailsModal.user.session_code ||
                            (viewDetailsModal.subscriptions && viewDetailsModal.subscriptions[0].session_code)}
                        </span>
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-6 px-0">
            {viewDetailsModal.subscriptions && viewDetailsModal.subscriptions.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Active Subscriptions
                </h3>
                <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Plan</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Start Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">End Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Remaining</TableHead>
                        {viewDetailsModal.user?.is_guest_session && (
                          <TableHead className="font-semibold text-gray-700">Session Code</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewDetailsModal.subscriptions.map((subscription) => {
                        const timeRemaining = calculateTimeRemaining(subscription.end_date)
                        const daysLeft = calculateDaysLeft(subscription.end_date)
                        const planNameLower = subscription.plan_name?.toLowerCase() || ''
                        const isDay1Session = planNameLower.includes('day 1') || planNameLower.includes('day1')
                        const isWalkIn = planNameLower === 'walk in' || subscription.plan_id === 6

                        return (
                          <React.Fragment key={subscription.id}>
                            <TableRow>
                              <TableCell className="font-medium">{subscription.plan_name}</TableCell>
                              <TableCell>
                                <Badge
                                  className={`${getStatusColor(subscription.display_status || subscription.status_name)} flex items-center gap-1 w-fit`}
                                >
                                  {getStatusIcon(subscription.status_name)}
                                  {subscription.display_status || subscription.status_name}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(subscription.start_date)}</TableCell>
                              <TableCell>{formatDate(subscription.end_date)}</TableCell>
                              <TableCell>
                                {timeRemaining ? (() => {
                                  if (timeRemaining.type === 'expired_minutes') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        {timeRemaining.minutes} minute{timeRemaining.minutes === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'expired_hours') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'expired') {
                                    return (
                                      <Badge className="bg-red-100 text-red-700 border-red-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} ago
                                      </Badge>
                                    )
                                  }
                                  if (isWalkIn || isDay1Session) {
                                    if (timeRemaining.type === 'minutes') {
                                      return (
                                        <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                          {timeRemaining.minutes} minute{timeRemaining.minutes === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                    if (timeRemaining.type === 'hours') {
                                      return (
                                        <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                          {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                        </Badge>
                                      )
                                    }
                                    return (
                                      <Badge className="bg-green-100 text-green-700 border-green-300 font-medium">
                                        {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'minutes') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.minutes} minute{timeRemaining.minutes === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'hours') {
                                    return (
                                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-medium">
                                        {timeRemaining.hours} hour{timeRemaining.hours === 1 ? '' : 's'} left
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'years_months') {
                                    const yearText = timeRemaining.years === 1 ? '1 year' : `${timeRemaining.years} years`
                                    const monthText = timeRemaining.months === 0 ? '' : timeRemaining.months === 1 ? ' and 1 month' : ` and ${timeRemaining.months} months`
                                    return (
                                      <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                        'bg-green-100 text-green-700 border-green-300'
                                        }`}>
                                        {yearText}{monthText} left
                                      </Badge>
                                    )
                                  }
                                  if (timeRemaining.type === 'months_days') {
                                    const monthText = timeRemaining.months === 1 ? '1 month' : `${timeRemaining.months} months`
                                    const daysText = timeRemaining.days === 0 ? '' : timeRemaining.days === 1 ? ' and 1 day' : ` and ${timeRemaining.days} days`
                                    return (
                                      <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                        'bg-green-100 text-green-700 border-green-300'
                                        }`}>
                                        {monthText}{daysText} left
                                      </Badge>
                                    )
                                  }
                                  return (
                                    <Badge className={`font-medium ${daysLeft <= 7 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                      'bg-green-100 text-green-700 border-green-300'
                                      }`}>
                                      {timeRemaining.days} day{timeRemaining.days === 1 ? '' : 's'} left
                                    </Badge>
                                  )
                                })() : <span className="text-slate-500">N/A</span>}
                              </TableCell>
                              {viewDetailsModal.user?.is_guest_session && (
                                <TableCell>
                                  <span className="text-sm font-mono font-semibold text-gray-900">
                                    {subscription.session_code || 'N/A'}
                                  </span>
                                </TableCell>
                              )}
                            </TableRow>
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">No active subscriptions</p>
              </div>
            )}

            {/* Transaction History Section */}
            {allUserSales.length > 0 && (() => {
              // Get unique plan names for filter
              const uniquePlans = [...new Set(allUserSales.map(sale => sale.plan_name).filter(Boolean))]

              // Sort sales by plan_id (Membership first), then by sale_date (latest first)
              const sortedSales = [...allUserSales].sort((a, b) => {
                const planIdA = a.plan_id || 999 // Put items without plan_id at the end
                const planIdB = b.plan_id || 999

                // First sort by plan_id (ascending - so plan 1 comes before plan 2)
                if (planIdA !== planIdB) {
                  return planIdA - planIdB
                }

                // If same plan_id, sort by date (descending - latest first)
                const dateA = new Date(a.sale_date || 0).getTime()
                const dateB = new Date(b.sale_date || 0).getTime()
                return dateB - dateA
              })

              // Filter transactions by selected plan
              const filteredSales = transactionHistoryPlanFilter === "all"
                ? sortedSales
                : sortedSales.filter(sale => sale.plan_name === transactionHistoryPlanFilter)

              const totalFiltered = filteredSales.length
              const totalPages = Math.ceil(totalFiltered / transactionsPerPage)

              return (
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Transaction History</h3>
                    <div className="flex items-center gap-3">
                      <Select
                        value={transactionHistoryPlanFilter}
                        onValueChange={(value) => {
                          setTransactionHistoryPlanFilter(value)
                          setTransactionHistoryPage(1) // Reset to first page when filter changes
                        }}
                      >
                        <SelectTrigger className="h-8 w-40 text-xs border-gray-300">
                          <SelectValue placeholder="Filter by plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Plans</SelectItem>
                          {uniquePlans.map((planName) => (
                            <SelectItem key={planName} value={planName}>
                              {planName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {totalFiltered > transactionsPerPage && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          Showing {((transactionHistoryPage - 1) * transactionsPerPage) + 1}-{Math.min(transactionHistoryPage * transactionsPerPage, totalFiltered)} of {totalFiltered}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {filteredSales.length > 0 ? (
                      filteredSales
                        .slice((transactionHistoryPage - 1) * transactionsPerPage, transactionHistoryPage * transactionsPerPage)
                        .map((sale, idx) => {
                          // Get payment method from multiple possible sources
                          // Check payments array first, then sales table, then subscription table
                          let paymentMethodRaw = 'cash'
                          if (sale.payments && sale.payments.length > 0 && sale.payments[0].payment_method) {
                            paymentMethodRaw = sale.payments[0].payment_method
                          } else if (sale.payment_method) {
                            paymentMethodRaw = sale.payment_method
                          } else if (sale.payment_table_payment_method) {
                            paymentMethodRaw = sale.payment_table_payment_method
                          } else if (sale.subscription_payment_method) {
                            paymentMethodRaw = sale.subscription_payment_method
                          }
                          const paymentMethod = paymentMethodRaw.toLowerCase()
                          const quantity = sale.quantity || sale.detail_quantity || 1

                          return (
                            <div key={sale.id || idx} className="rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors">
                              <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="text-sm font-semibold text-gray-900">{sale.plan_name || 'N/A'}</span>
                                      <span className="text-xs text-gray-600 font-medium">
                                        {quantity}x
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {sale.transaction_status || 'confirmed'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{formatDate(sale.sale_date)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-700">{formatCurrency(sale.total_amount || 0)}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Payment</p>
                                    <span className="text-xs text-gray-700 font-medium">
                                      {paymentMethod === 'digital' || paymentMethod === 'gcash' ? 'GCASH' : paymentMethod.toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">
                                      {paymentMethod === 'digital' || paymentMethod === 'gcash'
                                        ? 'Reference'
                                        : 'Receipt'}
                                    </p>
                                    <p className="text-xs font-mono text-gray-700 break-all">
                                      {paymentMethod === 'digital' || paymentMethod === 'gcash'
                                        ? (sale.reference_number || sale.payment_reference_number || (sale.payments && sale.payments.length > 0 ? sale.payments[0].reference_number : null) || sale.receipt_number || 'N/A')
                                        : (sale.receipt_number || 'N/A')}
                                    </p>
                                  </div>
                                  {sale.session_code && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Session Code</p>
                                      <p className="text-xs font-mono font-semibold text-gray-900">
                                        {sale.session_code}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })) : (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No transactions found for selected plan
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {totalFiltered > transactionsPerPage && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTransactionHistoryPage(prev => Math.max(1, prev - 1))}
                        disabled={transactionHistoryPage === 1}
                        className="h-8 px-3"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= transactionHistoryPage - 1 && page <= transactionHistoryPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={transactionHistoryPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTransactionHistoryPage(page)}
                                className={`h-8 w-8 p-0 ${transactionHistoryPage === page ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}`}
                              >
                                {page}
                              </Button>
                            )
                          } else if (
                            page === transactionHistoryPage - 2 ||
                            page === transactionHistoryPage + 2
                          ) {
                            return (
                              <span key={page} className="px-2 text-gray-400">
                                ...
                              </span>
                            )
                          }
                          return null
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTransactionHistoryPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={transactionHistoryPage >= totalPages}
                        className="h-8 px-3"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsModal({ open: false, user: null, subscriptions: [] })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SubscriptionMonitor
