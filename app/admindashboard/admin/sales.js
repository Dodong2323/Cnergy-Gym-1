"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus,
  ShoppingCart,
  Package,
  TrendingUp,
  Search,
  Edit,
  Trash2,
  Minus,
  Calendar as CalendarIcon,
  User,
  ShoppingBag,
  CheckCircle,
  Users,
  Filter,
  Hash,
  Layers,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  UserCheck,
  LogIn,
  AlertTriangle,
  Clock,
  Store,
  BarChart3,
  Archive,
  RotateCcw,
  RefreshCw,
  X,
  XCircle,
  Receipt,
  Ticket,
  FileText,
  Printer,
} from "lucide-react"

// API Configuration
const API_BASE_URL = "https://api.cnergy.site/sales.php"

const Sales = ({ userId }) => {
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [newProduct, setNewProduct] = useState({ name: "", price: "", stock: "", category: "Uncategorized" })
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)

  // Filter states
  const [analyticsFilter, setAnalyticsFilter] = useState("today")
  const [saleTypeFilter, setSaleTypeFilter] = useState("all") // all, Product, Subscription, Coach Assignment, Session
  const [dateFilter, setDateFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [unifiedSalesFilter, setUnifiedSalesFilter] = useState("all") // all, Product, Subscription, Coach Assignment, Session
  const [allSalesSessionMethodFilter, setAllSalesSessionMethodFilter] = useState("all") // all, with_account, without_account

  // Product Inventory filter states
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [productStockStatusFilter, setProductStockStatusFilter] = useState("all") // all, in_stock, low_stock, out_of_stock
  const [productPriceRangeFilter, setProductPriceRangeFilter] = useState("all") // all, low, medium, high

  // Pagination states
  const [allSalesCurrentPage, setAllSalesCurrentPage] = useState(1)
  const [allSalesItemsPerPage] = useState(15) // 15 entries per page for All Sales
  const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1)
  const [inventoryItemsPerPage] = useState(20) // 20 entries per page for Product Inventory

  // Calendar states
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

  // Cart for multiple products
  const [cart, setCart] = useState([])

  // POS state
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [gcashReference, setGcashReference] = useState("")
  const [changeGiven, setChangeGiven] = useState(0)
  const [receiptNumber, setReceiptNumber] = useState("")
  const [transactionNotes, setTransactionNotes] = useState("")
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Stock management state
  const [stockUpdateProduct, setStockUpdateProduct] = useState(null)
  const [stockUpdateQuantity, setStockUpdateQuantity] = useState("")
  const [stockUpdateType, setStockUpdateType] = useState("add")
  const [isAddOnlyMode, setIsAddOnlyMode] = useState(false)

  // Product edit state
  const [editProduct, setEditProduct] = useState(null)
  const [editProductData, setEditProductData] = useState({ name: "", price: "", category: "Uncategorized" })

  // Archive/Restore state
  const [showArchived, setShowArchived] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [productToArchive, setProductToArchive] = useState(null)

  // Toast notifications
  const { toast } = useToast()

  // Low stock dialog state
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false)

  // Stock error modal state
  const [stockErrorModalOpen, setStockErrorModalOpen] = useState(false)
  const [stockErrorData, setStockErrorData] = useState({ productName: "", availableStock: 0, requestedQuantity: 0 })

  // Success notification state
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false)

  // Coaching Sales dialog state
  const [coachingSalesDialogOpen, setCoachingSalesDialogOpen] = useState(false)
  const [coaches, setCoaches] = useState([])
  const [selectedCoachFilter, setSelectedCoachFilter] = useState("all")
  const [memberAssignments, setMemberAssignments] = useState({}) // Map of member_id -> assignment details
  const [coachingStatusFilter, setCoachingStatusFilter] = useState("all") // all, active, or expired
  const [coachingStartDate, setCoachingStartDate] = useState(null)
  const [coachingEndDate, setCoachingEndDate] = useState(null)
  const [coachingServiceTypeFilter, setCoachingServiceTypeFilter] = useState("all") // all, session, monthly
  const [coachingSalesQuickFilter, setCoachingSalesQuickFilter] = useState("today") // "all", "today", "thisWeek", "thisMonth"
  const [coachingSalesSearchQuery, setCoachingSalesSearchQuery] = useState("")
  const [coachingCurrentPage, setCoachingCurrentPage] = useState(1)
  const [coachingItemsPerPage] = useState(10)


  // Total Sales dialog state
  const [totalSalesDialogOpen, setTotalSalesDialogOpen] = useState(false)
  const [totalSalesSearchQuery, setTotalSalesSearchQuery] = useState("")
  const [totalSalesTypeFilter, setTotalSalesTypeFilter] = useState("all")
  const [totalSalesStartDate, setTotalSalesStartDate] = useState(null)
  const [totalSalesEndDate, setTotalSalesEndDate] = useState(null)
  const [totalSalesQuickFilter, setTotalSalesQuickFilter] = useState("today") // "all", "today", "thisWeek", "thisMonth"
  const [totalSalesCurrentPage, setTotalSalesCurrentPage] = useState(1)
  const [totalSalesItemsPerPage] = useState(10)
  const [totalSalesSubscriptionPlans, setTotalSalesSubscriptionPlans] = useState([])
  const [totalSalesSubscriptionTypeFilter, setTotalSalesSubscriptionTypeFilter] = useState("all") // all, regular, day_pass, or plan_id
  const [dayPassMethodFilter, setDayPassMethodFilter] = useState("all") // all, with_account, without_account
  const [dayPassTypeFilter, setDayPassTypeFilter] = useState("all") // all, day_pass, guest - filters Day Pass vs Guest type
  const [gymSessionTypeFilter, setGymSessionTypeFilter] = useState("all") // all, subscription, guest - filters Gym Session by type
  const [totalSalesCategoryFilter, setTotalSalesCategoryFilter] = useState("all") // all, or category name
  const [totalSalesProductFilter, setTotalSalesProductFilter] = useState("all") // all, or product id
  const [totalSalesCoaches, setTotalSalesCoaches] = useState([])
  const [totalSalesCoachFilter, setTotalSalesCoachFilter] = useState("all") // all, or coach id
  const [totalSalesServiceTypeFilter, setTotalSalesServiceTypeFilter] = useState("all") // all, session, monthly

  // Product Sales dialog state
  const [productSalesDialogOpen, setProductSalesDialogOpen] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all")
  const [selectedProductFilter, setSelectedProductFilter] = useState("all")
  const [productSalesSearchQuery, setProductSalesSearchQuery] = useState("")
  const [productSalesStartDate, setProductSalesStartDate] = useState(null)
  const [productSalesEndDate, setProductSalesEndDate] = useState(null)
  const [productSalesQuickFilter, setProductSalesQuickFilter] = useState("today") // "all", "today", "thisWeek", "thisMonth"
  const [productSalesCurrentPage, setProductSalesCurrentPage] = useState(1)
  const [productSalesItemsPerPage] = useState(10)

  // Subscription Sales dialog state
  const [subscriptionSalesDialogOpen, setSubscriptionSalesDialogOpen] = useState(false)
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("all")
  const [subscriptionDetails, setSubscriptionDetails] = useState({}) // Map of sale_id -> subscription details
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState("all") // all, active, or expired
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(null)
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null)
  const [subscriptionSalesQuickFilter, setSubscriptionSalesQuickFilter] = useState("today") // "all", "today", "thisWeek", "thisMonth"
  const [subscriptionSalesSearchQuery, setSubscriptionSalesSearchQuery] = useState("")
  const [subscriptionDayPassTypeFilter, setSubscriptionDayPassTypeFilter] = useState("all") // all, day_pass, guest - filters Day Pass vs Guest type
  const [subscriptionGymSessionTypeFilter, setSubscriptionGymSessionTypeFilter] = useState("all") // all, subscription, guest - filters Gym Session by type
  const [subscriptionCurrentPage, setSubscriptionCurrentPage] = useState(1)
  const [subscriptionItemsPerPage] = useState(10)

  // Data from API
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [analytics, setAnalytics] = useState({
    todaysSales: 0,
    productsSoldToday: 0,
    lowStockItems: 0,
    monthlyRevenue: 0,
    productSales: 0,
    subscriptionSales: 0,
    coachAssignmentSales: 0,
    totalSales: 0,
    totalProductSales: 0,
    totalSubscriptionSales: 0,
  })

  // Helper function to get today's date in Philippine time (YYYY-MM-DD format)
  const getTodayInPHTime = () => {
    const now = new Date()
    const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
    const year = phTime.getFullYear()
    const month = String(phTime.getMonth() + 1).padStart(2, '0')
    const day = String(phTime.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Load initial data
  useEffect(() => {
    loadInitialData()

    // Check for navigation parameters from home page
    const navParams = localStorage.getItem('adminNavParams')
    if (navParams) {
      try {
        const params = JSON.parse(navParams)
        if (params.openModal === 'totalSales') {
          // Set today's date filter
          if (params.useCustomDate && params.customDate) {
            const customDate = new Date(params.customDate)
            setTotalSalesStartDate(customDate)
            setTotalSalesEndDate(customDate)
          }
          // Set quick filter to today
          setTotalSalesQuickFilter("today")
          // Open the modal
          setTimeout(() => {
            setTotalSalesDialogOpen(true)
          }, 500) // Small delay to ensure page is loaded
        }
        // Clear the navigation params after using them
        localStorage.removeItem('adminNavParams')
        localStorage.removeItem('adminNavTarget')
      } catch (e) {
        console.error('Error parsing nav params:', e)
      }
    }
  }, [])

  // Reset quick filter to "today" when modal opens
  useEffect(() => {
    if (totalSalesDialogOpen) {
      setTotalSalesQuickFilter("today")
      // Set today's date in Philippine time
      const todayPH = getTodayInPHTime()
      const todayDate = new Date(todayPH + "T00:00:00")
      setTotalSalesStartDate(todayDate)
      setTotalSalesEndDate(todayDate)
    }
  }, [totalSalesDialogOpen])

  // Reload analytics when filter changes
  useEffect(() => {
    loadAnalytics()
  }, [analyticsFilter, startDate, endDate])

  // Reload sales when filters change
  useEffect(() => {
    loadSales()
  }, [saleTypeFilter, dateFilter, startDate, endDate])

  // Load coaches when coaching sales dialog opens
  useEffect(() => {
    if (coachingSalesDialogOpen) {
      loadCoaches()
      // Set default to "today" when dialog opens
      setCoachingSalesQuickFilter("today")
      const todayPH = getTodayInPHTime()
      const todayDate = new Date(todayPH + "T00:00:00")
      setCoachingStartDate(todayDate)
      setCoachingEndDate(todayDate)
    }
  }, [coachingSalesDialogOpen])

  // Load member assignments when coaching sales dialog opens
  useEffect(() => {
    if (coachingSalesDialogOpen) {
      loadMemberAssignments()
    } else {
      setMemberAssignments({})
      setCoachingCurrentPage(1) // Reset to first page when dialog closes
    }
  }, [coachingSalesDialogOpen])

  // Reset to first page when filters change
  useEffect(() => {
    setCoachingCurrentPage(1)
  }, [selectedCoachFilter, coachingStartDate, coachingEndDate, coachingServiceTypeFilter, coachingSalesQuickFilter, coachingSalesSearchQuery])

  // Reset to first page when total sales dialog filters change
  useEffect(() => {
    setTotalSalesCurrentPage(1)
  }, [totalSalesTypeFilter, totalSalesStartDate, totalSalesEndDate, totalSalesSearchQuery, totalSalesSubscriptionTypeFilter, dayPassMethodFilter, dayPassTypeFilter, gymSessionTypeFilter, totalSalesCategoryFilter, totalSalesProductFilter, totalSalesCoachFilter, totalSalesServiceTypeFilter, totalSalesQuickFilter])

  // Reset filters when total sales dialog closes
  useEffect(() => {
    if (!totalSalesDialogOpen) {
      setTotalSalesSearchQuery("")
      setTotalSalesTypeFilter("all")
      setTotalSalesStartDate(null)
      setTotalSalesEndDate(null)
      setTotalSalesCurrentPage(1)
      setTotalSalesSubscriptionTypeFilter("all")
      setDayPassMethodFilter("all")
      setDayPassTypeFilter("all")
      setGymSessionTypeFilter("all")
      setTotalSalesCategoryFilter("all")
      setTotalSalesProductFilter("all")
      setTotalSalesCoachFilter("all")
      setTotalSalesServiceTypeFilter("all")
    }
  }, [totalSalesDialogOpen])

  // Reset day pass method filter when type filter changes away from Day Pass
  // Reset subscription type and day pass method filters when type changes away from Subscription
  // Reset product filters when type filter changes away from Product
  useEffect(() => {
    if (totalSalesTypeFilter !== "Subscription") {
      setTotalSalesSubscriptionTypeFilter("all")
      setDayPassMethodFilter("all")
      setDayPassTypeFilter("all")
      setGymSessionTypeFilter("all")
    }
    if (totalSalesTypeFilter !== "Product") {
      setTotalSalesCategoryFilter("all")
      setTotalSalesProductFilter("all")
    }
    if (totalSalesTypeFilter !== "Coach Assignment") {
      setTotalSalesCoachFilter("all")
      setTotalSalesServiceTypeFilter("all")
    }
  }, [totalSalesTypeFilter])

  // Reset gym session type filter when plan changes away from Gym Session
  useEffect(() => {
    if (totalSalesTypeFilter === "Subscription" && totalSalesSubscriptionTypeFilter !== "all") {
      const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === totalSalesSubscriptionTypeFilter.toString())
      const isGymSessionPlan = selectedPlan && (
        selectedPlan.name.toLowerCase().includes('gym session') ||
        selectedPlan.name.toLowerCase().includes('gymsession')
      ) && !(
        selectedPlan.name.toLowerCase().includes('day pass') ||
        selectedPlan.name.toLowerCase().includes('daypass') ||
        selectedPlan.name.toLowerCase().includes('walk-in') ||
        selectedPlan.name.toLowerCase().includes('walkin') ||
        selectedPlan.name.toLowerCase().includes('guest')
      )

      if (!isGymSessionPlan) {
        setGymSessionTypeFilter("all")
      }
    } else if (totalSalesTypeFilter !== "Subscription" || totalSalesSubscriptionTypeFilter === "all") {
      setGymSessionTypeFilter("all")
    }
  }, [totalSalesTypeFilter, totalSalesSubscriptionTypeFilter, totalSalesSubscriptionPlans])

  // Reset session method filter when sale type filter changes away from Session in All Sales tab
  useEffect(() => {
    if (saleTypeFilter !== "Session") {
      setAllSalesSessionMethodFilter("all")
    }
  }, [saleTypeFilter])

  // Reset to first page when product sales dialog filters change
  useEffect(() => {
    setProductSalesCurrentPage(1)
  }, [selectedCategoryFilter, selectedProductFilter, productSalesStartDate, productSalesEndDate, productSalesSearchQuery, productSalesQuickFilter])

  // Reset quick filter to "today" when product sales modal opens
  useEffect(() => {
    if (productSalesDialogOpen) {
      setProductSalesQuickFilter("today")
      // Set today's date in Philippine time
      const todayPH = getTodayInPHTime()
      const todayDate = new Date(todayPH + "T00:00:00")
      setProductSalesStartDate(todayDate)
      setProductSalesEndDate(todayDate)
    }
  }, [productSalesDialogOpen])

  // Reset filters when product sales dialog closes
  useEffect(() => {
    if (!productSalesDialogOpen) {
      setSelectedCategoryFilter("all")
      setSelectedProductFilter("all")
      setProductSalesSearchQuery("")
      setProductSalesStartDate(null)
      setProductSalesEndDate(null)
      setProductSalesCurrentPage(1)
      setProductSalesQuickFilter("today")
    }
  }, [productSalesDialogOpen])

  // Load subscription plans when subscription sales dialog opens
  useEffect(() => {
    if (subscriptionSalesDialogOpen) {
      loadSubscriptionPlans()
    }
  }, [subscriptionSalesDialogOpen])

  // Reset quick filter to "today" when subscription sales modal opens
  useEffect(() => {
    if (subscriptionSalesDialogOpen) {
      setSubscriptionSalesQuickFilter("today")
      // Set today's date in Philippine time
      const todayPH = getTodayInPHTime()
      const todayDate = new Date(todayPH + "T00:00:00")
      setSubscriptionStartDate(todayDate)
      setSubscriptionEndDate(todayDate)
    }
  }, [subscriptionSalesDialogOpen])

  // Load subscription plans when total sales dialog opens
  useEffect(() => {
    if (totalSalesDialogOpen) {
      loadTotalSalesSubscriptionPlans()
      loadTotalSalesCoaches()
    }
  }, [totalSalesDialogOpen])

  // Load subscription details when modal opens and sales are available
  useEffect(() => {
    if (subscriptionSalesDialogOpen && sales.length > 0) {
      loadSubscriptionDetails()
    } else if (!subscriptionSalesDialogOpen) {
      setSubscriptionDetails({})
      setSubscriptionCurrentPage(1) // Reset to first page when dialog closes
    }
  }, [subscriptionSalesDialogOpen, sales])

  // Reset to first page when subscription filters change
  useEffect(() => {
    setSubscriptionCurrentPage(1)
  }, [selectedPlanFilter, subscriptionStartDate, subscriptionEndDate, subscriptionDayPassTypeFilter, subscriptionGymSessionTypeFilter])

  // Reset gym session type filter when plan changes away from Gym Session
  useEffect(() => {
    if (selectedPlanFilter !== "all") {
      const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter.toString())
      const isDayPassPlan = selectedPlan && (
        selectedPlan.name.toLowerCase().includes('day pass') ||
        selectedPlan.name.toLowerCase().includes('daypass') ||
        selectedPlan.name.toLowerCase().includes('walk-in') ||
        selectedPlan.name.toLowerCase().includes('walkin') ||
        selectedPlan.name.toLowerCase().includes('guest')
      )
      const isGymSessionPlan = selectedPlan && (
        selectedPlan.name.toLowerCase().includes('gym session') ||
        selectedPlan.name.toLowerCase().includes('gymsession')
      ) && !isDayPassPlan

      if (!isGymSessionPlan) {
        setSubscriptionGymSessionTypeFilter("all")
      }
    } else {
      setSubscriptionGymSessionTypeFilter("all")
    }
  }, [selectedPlanFilter, subscriptionPlans])

  // Calculate total sales with discount consideration
  const calculateTotalSales = (salesData) => {
    return salesData.reduce((total, sale) => {
      // If the sale has discount info, use the discounted amount
      if (sale.discount_amount && sale.discount_amount > 0) {
        return total + (sale.amount - sale.discount_amount);
      }
      // Otherwise use the regular amount
      return total + sale.amount;
    }, 0);
  }

  const loadInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadProducts(), loadSales(), loadAnalytics()])
    } catch (error) {
      console.error("Error loading initial data:", error)
      alert("Error loading data. Please refresh the page.")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      await Promise.all([loadProducts(), loadSales(), loadAnalytics()])
    } catch (error) {
      console.error("Error refreshing data:", error)
      alert("Error refreshing data. Please try again.")
    } finally {
      setLoading(false)
    }
  }


  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=products${showArchived ? '&archived=1' : ''}`, {
        timeout: 30000 // 30 second timeout
      })
      console.log("Products loaded:", response.data.products)
      setProducts(response.data.products || [])
    } catch (error) {
      console.error("Error loading products:", error)
    }
  }

  // Reload products when archive view changes
  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  const loadCoaches = async () => {
    try {
      const response = await axios.get("https://api.cnergy.site/addcoach.php")
      if (response.data && response.data.coaches) {
        const coaches = response.data.coaches.map(coach => ({
          id: coach.id,
          name: `${coach.fname} ${coach.mname || ''} ${coach.lname}`.trim()
        }))
        setCoaches(coaches)
      }
    } catch (error) {
      console.error("Error loading coaches:", error)
    }
  }

  const loadTotalSalesCoaches = async () => {
    try {
      const response = await axios.get("https://api.cnergy.site/addcoach.php")
      if (response.data && response.data.coaches) {
        const coaches = response.data.coaches.map(coach => ({
          id: coach.id,
          name: `${coach.fname} ${coach.mname || ''} ${coach.lname}`.trim(),
          fullName: `${coach.fname} ${coach.mname || ''} ${coach.lname}`.trim()
        }))
        setTotalSalesCoaches(coaches)
        console.log("Loaded coaches for All Sales:", coaches)
      }
    } catch (error) {
      console.error("Error loading coaches for All Sales:", error)
    }
  }

  // Calculate member count per coach from sales data
  const getMemberCountForCoach = (coachId) => {
    const coachingSales = sales.filter(sale => {
      const isCoachingSale = sale.sale_type === 'Coaching' ||
        sale.sale_type === 'Coach Assignment' ||
        sale.sale_type === 'Coach'
      return isCoachingSale && sale.coach_id && sale.coach_id.toString() === coachId.toString()
    })

    // Get unique member IDs
    const uniqueMemberIds = new Set()
    coachingSales.forEach(sale => {
      if (sale.user_id) {
        uniqueMemberIds.add(sale.user_id)
      }
    })

    return uniqueMemberIds.size
  }

  // Load member assignments to get end dates and days left for each member
  const loadMemberAssignments = async () => {
    try {
      const response = await axios.get(`https://api.cnergy.site/admin_coach.php?action=assigned-members`)
      if (response.data && response.data.success && response.data.assignments && response.data.assignments.length > 0) {
        const assignmentsMap = {}

        response.data.assignments.forEach(assignment => {
          const memberId = assignment.member?.id || assignment.member_id
          const coachId = assignment.coach?.id || assignment.coach_id

          if (memberId && coachId) {
            const key = `${memberId}_${coachId}`

            // Only keep the most recent active assignment for each member-coach pair
            if (!assignmentsMap[key] || assignment.status === 'active') {
              const endDate = assignment.expires_at || assignment.expiresAt
              let daysLeft = null

              if (endDate) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const expiry = new Date(endDate)
                expiry.setHours(0, 0, 0, 0)
                const diffTime = expiry - today
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              }

              assignmentsMap[key] = {
                endDate,
                daysLeft,
                startDate: assignment.staff_approved_at || assignment.assignedAt || assignment.created_at,
                rateType: assignment.rateType || assignment.rate_type || 'monthly',
                assignmentType: assignment.assignment_type || assignment.rateType || assignment.rate_type || 'monthly'
              }
            }
          }
        })

        setMemberAssignments(assignmentsMap)
      }
    } catch (error) {
      console.error("Error loading member assignments:", error)
      setMemberAssignments({})
    }
  }

  // Get assignment details for a specific member and coach
  const getMemberAssignmentDetails = (memberId, coachId) => {
    if (!memberId || !coachId) return null
    const key = `${memberId}_${coachId}`
    return memberAssignments[key] || null
  }

  // Calculate time remaining with hours when 1 day or less
  const calculateTimeRemaining = (endDate, daysLeft) => {
    if (daysLeft === null || daysLeft === undefined || !endDate) return null

    // If expired, return null (will be handled separately)
    if (daysLeft < 0) return null

    const now = new Date()
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999) // Set to end of day
    const diffTime = end.getTime() - now.getTime()

    if (diffTime < 0) return null

    const totalHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    // If 1 day or less remaining, show hours
    if (diffDays <= 1) {
      return { type: 'hours', days: diffDays, hours: totalHours }
    }

    // Otherwise show days using the passed daysLeft value (more accurate)
    return { type: 'days', days: daysLeft }
  }

  // Load subscription details to get end dates and status for each subscription sale
  const loadSubscriptionDetails = async () => {
    try {
      // Get all subscription sales
      const subscriptionSales = sales.filter(sale => sale.sale_type === 'Subscription')

      if (subscriptionSales.length === 0) {
        setSubscriptionDetails({})
        return
      }

      // Fetch all subscriptions from API
      const response = await axios.get(`https://api.cnergy.site/monitor_subscription.php`)
      if (!response.data || !response.data.success || !response.data.subscriptions) {
        setSubscriptionDetails({})
        return
      }

      const allSubscriptions = response.data.subscriptions
      const detailsMap = {}
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Process each subscription sale
      subscriptionSales.forEach(sale => {
        let matchedSubscription = null

        // Method 1: Try to match by subscription_id from sales_details
        if (sale.sales_details && sale.sales_details.length > 0) {
          for (const detail of sale.sales_details) {
            if (detail.subscription_id) {
              matchedSubscription = allSubscriptions.find(sub =>
                sub.id === detail.subscription_id ||
                sub.id.toString() === detail.subscription_id.toString()
              )
              if (matchedSubscription) break
            }
          }
        }

        // Method 2: If no match, try to match by user_id, plan_id, and sale_date proximity
        if (!matchedSubscription && sale.user_id) {
          const saleDate = new Date(sale.sale_date)
          saleDate.setHours(0, 0, 0, 0)

          // Find subscriptions for this user
          const userSubscriptions = allSubscriptions.filter(sub =>
            sub.user_id === sale.user_id ||
            sub.user_id?.toString() === sale.user_id?.toString()
          )

          // Try to match by plan_id if available
          if (sale.plan_id) {
            matchedSubscription = userSubscriptions.find(sub => {
              if (sub.plan_id === sale.plan_id || sub.plan_id?.toString() === sale.plan_id?.toString()) {
                // Check if sale_date is close to subscription start_date (within 7 days)
                const subStartDate = new Date(sub.start_date)
                subStartDate.setHours(0, 0, 0, 0)
                const daysDiff = Math.abs((saleDate - subStartDate) / (1000 * 60 * 60 * 24))
                return daysDiff <= 7
              }
              return false
            })
          }

          // Method 3: If still no match, try to match by plan_name and date
          if (!matchedSubscription && sale.plan_name) {
            matchedSubscription = userSubscriptions.find(sub => {
              if (sub.plan_name === sale.plan_name || sub.plan?.plan_name === sale.plan_name) {
                const subStartDate = new Date(sub.start_date)
                subStartDate.setHours(0, 0, 0, 0)
                const daysDiff = Math.abs((saleDate - subStartDate) / (1000 * 60 * 60 * 24))
                return daysDiff <= 7
              }
              return false
            })
          }

          // Method 4: If still no match, find the most recent subscription for this user
          // that started before or on the sale date
          if (!matchedSubscription && userSubscriptions.length > 0) {
            matchedSubscription = userSubscriptions
              .filter(sub => {
                const subStartDate = new Date(sub.start_date)
                subStartDate.setHours(0, 0, 0, 0)
                return subStartDate <= saleDate
              })
              .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0]
          }
        }

        // If we found a match, calculate days left and store details
        if (matchedSubscription) {
          const endDate = matchedSubscription.end_date
          let daysLeft = null

          if (endDate) {
            const expiry = new Date(endDate)
            expiry.setHours(0, 0, 0, 0)
            const diffTime = expiry - today
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          }

          // Get user name from subscription (fname, mname, lname)
          let userName = null
          if (matchedSubscription.fname || matchedSubscription.lname) {
            const nameParts = []
            if (matchedSubscription.fname) nameParts.push(matchedSubscription.fname)
            if (matchedSubscription.mname) nameParts.push(matchedSubscription.mname)
            if (matchedSubscription.lname) nameParts.push(matchedSubscription.lname)
            userName = nameParts.join(' ').trim()
          }

          detailsMap[sale.id] = {
            endDate: endDate,
            daysLeft: daysLeft,
            status: matchedSubscription.display_status || matchedSubscription.status_name || 'unknown',
            planName: matchedSubscription.plan_name || sale.plan_name || 'Unknown Plan',
            userName: userName || null,
            userId: matchedSubscription.user_id || sale.user_id || null
          }
        } else {
          // If no match found, still create an entry but mark it as unknown
          // This ensures all subscription sales are shown even if we can't match them
          detailsMap[sale.id] = {
            endDate: null,
            daysLeft: null,
            status: 'unknown',
            planName: sale.plan_name || 'Unknown Plan',
            userName: null,
            userId: sale.user_id || null
          }
        }
      })

      setSubscriptionDetails(detailsMap)
    } catch (error) {
      console.error("Error loading subscription details:", error)
      // On error, still set empty map so UI doesn't break
      setSubscriptionDetails({})
    }
  }

  // Get subscription details for a sale
  const getSubscriptionDetails = (saleId) => {
    return subscriptionDetails[saleId] || null
  }

  const loadSubscriptionPlans = async () => {
    try {
      const response = await axios.get("https://api.cnergy.site/monitor_subscription.php?action=plans")
      if (response.data && response.data.plans) {
        const plans = response.data.plans.map(plan => ({
          id: plan.id,
          name: plan.plan_name,
          duration_days: plan.duration_days || 0,
          duration_months: plan.duration_months || 0
        }))
        setSubscriptionPlans(plans)
        console.log("Loaded subscription plans:", plans)
      }
    } catch (error) {
      console.error("Error loading subscription plans:", error)
      // If that endpoint doesn't work, try fetching from monitor_subscription
      try {
        const altResponse = await axios.get("https://api.cnergy.site/monitor_subscription.php")
        if (altResponse.data && altResponse.data.plans) {
          const plans = altResponse.data.plans.map(plan => ({
            id: plan.id,
            name: plan.plan_name,
            duration_days: plan.duration_days || 0,
            duration_months: plan.duration_months || 0
          }))
          setSubscriptionPlans(plans)
          console.log("Loaded subscription plans from alternative endpoint:", plans)
        }
      } catch (altError) {
        console.error("Error loading subscription plans from alternative endpoint:", altError)
      }
    }
  }

  const loadTotalSalesSubscriptionPlans = async () => {
    try {
      const response = await axios.get("https://api.cnergy.site/monitor_subscription.php?action=plans")
      if (response.data && response.data.plans) {
        const plans = response.data.plans.map(plan => ({
          id: plan.id,
          name: plan.plan_name,
          duration_days: plan.duration_days || 0,
          duration_months: plan.duration_months || 0
        }))
        setTotalSalesSubscriptionPlans(plans)
        console.log("Loaded subscription plans for All Sales:", plans)
      }
    } catch (error) {
      console.error("Error loading subscription plans for All Sales:", error)
      // If that endpoint doesn't work, try fetching from monitor_subscription
      try {
        const altResponse = await axios.get("https://api.cnergy.site/monitor_subscription.php")
        if (altResponse.data && altResponse.data.plans) {
          const plans = altResponse.data.plans.map(plan => ({
            id: plan.id,
            name: plan.plan_name,
            duration_days: plan.duration_days || 0,
            duration_months: plan.duration_months || 0
          }))
          setTotalSalesSubscriptionPlans(plans)
          console.log("Loaded subscription plans from alternative endpoint for All Sales:", plans)
        }
      } catch (altError) {
        console.error("Error loading subscription plans from alternative endpoint for All Sales:", altError)
      }
    }
  }

  const loadSales = async () => {
    try {
      const params = new URLSearchParams()
      if (saleTypeFilter !== "all" && saleTypeFilter !== "Coach Assignment") {
        // Map filter values to backend expected values
        let backendSaleType = saleTypeFilter
        if (saleTypeFilter === "Session") {
          backendSaleType = "Guest" // Backend uses "Guest" for day pass
        }
        params.append("sale_type", backendSaleType)
      }
      if (dateFilter !== "all") {
        params.append("date_filter", dateFilter)
      }
      if (startDate) {
        params.append("start_date", format(startDate, "yyyy-MM-dd"))
      }
      if (endDate) {
        params.append("end_date", format(endDate, "yyyy-MM-dd"))
      }

      const response = await axios.get(`${API_BASE_URL}?action=sales&${params.toString()}`, {
        timeout: 30000 // 30 second timeout
      })
      const salesData = response.data.sales || []
      // Log payment methods for debugging
      const subscriptionSales = salesData.filter(s => s.sale_type === 'Subscription')
      if (subscriptionSales.length > 0) {
        console.log("🔍 DEBUG - Subscription sales payment methods:", subscriptionSales.map(s => ({
          id: s.id,
          receipt: s.receipt_number,
          payment_method: s.payment_method,
          payment_method_type: typeof s.payment_method,
          payment_method_value: JSON.stringify(s.payment_method),
          formatted: formatPaymentMethod(s.payment_method)
        })))
        // Also log the most recent ones
        const recentGCash = subscriptionSales.filter(s => {
          const pm = (s.payment_method || '').toLowerCase().trim()
          return pm === 'gcash' || pm === 'digital'
        })
        console.log("🔍 DEBUG - Recent GCash subscriptions:", recentGCash.slice(-5).map(s => ({
          id: s.id,
          receipt: s.receipt_number,
          payment_method: s.payment_method,
          formatted: formatPaymentMethod(s.payment_method)
        })))
        // Log the most recent 10 subscriptions to see their payment methods
        console.log("🔍 DEBUG - Most recent 10 subscriptions:", subscriptionSales.slice(-10).map(s => ({
          id: s.id,
          receipt: s.receipt_number,
          payment_method: s.payment_method,
          payment_method_type: typeof s.payment_method,
          payment_method_length: s.payment_method ? s.payment_method.length : 0,
          formatted: formatPaymentMethod(s.payment_method)
        })))
      }
      setSales(salesData)
    } catch (error) {
      console.error("Error loading sales:", error)
    }
  }

  const loadAnalytics = async () => {
    try {
      const params = new URLSearchParams()

      // Handle custom date first (highest priority)
      // Use date range if set, otherwise use period filter
      if (startDate || endDate) {
        if (startDate) {
          params.append("start_date", format(startDate, "yyyy-MM-dd"))
        }
        if (endDate) {
          params.append("end_date", format(endDate, "yyyy-MM-dd"))
        }
      } else {
        params.append("period", analyticsFilter)
      }

      const response = await axios.get(`${API_BASE_URL}?action=analytics&${params.toString()}`, {
        timeout: 30000 // 30 second timeout
      })
      setAnalytics(
        response.data.analytics || {
          todaysSales: 0,
          productsSoldToday: 0,
          lowStockItems: 0,
          monthlyRevenue: 0,
          productSales: 0,
          subscriptionSales: 0,
          coachAssignmentSales: 0,
          totalSales: 0,
          totalProductSales: 0,
          totalSubscriptionSales: 0,
        },
      )
    } catch (error) {
      console.error("Error loading analytics:", error)
    }
  }

  const addToCart = () => {
    if (!selectedProduct) {
      alert("Please select a product")
      return
    }

    const product = getFilteredProducts().find((p) => p.id == selectedProduct || p.id === Number.parseInt(selectedProduct))
    if (!product) {
      console.log("Selected product ID:", selectedProduct)
      console.log("Available products:", products)
      alert("Product not found!")
      return
    }

    if (product.stock < quantity) {
      setStockErrorData({
        productName: product.name,
        availableStock: product.stock,
        requestedQuantity: quantity
      })
      setStockErrorModalOpen(true)
      return
    }

    // Check if product already in cart
    const existingItemIndex = cart.findIndex((item) => item.product.id === product.id)
    if (existingItemIndex >= 0) {
      // Update quantity to the new value (replace, not add)
      const updatedCart = [...cart]
      if (quantity > product.stock) {
        setStockErrorData({
          productName: product.name,
          availableStock: product.stock,
          requestedQuantity: quantity
        })
        setStockErrorModalOpen(true)
        return
      }
      updatedCart[existingItemIndex].quantity = quantity
      updatedCart[existingItemIndex].price = product.price * quantity
      setCart(updatedCart)
    } else {
      // Add new item to cart
      const cartItem = {
        product: product,
        quantity: quantity,
        price: product.price * quantity,
      }
      setCart([...cart, cartItem])
    }

    // Reset form
    setSelectedProduct("")
    setQuantity(1)
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    const product = getFilteredProducts().find((p) => p.id == productId || p.id === Number.parseInt(productId))
    if (!product) {
      alert("Product not found!")
      return
    }

    if (newQuantity > product.stock) {
      setStockErrorData({
        productName: product.name,
        availableStock: product.stock,
        requestedQuantity: newQuantity
      })
      setStockErrorModalOpen(true)
      return
    }

    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQuantity, price: product.price * newQuantity } : item,
      ),
    )
  }

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.price, 0)
  }

  const handleProductSale = async () => {
    if (cart.length === 0) {
      alert("Please add products to cart")
      return
    }

    // Validate payment method and amount for cash payments
    if (paymentMethod === "cash" && (!amountReceived || parseFloat(amountReceived) < getTotalAmount())) {
      alert("Please enter a valid amount received for cash payment")
      return
    }

    // Validate GCash reference for GCash payments
    if (paymentMethod === "gcash" && !gcashReference) {
      alert("Please enter GCash reference number")
      return
    }

    setShowConfirmDialog(true)
  }

  const confirmTransaction = async () => {
    setShowConfirmDialog(false)
    await handlePOSSale()
  }

  const handleRegularSale = async () => {
    setLoading(true)
    try {
      const saleData = {
        total_amount: getTotalAmount(),
        sale_type: "Product",
        sales_details: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
        })),
      }

      const response = await axios.post(`${API_BASE_URL}?action=sale&staff_id=${userId}`, saleData)
      if (response.data.success) {
        alert("Sale completed successfully!")
        // Reset form and cart
        setCart([])
        // Reload data
        await Promise.all([loadProducts(), loadSales(), loadAnalytics()])
      }
    } catch (error) {
      console.error("Error creating sale:", error)
      alert(error.response?.data?.error || "Error creating sale")
    } finally {
      setLoading(false)
    }
  }

  const handlePOSSale = async () => {
    if (!paymentMethod) {
      alert("Please select a payment method")
      return
    }

    const totalAmount = getTotalAmount()
    const receivedAmount = parseFloat(amountReceived) || totalAmount
    const change = Math.max(0, receivedAmount - totalAmount)

    if (paymentMethod === "cash" && receivedAmount < totalAmount) {
      alert("Amount received cannot be less than total amount")
      return
    }

    setLoading(true)
    try {
      // Convert "gcash" to "digital" for API consistency
      const apiPaymentMethod = paymentMethod === "gcash" ? "digital" : paymentMethod

      const saleData = {
        total_amount: totalAmount,
        sale_type: "Product",
        sales_details: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
        })),
        payment_method: apiPaymentMethod,
        amount_received: receivedAmount,
        gcash_reference: paymentMethod === "gcash" ? gcashReference : "",
        reference_number: paymentMethod === "gcash" ? gcashReference : null,
        notes: ""
      }

      const response = await axios.post(`${API_BASE_URL}?action=pos_sale&staff_id=${userId}`, saleData)
      if (response.data.success) {
        setLastTransaction({
          ...response.data,
          change_given: change,
          total_amount: totalAmount,
          payment_method: paymentMethod, // Keep original for display
          reference_number: paymentMethod === "gcash" ? gcashReference : (response.data.reference_number || null)
        })
        setReceiptNumber(response.data.receipt_number)
        setChangeGiven(change)
        setShowReceipt(true)

        // Reset form and cart
        setCart([])
        setAmountReceived("")
        setGcashReference("")
        setTransactionNotes("")
        setPaymentMethod("cash")

        // Reload products immediately (before showing receipt)
        await loadProducts()

        // Reload sales and analytics in background
        loadSales()
        loadAnalytics()
      }
    } catch (error) {
      console.error("Error creating POS sale:", error)
      alert(error.response?.data?.error || "Error creating POS sale")
    } finally {
      setLoading(false)
    }
  }

  const calculateChange = () => {
    const total = getTotalAmount()
    const received = parseFloat(amountReceived) || 0
    const change = Math.max(0, received - total)
    setChangeGiven(change)
    return change
  }

  // Calculate change whenever amount received or cart changes
  useEffect(() => {
    if (paymentMethod === "cash" && amountReceived) {
      calculateChange()
    }
  }, [amountReceived, cart, paymentMethod])


  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      alert("Please fill all product fields")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}?action=product&staff_id=${userId}`, {
        name: newProduct.name,
        price: Number.parseFloat(newProduct.price),
        stock: Number.parseInt(newProduct.stock),
        category: newProduct.category,
      })

      if (response.data.success) {
        setSuccessMessage("Your product has been added to the inventory successfully.")
        setShowSuccessNotification(true)
        setNewProduct({ name: "", price: "", stock: "", category: "Uncategorized" })
        setAddProductDialogOpen(false)
        await loadProducts()

        // Auto-close success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessNotification(false)
        }, 3000)
      }
    } catch (error) {
      console.error("Error adding product:", error)
      alert(error.response?.data?.error || "Error adding product")
    } finally {
      setLoading(false)
    }
  }

  const handleStockUpdate = async () => {
    if (!stockUpdateProduct || !stockUpdateQuantity) {
      alert("Please fill all fields")
      return
    }

    const updateQuantity = Number.parseInt(stockUpdateQuantity)
    if (updateQuantity <= 0) {
      alert("Quantity must be greater than 0")
      return
    }

    // Ensure userId is available
    if (!userId) {
      alert("User ID is missing. Please refresh the page and try again.")
      return
    }

    setLoading(true)
    try {
      const response = await axios.put(`${API_BASE_URL}?action=stock&staff_id=${userId}`, {
        product_id: stockUpdateProduct.id,
        quantity: updateQuantity,
        type: stockUpdateType,
        staff_id: userId,
      }, {
        timeout: 30000 // Increase timeout to 30 seconds
      })

      if (response.data.success) {
        setSuccessMessage(`Stock ${stockUpdateType === "add" ? "added" : "removed"} successfully!`)
        setShowSuccessNotification(true)
        setStockUpdateProduct(null)
        setStockUpdateQuantity("")
        setStockUpdateType("add")
        setIsAddOnlyMode(false)
        await Promise.all([loadProducts(), loadAnalytics()])
      }
    } catch (error) {
      console.error("Error updating stock:", error)

      // Check if it's a timeout but the update might have succeeded
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Reload products to check if update actually succeeded
        await loadProducts()
        await loadAnalytics()

        // Check if the stock was actually updated
        const updatedProducts = await axios.get(`${API_BASE_URL}?action=products`)
        const updatedProduct = updatedProducts.data.products?.find(p => p.id === stockUpdateProduct.id)

        if (updatedProduct) {
          const expectedStock = stockUpdateType === "add"
            ? Number.parseInt(stockUpdateProduct.stock) + updateQuantity
            : Math.max(0, Number.parseInt(stockUpdateProduct.stock) - updateQuantity)

          if (updatedProduct.stock == expectedStock) {
            // Update actually succeeded, show success
            setSuccessMessage(`Stock ${stockUpdateType === "add" ? "added" : "removed"} successfully!`)
            setShowSuccessNotification(true)
            setStockUpdateProduct(null)
            setStockUpdateQuantity("")
            setStockUpdateType("add")
            setIsAddOnlyMode(false)
            setLoading(false)
            return
          }
        }
      }

      // Only show error if update actually failed
      alert(error.response?.data?.error || "Error updating stock. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEditProduct = async () => {
    if (!editProductData.name || !editProductData.price) {
      alert("Please fill all required fields")
      return
    }

    setLoading(true)
    try {
      const response = await axios.put(`${API_BASE_URL}?action=product`, {
        id: editProduct.id,
        name: editProductData.name,
        price: Number.parseFloat(editProductData.price),
        category: editProductData.category,
      })

      if (response.data.success) {
        setSuccessMessage("Product updated successfully!")
        setShowSuccessNotification(true)
        setEditProduct(null)
        setEditProductData({ name: "", price: "", category: "Uncategorized" })
        await loadProducts()
      }
    } catch (error) {
      console.error("Error updating product:", error)
      alert(error.response?.data?.error || "Error updating product")
    } finally {
      setLoading(false)
    }
  }

  const handleArchiveProduct = async () => {
    if (!productToArchive) return

    setLoading(true)
    try {
      const response = await axios.delete(`${API_BASE_URL}?action=product`, {
        data: { id: productToArchive.id }
      })

      if (response.data.success) {
        const productName = productToArchive.name
        setArchiveDialogOpen(false)
        setProductToArchive(null)
        await loadProducts()
        toast({
          title: "Product Archived Successfully",
          description: `"${productName}" has been archived and hidden from active inventory. You can restore it anytime.`,
        })
      }
    } catch (error) {
      console.error("Error archiving product:", error)
      alert(error.response?.data?.error || "Error archiving product")
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreProduct = async (product) => {
    setLoading(true)
    try {
      const response = await axios.put(`${API_BASE_URL}?action=restore`, {
        id: product.id
      })

      if (response.data.success) {
        await loadProducts()
        toast({
          title: "Product Restored Successfully",
          description: `"${product.name}" has been restored and is now visible in active inventory.`,
        })
      }
    } catch (error) {
      console.error("Error restoring product:", error)
      alert(error.response?.data?.error || "Error restoring product")
    } finally {
      setLoading(false)
    }
  }

  const openArchiveDialog = (product) => {
    setProductToArchive(product)
    setArchiveDialogOpen(true)
  }

  const openEditDialog = (product) => {
    setEditProduct(product)
    setEditProductData({
      name: product.name,
      price: product.price.toString(),
      category: product.category
    })
  }


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount)
  }

  const formatName = (name) => {
    if (!name || name === "N/A" || name === "Guest") return name
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
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

  const formatDateOnly = (dateString) => {
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

  // Normalize payment method display: digital -> GCash, gcash -> GCash, empty -> Cash
  const formatPaymentMethod = (paymentMethod) => {
    if (!paymentMethod || paymentMethod === "N/A") {
      return "Cash"
    }
    const normalized = paymentMethod.toLowerCase().trim()
    if (normalized === "digital" || normalized === "gcash") {
      return "GCash"
    }
    // Capitalize first letter for other methods
    return paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).toLowerCase()
  }

  const formatDateTime = () => {
    const now = new Date()
    // Format current date/time in Philippines timezone
    return {
      date: now.toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    }
  }

  // Calculate months for subscription (similar to monitoring subscription)
  const calculateSubscriptionMonths = (subscription, sale = null) => {
    // First check duration_months from plan (most accurate)
    if (subscription?.duration_months) {
      return subscription.duration_months
    }
    if (sale?.duration_months) {
      return sale.duration_months
    }

    // Fallback: Calculate from amount paid and plan price
    const amountPaid = subscription?.amount_paid ||
      subscription?.discounted_price ||
      sale?.subscription_amount_paid ||
      sale?.subscription_discounted_price ||
      sale?.total_amount ||
      0

    const planPrice = subscription?.plan_price ||
      sale?.plan_price ||
      0

    if (planPrice > 0 && amountPaid > 0) {
      const months = Math.floor(amountPaid / planPrice)
      return months > 0 ? months : 1
    }
    return 1
  }

  const getProductName = (salesDetail, sale = null) => {
    // Product sales
    if (salesDetail?.product) {
      return salesDetail.product.name
    }

    // Check subscription details first (most reliable for Day Pass subscriptions)
    let subscriptionDetail = null
    if (sale?.id) {
      subscriptionDetail = getSubscriptionDetails(sale.id)
      if (subscriptionDetail?.planName) {
        const planNameLower = subscriptionDetail.planName.toLowerCase()
        if (planNameLower.includes('day pass') ||
          planNameLower.includes('daypass') ||
          planNameLower.includes('walk-in') ||
          planNameLower.includes('walkin')) {
          return "Day Pass"
        }
      }
    }

    // Check if this is a Day Pass subscription sale (user with account)
    // Day Pass subscriptions have plan_id that matches Day Pass plan or plan_name contains "day pass"
    const isDayPassSubscription = sale?.sale_type === 'Subscription' && (
      // Check by plan_id against subscriptionPlans array
      (sale.plan_id && subscriptionPlans && subscriptionPlans.length > 0 && subscriptionPlans.find(p =>
        p.id.toString() === sale.plan_id.toString() && (
          (p.name && (
            p.name.toLowerCase().includes('day pass') ||
            p.name.toLowerCase().includes('daypass') ||
            p.name.toLowerCase().includes('walk-in') ||
            p.name.toLowerCase().includes('walkin')
          )) ||
          (p.duration_days && p.duration_days > 0 && (!p.duration_months || p.duration_months === 0))
        )
      )) ||
      // Check by plan_name from sale object
      (sale.plan_name && (
        sale.plan_name.toLowerCase().includes('day pass') ||
        sale.plan_name.toLowerCase().includes('daypass') ||
        sale.plan_name.toLowerCase().includes('walk-in') ||
        sale.plan_name.toLowerCase().includes('walkin')
      )) ||
      // Check by subscription in sales detail
      (salesDetail?.subscription && salesDetail.subscription.plan_name && (
        salesDetail.subscription.plan_name.toLowerCase().includes('day pass') ||
        salesDetail.subscription.plan_name.toLowerCase().includes('daypass') ||
        salesDetail.subscription.plan_name.toLowerCase().includes('walk-in') ||
        salesDetail.subscription.plan_name.toLowerCase().includes('walkin')
      )) ||
      // Check by plan_id characteristics (duration_days > 0, duration_months === 0)
      (sale.plan_id && subscriptionPlans && subscriptionPlans.length > 0) && (() => {
        const plan = subscriptionPlans.find(p => p.id.toString() === sale.plan_id.toString())
        return plan && plan.duration_days && plan.duration_days > 0 &&
          (!plan.duration_months || plan.duration_months === 0)
      })()
    )

    // If Day Pass subscription, return "Day Pass"
    if (isDayPassSubscription) {
      return "Day Pass"
    }

    // Get plan name from multiple sources
    let planName = null
    let subscription = null

    // 1. Check subscription in sales detail
    if (salesDetail?.subscription) {
      subscription = salesDetail.subscription
      planName = subscription.plan_name
    }

    // 2. Check sale level plan_name (set by API)
    if (!planName && sale?.plan_name) {
      planName = sale.plan_name
    }

    // 3. Check subscription details (already checked above, but use planName if not Day Pass)
    if (!planName && subscriptionDetail?.planName) {
      planName = subscriptionDetail.planName
    }

    // 4. If we have a subscription_id but no plan_name, check sale object
    if (!planName && (salesDetail?.subscription_id || sale?.sale_type === 'Subscription')) {
      planName = sale?.plan_name || "Subscription Plan"
    }

    // If we found a plan name, calculate and display months
    // Don't show "12 months" since that's the default/given duration
    if (planName) {
      // Replace "Guest Walk In" or "Guest Walk-In" with "Gym Session"
      let displayName = planName
      if (planName.toLowerCase().includes('guest walk in') || planName.toLowerCase().includes('guest walk-in')) {
        displayName = "Gym Session"
      }

      const months = calculateSubscriptionMonths(subscription, sale)
      // Only show months if it's not 12 (since 12 months is the default)
      if (months > 1 && months !== 12) {
        return `${displayName} (${months} months)`
      }
      return displayName
    }

    // Guest/Walk-in/Day Pass sales (without account)
    if (sale?.guest_name || sale?.sale_type === "Walk-in" || sale?.sale_type === "Walkin" || sale?.sale_type === "Guest" || sale?.sale_type === "Day Pass") {
      return "Day Pass"
    }

    // Coaching sales
    if (sale?.coach_name || sale?.sale_type === "Coaching" || sale?.sale_type === "Coach Assignment" || sale?.sale_type === "Coach") {
      return "Coaching"
    }

    // Fallback
    if (salesDetail?.subscription_id || sale?.sale_type === 'Subscription') {
      return "Subscription Plan"
    }

    return "Unknown Item"
  }

  const getUniqueCategories = () => {
    const categories = [...new Set(products.map(product => product.category).filter(category => category && category.trim() !== ""))]
    return categories.sort()
  }

  const getFilteredProducts = () => {
    let filtered = products

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.category === categoryFilter)
    }

    // Filter by stock status
    if (productStockStatusFilter !== "all") {
      if (productStockStatusFilter === "in_stock") {
        filtered = filtered.filter(product => product.stock > 10)
      } else if (productStockStatusFilter === "low_stock") {
        filtered = filtered.filter(product => product.stock > 0 && product.stock <= 10)
      } else if (productStockStatusFilter === "out_of_stock") {
        filtered = filtered.filter(product => product.stock === 0)
      }
    }

    // Filter by price range
    if (productPriceRangeFilter !== "all") {
      if (productPriceRangeFilter === "low") {
        filtered = filtered.filter(product => product.price < 100)
      } else if (productPriceRangeFilter === "medium") {
        filtered = filtered.filter(product => product.price >= 100 && product.price < 500)
      } else if (productPriceRangeFilter === "high") {
        filtered = filtered.filter(product => product.price >= 500)
      }
    }

    // Filter by search query
    if (productSearchQuery) {
      const query = productSearchQuery.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.price.toString().includes(query)
      )
    }

    return filtered
  }

  const getLowStockProducts = () => {
    return products.filter(product =>
      product.stock <= 10 &&
      (product.is_archived === 0 || product.is_archived === false || !product.is_archived)
    )
  }

  const filteredSales = sales.filter((sale) => {
    // Filter by search query
    const matchesSearch = searchQuery === "" ||
      sale.sale_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.plan_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.coach_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.sales_details && Array.isArray(sale.sales_details) && sale.sales_details.some(detail =>
        (detail.product && detail.product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (detail.subscription?.plan_name && detail.subscription.plan_name.toLowerCase().includes(searchQuery.toLowerCase()))
      ))

    // Filter by sale type (this should already be handled by the API, but keeping as backup)
    let matchesSaleType = true
    if (saleTypeFilter !== "all") {
      if (saleTypeFilter === "Session") {
        // Session sales: combine all walk-ins, guests, and day passes
        const isSessionSale = sale.sale_type === 'Walk-in' || sale.sale_type === 'Walkin' || sale.sale_type === 'Guest' || sale.sale_type === 'Day Pass'
        if (!isSessionSale) {
          matchesSaleType = false
        } else {
          // Additional filter for session method
          if (allSalesSessionMethodFilter !== "all") {
            if (allSalesSessionMethodFilter === "with_account") {
              // Session with account - has user_id
              matchesSaleType = sale.user_id !== null && sale.user_id !== undefined
            } else if (allSalesSessionMethodFilter === "without_account") {
              // Session without account - no user_id
              matchesSaleType = sale.user_id === null || sale.user_id === undefined
            }
          }
        }
      } else if (saleTypeFilter === "Coach Assignment") {
        // Coaching sales: 'Coach Assignment', 'Coaching', or 'Coach'
        matchesSaleType = sale.sale_type === 'Coach Assignment' ||
          sale.sale_type === 'Coaching' ||
          sale.sale_type === 'Coach'
      } else {
        // Other types: exact match
        matchesSaleType = sale.sale_type === saleTypeFilter
      }
    }

    return matchesSearch && matchesSaleType
  })

  // Pagination for All Sales tab
  const allSalesTotalPages = Math.max(1, Math.ceil(filteredSales.length / allSalesItemsPerPage))
  const allSalesStartIndex = (allSalesCurrentPage - 1) * allSalesItemsPerPage
  const allSalesEndIndex = allSalesStartIndex + allSalesItemsPerPage
  const paginatedAllSales = filteredSales.slice(allSalesStartIndex, allSalesEndIndex)

  // Pagination for Product Inventory
  const filteredProducts = getFilteredProducts()
  const inventoryTotalPages = Math.max(1, Math.ceil(filteredProducts.length / inventoryItemsPerPage))
  const inventoryStartIndex = (inventoryCurrentPage - 1) * inventoryItemsPerPage
  const inventoryEndIndex = inventoryStartIndex + inventoryItemsPerPage
  const paginatedProducts = filteredProducts.slice(inventoryStartIndex, inventoryEndIndex)

  // Reset pagination when filters change
  useEffect(() => {
    setAllSalesCurrentPage(1)
  }, [searchQuery, saleTypeFilter, allSalesSessionMethodFilter, dateFilter])

  useEffect(() => {
    setInventoryCurrentPage(1)
  }, [productSearchQuery, categoryFilter, productStockStatusFilter, productPriceRangeFilter, showArchived])


  if (loading && sales.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading sales data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold text-gray-900 mb-1">Sales Management</CardTitle>
              <p className="text-sm text-gray-600">Manage product sales and inventory for CNERGY Gym</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              className="h-10 w-10 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              title="Refresh data"
            >
              <RefreshCw className={`h-5 w-5 text-gray-700 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats with Filter */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 shadow-sm">
                <Store className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">Sales Overview</CardTitle>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date Range Picker */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600 whitespace-nowrap">Start Date:</Label>
                  <Input
                    type="date"
                    value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                    max={format(new Date(), "yyyy-MM-dd")}
                    onChange={(e) => {
                      const selectedDate = e.target.value
                      if (selectedDate) {
                        const date = new Date(selectedDate + "T00:00:00")
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)

                        if (date.getTime() <= today.getTime()) {
                          setStartDate(date)
                          // If end date is set and is before start date, clear it
                          if (endDate && date > endDate) {
                            setEndDate(null)
                          }
                        }
                      } else {
                        setStartDate(null)
                      }
                    }}
                    className="h-10 text-sm w-[140px] border-gray-300"
                    placeholder="Start date"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600 whitespace-nowrap">End Date:</Label>
                  <Input
                    type="date"
                    value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                    min={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
                    max={format(new Date(), "yyyy-MM-dd")}
                    onChange={(e) => {
                      const selectedDate = e.target.value
                      if (selectedDate) {
                        const date = new Date(selectedDate + "T00:00:00")
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)

                        if (date.getTime() <= today.getTime()) {
                          // If start date is set and selected date is before it, don't update
                          if (startDate && date < startDate) {
                            return
                          }
                          setEndDate(date)
                        }
                      } else {
                        setEndDate(null)
                      }
                    }}
                    className="h-10 text-sm w-[140px] border-gray-300"
                    placeholder="End date"
                  />
                </div>
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setStartDate(null)
                      setEndDate(null)
                    }}
                    className="h-10 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Total Sales Card */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Total Sales</CardTitle>
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5 text-gray-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1.5">{formatCurrency(analytics.totalSales || 0)}</div>
                <p className="text-xs text-gray-600 font-medium mb-4">All sales combined</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 font-medium"
                  onClick={() => setTotalSalesDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Product Sales Card */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Product Sales</CardTitle>
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-5 w-5 text-gray-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1.5">{formatCurrency(analytics.productSales || 0)}</div>
                <p className="text-xs text-gray-600 font-medium mb-4">
                  {analytics.productsSoldToday || 0} items sold
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 font-medium"
                  onClick={() => setProductSalesDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Subscription Sales Card */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Subscription Sales</CardTitle>
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 group-hover:scale-110 transition-transform">
                  <CreditCard className="h-5 w-5 text-gray-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1.5">{formatCurrency(analytics.totalSubscriptionSales || 0)}</div>
                <p className="text-xs text-gray-600 font-medium mb-4">Subscription revenue</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 font-medium"
                  onClick={() => setSubscriptionSalesDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Coaching Sales Card */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Coaching Sales</CardTitle>
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 group-hover:scale-110 transition-transform">
                  <UserCheck className="h-5 w-5 text-gray-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1.5">{formatCurrency(analytics.coachAssignmentSales || 0)}</div>
                <p className="text-xs text-gray-600 font-medium mb-4">Coach revenue</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 font-medium"
                  onClick={() => setCoachingSalesDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Low Stock Items Card */}
            <Card className="border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Low Stock Items</CardTitle>
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-5 w-5 text-gray-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1.5">{analytics.lowStockItems}</div>
                <p className="text-xs text-gray-600 font-medium mb-4">Need restocking</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 font-medium"
                  onClick={() => setLowStockDialogOpen(true)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">New Sale</TabsTrigger>
          <TabsTrigger value="history">All Sales</TabsTrigger>
          <TabsTrigger value="products">Product Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Selection */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <ShoppingBag className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">Add Products to Cart</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Filter className="h-4 w-4 text-gray-500" />
                    Filter by Category
                  </Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {getUniqueCategories().map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Package className="h-4 w-4 text-gray-500" />
                    Select Product
                  </Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {getFilteredProducts() && getFilteredProducts().length > 0 ? getFilteredProducts().map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()} disabled={product.stock === 0} className="py-3">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-semibold text-gray-900 truncate">{product.name}</span>
                              <span className="text-xs text-gray-500">{product.category} • {formatCurrency(product.price)}</span>
                            </div>
                            <span className={`ml-3 text-xs font-medium px-2 py-1 rounded ${product.stock === 0
                              ? 'bg-red-100 text-red-700'
                              : product.stock <= 5
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                              }`}>
                              {product.stock === 0 ? 'Out' : `${product.stock} left`}
                            </span>
                          </div>
                        </SelectItem>
                      )) : (
                        <SelectItem value="no-products" disabled>No products available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Hash className="h-4 w-4 text-gray-500" />
                    Quantity
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max={
                      selectedProduct ? (products.find((p) => p.id == selectedProduct || p.id === Number.parseInt(selectedProduct))?.stock || 1) : 1
                    }
                    value={quantity}
                    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    disabled={!selectedProduct}
                    className="h-11 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-semibold"
                  />
                  {selectedProduct && (
                    <p className="text-xs text-gray-500">
                      Max available: {products.find((p) => p.id == selectedProduct || p.id === Number.parseInt(selectedProduct))?.stock || 0} units
                    </p>
                  )}
                </div>

                <Button
                  onClick={addToCart}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={!selectedProduct || loading}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>

            {/* Shopping Cart */}
            <Card className="border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">Shopping Cart</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-base px-3 py-1 bg-green-100 text-green-700 border-green-300">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="p-4 rounded-full bg-gray-100 mb-4">
                      <ShoppingCart className="h-12 w-12 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-600 mb-2">No items in cart</p>
                    <p className="text-sm text-gray-500 text-center">Add products from the left panel to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {cart.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-all duration-200">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1 truncate">{item.product?.name || 'Unknown Product'}</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-600">{formatCurrency(item.product?.price || 0)} each</p>
                              <span className="text-gray-400">•</span>
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-900 border-gray-300">
                                {item.product?.category || 'N/A'}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mx-4">
                            <div className="flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                                onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-10 text-center font-semibold text-gray-900">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                                onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-700"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="text-right min-w-[80px]">
                            <p className="font-bold text-lg text-gray-900">{formatCurrency(item.price)}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t-2 border-gray-300 pt-4 mt-4">
                      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                        <span className="text-xl font-bold text-gray-900">Total:</span>
                        <span className="text-2xl font-bold text-green-700">{formatCurrency(getTotalAmount())}</span>
                      </div>
                    </div>

                    {/* Payment Interface - Always Visible */}
                    {cart.length > 0 && (
                      <div className="border-t pt-4 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Payment Method</Label>
                          <Select value={paymentMethod} onValueChange={(value) => {
                            setPaymentMethod(value)
                            setAmountReceived("")
                            setGcashReference("")
                          }}>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="gcash">GCash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {paymentMethod === "cash" && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Amount Received (₱)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={amountReceived}
                              onChange={(e) => setAmountReceived(e.target.value)}
                              placeholder="Enter amount received"
                              className="h-11"
                            />
                            {amountReceived && (
                              <div className="text-sm text-muted-foreground">
                                Change: {formatCurrency(changeGiven)}
                              </div>
                            )}
                          </div>
                        )}

                        {paymentMethod === "gcash" && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                              Reference Number
                            </Label>
                            <Input
                              type="text"
                              value={gcashReference}
                              onChange={(e) => setGcashReference(e.target.value)}
                              placeholder="Enter transaction reference"
                              className="h-11"
                              required
                            />
                            <p className="text-xs text-gray-500">Required for GCash transactions</p>
                          </div>
                        )}

                      </div>
                    )}

                    <Button
                      onClick={handleProductSale}
                      className="w-full"
                      disabled={cart.length === 0 || loading || (paymentMethod === "cash" && (!amountReceived || parseFloat(amountReceived) < getTotalAmount())) || (paymentMethod === "gcash" && !gcashReference)}
                    >
                      {loading ? "Processing..." : "Process Sale"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">All Sales</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <span>
                          {filteredSales.length === sales.length
                            ? `${filteredSales.length} ${filteredSales.length === 1 ? "sale" : "sales"}`
                            : `Showing ${filteredSales.length} of ${sales.length} sales`
                          }
                        </span>
                        {saleTypeFilter !== "all" && (
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                            {saleTypeFilter} only
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search sales..."
                      className="pl-10 h-11 border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap pt-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sale-type-filter" className="text-sm font-semibold text-gray-700">Sale Type:</Label>
                    <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
                      <SelectTrigger className="w-44 h-10 border-2 border-gray-300 focus:border-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Subscription">Subscription</SelectItem>
                        <SelectItem value="Coach Assignment">Coach Assignment</SelectItem>
                        <SelectItem value="Session">Session</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Session Method Filter - Only show when Session is selected in All Sales tab */}
                  {saleTypeFilter === "Session" && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="session-method-filter" className="text-sm font-semibold text-gray-700">Method:</Label>
                      <Select value={allSalesSessionMethodFilter} onValueChange={setAllSalesSessionMethodFilter}>
                        <SelectTrigger className="w-[180px] h-10 border-2 border-gray-300 focus:border-purple-500">
                          <SelectValue placeholder="All Methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Methods</SelectItem>
                          <SelectItem value="with_account">Member Request</SelectItem>
                          <SelectItem value="without_account">Guest Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {/* Date Range Picker */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-600 whitespace-nowrap">Start Date:</Label>
                      <Input
                        type="date"
                        value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                        max={format(new Date(), "yyyy-MM-dd")}
                        onChange={(e) => {
                          const selectedDate = e.target.value
                          if (selectedDate) {
                            const date = new Date(selectedDate + "T00:00:00")
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)

                            if (date.getTime() <= today.getTime()) {
                              setStartDate(date)
                              // If end date is set and is before start date, clear it
                              if (endDate && date > endDate) {
                                setEndDate(null)
                              }
                            }
                          } else {
                            setStartDate(null)
                          }
                        }}
                        className="h-10 text-sm w-[140px] border-gray-300"
                        placeholder="Start date"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-600 whitespace-nowrap">End Date:</Label>
                      <Input
                        type="date"
                        value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                        min={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
                        max={format(new Date(), "yyyy-MM-dd")}
                        onChange={(e) => {
                          const selectedDate = e.target.value
                          if (selectedDate) {
                            const date = new Date(selectedDate + "T00:00:00")
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)

                            if (date.getTime() <= today.getTime()) {
                              // If start date is set and selected date is before it, don't update
                              if (startDate && date < startDate) {
                                return
                              }
                              setEndDate(date)
                            }
                          } else {
                            setEndDate(null)
                          }
                        }}
                        className="h-10 text-sm w-[140px] border-gray-300"
                        placeholder="End date"
                      />
                    </div>
                    {(startDate || endDate) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStartDate(null)
                          setEndDate(null)
                        }}
                        className="h-10 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200"
                      >
                        ✕ Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Plan/Product</TableHead>
                      <TableHead className="font-semibold text-gray-900">Customer</TableHead>
                      <TableHead className="font-semibold text-gray-900">Type</TableHead>
                      <TableHead className="font-semibold text-gray-900">Payment</TableHead>
                      <TableHead className="font-semibold text-gray-900">Receipt</TableHead>
                      <TableHead className="font-semibold text-gray-900">Date</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-3 rounded-full bg-gray-100 mb-3">
                              <Search className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-600 mb-1">No sales found</p>
                            <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAllSales.map((sale) => (
                        <TableRow key={sale.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="py-4">
                            <div className="space-y-2">
                              {sale.sales_details && Array.isArray(sale.sales_details) && sale.sales_details.length > 0 ? (
                                sale.sales_details.map((detail, index) => {
                                  // Get quantity from detail or sale level
                                  const quantity = detail.quantity || sale.quantity || 1
                                  return (
                                    <div key={index} className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-gray-900">
                                        {getProductName(detail, sale)}
                                      </span>
                                      {quantity > 1 && (
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-medium">
                                          {quantity}x
                                        </Badge>
                                      )}
                                    </div>
                                  )
                                })
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {getProductName({}, sale)}
                                  </span>
                                  {(() => {
                                    // Get quantity from sale level for subscriptions without sales_details
                                    const quantity = sale.quantity || 1
                                    return quantity > 1 ? (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-medium">
                                        {quantity}x
                                      </Badge>
                                    ) : null
                                  })()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-1">
                              {sale.sale_type === "Subscription" || sale.sale_type === "Coach Assignment" || sale.sale_type === "Coaching" || sale.sale_type === "Coach" ? (
                                <div className="text-sm font-medium text-gray-900">
                                  {formatName(sale.user_name) || "N/A"}
                                </div>
                              ) : sale.sale_type === "Guest" || sale.sale_type === "Day Pass" || sale.sale_type === "Walk-in" || sale.sale_type === "Walkin" ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {formatName(sale.guest_name || sale.user_name) || "Guest"}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  N/A
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="font-medium bg-gray-50 text-gray-900 border-gray-300">
                              {(() => {
                                // For day pass sales, show "Day Pass" if user has account, "Guest" if no account
                                const isDayPass = sale.sale_type === 'Walk-in' || sale.sale_type === 'Walkin' || sale.sale_type === 'Guest' || sale.sale_type === 'Day Pass'
                                if (isDayPass) {
                                  return sale.user_id !== null && sale.user_id !== undefined ? 'Day Pass' : 'Guest'
                                }
                                return sale.sale_type
                              })()}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs font-medium bg-gray-50 text-gray-700 border-gray-300">
                                {formatPaymentMethod(sale.payment_method)}
                              </Badge>
                              {sale.change_given > 0 && (
                                <div className="text-xs text-gray-600 font-medium">
                                  Change: {formatCurrency(sale.change_given)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="text-xs font-mono font-medium text-gray-700">
                              {(() => {
                                const paymentMethod = (sale.payment_method || 'cash').toLowerCase()
                                if (paymentMethod === 'gcash' || paymentMethod === 'digital') {
                                  // Check reference_number first, then gcash_reference, then receipt_number
                                  return sale.reference_number || sale.gcash_reference || sale.receipt_number || "N/A"
                                }
                                return sale.receipt_number || "N/A"
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="py-4 font-medium text-gray-700">{formatDate(sale.sale_date)}</TableCell>
                          <TableCell className="text-right py-4 font-bold text-lg text-gray-900">{formatCurrency(sale.total_amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination Controls for All Sales */}
              {filteredSales.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white mb-6">
                  <div className="text-sm text-gray-500">
                    {filteredSales.length} {filteredSales.length === 1 ? 'entry' : 'entries'} total
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllSalesCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={allSalesCurrentPage === 1}
                      className="h-8 px-3 flex items-center gap-1 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllSalesCurrentPage(prev => Math.min(allSalesTotalPages, prev + 1))}
                      disabled={allSalesCurrentPage === allSalesTotalPages}
                      className="h-8 px-3 flex items-center gap-1 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900">Product Inventory</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <span>
                          {filteredProducts.length === products.length
                            ? `${filteredProducts.length} ${showArchived ? "archived" : "active"} ${filteredProducts.length === 1 ? "product" : "products"}`
                            : `Showing ${filteredProducts.length} of ${products.length} ${showArchived ? "archived" : "active"} products`
                          }
                        </span>
                        {(categoryFilter !== "all" || productStockStatusFilter !== "all" || productPriceRangeFilter !== "all" || productSearchQuery) && (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                            Filtered
                          </Badge>
                        )}
                        {showArchived && (
                          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                            Archived
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Dialog open={addProductDialogOpen} onOpenChange={setAddProductDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all duration-200">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader className="space-y-3 pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-100">
                            <Plus className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-bold text-gray-900">Add New Product</DialogTitle>
                            <DialogDescription className="text-sm text-gray-600 mt-1">
                              Add a new product to your inventory
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <div className="space-y-5 py-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-500" />
                            Product Name
                          </Label>
                          <Input
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                            placeholder="Enter product name"
                            className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            Price (₱)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                            placeholder="Enter price"
                            className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 text-lg font-semibold"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            Initial Stock
                          </Label>
                          <Input
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                            placeholder="Enter stock quantity"
                            className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            Category
                          </Label>
                          <Select value={newProduct.category} onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}>
                            <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-gray-500">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                              <SelectItem value="Beverages">Beverages</SelectItem>
                              <SelectItem value="Supplements">Supplements</SelectItem>
                              <SelectItem value="Snacks">Snacks</SelectItem>
                              <SelectItem value="Merch/Apparel">Merch/Apparel</SelectItem>
                              <SelectItem value="Accessories">Accessories</SelectItem>
                              <SelectItem value="Equipment">Equipment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter className="pt-4 border-t border-gray-200">
                        <Button
                          variant="outline"
                          onClick={() => setNewProduct({ name: "", price: "", stock: "", category: "Uncategorized" })}
                          className="h-11 border-2 border-gray-300 hover:bg-gray-50"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddProduct}
                          disabled={loading}
                          className="h-11 bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          {loading ? "Adding..." : "Add"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="pt-3">
                  {/* All Filters in One Row */}
                  <div className="bg-gradient-to-r from-gray-50 to-orange-50/30 rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Search - Very Left */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          type="search"
                          placeholder="Search products..."
                          className="pl-10 h-10 w-48 text-sm border-2 border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-white"
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                        />
                      </div>

                      {/* Spacer - Big Space */}
                      <div className="flex-1"></div>

                      {/* Archive Button */}
                      <Button
                        variant={showArchived ? "default" : "outline"}
                        onClick={() => setShowArchived(!showArchived)}
                        className={`h-10 border-2 transition-all duration-200 ${showArchived
                          ? "bg-orange-600 hover:bg-orange-700 text-white border-orange-600 shadow-md"
                          : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
                          }`}
                      >
                        {showArchived ? (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        ) : (
                          <Archive className="mr-2 h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">Archive</span>
                      </Button>

                      {/* Category Filter */}
                      <div className="flex items-center gap-2">
                        <Label htmlFor="product-category-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap flex items-center gap-1">
                          <Filter className="h-4 w-4" />
                          Category:
                        </Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                          <SelectTrigger className="w-40 h-10 text-sm border-2 border-gray-300 focus:border-orange-500 bg-white">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {getUniqueCategories().map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Stock Status Filter */}
                      <div className="flex items-center gap-2">
                        <Label htmlFor="stock-status-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                          Stock:
                        </Label>
                        <Select value={productStockStatusFilter} onValueChange={setProductStockStatusFilter}>
                          <SelectTrigger className="w-36 h-10 text-sm border-2 border-gray-300 focus:border-orange-500 bg-white">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="in_stock">In Stock (&gt;10)</SelectItem>
                            <SelectItem value="low_stock">Low Stock (1-10)</SelectItem>
                            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Price Range Filter */}
                      <div className="flex items-center gap-2">
                        <Label htmlFor="price-range-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                          Price:
                        </Label>
                        <Select value={productPriceRangeFilter} onValueChange={setProductPriceRangeFilter}>
                          <SelectTrigger className="w-32 h-10 text-sm border-2 border-gray-300 focus:border-orange-500 bg-white">
                            <SelectValue placeholder="All Prices" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Prices</SelectItem>
                            <SelectItem value="low">Low (&lt;₱100)</SelectItem>
                            <SelectItem value="medium">Medium (₱100-₱500)</SelectItem>
                            <SelectItem value="high">High (&gt;₱500)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Product Name</TableHead>
                      <TableHead className="font-semibold text-gray-900">Category</TableHead>
                      <TableHead className="font-semibold text-gray-900">Price</TableHead>
                      <TableHead className="font-semibold text-gray-900">Stock</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-3 rounded-full bg-gray-100 mb-3">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-600 mb-1">No products found</p>
                            <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedProducts.map((product) => (
                        <TableRow key={product.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="py-4 font-medium text-gray-900">{product.name}</TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-gray-50 text-gray-900 border-gray-300">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="py-4 font-medium text-gray-900">{formatCurrency(product.price)}</TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{product.stock}</span>
                              {product.stock <= 5 && product.stock > 0 && (
                                <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                                  Low
                                </Badge>
                              )}
                              {product.stock === 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  Out
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge
                              variant={product.stock > 10 ? "outline" : product.stock > 0 ? "secondary" : "destructive"}
                              className={`font-medium ${product.stock > 10
                                ? "bg-green-100 text-green-700 border-green-300"
                                : product.stock > 0
                                  ? "bg-orange-100 text-orange-700 border-orange-300"
                                  : "bg-red-100 text-red-700 border-red-300"
                                }`}
                            >
                              {product.stock > 10 ? "In Stock" : product.stock > 0 ? "Low Stock" : "Out of Stock"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStockUpdateProduct(product)
                                  setStockUpdateType("add")
                                  setStockUpdateQuantity("")
                                }}
                                disabled={loading}
                                className="border-2 hover:bg-gray-100"
                              >
                                <Package className="mr-1 h-3 w-3" />
                                Stock
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(product)}
                                disabled={loading}
                                className="border-2 hover:bg-blue-50"
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              {!showArchived ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openArchiveDialog(product)}
                                  disabled={loading}
                                  className="border-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                                >
                                  <Archive className="mr-1 h-3 w-3" />
                                  Archive
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestoreProduct(product)}
                                  disabled={loading}
                                  className="border-2 border-green-300 text-green-700 hover:bg-green-50"
                                >
                                  <RotateCcw className="mr-1 h-3 w-3" />
                                  Restore
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination Controls for Product Inventory */}
              {filteredProducts.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white mb-6">
                  <div className="text-sm text-gray-500">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'entry' : 'entries'} total
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInventoryCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={inventoryCurrentPage === 1}
                      className="h-8 px-3 flex items-center gap-1 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInventoryCurrentPage(prev => Math.min(inventoryTotalPages, prev + 1))}
                      disabled={inventoryCurrentPage === inventoryTotalPages}
                      className="h-8 px-3 flex items-center gap-1 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Update Dialog */}
      <Dialog open={!!stockUpdateProduct} onOpenChange={() => {
        setStockUpdateProduct(null)
        setStockUpdateQuantity("")
        setStockUpdateType("add")
      }}>
        <DialogContent className="max-w-md" hideClose>
          <DialogHeader className="space-y-3 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Plus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Add Stock
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  {stockUpdateProduct?.name}
                </DialogDescription>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-sm text-gray-600">
                Current stock: <span className="font-bold text-gray-900">{stockUpdateProduct?.stock} units</span>
              </p>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                Quantity to Add
              </Label>
              <Input
                type="number"
                min="1"
                value={stockUpdateQuantity}
                onChange={(e) => setStockUpdateQuantity(e.target.value)}
                placeholder={isAddOnlyMode ? "Enter quantity to add" : "Enter quantity"}
                className="h-11 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-semibold"
                autoFocus
              />
            </div>
            {stockUpdateQuantity && stockUpdateProduct && (
              <div className="p-5 rounded-xl border-2 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Stock Preview</p>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Current</p>
                        <span className="text-2xl font-bold text-gray-700">{stockUpdateProduct.stock}</span>
                      </div>
                      <span className="text-2xl text-gray-400">→</span>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">New</p>
                        <span className="text-3xl font-bold text-green-700">
                          {Number.parseInt(stockUpdateProduct.stock) + Number.parseInt(stockUpdateQuantity || "0")}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">units</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-100">
                    <Plus className="h-6 w-6 text-green-700" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setStockUpdateProduct(null)
                setStockUpdateQuantity("")
                setStockUpdateType("add")
              }}
              className="h-11 border-2 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockUpdate}
              disabled={loading || !stockUpdateQuantity}
              className="h-11 shadow-md hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {loading ? "Processing..." : "Add Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-3 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Edit className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">Edit Product</DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  {editProduct?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                Product Name
              </Label>
              <Input
                value={editProductData.name}
                onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                placeholder="Enter product name"
                className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-500" />
                Price (₱)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={editProductData.price}
                onChange={(e) => setEditProductData({ ...editProductData, price: e.target.value })}
                placeholder="Enter price"
                className="h-11 border-2 border-gray-300 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                Category
              </Label>
              <Select value={editProductData.category} onValueChange={(value) => setEditProductData({ ...editProductData, category: value })}>
                <SelectTrigger className="h-11 border-2 border-gray-300 focus:border-gray-500">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                  <SelectItem value="Beverages">Beverages</SelectItem>
                  <SelectItem value="Supplements">Supplements</SelectItem>
                  <SelectItem value="Snacks">Snacks</SelectItem>
                  <SelectItem value="Merch/Apparel">Merch/Apparel</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setEditProduct(null)}
              className="h-11 border-2 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditProduct}
              disabled={loading}
              className="h-11 bg-gray-900 hover:bg-gray-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {loading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-lg" hideClose>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900">Confirm Transaction</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              Review the details below before completing the payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Cart Items Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Order Summary</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto space-y-3">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{item.product?.name}</span>
                      <span className="text-xs text-gray-500 ml-2">× {item.quantity}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(getTotalAmount())}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">Payment Method</span>
                <span className="text-sm font-medium text-gray-900 capitalize px-3 py-1 bg-blue-50 text-blue-700 rounded-md">
                  {paymentMethod}
                </span>
              </div>

              {paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-600">Amount Received</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(parseFloat(amountReceived) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200 pt-3 mt-2">
                    <span className="text-base font-semibold text-gray-900">Change</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(changeGiven)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 pt-4 mt-2">
                <span className="text-base font-semibold text-gray-900">Total Amount</span>
                <span className="text-xl font-bold text-gray-900">{formatCurrency(getTotalAmount())}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="flex-1 h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmTransaction}
              disabled={loading}
              className="flex-1 h-11 bg-gray-900 hover:bg-gray-800 text-white"
            >
              {loading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-lg" hideClose>
          <DialogTitle className="sr-only">Point of Sale Receipt</DialogTitle>
          <DialogDescription className="sr-only">Transaction receipt for {receiptNumber}</DialogDescription>
          {lastTransaction && (
            <div className="space-y-6">
              {/* Header Section */}
              <div className="text-center space-y-4 pb-6 border-b-2 border-gray-200">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-900 tracking-tight">CNERGY GYM</h2>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Point of Sale Receipt</p>
                </div>
                <div className="pt-2 space-y-1.5">
                  {lastTransaction.payment_method === "gcash" && lastTransaction.reference_number ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Reference #</span>
                      <span className="text-sm font-bold text-gray-900">{lastTransaction.reference_number}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Receipt #</span>
                      <span className="text-sm font-bold text-gray-900">{receiptNumber}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {formatDateTime().date} • {formatDateTime().time}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 space-y-4 border border-gray-200">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-gray-600">Payment Method</span>
                    <span className={`text-sm font-semibold text-gray-900 capitalize px-4 py-1.5 rounded-full ${lastTransaction.payment_method === "gcash"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                      }`}>
                      {formatPaymentMethod(lastTransaction.payment_method)}
                    </span>
                  </div>

                  {lastTransaction.payment_method === "gcash" && lastTransaction.reference_number && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">GCash Reference</span>
                        <span className="text-sm font-semibold text-gray-900 font-mono">
                          {lastTransaction.reference_number}
                        </span>
                      </div>
                    </div>
                  )}

                  {lastTransaction.payment_method === "cash" && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Amount Received</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(parseFloat(amountReceived) || lastTransaction.total_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">Change</span>
                        <span className="text-base font-bold text-green-600">
                          {formatCurrency(changeGiven)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Section */}
                <div className="flex justify-between items-center py-4 px-2 border-t-2 border-gray-300">
                  <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(lastTransaction.total_amount)}
                  </span>
                </div>
              </div>

              {/* Footer Message */}
              <div className="text-center pt-4 border-t border-gray-200">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium text-green-700">Transaction completed successfully</p>
                </div>
                <p className="text-sm text-gray-500 mt-4">Thank you for your business!</p>
              </div>
            </div>
          )}
          <DialogFooter className="pt-6 border-t border-gray-200">
            <Button
              onClick={() => setShowReceipt(false)}
              className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="space-y-3 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Archive className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-gray-900">Archive Product</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-gray-600 mt-1">
                  {productToArchive?.name}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-700">
              Are you sure you want to archive <span className="font-semibold text-gray-900">&quot;{productToArchive?.name}&quot;</span>?
            </p>
            <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="space-y-2 text-sm text-orange-800">
                  <p className="font-semibold">Important Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-orange-700">
                    <li>This product will be hidden from active inventory</li>
                    <li>Sales data will be preserved</li>
                    <li>You can restore this product later</li>
                    <li>This action does not delete the product</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="pt-4 border-t border-gray-200">
            <AlertDialogCancel className="h-11 border-2 border-gray-300 hover:bg-gray-50" disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveProduct}
              disabled={loading}
              className="h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {loading ? "Archiving..." : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Product
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Low Stock Products Dialog */}
      <Dialog open={lowStockDialogOpen} onOpenChange={setLowStockDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] border-0 shadow-2xl bg-gray-50/95" hideClose={true}>
          <DialogHeader className="pb-6 border-b border-gray-200 bg-white/80 rounded-t-lg px-6 -mx-6 -mt-6 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gray-100 border border-gray-300 shadow-sm">
                  <Package className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-semibold text-gray-900">
                    Low Stock Products
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600 mt-1.5">
                    Products with 10 or fewer items remaining that need restocking
                  </DialogDescription>
                </div>
              </div>
              {getLowStockProducts().length > 0 && (
                <Badge variant="outline" className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 border-gray-300 font-medium shadow-sm">
                  {getLowStockProducts().length} {getLowStockProducts().length === 1 ? 'Item' : 'Items'}
                </Badge>
              )}
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] -mx-6 px-6 bg-white/50">
            {getLowStockProducts().length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6 border border-gray-200">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">All Products Well Stocked!</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Great news! All your products have sufficient inventory levels. No restocking needed at this time.
                </p>
              </div>
            ) : (
              <div className="py-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100/80 hover:bg-gray-100/80 border-b border-gray-200">
                      <TableHead className="font-medium text-gray-700">Product Name</TableHead>
                      <TableHead className="font-medium text-gray-700">Category</TableHead>
                      <TableHead className="font-medium text-gray-700">Current Stock</TableHead>
                      <TableHead className="font-medium text-gray-700">Price</TableHead>
                      <TableHead className="font-medium text-gray-700">Status</TableHead>
                      <TableHead className="text-right font-medium text-gray-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getLowStockProducts()
                      .sort((a, b) => a.stock - b.stock)
                      .map((product) => (
                        <TableRow key={product.id} className="hover:bg-gray-50/60 transition-colors border-b border-gray-100 bg-white/70">
                          <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 font-normal shadow-sm">
                              {product.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-gray-700">
                              {product.stock} {product.stock === 1 ? 'unit' : 'units'}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">{formatCurrency(product.price)}</TableCell>
                          <TableCell>
                            {product.stock === 0 || product.stock <= 5 ? (
                              <Badge className="bg-red-500 text-white font-medium border-0">
                                {product.stock === 0 ? 'Out of Stock' : 'Critical'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
                                Low Stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setStockUpdateProduct(product)
                                setStockUpdateType("add")
                                setStockUpdateQuantity("")
                                setIsAddOnlyMode(true)
                                setLowStockDialogOpen(false)
                              }}
                              disabled={loading}
                              className="bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-sm hover:shadow-md transition-all"
                            >
                              <Plus className="mr-1.5 h-4 w-4" />
                              Add Stock
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-gray-200 pt-4 bg-white/80 rounded-b-lg px-6 -mx-6 -mb-6 pb-6">
            <Button
              variant="outline"
              onClick={() => setLowStockDialogOpen(false)}
              className="font-medium border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700 shadow-sm transition-all"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Error Modal */}
      <Dialog open={stockErrorModalOpen} onOpenChange={setStockErrorModalOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Insufficient Stock
              </DialogTitle>
            </div>
            <DialogDescription className="text-base text-gray-600">
              The requested quantity exceeds the available stock for this product.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Product:</span>
                <span className="text-sm font-semibold text-gray-900">{stockErrorData.productName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Available Stock:</span>
                <Badge
                  variant={stockErrorData.availableStock === 0 ? "destructive" : "secondary"}
                  className="font-semibold"
                >
                  {stockErrorData.availableStock} {stockErrorData.availableStock === 1 ? 'unit' : 'units'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Requested Quantity:</span>
                <Badge variant="outline" className="font-semibold text-red-600 border-red-300">
                  {stockErrorData.requestedQuantity} {stockErrorData.requestedQuantity === 1 ? 'unit' : 'units'}
                </Badge>
              </div>
            </div>
            {stockErrorData.availableStock > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> You can add up to {stockErrorData.availableStock} {stockErrorData.availableStock === 1 ? 'unit' : 'units'} of this product to your cart.
                </p>
              </div>
            )}
            {stockErrorData.availableStock === 0 && (
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <p className="text-sm text-red-800">
                  <strong>Note:</strong> This product is currently out of stock. Please restock the inventory before adding it to a sale.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setStockErrorModalOpen(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Notification Dialog */}
      <Dialog open={showSuccessNotification} onOpenChange={setShowSuccessNotification}>
        <DialogContent className="max-w-md border-0 shadow-2xl p-0 overflow-hidden">
          <div className="flex flex-col items-center text-center py-8 px-6 bg-gradient-to-b from-white to-gray-50">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-green-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative p-5 rounded-full bg-gradient-to-br from-green-50 to-emerald-50 border-4 border-green-100 shadow-lg">
                <CheckCircle className="h-16 w-16 text-green-600" strokeWidth={2.5} />
              </div>
            </div>
            <DialogTitle className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              Product Added Successfully!
            </DialogTitle>
            <p className="text-gray-600 mb-8 text-base leading-relaxed max-w-sm">
              {successMessage}
            </p>
            <Button
              onClick={() => setShowSuccessNotification(false)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-10 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Coaching Sales Dialog */}
      <Dialog open={coachingSalesDialogOpen} onOpenChange={setCoachingSalesDialogOpen}>
        <DialogContent className="max-w-[80vw] w-[80vw] max-h-[85vh] overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="pb-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                  <User className="h-5 w-5 text-gray-700" />
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <DialogTitle className="text-xl font-bold text-gray-900">Coaching Sales Details</DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 mt-0.5">
                      View all coaching sales by coach with detailed transaction information
                    </DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Get filtered coaching sales for printing - use EXACT same logic as the table
                      const filteredSales = sales.filter((sale) => {
                        // Filter by coaching sales
                        const isCoachingSale = sale.sale_type === 'Coaching' ||
                          sale.sale_type === 'Coach Assignment' ||
                          sale.sale_type === 'Coach'

                        if (!isCoachingSale) return false

                        // Filter by search query
                        const matchesSearch = coachingSalesSearchQuery === "" ||
                          sale.user_name?.toLowerCase().includes(coachingSalesSearchQuery.toLowerCase()) ||
                          sale.coach_name?.toLowerCase().includes(coachingSalesSearchQuery.toLowerCase()) ||
                          sale.receipt_number?.toLowerCase().includes(coachingSalesSearchQuery.toLowerCase()) ||
                          sale.payment_method?.toLowerCase().includes(coachingSalesSearchQuery.toLowerCase())

                        if (!matchesSearch) return false

                        // Filter by selected coach if not "all"
                        if (selectedCoachFilter !== "all") {
                          if (!sale.coach_id || sale.coach_id.toString() !== selectedCoachFilter) return false
                        }

                        // Filter by quick access filter
                        if (coachingSalesQuickFilter === "today") {
                          const saleDate = new Date(sale.sale_date)
                          saleDate.setHours(0, 0, 0, 0)
                          const todayPH = getTodayInPHTime()
                          const todayDate = new Date(todayPH + "T00:00:00")
                          todayDate.setHours(0, 0, 0, 0)
                          const saleDateStr = saleDate.toISOString().split('T')[0]
                          const todayStr = todayDate.toISOString().split('T')[0]
                          if (saleDateStr !== todayStr) return false
                        } else if (coachingSalesQuickFilter === "thisWeek") {
                          const now = new Date()
                          const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                          const today = new Date(phTime)
                          today.setHours(0, 0, 0, 0)
                          const dayOfWeek = today.getDay()
                          const startOfWeek = new Date(today)
                          startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                          const endOfWeek = new Date(startOfWeek)
                          endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                          endOfWeek.setHours(23, 59, 59, 999)
                          const saleDate = new Date(sale.sale_date)
                          if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                        } else if (coachingSalesQuickFilter === "thisMonth") {
                          const now = new Date()
                          const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                          const saleDate = new Date(sale.sale_date)
                          const saleMonth = saleDate.getMonth()
                          const saleYear = saleDate.getFullYear()
                          const currentMonth = phTime.getMonth()
                          const currentYear = phTime.getFullYear()
                          if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                        } else if (coachingSalesQuickFilter === "all") {
                          // Filter by date range
                          if (coachingStartDate || coachingEndDate) {
                            const saleDate = new Date(sale.sale_date)
                            saleDate.setHours(0, 0, 0, 0)

                            if (coachingStartDate) {
                              const startDate = new Date(coachingStartDate)
                              startDate.setHours(0, 0, 0, 0)
                              if (saleDate < startDate) return false
                            }

                            if (coachingEndDate) {
                              const endDate = new Date(coachingEndDate)
                              endDate.setHours(23, 59, 59, 999)
                              if (saleDate > endDate) return false
                            }
                          }
                        }

                        const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)

                        // If no assignment details, it's likely a session sale
                        if (!assignmentDetails) {
                          // If service type filter is set to "session", include it
                          if (coachingServiceTypeFilter === "session") return true
                          // If service type filter is set to "monthly", exclude it
                          if (coachingServiceTypeFilter === "monthly") return false
                          // If filter is "all", include it
                          return true
                        }

                        // Filter out package sales and N/A entries (broken data)
                        const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                        const normalizedServiceType = serviceType === 'per_session' || serviceType === 'session' ? 'session' :
                          serviceType === 'package' ? 'package' : 'monthly'

                        // Exclude package sales
                        if (normalizedServiceType === 'package') return false

                        // For monthly sales, require assignment details with endDate
                        if (normalizedServiceType === 'monthly' && !assignmentDetails?.endDate) return false

                        if (coachingServiceTypeFilter !== "all") {
                          if (normalizedServiceType !== coachingServiceTypeFilter) return false
                        }

                        return true
                      })

                      // Calculate totals
                      const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
                      const sessionSales = filteredSales.filter(sale => {
                        const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                        if (!assignmentDetails) return true
                        const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                        return serviceType === 'per_session' || serviceType === 'session'
                      })
                      const monthlySales = filteredSales.filter(sale => {
                        const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                        if (!assignmentDetails) return false
                        const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                        const normalizedType = serviceType === 'per_session' || serviceType === 'session' ? 'session' : 'monthly'
                        return normalizedType === 'monthly'
                      })
                      const sessionTotal = sessionSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
                      const monthlyTotal = monthlySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

                      // Get date range text
                      let dateRangeText = "All Coaching Sales"
                      if (coachingSalesQuickFilter === "today") {
                        dateRangeText = "Today's Coaching Sales"
                      } else if (coachingSalesQuickFilter === "thisWeek") {
                        dateRangeText = "This Week's Coaching Sales"
                      } else if (coachingSalesQuickFilter === "thisMonth") {
                        dateRangeText = "This Month's Coaching Sales"
                      } else if (coachingStartDate && coachingEndDate) {
                        dateRangeText = `${format(coachingStartDate, "MMM dd, yyyy")} - ${format(coachingEndDate, "MMM dd, yyyy")}`
                      } else if (coachingStartDate) {
                        dateRangeText = `From ${format(coachingStartDate, "MMM dd, yyyy")}`
                      } else if (coachingEndDate) {
                        dateRangeText = `Until ${format(coachingEndDate, "MMM dd, yyyy")}`
                      }

                      // Create print window
                      const printWindow = window.open('', '_blank')
                      const printDate = format(new Date(), "MMM dd, yyyy 'at' hh:mm a")

                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Coaching Sales Report - ${dateRangeText}</title>
                            <style>
                              @media print {
                                @page {
                                  size: A4 landscape;
                                  margin: 1cm;
                                }
                                body {
                                  margin: 0;
                                  padding: 0;
                                }
                              }
                              body {
                                font-family: Arial, sans-serif;
                                padding: 20px;
                                font-size: 12px;
                              }
                              .header {
                                text-align: center;
                                margin-bottom: 20px;
                                border-bottom: 2px solid #000;
                                padding-bottom: 10px;
                              }
                              .header h1 {
                                margin: 0;
                                font-size: 24px;
                                font-weight: bold;
                              }
                              .header h2 {
                                margin: 5px 0;
                                font-size: 18px;
                                font-weight: normal;
                              }
                              .header p {
                                font-size: 13px;
                                font-weight: 600;
                                margin-top: 8px;
                                color: #333;
                              }
                              .header .date {
                                font-size: 11px;
                                margin-top: 4px;
                                color: #666;
                              }
                              .summary {
                                display: grid;
                                grid-template-columns: repeat(3, 1fr);
                                gap: 15px;
                                margin-bottom: 20px;
                                padding: 15px;
                                background: #f5f5f5;
                                border-radius: 5px;
                              }
                              .summary-card {
                                text-align: center;
                                padding: 10px;
                                background: white;
                                border-radius: 5px;
                                border: 1px solid #ddd;
                              }
                              .summary-card h3 {
                                margin: 0 0 5px 0;
                                font-size: 11px;
                                color: #666;
                                text-transform: uppercase;
                              }
                              .summary-card p {
                                margin: 0;
                                font-size: 18px;
                                font-weight: bold;
                                color: #000;
                              }
                              table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 10px;
                              }
                              th, td {
                                border: 1px solid #ddd;
                                padding: 8px;
                                text-align: left;
                              }
                              th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                                font-size: 11px;
                                text-transform: uppercase;
                              }
                              td {
                                font-size: 11px;
                              }
                              .text-right {
                                text-align: right;
                              }
                              .footer {
                                margin-top: 20px;
                                padding-top: 10px;
                                border-top: 1px solid #ddd;
                                text-align: center;
                                font-size: 10px;
                                color: #666;
                              }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>CNERGY GYM</h1>
                              <h2>Coaching Sales Report</h2>
                              <p>${dateRangeText}</p>
                              <p class="date">Generated: ${printDate}</p>
                            </div>
                            
                            <div class="summary">
                              <div class="summary-card">
                                <h3>Total Revenue</h3>
                                <p>${formatCurrency(totalSales)}</p>
                                <p style="font-size: 10px; color: #666; margin-top: 3px; font-weight: normal;">${filteredSales.length} transaction${filteredSales.length !== 1 ? 's' : ''}</p>
                              </div>
                              <div class="summary-card">
                                <h3>Session Sales</h3>
                                <p>${formatCurrency(sessionTotal)}</p>
                                <p style="font-size: 10px; color: #666; margin-top: 3px; font-weight: normal;">${sessionSales.length} sale${sessionSales.length !== 1 ? 's' : ''}</p>
                              </div>
                              <div class="summary-card">
                                <h3>Monthly Sales</h3>
                                <p>${formatCurrency(monthlyTotal)}</p>
                                <p style="font-size: 10px; color: #666; margin-top: 3px; font-weight: normal;">${monthlySales.length} sale${monthlySales.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>

                            <table>
                              <thead>
                                <tr>
                                  <th style="width: 40px;">#</th>
                                  <th>Transaction Date</th>
                                  <th>Customer Name</th>
                                  <th style="width: 100px;">Service Type</th>
                                  <th>Coach Name</th>
                                  <th style="width: 100px;">Payment Method</th>
                                  <th style="width: 120px;">Receipt Number</th>
                                  <th class="text-right" style="width: 110px;">Amount (₱)</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${filteredSales.length === 0 ? `
                                  <tr>
                                    <td colspan="8" style="text-align: center; padding: 30px; font-style: italic; color: #999;">
                                      No coaching sales found matching the selected filters.
                                    </td>
                                  </tr>
                                ` : filteredSales.map((sale, index) => {
                        const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                        const serviceType = assignmentDetails
                          ? (assignmentDetails.rateType === 'per_session' || assignmentDetails.rateType === 'session' || assignmentDetails.assignmentType === 'session' ? 'Session' : 'Monthly')
                          : 'Session'
                        const customerName = formatName(sale.user_name) || 'N/A'
                        const coachName = sale.coach_name ? formatName(sale.coach_name) : 'N/A'
                        const paymentMethod = formatPaymentMethod(sale.payment_method)
                        const receiptNumber = (() => {
                          const paymentMethod = (sale.payment_method || 'cash').toLowerCase()
                          if (sale.reference_number) {
                            return sale.reference_number
                          }
                          if (paymentMethod === 'gcash' || paymentMethod === 'digital') {
                            return sale.reference_number || sale.gcash_reference || sale.receipt_number || "N/A"
                          }
                          return sale.receipt_number || "N/A"
                        })()
                        const saleDateDisplay = formatDateOnly(sale.sale_date)
                        const saleAmount = sale.total_amount || 0

                        return `
                                    <tr>
                                      <td style="text-align: center;">${index + 1}</td>
                                      <td>${saleDateDisplay}</td>
                                      <td>${customerName}</td>
                                      <td>${serviceType}</td>
                                      <td>${coachName}</td>
                                      <td>${paymentMethod}</td>
                                      <td style="font-family: monospace; font-size: 10px;">${receiptNumber}</td>
                                      <td class="text-right" style="font-weight: 600;">${formatCurrency(saleAmount)}</td>
                                    </tr>
                                  `
                      }).join('')}
                              </tbody>
                              <tfoot>
                                <tr style="background-color: #f9fafb; font-weight: bold;">
                                  <td colspan="7" style="text-align: right; padding: 12px 8px; font-size: 12px; border-top: 2px solid #000;">TOTAL REVENUE:</td>
                                  <td class="text-right" style="padding: 12px 8px; font-size: 13px; border-top: 2px solid #000;">${formatCurrency(totalSales)}</td>
                                </tr>
                                <tr>
                                  <td colspan="8" style="text-align: center; padding: 8px; font-size: 10px; color: #666; border-top: 1px solid #ddd;">
                                    Total Transactions: ${filteredSales.length} | Session: ${formatCurrency(sessionTotal)} | Monthly: ${formatCurrency(monthlyTotal)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>

                            <div class="footer">
                              <p style="margin: 0;">This is a computer-generated report from CNERGY GYM Sales Management System.</p>
                              <p style="margin: 5px 0 0 0; font-size: 9px;">For inquiries, please contact the administration office.</p>
                            </div>
                          </body>
                        </html>
                      `)

                      printWindow.document.close()
                      setTimeout(() => {
                        printWindow.print()
                      }, 250)
                    }}
                    className="h-9 px-3 text-sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCoachingSalesDialogOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-4 flex-1 overflow-hidden flex flex-col">
            {/* Quick Access Filters */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-sm font-medium text-gray-700 mr-2">Quick Access:</span>
              <Button
                variant={coachingSalesQuickFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCoachingSalesQuickFilter("all")
                  setCoachingStartDate(null)
                  setCoachingEndDate(null)
                }}
                className={`h-8 text-xs ${coachingSalesQuickFilter === "all" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                All Sales
              </Button>
              <Button
                variant={coachingSalesQuickFilter === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCoachingSalesQuickFilter("today")
                  const todayPH = getTodayInPHTime()
                  const todayDate = new Date(todayPH + "T00:00:00")
                  setCoachingStartDate(todayDate)
                  setCoachingEndDate(todayDate)
                }}
                className={`h-8 text-xs ${coachingSalesQuickFilter === "today" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                Today
              </Button>
              <Button
                variant={coachingSalesQuickFilter === "thisWeek" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCoachingSalesQuickFilter("thisWeek")
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const today = new Date(phTime)
                  today.setHours(0, 0, 0, 0)
                  const dayOfWeek = today.getDay()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                  endOfWeek.setHours(23, 59, 59, 999)
                  setCoachingStartDate(startOfWeek)
                  setCoachingEndDate(endOfWeek)
                }}
                className={`h-8 text-xs ${coachingSalesQuickFilter === "thisWeek" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                This Week
              </Button>
              <Button
                variant={coachingSalesQuickFilter === "thisMonth" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCoachingSalesQuickFilter("thisMonth")
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const startOfMonth = new Date(phTime.getFullYear(), phTime.getMonth(), 1)
                  startOfMonth.setHours(0, 0, 0, 0)
                  const endOfMonth = new Date(phTime.getFullYear(), phTime.getMonth() + 1, 0)
                  endOfMonth.setHours(23, 59, 59, 999)
                  setCoachingStartDate(startOfMonth)
                  setCoachingEndDate(endOfMonth)
                }}
                className={`h-8 text-xs ${coachingSalesQuickFilter === "thisMonth" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                This Month
              </Button>
            </div>

            {/* Filters Row - All in One Row */}
            <div className="flex items-center gap-3 flex-wrap pb-3 border-b">
              {/* Search */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search coaching sales..."
                  className="pl-10 h-9 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  value={coachingSalesSearchQuery}
                  onChange={(e) => setCoachingSalesSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label htmlFor="coach-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">By Coach:</Label>
                  <Select value={selectedCoachFilter} onValueChange={setSelectedCoachFilter}>
                    <SelectTrigger className="w-48 h-9 text-sm border-gray-300">
                      <SelectValue placeholder="Select a coach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Coaches</SelectItem>
                      {coaches
                        .map((coach) => {
                          // Calculate total sales for this coach
                          const coachSales = sales.filter(sale => {
                            const isCoachingSale = sale.sale_type === 'Coaching' ||
                              sale.sale_type === 'Coach Assignment' ||
                              sale.sale_type === 'Coach'
                            return isCoachingSale && sale.coach_id && sale.coach_id.toString() === coach.id.toString()
                          })
                          const totalSales = coachSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
                          return { ...coach, totalSales }
                        })
                        .sort((a, b) => b.totalSales - a.totalSales) // Sort by sales descending (biggest first)
                        .map((coach) => (
                          <SelectItem key={coach.id} value={coach.id.toString()}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span>{coach.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="coaching-service-type-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">Service Type:</Label>
                  <Select value={coachingServiceTypeFilter} onValueChange={setCoachingServiceTypeFilter}>
                    <SelectTrigger className="w-36 h-9 text-sm border-gray-300">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range Picker */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600 whitespace-nowrap">Start Date:</Label>
                    <Input
                      type="date"
                      value={coachingStartDate ? format(coachingStartDate, "yyyy-MM-dd") : ""}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        if (selectedDate) {
                          const date = new Date(selectedDate + "T00:00:00")
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          if (date.getTime() <= today.getTime()) {
                            setCoachingStartDate(date)
                            setCoachingSalesQuickFilter("all") // Switch to "all" when custom date range is selected
                            // If end date is set and is before start date, clear it
                            if (coachingEndDate && date > coachingEndDate) {
                              setCoachingEndDate(null)
                            }
                          }
                        } else {
                          setCoachingStartDate(null)
                        }
                      }}
                      className="h-9 text-sm w-[140px] border-gray-300"
                      placeholder="Start date"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600 whitespace-nowrap">End Date:</Label>
                    <Input
                      type="date"
                      value={coachingEndDate ? format(coachingEndDate, "yyyy-MM-dd") : ""}
                      min={coachingStartDate ? format(coachingStartDate, "yyyy-MM-dd") : undefined}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        if (selectedDate) {
                          const date = new Date(selectedDate + "T00:00:00")
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          if (date.getTime() <= today.getTime()) {
                            // If start date is set and selected date is before it, don't update
                            if (coachingStartDate && date < coachingStartDate) {
                              return
                            }
                            setCoachingEndDate(date)
                            setCoachingSalesQuickFilter("all") // Switch to "all" when custom date range is selected
                          }
                        } else {
                          setCoachingEndDate(null)
                        }
                      }}
                      className="h-9 text-sm w-[140px] border-gray-300"
                      placeholder="End date"
                    />
                  </div>
                  {(coachingStartDate || coachingEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setCoachingStartDate(null)
                        setCoachingEndDate(null)
                      }}
                      className="h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Coach Total Transactions Display Card */}
            {selectedCoachFilter !== "all" && (() => {
              // Calculate total transactions for the selected coach based on current filters
              const coachSales = sales.filter((sale) => {
                const isCoachingSale = sale.sale_type === 'Coaching' ||
                  sale.sale_type === 'Coach Assignment' ||
                  sale.sale_type === 'Coach'
                if (!isCoachingSale) return false
                if (!sale.coach_id || sale.coach_id.toString() !== selectedCoachFilter) return false

                // Apply same date filters as the main filter
                // Filter by date range (works for all quick filters and custom range)
                if (coachingStartDate || coachingEndDate) {
                  const saleDate = new Date(sale.sale_date)
                  saleDate.setHours(0, 0, 0, 0)

                  if (coachingStartDate) {
                    const startDate = new Date(coachingStartDate)
                    startDate.setHours(0, 0, 0, 0)
                    if (saleDate < startDate) return false
                  }

                  if (coachingEndDate) {
                    const endDate = new Date(coachingEndDate)
                    endDate.setHours(23, 59, 59, 999)
                    if (saleDate > endDate) return false
                  }
                }

                // Filter out package sales and N/A entries (broken data)
                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)

                // If no assignment details, it's likely a session sale
                if (!assignmentDetails) {
                  // If service type filter is set to "session", include it (session sales might not have assignments)
                  if (coachingServiceTypeFilter === "session") return true
                  // If service type filter is set to "monthly", exclude it (monthly sales have assignments)
                  if (coachingServiceTypeFilter === "monthly") return false
                  // If filter is "all", include it
                  return true
                }

                // Apply service type filter if set
                if (coachingServiceTypeFilter !== "all") {
                  const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                  const normalizedServiceType = serviceType === 'per_session' || serviceType === 'session' ? 'session' : 'monthly'
                  if (normalizedServiceType !== coachingServiceTypeFilter) return false
                }

                const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                const normalizedServiceType = serviceType === 'per_session' || serviceType === 'session' ? 'session' :
                  serviceType === 'package' ? 'package' : 'monthly'

                // Exclude package sales
                if (normalizedServiceType === 'package') return false

                // For session sales, allow them even without assignment details (session sales might not have assignments)
                // For monthly sales, require assignment details with endDate (to filter out broken data)
                if (normalizedServiceType === 'monthly' && !assignmentDetails?.endDate) return false

                return true
              })

              const totalTransactions = coachSales.length

              return (
                <Card className="border border-gray-200 bg-white shadow-sm flex-shrink-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                          <TrendingUp className="h-6 w-6 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {coaches.find(c => c.id.toString() === selectedCoachFilter)?.name || 'Selected Coach'}
                          </p>
                          <p className="text-xs text-gray-600 font-medium mt-0.5">Total Transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">
                          {totalTransactions}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 font-medium">
                          {totalTransactions === 1 ? 'Transaction' : 'Transactions'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {/* Sales Dashboard */}
            {(() => {
              // Calculate statistics based on current filters (including status filter)
              const filteredSalesForStats = sales.filter((sale) => {
                const isCoachingSale = sale.sale_type === 'Coaching' ||
                  sale.sale_type === 'Coach Assignment' ||
                  sale.sale_type === 'Coach'
                if (!isCoachingSale) return false

                if (selectedCoachFilter !== "all") {
                  if (!sale.coach_id || sale.coach_id.toString() !== selectedCoachFilter) return false
                }

                // Filter by quick access filter
                if (coachingSalesQuickFilter === "today") {
                  const saleDate = new Date(sale.sale_date)
                  saleDate.setHours(0, 0, 0, 0)
                  const todayPH = getTodayInPHTime()
                  const todayDate = new Date(todayPH + "T00:00:00")
                  todayDate.setHours(0, 0, 0, 0)
                  const saleDateStr = saleDate.toISOString().split('T')[0]
                  const todayStr = todayDate.toISOString().split('T')[0]
                  if (saleDateStr !== todayStr) return false
                } else if (coachingSalesQuickFilter === "thisWeek") {
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const today = new Date(phTime)
                  today.setHours(0, 0, 0, 0)
                  const dayOfWeek = today.getDay()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                  endOfWeek.setHours(23, 59, 59, 999)
                  const saleDate = new Date(sale.sale_date)
                  if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                } else if (coachingSalesQuickFilter === "thisMonth") {
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const saleDate = new Date(sale.sale_date)
                  const saleMonth = saleDate.getMonth()
                  const saleYear = saleDate.getFullYear()
                  const currentMonth = phTime.getMonth()
                  const currentYear = phTime.getFullYear()
                  if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                } else if (coachingSalesQuickFilter === "all") {
                  // Filter by date range
                  if (coachingStartDate || coachingEndDate) {
                    const saleDate = new Date(sale.sale_date)
                    saleDate.setHours(0, 0, 0, 0)

                    if (coachingStartDate) {
                      const startDate = new Date(coachingStartDate)
                      startDate.setHours(0, 0, 0, 0)
                      if (saleDate < startDate) return false
                    }

                    if (coachingEndDate) {
                      const endDate = new Date(coachingEndDate)
                      endDate.setHours(23, 59, 59, 999)
                      if (saleDate > endDate) return false
                    }
                  }
                }

                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)

                // If no assignment details, it's likely a session sale
                if (!assignmentDetails) {
                  // If service type filter is set to "session", include it (session sales might not have assignments)
                  if (coachingServiceTypeFilter === "session") return true
                  // If service type filter is set to "monthly", exclude it (monthly sales have assignments)
                  if (coachingServiceTypeFilter === "monthly") return false
                  // If filter is "all", include it
                  return true
                }

                // Filter out package sales and N/A entries (broken data)
                const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                const normalizedServiceType = serviceType === 'per_session' || serviceType === 'session' ? 'session' :
                  serviceType === 'package' ? 'package' : 'monthly'

                // Exclude package sales
                if (normalizedServiceType === 'package') return false

                // For session sales, allow them even without assignment details (session sales might not have assignments)
                // For monthly sales, require assignment details with endDate (to filter out broken data)
                if (normalizedServiceType === 'monthly' && !assignmentDetails?.endDate) return false

                if (coachingServiceTypeFilter !== "all") {
                  if (normalizedServiceType !== coachingServiceTypeFilter) return false
                }

                // Status filter removed - show all sales
                return true
              })

              const totalSales = filteredSalesForStats.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
              const sessionSales = filteredSalesForStats.filter(sale => {
                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                // If no assignment details, it's a session sale (session sales might not have assignments)
                if (!assignmentDetails) return true
                const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                return serviceType === 'per_session' || serviceType === 'session'
              })
              const monthlySales = filteredSalesForStats.filter(sale => {
                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                // If no assignment details, it's not a monthly sale (monthly sales have assignments)
                if (!assignmentDetails) return false
                const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                const normalizedType = serviceType === 'per_session' || serviceType === 'session' ? 'session' : 'monthly'
                return normalizedType === 'monthly'
              })

              const sessionTotal = sessionSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
              const monthlyTotal = monthlySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0">
                  <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Total Sales</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
                          <p className="text-xs text-gray-600 mt-1.5">{filteredSalesForStats.length} transaction{filteredSalesForStats.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                          <TrendingUp className="h-5 w-5 text-gray-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Session Sales</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(sessionTotal)}</p>
                          <p className="text-xs text-gray-600 mt-1.5">{sessionSales.length} sale{sessionSales.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                          <Clock className="h-5 w-5 text-gray-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Monthly Sales</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyTotal)}</p>
                          <p className="text-xs text-gray-600 mt-1.5">{monthlySales.length} sale{monthlySales.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                          <CalendarIcon className="h-5 w-5 text-gray-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              )
            })()}

            {/* Active/Expired Tabs */}
            {/* Coaching Sales Table */}
            {(() => {
              const filteredSales = sales.filter((sale) => {
                // Filter by coaching sales
                const isCoachingSale = sale.sale_type === 'Coaching' ||
                  sale.sale_type === 'Coach Assignment' ||
                  sale.sale_type === 'Coach'

                if (!isCoachingSale) return false

                // Filter by search query
                const matchesSearch = coachingSalesSearchQuery === "" ||
                  sale.user_name?.toLowerCase().includes(coachingSalesSearchQuery.toLowerCase()) ||
                  sale.coach_name?.toLowerCase().includes(coachingSalesSearchQuery.toLowerCase()) ||
                  sale.receipt_number?.toLowerCase().includes(coachingSalesSearchQuery.toLowerCase()) ||
                  sale.payment_method?.toLowerCase().includes(coachingSalesSearchQuery.toLowerCase())

                if (!matchesSearch) return false

                // Filter by selected coach if not "all"
                if (selectedCoachFilter !== "all") {
                  if (!sale.coach_id || sale.coach_id.toString() !== selectedCoachFilter) return false
                }

                // Filter by quick access filter
                if (coachingSalesQuickFilter === "today") {
                  const saleDate = new Date(sale.sale_date)
                  saleDate.setHours(0, 0, 0, 0)
                  const todayPH = getTodayInPHTime()
                  const todayDate = new Date(todayPH + "T00:00:00")
                  todayDate.setHours(0, 0, 0, 0)
                  const saleDateStr = saleDate.toISOString().split('T')[0]
                  const todayStr = todayDate.toISOString().split('T')[0]
                  if (saleDateStr !== todayStr) return false
                } else if (coachingSalesQuickFilter === "thisWeek") {
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const today = new Date(phTime)
                  today.setHours(0, 0, 0, 0)
                  const dayOfWeek = today.getDay()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                  endOfWeek.setHours(23, 59, 59, 999)
                  const saleDate = new Date(sale.sale_date)
                  if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                } else if (coachingSalesQuickFilter === "thisMonth") {
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const saleDate = new Date(sale.sale_date)
                  const saleMonth = saleDate.getMonth()
                  const saleYear = saleDate.getFullYear()
                  const currentMonth = phTime.getMonth()
                  const currentYear = phTime.getFullYear()
                  if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                } else if (coachingSalesQuickFilter === "all") {
                  // Filter by date range
                  if (coachingStartDate || coachingEndDate) {
                    const saleDate = new Date(sale.sale_date)
                    saleDate.setHours(0, 0, 0, 0)

                    if (coachingStartDate) {
                      const startDate = new Date(coachingStartDate)
                      startDate.setHours(0, 0, 0, 0)
                      if (saleDate < startDate) return false
                    }

                    if (coachingEndDate) {
                      const endDate = new Date(coachingEndDate)
                      endDate.setHours(23, 59, 59, 999)
                      if (saleDate > endDate) return false
                    }
                  }
                }

                const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)

                // If no assignment details, it's likely a session sale
                if (!assignmentDetails) {
                  // If service type filter is set to "session", include it (session sales might not have assignments)
                  if (coachingServiceTypeFilter === "session") return true
                  // If service type filter is set to "monthly", exclude it (monthly sales have assignments)
                  if (coachingServiceTypeFilter === "monthly") return false
                  // If filter is "all", include it
                  return true
                }

                // Filter out package sales and N/A entries (broken data)
                const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                const normalizedServiceType = serviceType === 'per_session' || serviceType === 'session' ? 'session' :
                  serviceType === 'package' ? 'package' : 'monthly'

                // Exclude package sales
                if (normalizedServiceType === 'package') return false

                // For session sales, allow them even without assignment details (session sales might not have assignments)
                // For monthly sales, require assignment details with endDate (to filter out broken data)
                if (normalizedServiceType === 'monthly' && !assignmentDetails?.endDate) return false

                if (coachingServiceTypeFilter !== "all") {
                  if (normalizedServiceType !== coachingServiceTypeFilter) return false
                }

                // Status filter removed - show all sales
                return true
              })

              const totalPages = Math.ceil(filteredSales.length / coachingItemsPerPage)
              const startIndex = (coachingCurrentPage - 1) * coachingItemsPerPage
              const endIndex = startIndex + coachingItemsPerPage
              const paginatedSales = filteredSales.slice(startIndex, endIndex)

              return (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                          <TableHead className="font-semibold text-gray-900">Date</TableHead>
                          <TableHead className="font-semibold text-gray-900">Name</TableHead>
                          <TableHead className="font-semibold text-gray-900">Service Type</TableHead>
                          <TableHead className="font-semibold text-gray-900">Coach</TableHead>
                          <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                          <TableHead className="font-semibold text-gray-900">Payment Method</TableHead>
                          <TableHead className="font-semibold text-gray-900">Receipt #</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                              <div className="flex flex-col items-center justify-center">
                                <div className="p-3 rounded-full bg-gray-100 mb-3">
                                  <User className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-lg font-medium text-gray-600 mb-1">No coaching sales found</p>
                                <p className="text-sm text-gray-500">Try adjusting your filters</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedSales.map((sale) => {
                            const assignmentDetails = getMemberAssignmentDetails(sale.user_id, sale.coach_id)
                            return (
                              <TableRow key={sale.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                                <TableCell className="font-medium text-gray-900 py-3">
                                  {formatDateOnly(sale.sale_date)}
                                </TableCell>
                                <TableCell className="text-gray-700 py-3">
                                  {formatName(sale.user_name) || 'N/A'}
                                </TableCell>
                                <TableCell className="py-3">
                                  {(() => {
                                    // If no assignment details, it's likely a session sale (session sales might not have assignments)
                                    if (!assignmentDetails) {
                                      return (
                                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 font-medium">
                                          Session
                                        </Badge>
                                      )
                                    }
                                    const serviceType = assignmentDetails?.rateType || assignmentDetails?.assignmentType || 'monthly'
                                    const displayType = serviceType === 'per_session' || serviceType === 'session' ? 'Session' : 'Monthly'
                                    return (
                                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 font-medium">
                                        {displayType}
                                      </Badge>
                                    )
                                  })()}
                                </TableCell>
                                <TableCell className="py-3">
                                  {sale.coach_name ? (
                                    <Badge variant="secondary" className="font-medium">{formatName(sale.coach_name)}</Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-semibold text-gray-900 py-3">{formatCurrency(sale.total_amount)}</TableCell>
                                <TableCell className="py-3">
                                  <Badge variant="outline" className="font-medium">
                                    {formatPaymentMethod(sale.payment_method)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-gray-600 font-mono py-3">
                                  {(() => {
                                    const paymentMethod = (sale.payment_method || 'cash').toLowerCase()
                                    // If reference_number exists, it's a GCash payment (even if payment_method is empty/wrong)
                                    if (sale.reference_number) {
                                      return sale.reference_number
                                    }
                                    // Otherwise check payment method
                                    if (paymentMethod === 'gcash' || paymentMethod === 'digital') {
                                      // Check reference_number first, then gcash_reference, then receipt_number
                                      return sale.reference_number || sale.gcash_reference || sale.receipt_number || 'N/A'
                                    }
                                    return sale.receipt_number || 'N/A'
                                  })()}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {filteredSales.length > 0 && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 flex-shrink-0">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredSales.length)} of {filteredSales.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCoachingCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={coachingCurrentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (coachingCurrentPage <= 3) {
                              pageNum = i + 1
                            } else if (coachingCurrentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = coachingCurrentPage - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={coachingCurrentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCoachingCurrentPage(pageNum)}
                                className="w-10"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCoachingCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={coachingCurrentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Total Sales Dialog */}
      <Dialog open={totalSalesDialogOpen} onOpenChange={setTotalSalesDialogOpen}>
        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[92vh] h-[92vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&>button]:hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50/40">
                  <Receipt className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <DialogTitle className="text-xl font-bold text-gray-900">All Sales Details</DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 mt-1">
                      Comprehensive view of all sales
                    </DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Create a helper function to get filtered sales (same logic as the table)
                      const getFilteredSales = () => {
                        return sales.filter((sale) => {
                          // Filter by search query
                          const matchesSearch = totalSalesSearchQuery === "" ||
                            sale.sale_type?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                            sale.plan_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                            sale.user_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                            sale.guest_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                            sale.coach_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                            (sale.sales_details && Array.isArray(sale.sales_details) && sale.sales_details.some(detail =>
                              (detail.product && detail.product.name.toLowerCase().includes(totalSalesSearchQuery.toLowerCase())) ||
                              (detail.subscription?.plan_name && detail.subscription.plan_name.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()))
                            ))

                          // Filter by sale type - simplified version of the full filtering logic
                          let matchesSaleType = true
                          if (totalSalesTypeFilter !== "all") {
                            if (totalSalesTypeFilter === "Product") {
                              const hasProducts = sale.sales_details && sale.sales_details.some(detail => detail.product_id)
                              const isProductSale = sale.sale_type === 'Product'
                              if (!hasProducts && !isProductSale) {
                                matchesSaleType = false
                              } else {
                                if (totalSalesCategoryFilter !== "all") {
                                  const hasCategoryMatch = sale.sales_details?.some(detail => {
                                    if (!detail.product_id) return false
                                    const product = detail.product || products.find(p => p.id === detail.product_id)
                                    return product?.category === totalSalesCategoryFilter
                                  })
                                  if (!hasCategoryMatch) matchesSaleType = false
                                }
                                if (totalSalesProductFilter !== "all" && matchesSaleType) {
                                  const hasProductMatch = sale.sales_details?.some(detail =>
                                    detail.product_id && detail.product_id.toString() === totalSalesProductFilter
                                  )
                                  if (!hasProductMatch) matchesSaleType = false
                                }
                              }
                            } else if (totalSalesTypeFilter === "Subscription") {
                              if (sale.sale_type === 'Product') {
                                matchesSaleType = false
                              } else if (sale.sale_type === 'Subscription') {
                                if (totalSalesSubscriptionTypeFilter !== "all") {
                                  const salePlanId = sale.plan_id?.toString()
                                  const selectedPlanId = totalSalesSubscriptionTypeFilter.toString()
                                  if (salePlanId !== selectedPlanId) {
                                    const matchesInDetails = sale.sales_details && Array.isArray(sale.sales_details) &&
                                      sale.sales_details.some(detail =>
                                        detail.subscription?.plan_id?.toString() === selectedPlanId
                                      )
                                    if (!matchesInDetails) matchesSaleType = false
                                  }
                                }
                              } else {
                                matchesSaleType = false
                              }
                            } else if (totalSalesTypeFilter === "Coach Assignment") {
                              const isCoachingSale = sale.sale_type === 'Coach Assignment' ||
                                sale.sale_type === 'Coaching' ||
                                sale.sale_type === 'Coach'
                              if (!isCoachingSale) {
                                matchesSaleType = false
                              } else {
                                if (totalSalesCoachFilter !== "all") {
                                  if (!sale.coach_id || sale.coach_id.toString() !== totalSalesCoachFilter) {
                                    matchesSaleType = false
                                  }
                                }
                                if (totalSalesServiceTypeFilter !== "all" && matchesSaleType) {
                                  const serviceType = sale.service_type || sale.coaching_type || ''
                                  const normalizedServiceType = serviceType.toLowerCase().includes('session') ? 'session' :
                                    serviceType.toLowerCase().includes('monthly') ? 'monthly' : ''
                                  if (normalizedServiceType !== totalSalesServiceTypeFilter) {
                                    matchesSaleType = false
                                  }
                                }
                              }
                            } else {
                              matchesSaleType = sale.sale_type === totalSalesTypeFilter
                            }
                          }

                          // Filter by date range
                          if (totalSalesStartDate || totalSalesEndDate) {
                            const saleDate = new Date(sale.sale_date)
                            saleDate.setHours(0, 0, 0, 0)

                            if (totalSalesStartDate) {
                              const startDate = new Date(totalSalesStartDate)
                              startDate.setHours(0, 0, 0, 0)
                              if (saleDate < startDate) return false
                            }

                            if (totalSalesEndDate) {
                              const endDate = new Date(totalSalesEndDate)
                              endDate.setHours(23, 59, 59, 999)
                              if (saleDate > endDate) return false
                            }
                          }

                          return matchesSearch && matchesSaleType
                        })
                      }

                      // Get filtered sales using the helper function
                      const filteredSales = getFilteredSales()

                      // Calculate totals
                      const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
                      const productSales = filteredSales.filter(s => s.sale_type === 'Product')
                      const subscriptionSales = filteredSales.filter(s => s.sale_type === 'Subscription')
                      const coachingSales = filteredSales.filter(s =>
                        s.sale_type === 'Coaching' || s.sale_type === 'Coach Assignment' || s.sale_type === 'Coach'
                      )

                      const productTotal = productSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
                      const subscriptionTotal = subscriptionSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
                      const coachingTotal = coachingSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

                      // Get date range text
                      let dateRangeText = "All Sales"
                      if (totalSalesQuickFilter === "today") {
                        dateRangeText = "Today's Sales"
                      } else if (totalSalesQuickFilter === "thisWeek") {
                        dateRangeText = "This Week's Sales"
                      } else if (totalSalesQuickFilter === "thisMonth") {
                        dateRangeText = "This Month's Sales"
                      } else if (totalSalesStartDate && totalSalesEndDate) {
                        dateRangeText = `${format(totalSalesStartDate, "MMM dd, yyyy")} - ${format(totalSalesEndDate, "MMM dd, yyyy")}`
                      } else if (totalSalesStartDate) {
                        dateRangeText = `From ${format(totalSalesStartDate, "MMM dd, yyyy")}`
                      } else if (totalSalesEndDate) {
                        dateRangeText = `Until ${format(totalSalesEndDate, "MMM dd, yyyy")}`
                      }

                      // Create print window
                      const printWindow = window.open('', '_blank')
                      const printDate = format(new Date(), "MMM dd, yyyy 'at' hh:mm a")

                      printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Sales Report - ${dateRangeText}</title>
                          <style>
                            @media print {
                              @page {
                                size: A4 landscape;
                                margin: 1cm;
                              }
                              body {
                                margin: 0;
                                padding: 0;
                              }
                            }
                            body {
                              font-family: Arial, sans-serif;
                              padding: 20px;
                              font-size: 12px;
                            }
                            .header {
                              text-align: center;
                              margin-bottom: 20px;
                              border-bottom: 2px solid #000;
                              padding-bottom: 10px;
                            }
                            .header h1 {
                              margin: 0;
                              font-size: 24px;
                              font-weight: bold;
                            }
                            .header p {
                              margin: 5px 0;
                              color: #666;
                            }
                            .summary {
                              display: grid;
                              grid-template-columns: repeat(4, 1fr);
                              gap: 15px;
                              margin-bottom: 20px;
                              padding: 15px;
                              background: #f5f5f5;
                              border-radius: 5px;
                            }
                            .summary-card {
                              text-align: center;
                              padding: 10px;
                              background: white;
                              border-radius: 5px;
                              border: 1px solid #ddd;
                            }
                            .summary-card h3 {
                              margin: 0 0 5px 0;
                              font-size: 11px;
                              color: #666;
                              text-transform: uppercase;
                            }
                            .summary-card p {
                              margin: 0;
                              font-size: 18px;
                              font-weight: bold;
                              color: #000;
                            }
                            table {
                              width: 100%;
                              border-collapse: collapse;
                              margin-top: 10px;
                            }
                            th, td {
                              border: 1px solid #ddd;
                              padding: 8px;
                              text-align: left;
                            }
                            th {
                              background-color: #f2f2f2;
                              font-weight: bold;
                              font-size: 11px;
                              text-transform: uppercase;
                            }
                            td {
                              font-size: 11px;
                            }
                            .text-right {
                              text-align: right;
                            }
                            .footer {
                              margin-top: 20px;
                              padding-top: 10px;
                              border-top: 1px solid #ddd;
                              text-align: center;
                              font-size: 10px;
                              color: #666;
                            }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h1>CNERGY GYM - SALES REPORT</h1>
                            <p>${dateRangeText}</p>
                            <p>Generated on ${printDate}</p>
                          </div>
                          
                          <div class="summary">
                            <div class="summary-card">
                              <h3>Total Sales</h3>
                              <p>${formatCurrency(totalSales)}</p>
                              <p style="font-size: 10px; color: #666; margin-top: 3px;">${filteredSales.length} transaction${filteredSales.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div class="summary-card">
                              <h3>Product Sales</h3>
                              <p>${formatCurrency(productTotal)}</p>
                              <p style="font-size: 10px; color: #666; margin-top: 3px;">${productSales.length} sale${productSales.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div class="summary-card">
                              <h3>Subscription Sales</h3>
                              <p>${formatCurrency(subscriptionTotal)}</p>
                              <p style="font-size: 10px; color: #666; margin-top: 3px;">${subscriptionSales.length} sale${subscriptionSales.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div class="summary-card">
                              <h3>Coaching Sales</h3>
                              <p>${formatCurrency(coachingTotal)}</p>
                              <p style="font-size: 10px; color: #666; margin-top: 3px;">${coachingSales.length} sale${coachingSales.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>

                          <table>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Plan/Product</th>
                                <th>Customer</th>
                                <th>Type</th>
                                <th>Payment</th>
                                <th>Receipt</th>
                                <th>Date</th>
                                <th class="text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${filteredSales.length === 0 ? `
                                <tr>
                                  <td colspan="8" style="text-align: center; padding: 20px;">
                                    No sales found matching the selected filters.
                                  </td>
                                </tr>
                              ` : filteredSales.map((sale, index) => {
                        // Helper function to get product name (simplified version)
                        const getProductNameForPrint = (detail, sale) => {
                          if (detail?.product?.name) {
                            return detail.product.name
                          }
                          if (detail?.subscription?.plan_name) {
                            return detail.subscription.plan_name
                          }
                          if (sale?.plan_name) {
                            return sale.plan_name
                          }
                          if (sale?.sale_type === "Product" && detail?.product_id) {
                            const product = products.find(p => p.id === detail.product_id)
                            return product ? product.name : "N/A"
                          }
                          return sale?.sale_type || "N/A"
                        }

                        const getSaleItems = () => {
                          if (sale.sales_details && Array.isArray(sale.sales_details) && sale.sales_details.length > 0) {
                            return sale.sales_details.map(detail => {
                              const quantity = detail.quantity || sale.quantity || 1
                              const name = getProductNameForPrint(detail, sale)
                              return quantity > 1 ? `${name} (${quantity}x)` : name
                            }).join(", ")
                          }
                          return getProductNameForPrint({}, sale)
                        }

                        const customerName = sale.sale_type === "Subscription" || sale.sale_type === "Coach Assignment" || sale.sale_type === "Coaching" || sale.sale_type === "Coach"
                          ? (formatName(sale.user_name) || "N/A")
                          : sale.sale_type === "Guest" || sale.sale_type === "Day Pass" || sale.sale_type === "Walk-in" || sale.sale_type === "Walkin"
                            ? (formatName(sale.guest_name || sale.user_name) || "Guest")
                            : "N/A"

                        const saleType = (() => {
                          const isDayPass = sale.sale_type === 'Walk-in' || sale.sale_type === 'Walkin' || sale.sale_type === 'Guest' || sale.sale_type === 'Day Pass'
                          if (isDayPass) {
                            return sale.user_id !== null && sale.user_id !== undefined ? 'Day Pass' : 'Guest'
                          }
                          return sale.sale_type || 'N/A'
                        })()

                        const paymentMethod = formatPaymentMethod(sale.payment_method)
                        const receiptNumber = (() => {
                          const paymentMethod = (sale.payment_method || 'cash').toLowerCase()
                          if (paymentMethod === 'gcash' || paymentMethod === 'digital') {
                            return sale.reference_number || sale.receipt_number || "N/A"
                          }
                          return sale.receipt_number || "N/A"
                        })()

                        return `
                                  <tr>
                                    <td>${index + 1}</td>
                                    <td>${getSaleItems()}</td>
                                    <td>${customerName}</td>
                                    <td>${saleType}</td>
                                    <td>${paymentMethod}</td>
                                    <td>${receiptNumber}</td>
                                    <td>${formatDate(sale.sale_date)}</td>
                                    <td class="text-right">${formatCurrency(sale.total_amount)}</td>
                                  </tr>
                                `
                      }).join('')}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th colspan="7" style="text-align: right;">Total:</th>
                                <th class="text-right">${formatCurrency(totalSales)}</th>
                              </tr>
                            </tfoot>
                          </table>

                          <div class="footer">
                            <p>This is a computer-generated report. CNERGY GYM Sales Management System.</p>
                          </div>
                        </body>
                      </html>
                    `)

                      printWindow.document.close()
                      setTimeout(() => {
                        printWindow.print()
                      }, 250)
                    }}
                    className="h-9 px-3 text-sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTotalSalesDialogOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-gray-200/80 transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col px-6 pt-4 pb-6 space-y-4">
            {/* Quick Access Filters */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-sm font-medium text-gray-700 mr-2">Quick Access:</span>
              <Button
                variant={totalSalesQuickFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTotalSalesQuickFilter("all")
                  setTotalSalesStartDate(null)
                  setTotalSalesEndDate(null)
                }}
                className={`h-8 text-xs ${totalSalesQuickFilter === "all" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                All Sales
              </Button>
              <Button
                variant={totalSalesQuickFilter === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTotalSalesQuickFilter("today")
                  const todayPH = getTodayInPHTime()
                  const todayDate = new Date(todayPH + "T00:00:00")
                  setTotalSalesStartDate(todayDate)
                  setTotalSalesEndDate(todayDate)
                }}
                className={`h-8 text-xs ${totalSalesQuickFilter === "today" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                Today
              </Button>
              <Button
                variant={totalSalesQuickFilter === "thisWeek" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTotalSalesQuickFilter("thisWeek")
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const today = new Date(phTime)
                  today.setHours(0, 0, 0, 0)
                  const dayOfWeek = today.getDay()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                  endOfWeek.setHours(23, 59, 59, 999)
                  setTotalSalesStartDate(startOfWeek)
                  setTotalSalesEndDate(endOfWeek)
                }}
                className={`h-8 text-xs ${totalSalesQuickFilter === "thisWeek" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                This Week
              </Button>
              <Button
                variant={totalSalesQuickFilter === "thisMonth" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTotalSalesQuickFilter("thisMonth")
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const startOfMonth = new Date(phTime.getFullYear(), phTime.getMonth(), 1)
                  startOfMonth.setHours(0, 0, 0, 0)
                  const endOfMonth = new Date(phTime.getFullYear(), phTime.getMonth() + 1, 0)
                  endOfMonth.setHours(23, 59, 59, 999)
                  setTotalSalesStartDate(startOfMonth)
                  setTotalSalesEndDate(endOfMonth)
                }}
                className={`h-8 text-xs ${totalSalesQuickFilter === "thisMonth" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                This Month
              </Button>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3 flex-wrap pb-3 border-b">
              {/* Search */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search sales..."
                  className="pl-10 h-9 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  value={totalSalesSearchQuery}
                  onChange={(e) => setTotalSalesSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={totalSalesTypeFilter} onValueChange={setTotalSalesTypeFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Subscription">Subscription</SelectItem>
                    <SelectItem value="Coach Assignment">Coach Assignment</SelectItem>
                  </SelectContent>
                </Select>

                {/* Subscription Type Filter - Only show when Subscription is selected */}
                {totalSalesTypeFilter === "Subscription" && (
                  <Select value={totalSalesSubscriptionTypeFilter} onValueChange={(value) => {
                    setTotalSalesSubscriptionTypeFilter(value)
                    // Check if selected plan is Day Pass
                    const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === value)
                    const isDayPassPlan = selectedPlan && (
                      selectedPlan.name.toLowerCase().includes('day pass') ||
                      selectedPlan.name.toLowerCase().includes('daypass') ||
                      selectedPlan.name.toLowerCase().includes('walk-in') ||
                      selectedPlan.name.toLowerCase().includes('walkin') ||
                      selectedPlan.name.toLowerCase().includes('guest') ||
                      (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                      selectedPlan.name.toLowerCase() === 'day pass'
                    )
                    // Check if selected plan is Gym Session (but not Day Pass)
                    const isGymSessionPlan = selectedPlan && (
                      selectedPlan.name.toLowerCase().includes('gym session') ||
                      selectedPlan.name.toLowerCase().includes('gymsession')
                    ) && !isDayPassPlan

                    if (!isDayPassPlan && value !== "all") {
                      setDayPassMethodFilter("all")
                      setDayPassTypeFilter("all")
                    }
                    if (!isGymSessionPlan && value !== "all") {
                      setGymSessionTypeFilter("all")
                    }
                  }}>
                    <SelectTrigger className="w-[200px] h-9 text-sm">
                      <SelectValue placeholder="All Plans" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      {totalSalesSubscriptionPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Gym Session Type Filter - Only show when Subscription > Gym Session plan is selected */}
                {totalSalesTypeFilter === "Subscription" && (() => {
                  const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === totalSalesSubscriptionTypeFilter)
                  const isDayPassPlan = selectedPlan && (
                    selectedPlan.name.toLowerCase().includes('day pass') ||
                    selectedPlan.name.toLowerCase().includes('daypass') ||
                    selectedPlan.name.toLowerCase().includes('walk-in') ||
                    selectedPlan.name.toLowerCase().includes('walkin') ||
                    selectedPlan.name.toLowerCase().includes('guest') ||
                    (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                    selectedPlan.name.toLowerCase() === 'day pass'
                  )
                  const isGymSessionPlan = selectedPlan && (
                    selectedPlan.name.toLowerCase().includes('gym session') ||
                    selectedPlan.name.toLowerCase().includes('gymsession')
                  ) && !isDayPassPlan
                  return isGymSessionPlan
                })() && (
                    <Select value={gymSessionTypeFilter} onValueChange={setGymSessionTypeFilter}>
                      <SelectTrigger className="w-[160px] h-9 text-sm">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                {/* Day Pass Type Filter - Only show when Subscription > Day Pass plan is selected */}
                {totalSalesTypeFilter === "Subscription" && (() => {
                  const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === totalSalesSubscriptionTypeFilter)
                  const isDayPassPlan = selectedPlan && (
                    selectedPlan.name.toLowerCase().includes('day pass') ||
                    selectedPlan.name.toLowerCase().includes('daypass') ||
                    selectedPlan.name.toLowerCase().includes('walk-in') ||
                    selectedPlan.name.toLowerCase().includes('walkin') ||
                    selectedPlan.name.toLowerCase().includes('guest') ||
                    (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                    selectedPlan.name.toLowerCase() === 'day pass'
                  )
                  return isDayPassPlan
                })() && (
                    <Select value={dayPassTypeFilter} onValueChange={setDayPassTypeFilter}>
                      <SelectTrigger className="w-[160px] h-9 text-sm">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="day_pass">Subscription</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                {/* Category Filter - Only show when Product is selected */}
                {totalSalesTypeFilter === "Product" && (
                  <Select value={totalSalesCategoryFilter} onValueChange={(value) => {
                    setTotalSalesCategoryFilter(value)
                    setTotalSalesProductFilter("all") // Reset product filter when category changes
                  }}>
                    <SelectTrigger className="w-[160px] h-9 text-sm">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {getUniqueCategories().map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Product Filter - Only show when Product is selected */}
                {totalSalesTypeFilter === "Product" && (
                  <Select value={totalSalesProductFilter} onValueChange={setTotalSalesProductFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      {products
                        .filter(p => totalSalesCategoryFilter === "all" || p.category === totalSalesCategoryFilter)
                        .map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Coach Filter - Only show when Coach Assignment is selected */}
                {totalSalesTypeFilter === "Coach Assignment" && (
                  <Select value={totalSalesCoachFilter} onValueChange={setTotalSalesCoachFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                      <SelectValue placeholder="All Coaches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Coaches</SelectItem>
                      {totalSalesCoaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id.toString()}>
                          {coach.name || coach.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Service Type Filter - Only show when Coach Assignment is selected */}
                {totalSalesTypeFilter === "Coach Assignment" && (
                  <Select value={totalSalesServiceTypeFilter} onValueChange={setTotalSalesServiceTypeFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Date Range Picker */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600 whitespace-nowrap">Start Date:</Label>
                    <Input
                      type="date"
                      value={totalSalesStartDate ? format(totalSalesStartDate, "yyyy-MM-dd") : ""}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        if (selectedDate) {
                          const date = new Date(selectedDate + "T00:00:00")
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          if (date.getTime() <= today.getTime()) {
                            setTotalSalesStartDate(date)
                            setTotalSalesQuickFilter("all") // Switch to "all" when custom date range is selected
                            // If end date is set and is before start date, clear it
                            if (totalSalesEndDate && date > totalSalesEndDate) {
                              setTotalSalesEndDate(null)
                            }
                          }
                        } else {
                          setTotalSalesStartDate(null)
                        }
                      }}
                      className="h-9 text-sm w-[140px] border-gray-300"
                      placeholder="Start date"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600 whitespace-nowrap">End Date:</Label>
                    <Input
                      type="date"
                      value={totalSalesEndDate ? format(totalSalesEndDate, "yyyy-MM-dd") : ""}
                      min={totalSalesStartDate ? format(totalSalesStartDate, "yyyy-MM-dd") : undefined}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        if (selectedDate) {
                          const date = new Date(selectedDate + "T00:00:00")
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          if (date.getTime() <= today.getTime()) {
                            // If start date is set and selected date is before it, don't update
                            if (totalSalesStartDate && date < totalSalesStartDate) {
                              return
                            }
                            setTotalSalesEndDate(date)
                            setTotalSalesQuickFilter("all") // Switch to "all" when custom date range is selected
                          }
                        } else {
                          setTotalSalesEndDate(null)
                        }
                      }}
                      className="h-9 text-sm w-[140px] border-gray-300"
                      placeholder="End date"
                    />
                  </div>
                  {(totalSalesStartDate || totalSalesEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setTotalSalesStartDate(null)
                        setTotalSalesEndDate(null)
                      }}
                      className="h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Sales Dashboard Summary Cards */}
            {(() => {
              const filteredSales = sales.filter((sale) => {
                // Filter by search query
                const matchesSearch = totalSalesSearchQuery === "" ||
                  sale.sale_type?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  sale.plan_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  sale.user_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  sale.guest_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  sale.coach_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  (sale.sales_details && Array.isArray(sale.sales_details) && sale.sales_details.some(detail =>
                    (detail.product && detail.product.name.toLowerCase().includes(totalSalesSearchQuery.toLowerCase())) ||
                    (detail.subscription?.plan_name && detail.subscription.plan_name.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()))
                  ))

                // Filter by sale type
                let matchesSaleType = true
                if (totalSalesTypeFilter !== "all") {
                  if (totalSalesTypeFilter === "Product") {
                    // Check if sale has products or is a product sale
                    const hasProducts = sale.sales_details && sale.sales_details.some(detail => detail.product_id)
                    const isProductSale = sale.sale_type === 'Product'

                    if (!hasProducts && !isProductSale) {
                      matchesSaleType = false
                    } else {
                      // Filter by category if selected
                      if (totalSalesCategoryFilter !== "all") {
                        const hasCategoryMatch = sale.sales_details?.some(detail => {
                          if (!detail.product_id) return false
                          const product = detail.product || products.find(p => p.id === detail.product_id)
                          return product?.category === totalSalesCategoryFilter
                        })
                        if (!hasCategoryMatch) {
                          matchesSaleType = false
                        }
                      }

                      // Filter by product if selected
                      if (totalSalesProductFilter !== "all" && matchesSaleType) {
                        const hasProductMatch = sale.sales_details?.some(detail =>
                          detail.product_id && detail.product_id.toString() === totalSalesProductFilter
                        )
                        if (!hasProductMatch) {
                          matchesSaleType = false
                        }
                      }
                    }
                  } else if (totalSalesTypeFilter === "Subscription") {
                    // Exclude product sales explicitly when filtering by Subscription type
                    if (sale.sale_type === 'Product') {
                      matchesSaleType = false
                    }
                    // Must be a subscription sale or Day Pass guest sale
                    else if (sale.sale_type === 'Subscription') {
                      // It's a subscription sale, now check subscription type filter
                      if (totalSalesSubscriptionTypeFilter !== "all") {
                        // Check if this sale's plan_id matches the selected plan
                        const salePlanId = sale.plan_id?.toString()
                        const selectedPlanId = totalSalesSubscriptionTypeFilter.toString()

                        if (salePlanId !== selectedPlanId) {
                          // Also check sales_details for nested subscription plans
                          const matchesInDetails = sale.sales_details && Array.isArray(sale.sales_details) &&
                            sale.sales_details.some(detail =>
                              detail.subscription?.plan_id?.toString() === selectedPlanId
                            )

                          if (!matchesInDetails) {
                            matchesSaleType = false
                          } else {
                            // Matches in details, check Day Pass type filter
                            const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === selectedPlanId)
                            const isDayPassPlan = selectedPlan && (
                              selectedPlan.name.toLowerCase().includes('day pass') ||
                              selectedPlan.name.toLowerCase().includes('daypass') ||
                              selectedPlan.name.toLowerCase().includes('walk-in') ||
                              selectedPlan.name.toLowerCase().includes('walkin') ||
                              selectedPlan.name.toLowerCase().includes('guest') ||
                              (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                              selectedPlan.name.toLowerCase() === 'day pass'
                            )

                            if (isDayPassPlan) {
                              // Apply Day Pass type filter (Day Pass vs Guest)
                              if (dayPassTypeFilter === "guest") {
                                matchesSaleType = false // This is a subscription sale, not a guest sale
                              }
                              // Apply method filter
                              if (dayPassMethodFilter === "without_account") {
                                matchesSaleType = false // Subscription sales always have account
                              }
                            }

                            // Check if it's a Gym Session plan (but not Day Pass)
                            const isGymSessionPlan = selectedPlan && (
                              selectedPlan.name.toLowerCase().includes('gym session') ||
                              selectedPlan.name.toLowerCase().includes('gymsession')
                            ) && !isDayPassPlan

                            if (isGymSessionPlan) {
                              // Apply Gym Session type filter (Subscription vs Guest)
                              if (gymSessionTypeFilter === "guest") {
                                // Filter out subscription sales (those with user_id)
                                if (sale.user_id !== null && sale.user_id !== undefined) {
                                  matchesSaleType = false
                                }
                              } else if (gymSessionTypeFilter === "subscription") {
                                // Filter out guest sales (those without user_id or with guest_name)
                                if (sale.user_id === null || sale.user_id === undefined || sale.guest_name) {
                                  matchesSaleType = false
                                }
                              }
                            }
                          }
                        } else {
                          // Plan matches, check if it's a Day Pass plan and apply filters
                          const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === selectedPlanId)
                          const isDayPassPlan = selectedPlan && (
                            selectedPlan.name.toLowerCase().includes('day pass') ||
                            selectedPlan.name.toLowerCase().includes('daypass') ||
                            selectedPlan.name.toLowerCase().includes('walk-in') ||
                            selectedPlan.name.toLowerCase().includes('walkin') ||
                            selectedPlan.name.toLowerCase().includes('guest') ||
                            (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                            selectedPlan.name.toLowerCase() === 'day pass'
                          )

                          if (isDayPassPlan) {
                            // Apply Day Pass type filter (Day Pass vs Guest)
                            if (dayPassTypeFilter === "guest") {
                              matchesSaleType = false // This is a subscription sale, not a guest sale
                            }
                            // Apply method filter
                            if (dayPassMethodFilter === "without_account") {
                              matchesSaleType = false // Subscription sales always have account
                            }
                          }

                          // Check if it's a Gym Session plan (but not Day Pass)
                          const isGymSessionPlan = selectedPlan && (
                            selectedPlan.name.toLowerCase().includes('gym session') ||
                            selectedPlan.name.toLowerCase().includes('gymsession')
                          ) && !isDayPassPlan

                          if (isGymSessionPlan) {
                            // Apply Gym Session type filter (Subscription vs Guest)
                            if (gymSessionTypeFilter === "guest") {
                              // Filter out subscription sales (those with user_id)
                              if (sale.user_id !== null && sale.user_id !== undefined) {
                                matchesSaleType = false
                              }
                            } else if (gymSessionTypeFilter === "subscription") {
                              // Filter out guest sales (those without user_id or with guest_name)
                              if (sale.user_id === null || sale.user_id === undefined || sale.guest_name) {
                                matchesSaleType = false
                              }
                            }
                          }
                        }
                      }
                      // If "all", show all subscription sales (no additional filtering)
                    } else {
                      // Check if it's a Day Pass or Gym Session guest sale (Guest, Walk-in, etc.) - include when plan is selected
                      if (totalSalesSubscriptionTypeFilter !== "all") {
                        const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === totalSalesSubscriptionTypeFilter.toString())
                        const isDayPassPlan = selectedPlan && (
                          selectedPlan.name.toLowerCase().includes('day pass') ||
                          selectedPlan.name.toLowerCase().includes('daypass') ||
                          selectedPlan.name.toLowerCase().includes('walk-in') ||
                          selectedPlan.name.toLowerCase().includes('walkin') ||
                          selectedPlan.name.toLowerCase().includes('guest') ||
                          (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                          selectedPlan.name.toLowerCase() === 'day pass'
                        )
                        const isGymSessionPlan = selectedPlan && (
                          selectedPlan.name.toLowerCase().includes('gym session') ||
                          selectedPlan.name.toLowerCase().includes('gymsession')
                        ) && !isDayPassPlan

                        if (isDayPassPlan) {
                          // Check if this is a Guest/Walk-in/Day Pass sale
                          const isGuestSale = sale.sale_type === 'Guest' ||
                            sale.sale_type === 'Walk-in' ||
                            sale.sale_type === 'Walkin' ||
                            sale.sale_type === 'Day Pass' ||
                            sale.guest_name

                          if (isGuestSale) {
                            // Check if plan_id matches (if available), or include all Guest sales for Day Pass plan
                            const salePlanId = sale.plan_id?.toString()
                            const selectedPlanId = totalSalesSubscriptionTypeFilter.toString()

                            // Include if plan_id matches OR if no plan_id (guest sales might not have plan_id)
                            if (salePlanId && salePlanId !== selectedPlanId) {
                              matchesSaleType = false
                            } else {
                              // Apply Day Pass type filter (Day Pass vs Guest)
                              if (dayPassTypeFilter === "day_pass") {
                                matchesSaleType = false // This is a guest sale, not a Day Pass subscription
                              }
                              // Additional filter for day pass method
                              if (dayPassMethodFilter !== "all") {
                                if (dayPassMethodFilter === "with_account") {
                                  matchesSaleType = sale.user_id !== null && sale.user_id !== undefined
                                } else if (dayPassMethodFilter === "without_account") {
                                  matchesSaleType = sale.user_id === null || sale.user_id === undefined
                                }
                              }
                            }
                          } else {
                            matchesSaleType = false
                          }
                        } else if (isGymSessionPlan) {
                          // Exclude product sales explicitly for Gym Session
                          if (sale.sale_type === 'Product') {
                            matchesSaleType = false
                          }
                          // Check if this is a Guest/Walk-in sale for Gym Session
                          else {
                            const isGuestSale = sale.sale_type === 'Guest' ||
                              sale.sale_type === 'Walk-in' ||
                              sale.sale_type === 'Walkin' ||
                              sale.guest_name ||
                              (sale.user_id === null || sale.user_id === undefined)

                            if (isGuestSale) {
                              // Check if plan_id matches (if available), or include all Guest sales for Gym Session plan
                              const salePlanId = sale.plan_id?.toString()
                              const selectedPlanId = totalSalesSubscriptionTypeFilter.toString()

                              // Include if plan_id matches OR if no plan_id (guest sales might not have plan_id)
                              if (salePlanId && salePlanId !== selectedPlanId) {
                                matchesSaleType = false
                              } else {
                                // Apply Gym Session type filter (Subscription vs Guest)
                                if (gymSessionTypeFilter === "subscription") {
                                  matchesSaleType = false // This is a guest sale, not a subscription sale
                                }
                              }
                            } else {
                              matchesSaleType = false
                            }
                          }
                        } else {
                          matchesSaleType = false
                        }
                      } else {
                        // When filtering by Subscription type with "all" plans, include session sales (guest/walk-in/day pass)
                        const isSessionSale = sale.sale_type === 'Walk-in' ||
                          sale.sale_type === 'Walkin' ||
                          sale.sale_type === 'Guest' ||
                          sale.sale_type === 'Day Pass' ||
                          sale.guest_name ||
                          (sale.user_id === null || sale.user_id === undefined)

                        if (isSessionSale) {
                          matchesSaleType = true
                        } else {
                          matchesSaleType = false
                        }
                      }
                    }
                  } else if (totalSalesTypeFilter === "Coach Assignment") {
                    const isCoachingSale = sale.sale_type === 'Coach Assignment' ||
                      sale.sale_type === 'Coaching' ||
                      sale.sale_type === 'Coach'

                    if (!isCoachingSale) {
                      matchesSaleType = false
                    } else {
                      // Filter by coach if selected
                      if (totalSalesCoachFilter !== "all") {
                        if (!sale.coach_id || sale.coach_id.toString() !== totalSalesCoachFilter) {
                          matchesSaleType = false
                        }
                      }

                      // Filter by service type if selected
                      if (totalSalesServiceTypeFilter !== "all" && matchesSaleType) {
                        // Normalize service type from sale data
                        const serviceType = sale.service_type || sale.coaching_type || ''
                        const normalizedServiceType = serviceType.toLowerCase().includes('session') ? 'session' :
                          serviceType.toLowerCase().includes('monthly') ? 'monthly' : ''

                        if (normalizedServiceType !== totalSalesServiceTypeFilter) {
                          matchesSaleType = false
                        }
                      }
                    }
                  } else {
                    matchesSaleType = sale.sale_type === totalSalesTypeFilter
                  }
                }

                // Filter by date range (works for all quick filters and custom range)
                if (totalSalesStartDate || totalSalesEndDate) {
                  const saleDate = new Date(sale.sale_date)
                  saleDate.setHours(0, 0, 0, 0)

                  if (totalSalesStartDate) {
                    const startDate = new Date(totalSalesStartDate)
                    startDate.setHours(0, 0, 0, 0)
                    if (saleDate < startDate) return false
                  }

                  if (totalSalesEndDate) {
                    const endDate = new Date(totalSalesEndDate)
                    endDate.setHours(23, 59, 59, 999)
                    if (saleDate > endDate) return false
                  }
                }

                return matchesSearch && matchesSaleType
              })

              const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
              const productSales = filteredSales.filter(s => s.sale_type === 'Product')
              // Subscription sales - includes regular subscriptions and Day Pass subscriptions/guest sales when filtered
              const subscriptionSales = filteredSales.filter(s => {
                if (s.sale_type === 'Subscription') return true
                // Include Day Pass guest sales when Subscription > Day Pass is selected
                if (totalSalesTypeFilter === "Subscription" && totalSalesSubscriptionTypeFilter === "day_pass") {
                  return s.sale_type === 'Walk-in' || s.sale_type === 'Walkin' || s.sale_type === 'Guest' || s.sale_type === 'Day Pass' || s.guest_name
                }
                return false
              })
              const coachingSales = filteredSales.filter(s =>
                s.sale_type === 'Coaching' || s.sale_type === 'Coach Assignment' || s.sale_type === 'Coach'
              )
              // Day Pass sales - includes both guest sales and Day Pass subscription sales
              const dayPassSales = filteredSales.filter(s => {
                // Day Pass guest sales
                if (s.sale_type === 'Walk-in' || s.sale_type === 'Walkin' || s.sale_type === 'Guest' || s.sale_type === 'Day Pass' || s.guest_name) {
                  return true
                }
                // Day Pass subscription sales
                if (s.sale_type === 'Subscription') {
                  return (s.plan_name && (
                    s.plan_name.toLowerCase().includes('day pass') ||
                    s.plan_name.toLowerCase().includes('daypass') ||
                    s.plan_name.toLowerCase().includes('walk-in') ||
                    s.plan_name.toLowerCase().includes('walkin')
                  )) || (s.sales_details && Array.isArray(s.sales_details) && s.sales_details.some(detail =>
                    detail.subscription?.plan_name && (
                      detail.subscription.plan_name.toLowerCase().includes('day pass') ||
                      detail.subscription.plan_name.toLowerCase().includes('daypass') ||
                      detail.subscription.plan_name.toLowerCase().includes('walk-in') ||
                      detail.subscription.plan_name.toLowerCase().includes('walkin')
                    )
                  ))
                }
                return false
              })

              const productTotal = productSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
              const dayPassTotal = dayPassSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
              // Add session sales to subscription total - when filtering by Subscription type, session sales are already included in filteredSales
              const subscriptionTotal = subscriptionSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) + dayPassTotal
              const subscriptionSalesCount = subscriptionSales.length + dayPassSales.length
              const coachingTotal = coachingSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

              return (
                <div className="grid grid-cols-4 gap-3">
                  <Card className="border-2 border-blue-400/60 bg-gradient-to-br from-blue-50/40 to-indigo-50/20 shadow-sm hover:shadow transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-600 uppercase tracking-wide mb-1">Total</p>
                          <p className="text-lg font-bold text-gray-900 truncate">{formatCurrency(totalSales)}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-blue-100/60 ml-2 flex-shrink-0">
                          <Receipt className="h-4 w-4 text-blue-700/80" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-600 uppercase tracking-wide mb-1">Product</p>
                          <p className="text-lg font-bold text-gray-900 truncate">{formatCurrency(productTotal)}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{productSales.length} sale{productSales.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-gray-100 ml-2 flex-shrink-0">
                          <ShoppingCart className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-600 uppercase tracking-wide mb-1">Subscription</p>
                          <p className="text-lg font-bold text-gray-900 truncate">{formatCurrency(subscriptionTotal)}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{subscriptionSalesCount} sale{subscriptionSalesCount !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-gray-100 ml-2 flex-shrink-0">
                          <CreditCard className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-gray-600 uppercase tracking-wide mb-1">Coaching</p>
                          <p className="text-lg font-bold text-gray-900 truncate">{formatCurrency(coachingTotal)}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{coachingSales.length} sale{coachingSales.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-gray-100 ml-2 flex-shrink-0">
                          <UserCheck className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* All Sales Table */}
            {(() => {
              const filteredSales = sales.filter((sale) => {
                // Filter by search query
                const matchesSearch = totalSalesSearchQuery === "" ||
                  sale.sale_type?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  sale.plan_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  sale.user_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  sale.guest_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  sale.coach_name?.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()) ||
                  (sale.sales_details && Array.isArray(sale.sales_details) && sale.sales_details.some(detail =>
                    (detail.product && detail.product.name.toLowerCase().includes(totalSalesSearchQuery.toLowerCase())) ||
                    (detail.subscription?.plan_name && detail.subscription.plan_name.toLowerCase().includes(totalSalesSearchQuery.toLowerCase()))
                  ))

                // Filter by sale type
                let matchesSaleType = true
                if (totalSalesTypeFilter !== "all") {
                  if (totalSalesTypeFilter === "Product") {
                    // Check if sale has products or is a product sale
                    const hasProducts = sale.sales_details && sale.sales_details.some(detail => detail.product_id)
                    const isProductSale = sale.sale_type === 'Product'

                    if (!hasProducts && !isProductSale) {
                      matchesSaleType = false
                    } else {
                      // Filter by category if selected
                      if (totalSalesCategoryFilter !== "all") {
                        const hasCategoryMatch = sale.sales_details?.some(detail => {
                          if (!detail.product_id) return false
                          const product = detail.product || products.find(p => p.id === detail.product_id)
                          return product?.category === totalSalesCategoryFilter
                        })
                        if (!hasCategoryMatch) {
                          matchesSaleType = false
                        }
                      }

                      // Filter by product if selected
                      if (totalSalesProductFilter !== "all" && matchesSaleType) {
                        const hasProductMatch = sale.sales_details?.some(detail =>
                          detail.product_id && detail.product_id.toString() === totalSalesProductFilter
                        )
                        if (!hasProductMatch) {
                          matchesSaleType = false
                        }
                      }
                    }
                  } else if (totalSalesTypeFilter === "Subscription") {
                    // Exclude product sales explicitly when filtering by Subscription type
                    if (sale.sale_type === 'Product') {
                      matchesSaleType = false
                    }
                    // Must be a subscription sale or Day Pass guest sale
                    else if (sale.sale_type === 'Subscription') {
                      // It's a subscription sale, now check subscription type filter
                      if (totalSalesSubscriptionTypeFilter !== "all") {
                        // Check if this sale's plan_id matches the selected plan
                        const salePlanId = sale.plan_id?.toString()
                        const selectedPlanId = totalSalesSubscriptionTypeFilter.toString()

                        if (salePlanId !== selectedPlanId) {
                          // Also check sales_details for nested subscription plans
                          const matchesInDetails = sale.sales_details && Array.isArray(sale.sales_details) &&
                            sale.sales_details.some(detail =>
                              detail.subscription?.plan_id?.toString() === selectedPlanId
                            )

                          if (!matchesInDetails) {
                            matchesSaleType = false
                          } else {
                            // Matches in details, check Day Pass type filter
                            const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === selectedPlanId)
                            const isDayPassPlan = selectedPlan && (
                              selectedPlan.name.toLowerCase().includes('day pass') ||
                              selectedPlan.name.toLowerCase().includes('daypass') ||
                              selectedPlan.name.toLowerCase().includes('walk-in') ||
                              selectedPlan.name.toLowerCase().includes('walkin') ||
                              selectedPlan.name.toLowerCase().includes('guest') ||
                              (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                              selectedPlan.name.toLowerCase() === 'day pass'
                            )

                            if (isDayPassPlan) {
                              // Apply Day Pass type filter (Day Pass vs Guest)
                              if (dayPassTypeFilter === "guest") {
                                matchesSaleType = false // This is a subscription sale, not a guest sale
                              }
                              // Apply method filter
                              if (dayPassMethodFilter === "without_account") {
                                matchesSaleType = false // Subscription sales always have account
                              }
                            }

                            // Check if it's a Gym Session plan (but not Day Pass)
                            const isGymSessionPlan = selectedPlan && (
                              selectedPlan.name.toLowerCase().includes('gym session') ||
                              selectedPlan.name.toLowerCase().includes('gymsession')
                            ) && !isDayPassPlan

                            if (isGymSessionPlan) {
                              // Apply Gym Session type filter (Subscription vs Guest)
                              if (gymSessionTypeFilter === "guest") {
                                // Filter out subscription sales (those with user_id)
                                if (sale.user_id !== null && sale.user_id !== undefined) {
                                  matchesSaleType = false
                                }
                              } else if (gymSessionTypeFilter === "subscription") {
                                // Filter out guest sales (those without user_id or with guest_name)
                                if (sale.user_id === null || sale.user_id === undefined || sale.guest_name) {
                                  matchesSaleType = false
                                }
                              }
                            }
                          }
                        } else {
                          // Plan matches, check if it's a Day Pass plan and apply filters
                          const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === selectedPlanId)
                          const isDayPassPlan = selectedPlan && (
                            selectedPlan.name.toLowerCase().includes('day pass') ||
                            selectedPlan.name.toLowerCase().includes('daypass') ||
                            selectedPlan.name.toLowerCase().includes('walk-in') ||
                            selectedPlan.name.toLowerCase().includes('walkin') ||
                            selectedPlan.name.toLowerCase().includes('guest') ||
                            (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                            selectedPlan.name.toLowerCase() === 'day pass'
                          )

                          if (isDayPassPlan) {
                            // Apply Day Pass type filter (Day Pass vs Guest)
                            if (dayPassTypeFilter === "guest") {
                              matchesSaleType = false // This is a subscription sale, not a guest sale
                            }
                            // Apply method filter
                            if (dayPassMethodFilter === "without_account") {
                              matchesSaleType = false // Subscription sales always have account
                            }
                          }

                          // Check if it's a Gym Session plan (but not Day Pass)
                          const isGymSessionPlan = selectedPlan && (
                            selectedPlan.name.toLowerCase().includes('gym session') ||
                            selectedPlan.name.toLowerCase().includes('gymsession')
                          ) && !isDayPassPlan

                          if (isGymSessionPlan) {
                            // Apply Gym Session type filter (Subscription vs Guest)
                            if (gymSessionTypeFilter === "guest") {
                              // Filter out subscription sales (those with user_id)
                              if (sale.user_id !== null && sale.user_id !== undefined) {
                                matchesSaleType = false
                              }
                            } else if (gymSessionTypeFilter === "subscription") {
                              // Filter out guest sales (those without user_id or with guest_name)
                              if (sale.user_id === null || sale.user_id === undefined || sale.guest_name) {
                                matchesSaleType = false
                              }
                            }
                          }
                        }
                      }
                      // If "all", show all subscription sales (no additional filtering)
                    } else {
                      // Check if it's a Day Pass or Gym Session guest sale (Guest, Walk-in, etc.) - include when plan is selected
                      if (totalSalesSubscriptionTypeFilter !== "all") {
                        const selectedPlan = totalSalesSubscriptionPlans.find(p => p.id.toString() === totalSalesSubscriptionTypeFilter.toString())
                        const isDayPassPlan = selectedPlan && (
                          selectedPlan.name.toLowerCase().includes('day pass') ||
                          selectedPlan.name.toLowerCase().includes('daypass') ||
                          selectedPlan.name.toLowerCase().includes('walk-in') ||
                          selectedPlan.name.toLowerCase().includes('walkin') ||
                          selectedPlan.name.toLowerCase().includes('guest') ||
                          (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                          selectedPlan.name.toLowerCase() === 'day pass'
                        )
                        const isGymSessionPlan = selectedPlan && (
                          selectedPlan.name.toLowerCase().includes('gym session') ||
                          selectedPlan.name.toLowerCase().includes('gymsession')
                        ) && !isDayPassPlan

                        if (isDayPassPlan) {
                          // Check if this is a Guest/Walk-in/Day Pass sale
                          const isGuestSale = sale.sale_type === 'Guest' ||
                            sale.sale_type === 'Walk-in' ||
                            sale.sale_type === 'Walkin' ||
                            sale.sale_type === 'Day Pass' ||
                            sale.guest_name

                          if (isGuestSale) {
                            // Check if plan_id matches (if available), or include all Guest sales for Day Pass plan
                            const salePlanId = sale.plan_id?.toString()
                            const selectedPlanId = totalSalesSubscriptionTypeFilter.toString()

                            // Include if plan_id matches OR if no plan_id (guest sales might not have plan_id)
                            if (salePlanId && salePlanId !== selectedPlanId) {
                              matchesSaleType = false
                            } else {
                              // Apply Day Pass type filter (Day Pass vs Guest)
                              if (dayPassTypeFilter === "day_pass") {
                                matchesSaleType = false // This is a guest sale, not a Day Pass subscription
                              }
                              // Additional filter for day pass method
                              if (dayPassMethodFilter !== "all") {
                                if (dayPassMethodFilter === "with_account") {
                                  matchesSaleType = sale.user_id !== null && sale.user_id !== undefined
                                } else if (dayPassMethodFilter === "without_account") {
                                  matchesSaleType = sale.user_id === null || sale.user_id === undefined
                                }
                              }
                            }
                          } else {
                            matchesSaleType = false
                          }
                        } else if (isGymSessionPlan) {
                          // Exclude product sales explicitly for Gym Session
                          if (sale.sale_type === 'Product') {
                            matchesSaleType = false
                          }
                          // Check if this is a Guest/Walk-in sale for Gym Session
                          else {
                            const isGuestSale = sale.sale_type === 'Guest' ||
                              sale.sale_type === 'Walk-in' ||
                              sale.sale_type === 'Walkin' ||
                              sale.guest_name ||
                              (sale.user_id === null || sale.user_id === undefined)

                            if (isGuestSale) {
                              // Check if plan_id matches (if available), or include all Guest sales for Gym Session plan
                              const salePlanId = sale.plan_id?.toString()
                              const selectedPlanId = totalSalesSubscriptionTypeFilter.toString()

                              // Include if plan_id matches OR if no plan_id (guest sales might not have plan_id)
                              if (salePlanId && salePlanId !== selectedPlanId) {
                                matchesSaleType = false
                              } else {
                                // Apply Gym Session type filter (Subscription vs Guest)
                                if (gymSessionTypeFilter === "subscription") {
                                  matchesSaleType = false // This is a guest sale, not a subscription sale
                                }
                              }
                            } else {
                              matchesSaleType = false
                            }
                          }
                        } else {
                          matchesSaleType = false
                        }
                      } else {
                        // When filtering by Subscription type with "all" plans, include session sales (guest/walk-in/day pass)
                        const isSessionSale = sale.sale_type === 'Walk-in' ||
                          sale.sale_type === 'Walkin' ||
                          sale.sale_type === 'Guest' ||
                          sale.sale_type === 'Day Pass' ||
                          sale.guest_name ||
                          (sale.user_id === null || sale.user_id === undefined)

                        if (isSessionSale) {
                          matchesSaleType = true
                        } else {
                          matchesSaleType = false
                        }
                      }
                    }
                  } else if (totalSalesTypeFilter === "Coach Assignment") {
                    const isCoachingSale = sale.sale_type === 'Coach Assignment' ||
                      sale.sale_type === 'Coaching' ||
                      sale.sale_type === 'Coach'

                    if (!isCoachingSale) {
                      matchesSaleType = false
                    } else {
                      // Filter by coach if selected
                      if (totalSalesCoachFilter !== "all") {
                        if (!sale.coach_id || sale.coach_id.toString() !== totalSalesCoachFilter) {
                          matchesSaleType = false
                        }
                      }

                      // Filter by service type if selected
                      if (totalSalesServiceTypeFilter !== "all" && matchesSaleType) {
                        // Normalize service type from sale data
                        const serviceType = sale.service_type || sale.coaching_type || ''
                        const normalizedServiceType = serviceType.toLowerCase().includes('session') ? 'session' :
                          serviceType.toLowerCase().includes('monthly') ? 'monthly' : ''

                        if (normalizedServiceType !== totalSalesServiceTypeFilter) {
                          matchesSaleType = false
                        }
                      }
                    }
                  } else {
                    matchesSaleType = sale.sale_type === totalSalesTypeFilter
                  }
                }

                // Filter by date range
                if (totalSalesStartDate || totalSalesEndDate) {
                  const saleDate = new Date(sale.sale_date)
                  saleDate.setHours(0, 0, 0, 0)

                  if (totalSalesStartDate) {
                    const startDate = new Date(totalSalesStartDate)
                    startDate.setHours(0, 0, 0, 0)
                    if (saleDate < startDate) return false
                  }

                  if (totalSalesEndDate) {
                    const endDate = new Date(totalSalesEndDate)
                    endDate.setHours(23, 59, 59, 999)
                    if (saleDate > endDate) return false
                  }
                }

                return matchesSearch && matchesSaleType
              })

              const totalPages = Math.ceil(filteredSales.length / totalSalesItemsPerPage)
              const startIndex = (totalSalesCurrentPage - 1) * totalSalesItemsPerPage
              const endIndex = startIndex + totalSalesItemsPerPage
              const paginatedSales = filteredSales.slice(startIndex, endIndex)

              return (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-auto border rounded-lg bg-white">
                    <Table>
                      <TableHeader className="sticky top-0 bg-gray-50 z-10">
                        <TableRow className="hover:bg-gray-50">
                          <TableHead className="font-semibold text-gray-900 text-xs py-3">Plan/Product</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-xs py-3">Customer</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-xs py-3">Type</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-xs py-3">Payment</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-xs py-3">Receipt</TableHead>
                          <TableHead className="font-semibold text-gray-900 text-xs py-3">Date</TableHead>
                          <TableHead className="text-right font-semibold text-gray-900 text-xs py-3">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12">
                              <div className="flex flex-col items-center justify-center">
                                <div className="p-3 rounded-full bg-gray-100 mb-3">
                                  <Search className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-600 mb-1">No sales found</p>
                                <p className="text-xs text-gray-500">Try adjusting your filters</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedSales.map((sale) => (
                            <TableRow key={sale.id} className="hover:bg-gray-50/50 transition-colors border-b">
                              <TableCell className="py-3 align-top">
                                <div className="space-y-1">
                                  {sale.sales_details && Array.isArray(sale.sales_details) && sale.sales_details.length > 0 ? (
                                    sale.sales_details.map((detail, index) => {
                                      // Get quantity from detail or sale level
                                      const quantity = detail.quantity || sale.quantity || 1
                                      return (
                                        <div key={index} className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-xs font-medium text-gray-900">
                                            {getProductName(detail, sale)}
                                          </span>
                                          {quantity > 1 && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                              {quantity}x
                                            </Badge>
                                          )}
                                        </div>
                                      )
                                    })
                                  ) : (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-medium text-gray-900">
                                        {getProductName({}, sale)}
                                      </span>
                                      {(() => {
                                        // Get quantity from sale level for subscriptions without sales_details
                                        const quantity = sale.quantity || 1
                                        return quantity > 1 ? (
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                            {quantity}x
                                          </Badge>
                                        ) : null
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="text-xs font-medium text-gray-900 truncate max-w-[150px]">
                                  {sale.sale_type === "Subscription" || sale.sale_type === "Coach Assignment" || sale.sale_type === "Coaching" || sale.sale_type === "Coach"
                                    ? formatName(sale.user_name) || "N/A"
                                    : sale.sale_type === "Guest" || sale.sale_type === "Day Pass" || sale.sale_type === "Walk-in" || sale.sale_type === "Walkin"
                                      ? formatName(sale.guest_name || sale.user_name) || "Guest"
                                      : "N/A"}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-medium bg-gray-50 text-gray-700 border-gray-300">
                                  {(() => {
                                    // For day pass sales, show "Day Pass" if user has account, "Guest" if no account
                                    const isDayPass = sale.sale_type === 'Walk-in' || sale.sale_type === 'Walkin' || sale.sale_type === 'Guest' || sale.sale_type === 'Day Pass'
                                    if (isDayPass) {
                                      return sale.user_id !== null && sale.user_id !== undefined ? 'Day Pass' : 'Guest'
                                    }
                                    return sale.sale_type
                                  })()}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="space-y-0.5">
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-medium bg-gray-50 text-gray-700 border-gray-300">
                                    {formatPaymentMethod(sale.payment_method)}
                                  </Badge>
                                  {sale.change_given > 0 && (
                                    <div className="text-[10px] text-gray-600">
                                      Change: {formatCurrency(sale.change_given)}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top">
                                <div className="text-[10px] font-mono text-gray-600">
                                  {(() => {
                                    const paymentMethod = (sale.payment_method || 'cash').toLowerCase()
                                    if (paymentMethod === 'gcash' || paymentMethod === 'digital') {
                                      return sale.reference_number || sale.receipt_number || "N/A"
                                    }
                                    return sale.receipt_number || "N/A"
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 align-top text-xs text-gray-700">{formatDate(sale.sale_date)}</TableCell>
                              <TableCell className="text-right py-3 align-top font-semibold text-sm text-gray-900">{formatCurrency(sale.total_amount)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {filteredSales.length > 0 && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="text-xs text-gray-600">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredSales.length)} of {filteredSales.length}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTotalSalesCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={totalSalesCurrentPage === 1}
                          className="h-8 px-2 text-xs"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                          Prev
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (totalSalesCurrentPage <= 3) {
                              pageNum = i + 1
                            } else if (totalSalesCurrentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = totalSalesCurrentPage - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={totalSalesCurrentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTotalSalesCurrentPage(pageNum)}
                                className="h-8 w-8 p-0 text-xs"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTotalSalesCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={totalSalesCurrentPage === totalPages}
                          className="h-8 px-2 text-xs"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscription Sales Dialog */}
      <Dialog open={subscriptionSalesDialogOpen} onOpenChange={setSubscriptionSalesDialogOpen}>
        <DialogContent className="max-w-[80vw] w-[80vw] max-h-[85vh] overflow-hidden flex flex-col [&>button]:hidden">
          <DialogHeader className="pb-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                  <TrendingUp className="h-5 w-5 text-gray-700" />
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <DialogTitle className="text-xl font-bold text-gray-900">Subscription Sales Details</DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 mt-0.5">
                      View all subscription revenue with detailed transaction information
                    </DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Use the EXACT same two-step filtering logic as the modal uses for totals
                      // First, replicate the helper functions needed
                      const isDayPassPlanForStats = (selectedPlanFilter) => {
                        const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                        return selectedPlan && (
                          selectedPlan.name.toLowerCase().includes('day pass') ||
                          selectedPlan.name.toLowerCase().includes('daypass') ||
                          selectedPlan.name.toLowerCase().includes('gym session') ||
                          selectedPlan.name.toLowerCase().includes('gymsession') ||
                          selectedPlan.id === 6 ||
                          selectedPlan.name.toLowerCase().includes('walk-in') ||
                          selectedPlan.name.toLowerCase().includes('walkin') ||
                          selectedPlan.name.toLowerCase().includes('guest') ||
                          (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                          selectedPlan.name.toLowerCase() === 'day pass'
                        )
                      }

                      const isDayPassGuestSaleForStats = (sale) => {
                        return sale.sale_type === 'Walk-in' ||
                          sale.sale_type === 'Walkin' ||
                          sale.sale_type === 'Guest' ||
                          sale.sale_type === 'Day Pass' ||
                          sale.guest_name ||
                          (sale.plan_name && (
                            sale.plan_name.toLowerCase().includes('guest walk in') ||
                            sale.plan_name.toLowerCase().includes('guest walk-in') ||
                            sale.plan_name.toLowerCase().includes('walk in') ||
                            sale.plan_name.toLowerCase().includes('walk-in')
                          )) ||
                          (sale.plan_id === 6 && sale.sale_type === 'Guest')
                      }

                      const isDayPassSubscriptionForFilter = (sale, selectedPlanFilter) => {
                        if (sale.sale_type !== 'Subscription') return false
                        const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                        if (sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) return true
                        if (sale.plan_name) {
                          const planNameLower = sale.plan_name.toLowerCase()
                          if (planNameLower.includes('day pass') || planNameLower.includes('daypass') ||
                            planNameLower.includes('walk-in') || planNameLower.includes('walkin')) return true
                        }
                        const subscriptionDetail = getSubscriptionDetails(sale.id)
                        if (subscriptionDetail?.planName) {
                          const planNameLower = subscriptionDetail.planName.toLowerCase()
                          if (planNameLower.includes('day pass') || planNameLower.includes('daypass') ||
                            planNameLower.includes('walk-in') || planNameLower.includes('walkin')) return true
                        }
                        if (sale.plan_id) {
                          const plan = subscriptionPlans.find(p => p.id.toString() === sale.plan_id.toString())
                          if (plan && plan.duration_days && plan.duration_days > 0 &&
                            (!plan.duration_months || plan.duration_months === 0)) return true
                        }
                        return false
                      }

                      // Step 1: Create allSalesForCounts (matches modal logic exactly - includes guest sales for "All Plans")
                      const allSalesForCounts = sales.filter((sale) => {

                        // Check if selected plan is "Day Pass" or "Gym Session"
                        const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                        const isDayPassPlan = selectedPlan && (
                          selectedPlan.name.toLowerCase().includes('day pass') ||
                          selectedPlan.name.toLowerCase().includes('daypass') ||
                          selectedPlan.name.toLowerCase().includes('walk-in') ||
                          selectedPlan.name.toLowerCase().includes('walkin') ||
                          selectedPlan.name.toLowerCase().includes('guest') ||
                          (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                          selectedPlan.name.toLowerCase() === 'day pass'
                        ) && !(
                          selectedPlan.name.toLowerCase().includes('gym session') ||
                          selectedPlan.name.toLowerCase().includes('gymsession')
                        )
                        const isGymSessionPlan = selectedPlan && (
                          selectedPlan.name.toLowerCase().includes('gym session') ||
                          selectedPlan.name.toLowerCase().includes('gymsession')
                        ) && !isDayPassPlan

                        // If Day Pass plan is selected, include ALL Day Pass/Walk-in/Guest sales
                        if (isDayPassPlan) {
                          // Check if this is a Guest/Walk-in/Day Pass sale
                          const isGuestSale = sale.sale_type === 'Guest' ||
                            sale.sale_type === 'Walk-in' ||
                            sale.sale_type === 'Walkin' ||
                            sale.sale_type === 'Day Pass' ||
                            sale.guest_name

                          if (isGuestSale) {
                            // Apply Day Pass type filter (Subscription vs Guest)
                            if (subscriptionDayPassTypeFilter === "day_pass") {
                              return false // This is a guest sale, not a subscription sale
                            }

                            // Filter by date range (works for all quick filters and custom range)
                            if (subscriptionStartDate || subscriptionEndDate) {
                              const saleDate = new Date(sale.sale_date)
                              saleDate.setHours(0, 0, 0, 0)

                              if (subscriptionStartDate) {
                                const startDate = new Date(subscriptionStartDate)
                                startDate.setHours(0, 0, 0, 0)
                                if (saleDate < startDate) return false
                              }

                              if (subscriptionEndDate) {
                                const endDate = new Date(subscriptionEndDate)
                                endDate.setHours(23, 59, 59, 999)
                                if (saleDate > endDate) return false
                              }
                            }

                            // Status filter removed - show all sales
                            return true
                          }

                          // Also check if this is a subscription sale with Day Pass plan_id
                          if (sale.sale_type === 'Subscription' && sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) {
                            // This is a subscription sale with Day Pass plan
                            // Apply Day Pass type filter (Subscription vs Guest)
                            if (subscriptionDayPassTypeFilter === "guest") {
                              return false // This is a subscription sale, not a guest sale
                            }

                            // Filter by date range (works for all quick filters and custom range)
                            if (subscriptionStartDate || subscriptionEndDate) {
                              const saleDate = new Date(sale.sale_date)
                              saleDate.setHours(0, 0, 0, 0)

                              if (subscriptionStartDate) {
                                const startDate = new Date(subscriptionStartDate)
                                startDate.setHours(0, 0, 0, 0)
                                if (saleDate < startDate) return false
                              }

                              if (subscriptionEndDate) {
                                const endDate = new Date(subscriptionEndDate)
                                endDate.setHours(23, 59, 59, 999)
                                if (saleDate > endDate) return false
                              }
                            }

                            // Status filter removed - show all sales
                            return true
                          }

                          // If Day Pass plan is selected but this sale doesn't match, exclude it
                          return false
                        }

                        // If Gym Session plan is selected, handle Gym Session sales
                        if (isGymSessionPlan) {
                          // Exclude product sales explicitly
                          if (sale.sale_type === 'Product') {
                            return false
                          }

                          // Check if this is a Gym Session guest sale
                          const isGymSessionGuestSale = (sale.sale_type === 'Guest' || sale.guest_name) && (
                            sale.plan_name?.toLowerCase().includes('gym session') ||
                            sale.plan_name?.toLowerCase().includes('gymsession') ||
                            (sale.plan_id && sale.plan_id.toString() === selectedPlanFilter)
                          )

                          if (isGymSessionGuestSale) {
                            // Apply Gym Session type filter (Subscription vs Guest)
                            if (subscriptionGymSessionTypeFilter === "subscription") {
                              return false // This is a guest sale, not a subscription sale
                            }

                            // Filter by date range (works for all quick filters and custom range)
                            if (subscriptionStartDate || subscriptionEndDate) {
                              const saleDate = new Date(sale.sale_date)
                              saleDate.setHours(0, 0, 0, 0)

                              if (subscriptionStartDate) {
                                const startDate = new Date(subscriptionStartDate)
                                startDate.setHours(0, 0, 0, 0)
                                if (saleDate < startDate) return false
                              }

                              if (subscriptionEndDate) {
                                const endDate = new Date(subscriptionEndDate)
                                endDate.setHours(23, 59, 59, 999)
                                if (saleDate > endDate) return false
                              }
                            }

                            return true
                          }

                          // Check if this is a Gym Session subscription sale
                          if (sale.sale_type === 'Subscription' && sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) {
                            // Apply Gym Session type filter (Subscription vs Guest)
                            if (subscriptionGymSessionTypeFilter === "guest") {
                              return false // This is a subscription sale, not a guest sale
                            }

                            // Filter by date range (works for all quick filters and custom range)
                            if (subscriptionStartDate || subscriptionEndDate) {
                              const saleDate = new Date(sale.sale_date)
                              saleDate.setHours(0, 0, 0, 0)

                              if (subscriptionStartDate) {
                                const startDate = new Date(subscriptionStartDate)
                                startDate.setHours(0, 0, 0, 0)
                                if (saleDate < startDate) return false
                              }

                              if (subscriptionEndDate) {
                                const endDate = new Date(subscriptionEndDate)
                                endDate.setHours(23, 59, 59, 999)
                                if (saleDate > endDate) return false
                              }
                            }

                            return true
                          }

                          // If Gym Session plan is selected but this sale doesn't match, exclude it
                          return false
                        }

                        // Exclude product sales for subscription sales modal
                        if (sale.sale_type === 'Product') {
                          return false
                        }

                        // For "All Plans", include both subscription sales and guest sales
                        if (selectedPlanFilter === "all") {
                          // Include subscription sales
                          if (sale.sale_type === 'Subscription') {
                            // Filter by date range (works for all quick filters and custom range)
                            if (subscriptionStartDate || subscriptionEndDate) {
                              const saleDate = new Date(sale.sale_date)
                              saleDate.setHours(0, 0, 0, 0)
                              if (subscriptionStartDate) {
                                const startDate = new Date(subscriptionStartDate)
                                startDate.setHours(0, 0, 0, 0)
                                if (saleDate < startDate) return false
                              }
                              if (subscriptionEndDate) {
                                const endDate = new Date(subscriptionEndDate)
                                endDate.setHours(23, 59, 59, 999)
                                if (saleDate > endDate) return false
                              }
                            }
                            return true
                          }
                          // Include guest sales (Guest Walk In) in "All Plans"
                          else if (sale.sale_type === 'Guest' || sale.guest_name) {
                            // Filter by date range
                            if (subscriptionStartDate || subscriptionEndDate) {
                              const saleDate = new Date(sale.sale_date)
                              saleDate.setHours(0, 0, 0, 0)
                              if (subscriptionStartDate) {
                                const startDate = new Date(subscriptionStartDate)
                                startDate.setHours(0, 0, 0, 0)
                                if (saleDate < startDate) return false
                              }
                              if (subscriptionEndDate) {
                                const endDate = new Date(subscriptionEndDate)
                                endDate.setHours(23, 59, 59, 999)
                                if (saleDate > endDate) return false
                              }
                            }
                            return true // Guest sale included in "All Plans"
                          } else {
                            return false
                          }
                        }

                        // For other plans (not "all" and not Day Pass/Gym Session), only show subscription sales
                        const isSubscriptionSale = sale.sale_type === 'Subscription'
                        if (!isSubscriptionSale) return false

                        // Filter by selected plan if not "all"
                        if (selectedPlanFilter !== "all") {
                          // First try to match by plan_id from sale object
                          const salePlanId = sale.plan_id?.toString()
                          if (salePlanId === selectedPlanFilter) {
                            // Matches, continue
                          } else {
                            // Try to match by plan name from sale object
                            const salePlanName = sale.plan_name
                            if (selectedPlan && salePlanName === selectedPlan.name) {
                              // Matches by name, continue
                            } else {
                              // No match, exclude this sale
                              return false
                            }
                          }
                        }

                        // Filter by quick access filter
                        if (subscriptionSalesQuickFilter === "today") {
                          const saleDate = new Date(sale.sale_date)
                          saleDate.setHours(0, 0, 0, 0)
                          const todayPH = getTodayInPHTime()
                          const todayDate = new Date(todayPH + "T00:00:00")
                          todayDate.setHours(0, 0, 0, 0)
                          const saleDateStr = saleDate.toISOString().split('T')[0]
                          const todayStr = todayDate.toISOString().split('T')[0]
                          if (saleDateStr !== todayStr) return false
                        } else if (subscriptionSalesQuickFilter === "thisWeek") {
                          const now = new Date()
                          const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                          const today = new Date(phTime)
                          today.setHours(0, 0, 0, 0)
                          const dayOfWeek = today.getDay()
                          const startOfWeek = new Date(today)
                          startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                          const endOfWeek = new Date(startOfWeek)
                          endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                          endOfWeek.setHours(23, 59, 59, 999)

                          const saleDate = new Date(sale.sale_date)
                          if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                        } else if (subscriptionSalesQuickFilter === "thisMonth") {
                          const now = new Date()
                          const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                          const saleDate = new Date(sale.sale_date)
                          const saleMonth = saleDate.getMonth()
                          const saleYear = saleDate.getFullYear()
                          const currentMonth = phTime.getMonth()
                          const currentYear = phTime.getFullYear()
                          if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                        } else if (subscriptionSalesQuickFilter === "all") {
                          // "All" - no date filtering, but still respect month/year/custom date if set manually
                          // Filter by date range
                          if (subscriptionStartDate || subscriptionEndDate) {
                            const saleDate = new Date(sale.sale_date)
                            saleDate.setHours(0, 0, 0, 0)

                            if (subscriptionStartDate) {
                              const startDate = new Date(subscriptionStartDate)
                              startDate.setHours(0, 0, 0, 0)
                              if (saleDate < startDate) return false
                            }

                            if (subscriptionEndDate) {
                              const endDate = new Date(subscriptionEndDate)
                              endDate.setHours(23, 59, 59, 999)
                              if (saleDate > endDate) return false
                            }
                          }
                        }

                        return true
                      })

                      // Step 2: Create filteredSalesForStats from allSalesForCounts (matches modal logic exactly)
                      const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                      const isDayPassPlan = isDayPassPlanForStats(selectedPlanFilter)
                      const isGymSessionPlan = selectedPlan && (
                        selectedPlan.name.toLowerCase().includes('gym session') ||
                        selectedPlan.name.toLowerCase().includes('gymsession')
                      ) && !isDayPassPlan

                      const filteredSalesForStats = allSalesForCounts.filter((sale) => {
                        // Apply the same filtering logic as the modal's filteredSalesForStats
                        if (isDayPassPlan) {
                          if (isDayPassGuestSaleForStats(sale)) {
                            if (subscriptionDayPassTypeFilter === "day_pass") return false
                            // Date filtering already done in allSalesForCounts
                            return true
                          }
                          if (isDayPassSubscriptionForFilter(sale, selectedPlanFilter)) {
                            if (subscriptionDayPassTypeFilter === "guest") return false
                            return true
                          }
                          return false
                        }

                        if (isGymSessionPlan) {
                          if (sale.sale_type === 'Product') return false
                          const isGymSessionGuestSale = (sale.sale_type === 'Guest' || sale.guest_name) && (
                            sale.plan_name?.toLowerCase().includes('gym session') ||
                            sale.plan_name?.toLowerCase().includes('gymsession') ||
                            (sale.plan_id && sale.plan_id.toString() === selectedPlanFilter)
                          )
                          if (isGymSessionGuestSale) {
                            if (subscriptionGymSessionTypeFilter === "subscription") return false
                            return true
                          }
                          if (sale.sale_type === 'Subscription' && sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) {
                            if (subscriptionGymSessionTypeFilter === "guest") return false
                            return true
                          }
                          return false
                        }

                        // For "All Plans" or other plans - already filtered in allSalesForCounts
                        return true
                      })

                      // Step 3: Apply search query filter to match what table shows
                      const filteredSales = filteredSalesForStats.filter((sale) => {
                        return subscriptionSalesSearchQuery === "" ||
                          sale.user_name?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase()) ||
                          sale.guest_name?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase()) ||
                          sale.receipt_number?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase()) ||
                          sale.plan_name?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase()) ||
                          sale.payment_method?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase())
                      })

                      // Calculate totals - use filteredSales which matches both modal total logic AND search filter
                      const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

                      // Get date range text
                      let dateRangeText = "All Subscription Sales"
                      if (subscriptionSalesQuickFilter === "today") {
                        dateRangeText = "Today's Subscription Sales"
                      } else if (subscriptionSalesQuickFilter === "thisWeek") {
                        dateRangeText = "This Week's Subscription Sales"
                      } else if (subscriptionSalesQuickFilter === "thisMonth") {
                        dateRangeText = "This Month's Subscription Sales"
                      } else if (subscriptionStartDate && subscriptionEndDate) {
                        dateRangeText = `${format(subscriptionStartDate, "MMM dd, yyyy")} - ${format(subscriptionEndDate, "MMM dd, yyyy")}`
                      } else if (subscriptionStartDate) {
                        dateRangeText = `From ${format(subscriptionStartDate, "MMM dd, yyyy")}`
                      } else if (subscriptionEndDate) {
                        dateRangeText = `Until ${format(subscriptionEndDate, "MMM dd, yyyy")}`
                      }

                      // Create print window
                      const printWindow = window.open('', '_blank')
                      const printDate = format(new Date(), "MMM dd, yyyy 'at' hh:mm a")

                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Subscription Sales Report - ${dateRangeText}</title>
                            <style>
                              @media print {
                                @page {
                                  size: A4 landscape;
                                  margin: 1cm;
                                }
                                body {
                                  margin: 0;
                                  padding: 0;
                                }
                              }
                              body {
                                font-family: Arial, sans-serif;
                                padding: 20px;
                                font-size: 12px;
                              }
                              .header {
                                text-align: center;
                                margin-bottom: 20px;
                                border-bottom: 2px solid #000;
                                padding-bottom: 10px;
                              }
                              .header h1 {
                                margin: 0;
                                font-size: 24px;
                                font-weight: bold;
                              }
                              .header p {
                                margin: 5px 0;
                                color: #666;
                              }
                              .summary {
                                display: grid;
                                grid-template-columns: repeat(2, 1fr);
                                gap: 15px;
                                margin-bottom: 20px;
                                padding: 15px;
                                background: #f5f5f5;
                                border-radius: 5px;
                              }
                              .summary-card {
                                text-align: center;
                                padding: 10px;
                                background: white;
                                border-radius: 5px;
                                border: 1px solid #ddd;
                              }
                              .summary-card h3 {
                                margin: 0 0 5px 0;
                                font-size: 11px;
                                color: #666;
                                text-transform: uppercase;
                              }
                              .summary-card p {
                                margin: 0;
                                font-size: 18px;
                                font-weight: bold;
                                color: #000;
                              }
                              table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 10px;
                              }
                              th, td {
                                border: 1px solid #ddd;
                                padding: 8px;
                                text-align: left;
                              }
                              th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                                font-size: 11px;
                                text-transform: uppercase;
                              }
                              td {
                                font-size: 11px;
                              }
                              .text-right {
                                text-align: right;
                              }
                              .footer {
                                margin-top: 20px;
                                padding-top: 10px;
                                border-top: 1px solid #ddd;
                                text-align: center;
                                font-size: 10px;
                                color: #666;
                              }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>CNERGY GYM</h1>
                              <h2 style="margin: 5px 0; font-size: 18px; font-weight: normal;">Subscription Sales Report</h2>
                              <p style="font-size: 13px; font-weight: 600; margin-top: 8px;">${dateRangeText}</p>
                              <p style="font-size: 11px; margin-top: 4px;">Generated: ${printDate}</p>
                            </div>
                            
                            <div class="summary">
                              <div class="summary-card">
                                <h3>Total Revenue</h3>
                                <p>${formatCurrency(totalSales)}</p>
                                <p style="font-size: 10px; color: #666; margin-top: 3px; font-weight: normal;">${filteredSales.length} transaction${filteredSales.length !== 1 ? 's' : ''}</p>
                              </div>
                              <div class="summary-card">
                                <h3>Average Transaction</h3>
                                <p>${formatCurrency(filteredSales.length > 0 ? totalSales / filteredSales.length : 0)}</p>
                                <p style="font-size: 10px; color: #666; margin-top: 3px; font-weight: normal;">per transaction</p>
                              </div>
                            </div>

                            <table>
                              <thead>
                                <tr>
                                  <th style="width: 40px;">#</th>
                                  <th>Subscription Plan</th>
                                  <th>Customer Name</th>
                                  <th style="width: 100px;">Sale Type</th>
                                  <th style="width: 100px;">Payment Method</th>
                                  <th style="width: 120px;">Receipt Number</th>
                                  <th style="width: 140px;">Transaction Date</th>
                                  <th class="text-right" style="width: 110px;">Amount (₱)</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${filteredSales.length === 0 ? `
                                  <tr>
                                    <td colspan="8" style="text-align: center; padding: 30px; font-style: italic; color: #999;">
                                      No subscription sales found matching the selected filters.
                                    </td>
                                  </tr>
                                ` : filteredSales.map((sale, index) => {
                        // Get plan name - check multiple sources
                        let planName = sale.plan_name || "N/A"
                        if (planName === "N/A" && sale.sales_details && Array.isArray(sale.sales_details)) {
                          const subscriptionDetail = sale.sales_details.find(d => d.subscription?.plan_name)
                          if (subscriptionDetail?.subscription?.plan_name) {
                            planName = subscriptionDetail.subscription.plan_name
                          }
                        }

                        // Get customer name
                        const customerName = sale.user_name
                          ? (formatName(sale.user_name) || "N/A")
                          : (formatName(sale.guest_name) || "Guest")

                        // Determine sale type
                        const saleType = (() => {
                          const planNameLower = planName.toLowerCase()
                          const isDayPass = planNameLower.includes('day pass') ||
                            planNameLower.includes('daypass') ||
                            planNameLower.includes('walk-in') ||
                            planNameLower.includes('walkin') ||
                            planNameLower.includes('guest')

                          if (isDayPass) {
                            return sale.user_id !== null && sale.user_id !== undefined ? 'Day Pass' : 'Guest'
                          }

                          const isGymSession = planNameLower.includes('gym session') ||
                            planNameLower.includes('gymsession')

                          if (isGymSession) {
                            return sale.user_id !== null && sale.user_id !== undefined ? 'Subscription' : 'Guest'
                          }

                          return sale.sale_type === 'Subscription' ? 'Subscription' : (sale.guest_name ? 'Guest' : 'Subscription')
                        })()

                        const paymentMethod = formatPaymentMethod(sale.payment_method)

                        // Get receipt number based on payment method
                        const receiptNumber = (() => {
                          const paymentMethodLower = (sale.payment_method || 'cash').toLowerCase()
                          if (paymentMethodLower === 'gcash' || paymentMethodLower === 'digital') {
                            return sale.reference_number || sale.receipt_number || "N/A"
                          }
                          return sale.receipt_number || "N/A"
                        })()

                        // Format date for display
                        const saleDateDisplay = formatDate(sale.sale_date)
                        const saleAmount = sale.total_amount || 0

                        return `
                                    <tr>
                                      <td style="text-align: center;">${index + 1}</td>
                                      <td style="font-weight: 500;">${planName}</td>
                                      <td>${customerName}</td>
                                      <td>${saleType}</td>
                                      <td>${paymentMethod}</td>
                                      <td style="font-family: monospace; font-size: 10px;">${receiptNumber}</td>
                                      <td>${saleDateDisplay}</td>
                                      <td class="text-right" style="font-weight: 600;">${formatCurrency(saleAmount)}</td>
                                    </tr>
                                  `
                      }).join('')}
                              </tbody>
                              <tfoot>
                                <tr style="background-color: #f9fafb; font-weight: bold;">
                                  <td colspan="7" style="text-align: right; padding: 12px 8px; font-size: 12px; border-top: 2px solid #000;">TOTAL REVENUE:</td>
                                  <td class="text-right" style="padding: 12px 8px; font-size: 13px; border-top: 2px solid #000;">${formatCurrency(totalSales)}</td>
                                </tr>
                                <tr>
                                  <td colspan="8" style="text-align: center; padding: 8px; font-size: 10px; color: #666; border-top: 1px solid #ddd;">
                                    Total Transactions: ${filteredSales.length} | Average: ${formatCurrency(filteredSales.length > 0 ? totalSales / filteredSales.length : 0)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>

                            <div class="footer">
                              <p style="margin: 0;">This is a computer-generated report from CNERGY GYM Sales Management System.</p>
                              <p style="margin: 5px 0 0 0; font-size: 9px;">For inquiries, please contact the administration office.</p>
                            </div>
                          </body>
                        </html>
                      `)

                      printWindow.document.close()
                      setTimeout(() => {
                        printWindow.print()
                      }, 250)
                    }}
                    className="h-9 px-3 text-sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSubscriptionSalesDialogOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col px-6 pt-4 pb-6 space-y-4">
            {/* Quick Access Filters */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-sm font-medium text-gray-700 mr-2">Quick Access:</span>
              <Button
                variant={subscriptionSalesQuickFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSubscriptionSalesQuickFilter("all")
                  setSubscriptionStartDate(null)
                  setSubscriptionEndDate(null)
                }}
                className={`h-8 text-xs ${subscriptionSalesQuickFilter === "all" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                All Sales
              </Button>
              <Button
                variant={subscriptionSalesQuickFilter === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSubscriptionSalesQuickFilter("today")
                  const todayPH = getTodayInPHTime()
                  const todayDate = new Date(todayPH + "T00:00:00")
                  setSubscriptionStartDate(todayDate)
                  setSubscriptionEndDate(todayDate)
                }}
                className={`h-8 text-xs ${subscriptionSalesQuickFilter === "today" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                Today
              </Button>
              <Button
                variant={subscriptionSalesQuickFilter === "thisWeek" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSubscriptionSalesQuickFilter("thisWeek")
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const today = new Date(phTime)
                  today.setHours(0, 0, 0, 0)
                  const dayOfWeek = today.getDay()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                  endOfWeek.setHours(23, 59, 59, 999)
                  setSubscriptionStartDate(startOfWeek)
                  setSubscriptionEndDate(endOfWeek)
                }}
                className={`h-8 text-xs ${subscriptionSalesQuickFilter === "thisWeek" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                This Week
              </Button>
              <Button
                variant={subscriptionSalesQuickFilter === "thisMonth" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSubscriptionSalesQuickFilter("thisMonth")
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const startOfMonth = new Date(phTime.getFullYear(), phTime.getMonth(), 1)
                  startOfMonth.setHours(0, 0, 0, 0)
                  const endOfMonth = new Date(phTime.getFullYear(), phTime.getMonth() + 1, 0)
                  endOfMonth.setHours(23, 59, 59, 999)
                  setSubscriptionStartDate(startOfMonth)
                  setSubscriptionEndDate(endOfMonth)
                }}
                className={`h-8 text-xs ${subscriptionSalesQuickFilter === "thisMonth" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                This Month
              </Button>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3 flex-wrap pb-3 border-b">
              {/* Search */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search subscriptions..."
                  className="pl-10 h-9 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  value={subscriptionSalesSearchQuery}
                  onChange={(e) => setSubscriptionSalesSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selectedPlanFilter} onValueChange={(value) => {
                  setSelectedPlanFilter(value)
                  // Reset Day Pass type filter when plan changes
                  const selectedPlan = subscriptionPlans.find(p => p.id.toString() === value)
                  const isDayPassPlan = selectedPlan && (
                    selectedPlan.name.toLowerCase().includes('day pass') ||
                    selectedPlan.name.toLowerCase().includes('daypass') ||
                    selectedPlan.name.toLowerCase().includes('walk-in') ||
                    selectedPlan.name.toLowerCase().includes('walkin') ||
                    selectedPlan.name.toLowerCase().includes('guest') ||
                    (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                    selectedPlan.name.toLowerCase() === 'day pass'
                  )
                  const isGymSessionPlan = selectedPlan && (
                    selectedPlan.name.toLowerCase().includes('gym session') ||
                    selectedPlan.name.toLowerCase().includes('gymsession')
                  ) && !isDayPassPlan

                  if (!isDayPassPlan) {
                    setSubscriptionDayPassTypeFilter("all")
                  }
                  if (!isGymSessionPlan) {
                    setSubscriptionGymSessionTypeFilter("all")
                  }
                }}>
                  <SelectTrigger className="w-[200px] h-9 text-sm">
                    <SelectValue placeholder="All Plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    {subscriptionPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Day Pass Type Filter - Only show when Day Pass plan is selected */}
                {(() => {
                  const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                  const isDayPassPlan = selectedPlan && (
                    selectedPlan.name.toLowerCase().includes('day pass') ||
                    selectedPlan.name.toLowerCase().includes('daypass') ||
                    selectedPlan.name.toLowerCase().includes('walk-in') ||
                    selectedPlan.name.toLowerCase().includes('walkin') ||
                    selectedPlan.name.toLowerCase().includes('guest') ||
                    (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                    selectedPlan.name.toLowerCase() === 'day pass'
                  )
                  return isDayPassPlan ? (
                    <Select value={subscriptionDayPassTypeFilter} onValueChange={setSubscriptionDayPassTypeFilter}>
                      <SelectTrigger className="w-[160px] h-9 text-sm">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="day_pass">Subscription</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null
                })()}

                {/* Gym Session Type Filter - Only show when Gym Session plan is selected */}
                {(() => {
                  const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                  const isDayPassPlan = selectedPlan && (
                    selectedPlan.name.toLowerCase().includes('day pass') ||
                    selectedPlan.name.toLowerCase().includes('daypass') ||
                    selectedPlan.name.toLowerCase().includes('walk-in') ||
                    selectedPlan.name.toLowerCase().includes('walkin') ||
                    selectedPlan.name.toLowerCase().includes('guest') ||
                    (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                    selectedPlan.name.toLowerCase() === 'day pass'
                  )
                  const isGymSessionPlan = selectedPlan && (
                    selectedPlan.name.toLowerCase().includes('gym session') ||
                    selectedPlan.name.toLowerCase().includes('gymsession')
                  ) && !isDayPassPlan
                  return isGymSessionPlan ? (
                    <Select value={subscriptionGymSessionTypeFilter} onValueChange={setSubscriptionGymSessionTypeFilter}>
                      <SelectTrigger className="w-[160px] h-9 text-sm">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null
                })()}

                {/* Date Range Picker */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600 whitespace-nowrap">Start Date:</Label>
                    <Input
                      type="date"
                      value={subscriptionStartDate ? format(subscriptionStartDate, "yyyy-MM-dd") : ""}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        if (selectedDate) {
                          const date = new Date(selectedDate + "T00:00:00")
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          if (date.getTime() <= today.getTime()) {
                            setSubscriptionStartDate(date)
                            setSubscriptionSalesQuickFilter("all") // Switch to "all" when custom date range is selected
                            // If end date is set and is before start date, clear it
                            if (subscriptionEndDate && date > subscriptionEndDate) {
                              setSubscriptionEndDate(null)
                            }
                          }
                        } else {
                          setSubscriptionStartDate(null)
                        }
                      }}
                      className="h-9 text-sm w-[140px] border-gray-300"
                      placeholder="Start date"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600 whitespace-nowrap">End Date:</Label>
                    <Input
                      type="date"
                      value={subscriptionEndDate ? format(subscriptionEndDate, "yyyy-MM-dd") : ""}
                      min={subscriptionStartDate ? format(subscriptionStartDate, "yyyy-MM-dd") : undefined}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        if (selectedDate) {
                          const date = new Date(selectedDate + "T00:00:00")
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          if (date.getTime() <= today.getTime()) {
                            // If start date is set and selected date is before it, don't update
                            if (subscriptionStartDate && date < subscriptionStartDate) {
                              return
                            }
                            setSubscriptionEndDate(date)
                            setSubscriptionSalesQuickFilter("all") // Switch to "all" when custom date range is selected
                          }
                        } else {
                          setSubscriptionEndDate(null)
                        }
                      }}
                      className="h-9 text-sm w-[140px] border-gray-300"
                      placeholder="End date"
                    />
                  </div>
                  {(subscriptionStartDate || subscriptionEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setSubscriptionStartDate(null)
                        setSubscriptionEndDate(null)
                      }}
                      className="h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Sales Dashboard */}
            {(() => {
              const filteredSales = sales.filter((sale) => {
                // Filter by search query
                const matchesSearch = subscriptionSalesSearchQuery === "" ||
                  sale.user_name?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase()) ||
                  sale.guest_name?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase()) ||
                  sale.receipt_number?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase()) ||
                  sale.plan_name?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase()) ||
                  sale.payment_method?.toLowerCase().includes(subscriptionSalesSearchQuery.toLowerCase())

                if (!matchesSearch) return false

                // Check if selected plan is "Day Pass" or "Gym Session"
                const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                const isDayPassPlan = selectedPlan && (
                  selectedPlan.name.toLowerCase().includes('day pass') ||
                  selectedPlan.name.toLowerCase().includes('daypass') ||
                  selectedPlan.name.toLowerCase().includes('walk-in') ||
                  selectedPlan.name.toLowerCase().includes('walkin') ||
                  selectedPlan.name.toLowerCase().includes('guest') ||
                  (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                  selectedPlan.name.toLowerCase() === 'day pass'
                ) && !(
                  selectedPlan.name.toLowerCase().includes('gym session') ||
                  selectedPlan.name.toLowerCase().includes('gymsession')
                )
                const isGymSessionPlan = selectedPlan && (
                  selectedPlan.name.toLowerCase().includes('gym session') ||
                  selectedPlan.name.toLowerCase().includes('gymsession')
                ) && !isDayPassPlan

                // Debug: Log when Day Pass plan is selected
                if (isDayPassPlan) {
                  console.log("Day Pass plan detected:", selectedPlan)
                }

                // If Day Pass plan is selected, include ALL Day Pass/Walk-in/Guest sales
                if (isDayPassPlan) {
                  // Check if this is a Guest/Walk-in/Day Pass sale
                  const isGuestSale = sale.sale_type === 'Guest' ||
                    sale.sale_type === 'Walk-in' ||
                    sale.sale_type === 'Walkin' ||
                    sale.sale_type === 'Day Pass' ||
                    sale.guest_name

                  if (isGuestSale) {
                    // Apply Day Pass type filter (Subscription vs Guest)
                    if (subscriptionDayPassTypeFilter === "day_pass") {
                      return false // This is a guest sale, not a subscription sale
                    }

                    // Filter by date range (works for all quick filters and custom range)
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    // Status filter removed - show all sales
                    return true
                  }

                  // Also check if this is a subscription sale with Day Pass plan_id
                  if (sale.sale_type === 'Subscription' && sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) {
                    // This is a subscription sale with Day Pass plan
                    // Apply Day Pass type filter (Subscription vs Guest)
                    if (subscriptionDayPassTypeFilter === "guest") {
                      return false // This is a subscription sale, not a guest sale
                    }

                    // Filter by date range (works for all quick filters and custom range)
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    // Status filter removed - show all sales
                    return true
                  }

                  // If Day Pass plan is selected but this sale doesn't match, exclude it
                  return false
                }

                // If Gym Session plan is selected, handle Gym Session sales
                if (isGymSessionPlan) {
                  // Exclude product sales explicitly
                  if (sale.sale_type === 'Product') {
                    return false
                  }

                  // Check if this is a Gym Session guest sale
                  const isGymSessionGuestSale = (sale.sale_type === 'Guest' || sale.guest_name) && (
                    sale.plan_name?.toLowerCase().includes('gym session') ||
                    sale.plan_name?.toLowerCase().includes('gymsession') ||
                    (sale.plan_id && sale.plan_id.toString() === selectedPlanFilter)
                  )

                  if (isGymSessionGuestSale) {
                    // Apply Gym Session type filter (Subscription vs Guest)
                    if (subscriptionGymSessionTypeFilter === "subscription") {
                      return false // This is a guest sale, not a subscription sale
                    }

                    // Filter by date range (works for all quick filters and custom range)
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    return true
                  }

                  // Check if this is a Gym Session subscription sale
                  if (sale.sale_type === 'Subscription' && sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) {
                    // Apply Gym Session type filter (Subscription vs Guest)
                    if (subscriptionGymSessionTypeFilter === "guest") {
                      return false // This is a subscription sale, not a guest sale
                    }

                    // Filter by date range (works for all quick filters and custom range)
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    return true
                  }

                  // If Gym Session plan is selected but this sale doesn't match, exclude it
                  return false
                }

                // Exclude product sales for subscription sales modal
                if (sale.sale_type === 'Product') {
                  return false
                }

                // For other plans or "All Plans", only show subscription sales
                const isSubscriptionSale = sale.sale_type === 'Subscription'
                if (!isSubscriptionSale) return false

                // Filter by selected plan if not "all"
                if (selectedPlanFilter !== "all") {
                  // First try to match by plan_id from sale object
                  const salePlanId = sale.plan_id?.toString()
                  if (salePlanId === selectedPlanFilter) {
                    // Matches, continue
                  } else {
                    // Try to match by plan name from sale object
                    const salePlanName = sale.plan_name
                    if (selectedPlan && salePlanName === selectedPlan.name) {
                      // Matches by name, continue
                    } else {
                      // No match, exclude this sale
                      return false
                    }
                  }
                }

                // Filter by quick access filter
                if (subscriptionSalesQuickFilter === "today") {
                  const saleDate = new Date(sale.sale_date)
                  saleDate.setHours(0, 0, 0, 0)
                  const todayPH = getTodayInPHTime()
                  const todayDate = new Date(todayPH + "T00:00:00")
                  todayDate.setHours(0, 0, 0, 0)
                  const saleDateStr = saleDate.toISOString().split('T')[0]
                  const todayStr = todayDate.toISOString().split('T')[0]
                  if (saleDateStr !== todayStr) return false
                } else if (subscriptionSalesQuickFilter === "thisWeek") {
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const today = new Date(phTime)
                  today.setHours(0, 0, 0, 0)
                  const dayOfWeek = today.getDay()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                  endOfWeek.setHours(23, 59, 59, 999)

                  const saleDate = new Date(sale.sale_date)
                  if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                } else if (subscriptionSalesQuickFilter === "thisMonth") {
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const saleDate = new Date(sale.sale_date)
                  const saleMonth = saleDate.getMonth()
                  const saleYear = saleDate.getFullYear()
                  const currentMonth = phTime.getMonth()
                  const currentYear = phTime.getFullYear()
                  if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                } else if (subscriptionSalesQuickFilter === "all") {
                  // "All" - no date filtering, but still respect month/year/custom date if set manually
                  // Filter by date range
                  if (subscriptionStartDate || subscriptionEndDate) {
                    const saleDate = new Date(sale.sale_date)
                    saleDate.setHours(0, 0, 0, 0)

                    if (subscriptionStartDate) {
                      const startDate = new Date(subscriptionStartDate)
                      startDate.setHours(0, 0, 0, 0)
                      if (saleDate < startDate) return false
                    }

                    if (subscriptionEndDate) {
                      const endDate = new Date(subscriptionEndDate)
                      endDate.setHours(23, 59, 59, 999)
                      if (saleDate > endDate) return false
                    }
                  }
                }

                // Status filter removed - show all sales
                return true
              })

              // Calculate statistics based on current filters (including status filter)
              // First get all sales matching plan/month/year filters (for calculating active/expired counts)
              const allSalesForCounts = sales.filter((sale) => {
                // Check if selected plan is "Day Pass" or "Gym Session"
                const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                const isDayPassPlan = selectedPlan && (
                  selectedPlan.name.toLowerCase().includes('day pass') ||
                  selectedPlan.name.toLowerCase().includes('daypass') ||
                  selectedPlan.name.toLowerCase().includes('walk-in') ||
                  selectedPlan.name.toLowerCase().includes('walkin') ||
                  selectedPlan.name.toLowerCase().includes('guest') ||
                  (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                  selectedPlan.name.toLowerCase() === 'day pass'
                ) && !(
                  selectedPlan.name.toLowerCase().includes('gym session') ||
                  selectedPlan.name.toLowerCase().includes('gymsession')
                )
                const isGymSessionPlan = selectedPlan && (
                  selectedPlan.name.toLowerCase().includes('gym session') ||
                  selectedPlan.name.toLowerCase().includes('gymsession')
                ) && !isDayPassPlan

                // Helper function to check if a sale is a Day Pass subscription (user with account)
                const isDayPassSubscription = (sale) => {
                  if (sale.sale_type !== 'Subscription') return false

                  // Check by plan_id
                  if (sale.plan_id && selectedPlan && sale.plan_id.toString() === selectedPlanFilter) {
                    return true
                  }

                  // Check by plan_name
                  if (sale.plan_name) {
                    const planNameLower = sale.plan_name.toLowerCase()
                    if (planNameLower.includes('day pass') ||
                      planNameLower.includes('daypass') ||
                      planNameLower.includes('walk-in') ||
                      planNameLower.includes('walkin')) {
                      return true
                    }
                  }

                  // Check subscription details for plan name
                  const subscriptionDetail = getSubscriptionDetails(sale.id)
                  if (subscriptionDetail && subscriptionDetail.planName) {
                    const planNameLower = subscriptionDetail.planName.toLowerCase()
                    if (planNameLower.includes('day pass') ||
                      planNameLower.includes('daypass') ||
                      planNameLower.includes('walk-in') ||
                      planNameLower.includes('walkin')) {
                      return true
                    }
                  }

                  // Check if plan has Day Pass characteristics (duration_days > 0, duration_months === 0)
                  if (sale.plan_id) {
                    const plan = subscriptionPlans.find(p => p.id.toString() === sale.plan_id.toString())
                    if (plan && plan.duration_days && plan.duration_days > 0 &&
                      (!plan.duration_months || plan.duration_months === 0)) {
                      return true
                    }
                  }

                  return false
                }

                // Helper function to check if a sale is a Day Pass guest/walk-in (user without account)
                const isDayPassGuestSale = (sale) => {
                  return sale.sale_type === 'Walk-in' ||
                    sale.sale_type === 'Walkin' ||
                    sale.sale_type === 'Guest' ||
                    sale.sale_type === 'Day Pass' ||
                    sale.guest_name ||
                    (sale.plan_name && (
                      sale.plan_name.toLowerCase().includes('guest walk in') ||
                      sale.plan_name.toLowerCase().includes('guest walk-in') ||
                      sale.plan_name.toLowerCase().includes('walk in') ||
                      sale.plan_name.toLowerCase().includes('walk-in')
                    )) ||
                    (sale.plan_id === 6 && sale.sale_type === 'Guest')
                }

                // If Day Pass plan is selected, include ALL Day Pass sales (both guest and subscription)
                if (isDayPassPlan) {
                  // Check if this is a Day Pass guest/walk-in sale (user without account)
                  if (isDayPassGuestSale(sale)) {
                    // Apply Day Pass type filter (Subscription vs Guest)
                    if (subscriptionDayPassTypeFilter === "day_pass") {
                      return false // This is a guest sale, not a subscription sale
                    }
                    // If type filter is "guest" or "all", include this guest sale

                    // Filter by date range (works for all quick filters and custom range)
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    // Day Pass guest sales always show (they don't expire)
                    return true
                  }

                  // Check if this is a Day Pass subscription sale (user with account)
                  if (isDayPassSubscription(sale)) {
                    // Apply Day Pass type filter (Subscription vs Guest)
                    if (subscriptionDayPassTypeFilter === "guest") {
                      return false // This is a subscription sale, not a guest sale
                    }
                    // If type filter is "day_pass" or "all", include this subscription sale

                    // Filter by date range (works for all quick filters and custom range)
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    // Day Pass subscription sales are included (will be filtered by status below)
                    return true
                  }

                  // If Day Pass plan is selected but this sale doesn't match, exclude it
                  return false
                }

                // If Gym Session plan is selected, handle Gym Session sales
                if (isGymSessionPlan) {
                  // Check if this is a Gym Session guest sale
                  const isGymSessionGuestSale = (sale.sale_type === 'Guest' || sale.guest_name) && (
                    sale.plan_name?.toLowerCase().includes('gym session') ||
                    sale.plan_name?.toLowerCase().includes('gymsession') ||
                    (sale.plan_id && sale.plan_id.toString() === selectedPlanFilter)
                  )

                  if (isGymSessionGuestSale) {
                    // Apply Gym Session type filter (Subscription vs Guest)
                    if (subscriptionGymSessionTypeFilter === "subscription") {
                      return false // This is a guest sale, not a subscription sale
                    }
                    // If type filter is "guest" or "all", include this guest sale

                    // Apply date filters
                    if (subscriptionSalesQuickFilter === "today") {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)
                      const todayPH = getTodayInPHTime()
                      const todayDate = new Date(todayPH + "T00:00:00")
                      todayDate.setHours(0, 0, 0, 0)
                      const saleDateStr = saleDate.toISOString().split('T')[0]
                      const todayStr = todayDate.toISOString().split('T')[0]
                      if (saleDateStr !== todayStr) return false
                    } else if (subscriptionSalesQuickFilter === "thisWeek") {
                      const now = new Date()
                      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                      const today = new Date(phTime)
                      today.setHours(0, 0, 0, 0)
                      const dayOfWeek = today.getDay()
                      const startOfWeek = new Date(today)
                      startOfWeek.setDate(today.getDate() - dayOfWeek)
                      const endOfWeek = new Date(startOfWeek)
                      endOfWeek.setDate(startOfWeek.getDate() + 6)
                      endOfWeek.setHours(23, 59, 59, 999)
                      const saleDate = new Date(sale.sale_date)
                      if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                    } else if (subscriptionSalesQuickFilter === "thisMonth") {
                      const now = new Date()
                      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                      const saleDate = new Date(sale.sale_date)
                      const saleMonth = saleDate.getMonth()
                      const saleYear = saleDate.getFullYear()
                      const currentMonth = phTime.getMonth()
                      const currentYear = phTime.getFullYear()
                      if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                    } else if (subscriptionSalesQuickFilter === "all") {
                      // Filter by date range
                      if (subscriptionStartDate || subscriptionEndDate) {
                        const saleDate = new Date(sale.sale_date)
                        saleDate.setHours(0, 0, 0, 0)

                        if (subscriptionStartDate) {
                          const startDate = new Date(subscriptionStartDate)
                          startDate.setHours(0, 0, 0, 0)
                          if (saleDate < startDate) return false
                        }

                        if (subscriptionEndDate) {
                          const endDate = new Date(subscriptionEndDate)
                          endDate.setHours(23, 59, 59, 999)
                          if (saleDate > endDate) return false
                        }
                      }
                    }
                    return true
                  }

                  // Check if this is a Gym Session subscription sale
                  if (sale.sale_type === 'Subscription' && sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) {
                    // Apply Gym Session type filter (Subscription vs Guest)
                    if (subscriptionGymSessionTypeFilter === "guest") {
                      return false // This is a subscription sale, not a guest sale
                    }
                    // If type filter is "subscription" or "all", include this subscription sale

                    // Apply date filters
                    if (subscriptionSalesQuickFilter === "today") {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)
                      const todayPH = getTodayInPHTime()
                      const todayDate = new Date(todayPH + "T00:00:00")
                      todayDate.setHours(0, 0, 0, 0)
                      const saleDateStr = saleDate.toISOString().split('T')[0]
                      const todayStr = todayDate.toISOString().split('T')[0]
                      if (saleDateStr !== todayStr) return false
                    } else if (subscriptionSalesQuickFilter === "thisWeek") {
                      const now = new Date()
                      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                      const today = new Date(phTime)
                      today.setHours(0, 0, 0, 0)
                      const dayOfWeek = today.getDay()
                      const startOfWeek = new Date(today)
                      startOfWeek.setDate(today.getDate() - dayOfWeek)
                      const endOfWeek = new Date(startOfWeek)
                      endOfWeek.setDate(startOfWeek.getDate() + 6)
                      endOfWeek.setHours(23, 59, 59, 999)
                      const saleDate = new Date(sale.sale_date)
                      if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                    } else if (subscriptionSalesQuickFilter === "thisMonth") {
                      const now = new Date()
                      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                      const saleDate = new Date(sale.sale_date)
                      const saleMonth = saleDate.getMonth()
                      const saleYear = saleDate.getFullYear()
                      const currentMonth = phTime.getMonth()
                      const currentYear = phTime.getFullYear()
                      if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                    } else if (subscriptionSalesQuickFilter === "all") {
                      // Filter by date range
                      if (subscriptionStartDate || subscriptionEndDate) {
                        const saleDate = new Date(sale.sale_date)
                        saleDate.setHours(0, 0, 0, 0)

                        if (subscriptionStartDate) {
                          const startDate = new Date(subscriptionStartDate)
                          startDate.setHours(0, 0, 0, 0)
                          if (saleDate < startDate) return false
                        }

                        if (subscriptionEndDate) {
                          const endDate = new Date(subscriptionEndDate)
                          endDate.setHours(23, 59, 59, 999)
                          if (saleDate > endDate) return false
                        }
                      }
                    }
                    return true
                  }

                  // If Gym Session plan is selected but this sale doesn't match, exclude it
                  return false
                }

                // For "All Plans", include both subscription sales and guest sales
                if (selectedPlanFilter === "all") {
                  // Include subscription sales
                  if (sale.sale_type === 'Subscription') {
                    // Filter by date range (works for all quick filters and custom range)
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }
                    return true
                  }
                  // Include guest sales (Guest Walk In) in "All Plans"
                  else if (sale.sale_type === 'Guest' || sale.guest_name) {
                    // Filter by date range (works for all quick filters and custom range)
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }
                    return true // Guest sale included in "All Plans"
                  } else {
                    // Not a subscription or guest sale, exclude it
                    return false
                  }
                }

                // For other plans (not "all" and not Day Pass/Gym Session), only show subscription sales
                const isSubscriptionSale = sale.sale_type === 'Subscription'
                if (!isSubscriptionSale) return false

                // Filter by selected plan if not "all"
                if (selectedPlanFilter !== "all") {
                  // First try to match by plan_id from sale object
                  const salePlanId = sale.plan_id?.toString()
                  if (salePlanId === selectedPlanFilter) {
                    // Matches, continue
                  } else {
                    // Try to match by plan name from sale object
                    const salePlanName = sale.plan_name
                    if (selectedPlan && salePlanName === selectedPlan.name) {
                      // Matches by name, continue
                    } else {
                      // No match, exclude this sale
                      return false
                    }
                  }
                }

                // Filter by quick access filter
                if (subscriptionSalesQuickFilter === "today") {
                  const saleDate = new Date(sale.sale_date)
                  saleDate.setHours(0, 0, 0, 0)
                  const todayPH = getTodayInPHTime()
                  const todayDate = new Date(todayPH + "T00:00:00")
                  todayDate.setHours(0, 0, 0, 0)
                  const saleDateStr = saleDate.toISOString().split('T')[0]
                  const todayStr = todayDate.toISOString().split('T')[0]
                  if (saleDateStr !== todayStr) return false
                } else if (subscriptionSalesQuickFilter === "thisWeek") {
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const today = new Date(phTime)
                  today.setHours(0, 0, 0, 0)
                  const dayOfWeek = today.getDay()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                  endOfWeek.setHours(23, 59, 59, 999)

                  const saleDate = new Date(sale.sale_date)
                  if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                } else if (subscriptionSalesQuickFilter === "thisMonth") {
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const saleDate = new Date(sale.sale_date)
                  const saleMonth = saleDate.getMonth()
                  const saleYear = saleDate.getFullYear()
                  const currentMonth = phTime.getMonth()
                  const currentYear = phTime.getFullYear()
                  if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                } else if (subscriptionSalesQuickFilter === "all") {
                  // "All" - no date filtering, but still respect month/year/custom date if set manually
                  // Filter by date range
                  if (subscriptionStartDate || subscriptionEndDate) {
                    const saleDate = new Date(sale.sale_date)
                    saleDate.setHours(0, 0, 0, 0)

                    if (subscriptionStartDate) {
                      const startDate = new Date(subscriptionStartDate)
                      startDate.setHours(0, 0, 0, 0)
                      if (saleDate < startDate) return false
                    }

                    if (subscriptionEndDate) {
                      const endDate = new Date(subscriptionEndDate)
                      endDate.setHours(23, 59, 59, 999)
                      if (saleDate > endDate) return false
                    }
                  }
                }

                return true
              })

              // Helper function to check if a sale is a Day Pass subscription (for filtering)
              const isDayPassSubscriptionForFilter = (sale, selectedPlanFilter) => {
                if (sale.sale_type !== 'Subscription') return false

                const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)

                // Check by plan_id
                if (sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) {
                  return true
                }

                // Check by plan_name
                if (sale.plan_name) {
                  const planNameLower = sale.plan_name.toLowerCase()
                  if (planNameLower.includes('day pass') ||
                    planNameLower.includes('daypass') ||
                    planNameLower.includes('walk-in') ||
                    planNameLower.includes('walkin')) {
                    return true
                  }
                }

                // Check subscription details for plan name
                const subscriptionDetail = getSubscriptionDetails(sale.id)
                if (subscriptionDetail && subscriptionDetail.planName) {
                  const planNameLower = subscriptionDetail.planName.toLowerCase()
                  if (planNameLower.includes('day pass') ||
                    planNameLower.includes('daypass') ||
                    planNameLower.includes('walk-in') ||
                    planNameLower.includes('walkin')) {
                    return true
                  }
                }

                // Check if plan has Day Pass characteristics
                if (sale.plan_id) {
                  const plan = subscriptionPlans.find(p => p.id.toString() === sale.plan_id.toString())
                  if (plan && plan.duration_days && plan.duration_days > 0 &&
                    (!plan.duration_months || plan.duration_months === 0)) {
                    return true
                  }
                }

                return false
              }

              // Helper function to check if a sale is a Day Pass guest sale (for filtering)
              const isDayPassGuestSaleForFilter = (sale) => {
                return sale.sale_type === 'Walk-in' ||
                  sale.sale_type === 'Walkin' ||
                  sale.sale_type === 'Guest' ||
                  sale.sale_type === 'Day Pass' ||
                  sale.guest_name
              }

              // Helper function to check if selected plan is Day Pass/Gym Session
              const isDayPassPlanForStats = (selectedPlanFilter) => {
                const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                return selectedPlan && (
                  selectedPlan.name.toLowerCase().includes('day pass') ||
                  selectedPlan.name.toLowerCase().includes('daypass') ||
                  selectedPlan.name.toLowerCase().includes('gym session') ||
                  selectedPlan.name.toLowerCase().includes('gymsession') ||
                  selectedPlan.id === 6 ||
                  selectedPlan.name.toLowerCase().includes('walk-in') ||
                  selectedPlan.name.toLowerCase().includes('walkin') ||
                  selectedPlan.name.toLowerCase().includes('guest') ||
                  (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                  selectedPlan.name.toLowerCase() === 'day pass'
                )
              }

              // Helper function to check if a sale is a Day Pass guest sale (for stats)
              const isDayPassGuestSaleForStats = (sale) => {
                return sale.sale_type === 'Walk-in' ||
                  sale.sale_type === 'Walkin' ||
                  sale.sale_type === 'Guest' ||
                  sale.sale_type === 'Day Pass' ||
                  sale.guest_name ||
                  (sale.plan_name && (
                    sale.plan_name.toLowerCase().includes('guest walk in') ||
                    sale.plan_name.toLowerCase().includes('guest walk-in') ||
                    sale.plan_name.toLowerCase().includes('walk in') ||
                    sale.plan_name.toLowerCase().includes('walk-in')
                  )) ||
                  (sale.plan_id === 6 && sale.sale_type === 'Guest')
              }

              // Now filter by status for statistics (same as table filter)
              const filteredSalesForStats = allSalesForCounts.filter((sale) => {
                const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
                const isDayPassPlan = isDayPassPlanForStats(selectedPlanFilter)
                const isGymSessionPlan = selectedPlan && (
                  selectedPlan.name.toLowerCase().includes('gym session') ||
                  selectedPlan.name.toLowerCase().includes('gymsession')
                ) && !isDayPassPlan

                // If Day Pass plan is selected, include ALL Day Pass sales (both guest and subscription)
                if (isDayPassPlan) {
                  // Check if this is a Day Pass guest/walk-in sale (user without account)
                  if (isDayPassGuestSaleForStats(sale)) {
                    // Apply Day Pass type filter (Subscription vs Guest)
                    if (subscriptionDayPassTypeFilter === "day_pass") {
                      return false // This is a guest sale, not a subscription sale
                    }
                    // If type filter is "guest" or "all", include this guest sale

                    // Apply date filters for guest sales
                    // Handle custom date first (highest priority)
                    // Filter by date range
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }
                    return true
                  }

                  // Check if this is a Day Pass subscription sale (user with account)
                  if (isDayPassSubscriptionForFilter(sale, selectedPlanFilter)) {
                    // Apply Day Pass type filter (Subscription vs Guest)
                    if (subscriptionDayPassTypeFilter === "guest") {
                      return false // This is a subscription sale, not a guest sale
                    }
                    // If type filter is "day_pass" or "all", include this subscription sale

                    // Apply date filters for subscription sales
                    // Handle custom date first (highest priority)
                    // Filter by date range
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }
                    return true
                  }

                  // If Day Pass plan is selected but this sale doesn't match, exclude it
                  return false
                }

                // If Gym Session plan is selected, handle Gym Session sales with type filter
                if (isGymSessionPlan) {
                  // Exclude product sales explicitly
                  if (sale.sale_type === 'Product') {
                    return false
                  }

                  // Check if this is a Gym Session guest sale (same logic as main filteredSales)
                  const isGymSessionGuestSale = (sale.sale_type === 'Guest' || sale.guest_name) && (
                    sale.plan_name?.toLowerCase().includes('gym session') ||
                    sale.plan_name?.toLowerCase().includes('gymsession') ||
                    (sale.plan_id && sale.plan_id.toString() === selectedPlanFilter)
                  )

                  if (isGymSessionGuestSale) {
                    // Apply Gym Session type filter (Subscription vs Guest) - same logic as Total Sales modal
                    if (subscriptionGymSessionTypeFilter === "subscription") {
                      // Filter out guest sales when filtering for subscriptions
                      return false
                    }
                    // If type filter is "guest" or "all", include this guest sale

                    // Apply quick access filter
                    if (subscriptionSalesQuickFilter === "today") {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)
                      const todayPH = getTodayInPHTime()
                      const todayDate = new Date(todayPH + "T00:00:00")
                      todayDate.setHours(0, 0, 0, 0)
                      const saleDateStr = saleDate.toISOString().split('T')[0]
                      const todayStr = todayDate.toISOString().split('T')[0]
                      if (saleDateStr !== todayStr) return false
                    } else if (subscriptionSalesQuickFilter === "thisWeek") {
                      const now = new Date()
                      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                      const today = new Date(phTime)
                      today.setHours(0, 0, 0, 0)
                      const dayOfWeek = today.getDay()
                      const startOfWeek = new Date(today)
                      startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                      const endOfWeek = new Date(startOfWeek)
                      endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                      endOfWeek.setHours(23, 59, 59, 999)
                      const saleDate = new Date(sale.sale_date)
                      if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                    } else if (subscriptionSalesQuickFilter === "thisMonth") {
                      const now = new Date()
                      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                      const saleDate = new Date(sale.sale_date)
                      const saleMonth = saleDate.getMonth()
                      const saleYear = saleDate.getFullYear()
                      const currentMonth = phTime.getMonth()
                      const currentYear = phTime.getFullYear()
                      if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                    } else if (subscriptionSalesQuickFilter === "all") {
                      // "All" - no date filtering, but still respect month/year/custom date if set manually
                      // Filter by date range
                      if (subscriptionStartDate || subscriptionEndDate) {
                        const saleDate = new Date(sale.sale_date)
                        saleDate.setHours(0, 0, 0, 0)

                        if (subscriptionStartDate) {
                          const startDate = new Date(subscriptionStartDate)
                          startDate.setHours(0, 0, 0, 0)
                          if (saleDate < startDate) return false
                        }

                        if (subscriptionEndDate) {
                          const endDate = new Date(subscriptionEndDate)
                          endDate.setHours(23, 59, 59, 999)
                          if (saleDate > endDate) return false
                        }
                      }
                    }
                    return true
                  }

                  // Check if this is a Gym Session subscription sale
                  if (sale.sale_type === 'Subscription' && sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) {
                    // Apply Gym Session type filter (Subscription vs Guest) - same logic as Total Sales modal
                    if (subscriptionGymSessionTypeFilter === "guest") {
                      // Filter out subscription sales when filtering for guests
                      return false
                    }
                    // If type filter is "subscription" or "all", include this subscription sale

                    // Apply quick access filter
                    if (subscriptionSalesQuickFilter === "today") {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)
                      const todayPH = getTodayInPHTime()
                      const todayDate = new Date(todayPH + "T00:00:00")
                      todayDate.setHours(0, 0, 0, 0)
                      const saleDateStr = saleDate.toISOString().split('T')[0]
                      const todayStr = todayDate.toISOString().split('T')[0]
                      if (saleDateStr !== todayStr) return false
                    } else if (subscriptionSalesQuickFilter === "thisWeek") {
                      const now = new Date()
                      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                      const today = new Date(phTime)
                      today.setHours(0, 0, 0, 0)
                      const dayOfWeek = today.getDay()
                      const startOfWeek = new Date(today)
                      startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                      const endOfWeek = new Date(startOfWeek)
                      endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                      endOfWeek.setHours(23, 59, 59, 999)
                      const saleDate = new Date(sale.sale_date)
                      if (saleDate < startOfWeek || saleDate > endOfWeek) return false
                    } else if (subscriptionSalesQuickFilter === "thisMonth") {
                      const now = new Date()
                      const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                      const saleDate = new Date(sale.sale_date)
                      const saleMonth = saleDate.getMonth()
                      const saleYear = saleDate.getFullYear()
                      const currentMonth = phTime.getMonth()
                      const currentYear = phTime.getFullYear()
                      if (saleMonth !== currentMonth || saleYear !== currentYear) return false
                    } else if (subscriptionSalesQuickFilter === "all") {
                      // "All" - no date filtering, but still respect month/year/custom date if set manually
                      // Filter by date range
                      if (subscriptionStartDate || subscriptionEndDate) {
                        const saleDate = new Date(sale.sale_date)
                        saleDate.setHours(0, 0, 0, 0)

                        if (subscriptionStartDate) {
                          const startDate = new Date(subscriptionStartDate)
                          startDate.setHours(0, 0, 0, 0)
                          if (saleDate < startDate) return false
                        }

                        if (subscriptionEndDate) {
                          const endDate = new Date(subscriptionEndDate)
                          endDate.setHours(23, 59, 59, 999)
                          if (saleDate > endDate) return false
                        }
                      }
                    }
                    return true
                  }

                  // If Gym Session plan is selected but this sale doesn't match the Gym Session guest/subscription conditions,
                  // apply type filter as a final check before excluding - same logic as Total Sales modal
                  if (subscriptionGymSessionTypeFilter === "guest") {
                    // Filter out subscription sales (those with user_id)
                    if (sale.user_id !== null && sale.user_id !== undefined) {
                      return false
                    }
                  } else if (subscriptionGymSessionTypeFilter === "subscription") {
                    // Filter out guest sales (those without user_id or with guest_name)
                    if (sale.user_id === null || sale.user_id === undefined || sale.guest_name) {
                      return false
                    }
                  }

                  // If Gym Session plan is selected but this sale doesn't match, exclude it
                  return false
                }

                // For "All Plans", include both subscription sales and guest sales
                if (selectedPlanFilter === "all") {
                  // Include subscription sales
                  if (sale.sale_type === 'Subscription') {
                    // Continue with date filters below
                  }
                  // Include guest sales (Guest Walk In) in "All Plans"
                  else if (sale.sale_type === 'Guest' || sale.guest_name) {
                    // Apply date filters for guest sales
                    // Handle custom date first (highest priority)
                    // Filter by date range
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }
                    return true // Guest sale included in "All Plans"
                  } else {
                    // Not a subscription or guest sale, exclude it
                    return false
                  }
                }

                // For other plans (not "all" and not Day Pass/Gym Session), only show subscription sales
                const isSubscriptionSale = sale.sale_type === 'Subscription'
                if (!isSubscriptionSale) return false

                // Filter by selected plan if not "all"
                if (selectedPlanFilter !== "all") {
                  // First try to match by plan_id from sale object
                  const salePlanId = sale.plan_id?.toString()
                  if (salePlanId === selectedPlanFilter) {
                    // Matches, continue
                  } else {
                    // Try to match by plan name from sale object
                    const salePlanName = sale.plan_name
                    if (selectedPlan && salePlanName === selectedPlan.name) {
                      // Matches by name, continue
                    } else {
                      // No match, exclude this sale
                      return false
                    }
                  }
                }

                // Apply date filters for subscription sales
                // Filter by date range
                if (subscriptionStartDate || subscriptionEndDate) {
                  const saleDate = new Date(sale.sale_date)
                  saleDate.setHours(0, 0, 0, 0)

                  if (subscriptionStartDate) {
                    const startDate = new Date(subscriptionStartDate)
                    startDate.setHours(0, 0, 0, 0)
                    if (saleDate < startDate) return false
                  }

                  if (subscriptionEndDate) {
                    const endDate = new Date(subscriptionEndDate)
                    endDate.setHours(23, 59, 59, 999)
                    if (saleDate > endDate) return false
                  }
                }

                return true
              })

              // Total sales reflects the filtered results (based on status filter)
              const totalSales = filteredSalesForStats.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

              // Calculate monthly subscription sales (plans with duration_months > 0)
              const monthlySales = filteredSalesForStats.filter(sale => {
                const subscriptionDetail = getSubscriptionDetails(sale.id)
                const plan = subscriptionPlans.find(p => p.id.toString() === sale.plan_id?.toString())

                // Check if it's a monthly plan (has duration_months > 0)
                if (plan && plan.duration_months && plan.duration_months > 0) {
                  return true
                }

                // Also check plan name for monthly indicators
                const planName = sale.plan_name || subscriptionDetail?.planName || ''
                if (planName.toLowerCase().includes('monthly') ||
                  planName.toLowerCase().includes('month')) {
                  return true
                }

                return false
              })
              const monthlyTotal = monthlySales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)

              // Check if Day Pass plan is selected
              const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
              const isDayPassPlan = selectedPlan && (
                selectedPlan.name.toLowerCase().includes('day pass') ||
                selectedPlan.name.toLowerCase().includes('daypass') ||
                selectedPlan.name.toLowerCase() === 'day pass'
              )

              // Count active subscriptions from all sales (for context, not filtered by status)
              const activeCount = allSalesForCounts.filter(sale => {
                // If Day Pass sale, always count as active
                if (isDayPassPlan) {
                  const isDayPassSale = sale.sale_type === 'Walk-in' ||
                    sale.sale_type === 'Walkin' ||
                    sale.sale_type === 'Guest' ||
                    sale.sale_type === 'Day Pass' ||
                    sale.guest_name
                  if (isDayPassSale) return true
                }
                // For subscription sales, check subscription details
                const detail = getSubscriptionDetails(sale.id)
                return detail && (detail.daysLeft === null || detail.daysLeft === undefined || detail.daysLeft >= 0)
              }).length

              // Count expired subscriptions from all sales (for context, not filtered by status)
              const expiredCount = allSalesForCounts.filter(sale => {
                // Exclude Day Pass sales from expired count
                if (isDayPassPlan) {
                  const isDayPassSale = sale.sale_type === 'Walk-in' ||
                    sale.sale_type === 'Walkin' ||
                    sale.sale_type === 'Guest' ||
                    sale.sale_type === 'Day Pass' ||
                    sale.guest_name
                  if (isDayPassSale) return false
                }
                const detail = getSubscriptionDetails(sale.id)
                return detail && detail.daysLeft !== null && detail.daysLeft !== undefined && detail.daysLeft < 0
              }).length

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0">
                  <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Total Sales</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
                          <p className="text-xs text-gray-600 mt-1.5">{filteredSalesForStats.length} transaction{filteredSalesForStats.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                          <TrendingUp className="h-5 w-5 text-gray-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Total Transactions</p>
                          <p className="text-2xl font-bold text-gray-900">{filteredSalesForStats.length}</p>
                          <p className="text-xs text-gray-600 mt-1.5">Sales recorded</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                          <FileText className="h-5 w-5 text-gray-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Monthly Sales</p>
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyTotal)}</p>
                          <p className="text-xs text-gray-600 mt-1.5">{monthlySales.length} sale{monthlySales.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                          <CalendarIcon className="h-5 w-5 text-gray-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Subscription Sales Table */}
            {(() => {
              // Check if selected plan is "Day Pass" or "Gym Session" (shared across filter and display)
              const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanFilter)
              const isDayPassPlan = selectedPlan && (
                selectedPlan.name.toLowerCase().includes('day pass') ||
                selectedPlan.name.toLowerCase().includes('daypass') ||
                selectedPlan.name.toLowerCase().includes('walk-in') ||
                selectedPlan.name.toLowerCase().includes('walkin') ||
                selectedPlan.name.toLowerCase().includes('guest') ||
                (selectedPlan.duration_days && selectedPlan.duration_days > 0 && selectedPlan.duration_months === 0) ||
                selectedPlan.name.toLowerCase() === 'day pass'
              ) && !(
                selectedPlan.name.toLowerCase().includes('gym session') ||
                selectedPlan.name.toLowerCase().includes('gymsession')
              )
              const isGymSessionPlan = selectedPlan && (
                selectedPlan.name.toLowerCase().includes('gym session') ||
                selectedPlan.name.toLowerCase().includes('gymsession') ||
                selectedPlan.id === 6 // Plan ID 6 is Gym Session
              ) && !isDayPassPlan

              // Helper function to check if a sale is a Day Pass or Gym Session subscription (user with account)
              const isDayPassSubscription = (sale) => {
                if (sale.sale_type !== 'Subscription') return false

                // Check by plan_id
                if (sale.plan_id && sale.plan_id.toString() === selectedPlanFilter) {
                  return true
                }

                // Check by plan_name
                if (sale.plan_name) {
                  const planNameLower = sale.plan_name.toLowerCase()
                  if (planNameLower.includes('day pass') ||
                    planNameLower.includes('daypass') ||
                    planNameLower.includes('walk-in') ||
                    planNameLower.includes('walkin') ||
                    planNameLower.includes('gym session') ||
                    planNameLower.includes('gymsession')) {
                    return true
                  }
                }

                // Check subscription details for plan name
                const subscriptionDetail = getSubscriptionDetails(sale.id)
                if (subscriptionDetail && subscriptionDetail.planName) {
                  const planNameLower = subscriptionDetail.planName.toLowerCase()
                  if (planNameLower.includes('day pass') ||
                    planNameLower.includes('daypass') ||
                    planNameLower.includes('walk-in') ||
                    planNameLower.includes('walkin') ||
                    planNameLower.includes('gym session') ||
                    planNameLower.includes('gymsession')) {
                    return true
                  }
                }

                // Check if plan has Day Pass/Gym Session characteristics (duration_days > 0, duration_months === 0)
                if (sale.plan_id) {
                  const plan = subscriptionPlans.find(p => p.id.toString() === sale.plan_id.toString())
                  if (plan && plan.duration_days && plan.duration_days > 0 &&
                    (!plan.duration_months || plan.duration_months === 0)) {
                    return true
                  }
                  // Also check if it's a Gym Session plan
                  if (plan && (plan.name.toLowerCase().includes('gym session') || plan.name.toLowerCase().includes('gymsession'))) {
                    return true
                  }
                }

                return false
              }

              // Helper function to check if a sale is a Day Pass guest/walk-in (user without account)
              const isDayPassGuestSale = (sale) => {
                // Check by sale_type first
                if (sale.sale_type === 'Walk-in' ||
                  sale.sale_type === 'Walkin' ||
                  sale.sale_type === 'Guest' ||
                  sale.sale_type === 'Day Pass') {
                  return true
                }

                // Check by guest_name
                if (sale.guest_name) {
                  return true
                }

                // Check by plan_name (Guest Walk In)
                if (sale.plan_name && (
                  sale.plan_name.toLowerCase().includes('guest walk in') ||
                  sale.plan_name.toLowerCase().includes('guest walk-in') ||
                  sale.plan_name.toLowerCase().includes('walk in') ||
                  sale.plan_name.toLowerCase().includes('walk-in')
                )) {
                  return true
                }

                // Check by plan_id = 6 and sale_type = Guest
                if (sale.plan_id === 6 && sale.sale_type === 'Guest') {
                  return true
                }

                return false
              }

              const filteredSales = sales.filter((sale) => {

                // If Day Pass plan is selected, include ALL Day Pass sales (both guest and subscription)
                if (isDayPassPlan) {
                  // Check if this is a Day Pass guest/walk-in sale (user without account)
                  if (isDayPassGuestSale(sale)) {
                    // Apply Day Pass type filter (Subscription vs Guest)
                    if (subscriptionDayPassTypeFilter === "day_pass") {
                      return false // This is a guest sale, not a subscription sale
                    }

                    // Handle custom date first (highest priority)
                    // Filter by date range
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    // Status filter removed - show all sales
                    return true
                  }

                  // Check if this is a Day Pass subscription sale (user with account)
                  if (isDayPassSubscription(sale)) {
                    // Apply Day Pass type filter (Subscription vs Guest)
                    if (subscriptionDayPassTypeFilter === "guest") {
                      return false // This is a subscription sale, not a guest sale
                    }

                    // Handle custom date first (highest priority)
                    // Filter by date range
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    // Status filter removed - show all sales
                    return true
                  }

                  // If Day Pass plan is selected but this sale doesn't match, exclude it
                  return false
                }

                // If Gym Session plan is selected, include ALL Gym Session sales (both guest and subscription)
                if (isGymSessionPlan) {
                  // Check if this is a Gym Session guest sale (user without account)
                  if (isDayPassGuestSale(sale)) {
                    // Apply Gym Session type filter (Subscription vs Guest)
                    if (subscriptionGymSessionTypeFilter === "subscription") {
                      return false // This is a guest sale, not a subscription sale
                    }

                    // Handle custom date first (highest priority)
                    // Filter by date range
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    return true
                  }

                  // Check if this is a Gym Session subscription sale (user with account)
                  if (isDayPassSubscription(sale) || (sale.sale_type === 'Subscription' && sale.plan_id && sale.plan_id.toString() === selectedPlanFilter)) {
                    // Apply Gym Session type filter (Subscription vs Guest)
                    if (subscriptionGymSessionTypeFilter === "guest") {
                      return false // This is a subscription sale, not a guest sale
                    }

                    // Handle custom date first (highest priority)
                    // Filter by date range
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }

                    return true
                  }

                  // If Gym Session plan is selected but this sale doesn't match, exclude it
                  return false
                }

                // For "All Plans", include both subscription sales and guest sales
                if (selectedPlanFilter === "all") {
                  // Include subscription sales
                  if (sale.sale_type === 'Subscription') {
                    // Continue with date filters below
                  }
                  // Include guest sales (Guest Walk In) in "All Plans"
                  else if (sale.sale_type === 'Guest' || sale.guest_name) {
                    // Apply date filters for guest sales
                    // Handle custom date first (highest priority)
                    // Filter by date range
                    if (subscriptionStartDate || subscriptionEndDate) {
                      const saleDate = new Date(sale.sale_date)
                      saleDate.setHours(0, 0, 0, 0)

                      if (subscriptionStartDate) {
                        const startDate = new Date(subscriptionStartDate)
                        startDate.setHours(0, 0, 0, 0)
                        if (saleDate < startDate) return false
                      }

                      if (subscriptionEndDate) {
                        const endDate = new Date(subscriptionEndDate)
                        endDate.setHours(23, 59, 59, 999)
                        if (saleDate > endDate) return false
                      }
                    }
                    return true // Guest sale included in "All Plans"
                  } else {
                    // Not a subscription or guest sale, exclude it
                    return false
                  }
                }

                // For other plans (not "all" and not Day Pass/Gym Session), only show subscription sales
                const isSubscriptionSale = sale.sale_type === 'Subscription'
                if (!isSubscriptionSale) return false

                // Filter by selected plan if not "all"
                if (selectedPlanFilter !== "all") {
                  // First try to match by plan_id from sale object
                  const salePlanId = sale.plan_id?.toString()
                  if (salePlanId === selectedPlanFilter) {
                    // Matches, continue
                  } else {
                    // Try to match by plan name from sale object
                    const salePlanName = sale.plan_name
                    if (selectedPlan && salePlanName === selectedPlan.name) {
                      // Matches by name, continue
                    } else {
                      // No match, exclude this sale
                      return false
                    }
                  }
                }

                // Filter by date range
                if (subscriptionStartDate || subscriptionEndDate) {
                  const saleDate = new Date(sale.sale_date)
                  saleDate.setHours(0, 0, 0, 0)

                  if (subscriptionStartDate) {
                    const startDate = new Date(subscriptionStartDate)
                    startDate.setHours(0, 0, 0, 0)
                    if (saleDate < startDate) return false
                  }

                  if (subscriptionEndDate) {
                    const endDate = new Date(subscriptionEndDate)
                    endDate.setHours(23, 59, 59, 999)
                    if (saleDate > endDate) return false
                  }
                }

                // Status filter removed - show all sales
                return true
              })

              const totalPages = Math.ceil(filteredSales.length / subscriptionItemsPerPage)
              const startIndex = (subscriptionCurrentPage - 1) * subscriptionItemsPerPage
              const endIndex = startIndex + subscriptionItemsPerPage
              const paginatedSales = filteredSales.slice(startIndex, endIndex)

              return (
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                          <TableHead className="font-semibold text-gray-900">Date</TableHead>
                          <TableHead className="font-semibold text-gray-900">Name</TableHead>
                          <TableHead className="font-semibold text-gray-900">Plan</TableHead>
                          <TableHead className="font-semibold text-gray-900">Amount</TableHead>
                          <TableHead className="font-semibold text-gray-900">Payment Method</TableHead>
                          <TableHead className="font-semibold text-gray-900">Receipt #</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSales.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                              <div className="flex flex-col items-center justify-center">
                                <div className="p-3 rounded-full bg-gray-100 mb-3">
                                  <TrendingUp className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-lg font-medium text-gray-600 mb-1">No subscription sales found</p>
                                <p className="text-sm text-gray-500">Try adjusting your filters</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedSales.map((sale) => {
                            // Check if this is a Day Pass guest sale (user without account)
                            const isDayPassGuest = isDayPassGuestSale(sale)

                            // Check if this is a Day Pass subscription sale (user with account)
                            const isDayPassSubscriptionSale = isDayPassSubscription(sale)

                            const subscriptionDetail = getSubscriptionDetails(sale.id)
                            // Always use the actual plan name from the sale data, never override based on filters
                            let planName = sale.plan_name || subscriptionDetail?.planName || 'N/A'

                            // For Guest Walk In sales, show "Session" instead
                            // Check if it's a guest sale (has guest_name) or if plan name indicates guest walk-in
                            const planNameLower = planName.toLowerCase()
                            const isGuestWalkIn = isDayPassGuest ||
                              planNameLower.includes('guest walk in') ||
                              planNameLower.includes('guest walk-in') ||
                              planNameLower.includes('guest walkin') ||
                              planNameLower === 'guest walk in' ||
                              planNameLower === 'guest walk-in' ||
                              planNameLower === 'guest walkin' ||
                              (sale.guest_name && (planNameLower.includes('walk') || planNameLower.includes('guest') || planNameLower.includes('session')))

                            if (isGuestWalkIn) {
                              planName = 'Gym Session'
                            }

                            // Get quantity from sale (now available at sale level from API) or default to 1
                            const quantity = sale.quantity || (sale.sales_details && sale.sales_details.length > 0 ? sale.sales_details[0].quantity : null) || sale.detail_quantity || 1

                            return (
                              <TableRow key={sale.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                                <TableCell className="font-medium text-gray-900 py-3">
                                  {formatDate(sale.sale_date)}
                                </TableCell>
                                <TableCell className="text-gray-700 py-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div>
                                      {isDayPassGuest
                                        ? formatName(sale.guest_name || sale.user_name) || 'Guest'
                                        : isDayPassSubscriptionSale && subscriptionDetail?.userName
                                          ? formatName(subscriptionDetail.userName)
                                          : formatName(sale.user_name) || 'N/A'}
                                    </div>
                                    {isDayPassGuest && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        Guest
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  {planName ? (
                                    <Badge variant="secondary" className="font-medium">
                                      {planName}{quantity > 1 ? ` x${quantity}` : ''}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-semibold text-gray-900 py-3">{formatCurrency(sale.total_amount)}</TableCell>
                                <TableCell className="py-3">
                                  <Badge variant="outline" className="font-medium">
                                    {formatPaymentMethod(sale.payment_method)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-gray-600 font-mono py-3">
                                  {(() => {
                                    const paymentMethod = (sale.payment_method || 'cash').toLowerCase()
                                    // If reference_number exists, it's a GCash payment (even if payment_method is empty/wrong)
                                    if (sale.reference_number) {
                                      return sale.reference_number
                                    }
                                    // Otherwise check payment method
                                    if (paymentMethod === 'gcash' || paymentMethod === 'digital') {
                                      // Check reference_number first, then gcash_reference, then receipt_number
                                      return sale.reference_number || sale.gcash_reference || sale.receipt_number || 'N/A'
                                    }
                                    return sale.receipt_number || 'N/A'
                                  })()}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination Controls */}
                  {filteredSales.length > 0 && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 flex-shrink-0">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredSales.length)} of {filteredSales.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSubscriptionCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={subscriptionCurrentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (subscriptionCurrentPage <= 3) {
                              pageNum = i + 1
                            } else if (subscriptionCurrentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = subscriptionCurrentPage - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={subscriptionCurrentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSubscriptionCurrentPage(pageNum)}
                                className="w-10"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSubscriptionCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={subscriptionCurrentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Sales Dialog */}
      <Dialog open={productSalesDialogOpen} onOpenChange={setProductSalesDialogOpen}>
        <DialogContent className="max-w-[85vw] w-[85vw] max-h-[85vh] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&>button]:hidden border-0 shadow-2xl">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gray-100">
                  <ShoppingCart className="h-5 w-5 text-gray-700" />
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <DialogTitle className="text-xl font-bold text-gray-900">Product Sales Details</DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 mt-1">
                      Comprehensive view of all product sales and transactions
                    </DialogDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Create a helper function to get filtered product sales (same logic as the table)
                      const getFilteredProductSales = () => {
                        return sales.filter((sale) => {
                          // Filter by product sales - sales that have product items OR sale_type is Product
                          const hasProducts = sale.sales_details && sale.sales_details.some(detail => detail.product_id)
                          const isProductSale = sale.sale_type === 'Product'

                          if (!hasProducts && !isProductSale) return false

                          // Filter by search query
                          const matchesSearch = productSalesSearchQuery === "" ||
                            sale.user_name?.toLowerCase().includes(productSalesSearchQuery.toLowerCase()) ||
                            sale.guest_name?.toLowerCase().includes(productSalesSearchQuery.toLowerCase()) ||
                            sale.receipt_number?.toLowerCase().includes(productSalesSearchQuery.toLowerCase()) ||
                            sale.sales_details?.some(detail => {
                              if (!detail.product_id) return false
                              const product = detail.product || products.find(p => p.id === detail.product_id)
                              return product?.name?.toLowerCase().includes(productSalesSearchQuery.toLowerCase())
                            })

                          // Filter by category if selected
                          if (selectedCategoryFilter !== "all") {
                            const hasCategoryMatch = sale.sales_details?.some(detail => {
                              if (!detail.product_id) return false
                              const product = detail.product || products.find(p => p.id === detail.product_id)
                              return product?.category === selectedCategoryFilter
                            })
                            if (!hasCategoryMatch) return false
                          }

                          // Filter by product if selected
                          if (selectedProductFilter !== "all") {
                            const hasProductMatch = sale.sales_details?.some(detail =>
                              detail.product_id && detail.product_id.toString() === selectedProductFilter
                            )
                            if (!hasProductMatch) return false
                          }

                          // Filter by date range
                          if (productSalesStartDate || productSalesEndDate) {
                            const saleDate = new Date(sale.sale_date)
                            saleDate.setHours(0, 0, 0, 0)

                            if (productSalesStartDate) {
                              const startDate = new Date(productSalesStartDate)
                              startDate.setHours(0, 0, 0, 0)
                              if (saleDate < startDate) return false
                            }

                            if (productSalesEndDate) {
                              const endDate = new Date(productSalesEndDate)
                              endDate.setHours(23, 59, 59, 999)
                              if (saleDate > endDate) return false
                            }
                          }

                          return matchesSearch
                        })
                      }

                      // Get filtered sales using the helper function
                      const filteredSales = getFilteredProductSales()

                      // Calculate totals
                      const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
                      const totalItems = filteredSales.reduce((sum, sale) => {
                        if (!sale.sales_details || !Array.isArray(sale.sales_details)) return sum
                        const items = sale.sales_details
                          .filter(d => d.product_id)
                          .reduce((s, d) => s + (parseInt(d.quantity) || 1), 0)
                        return sum + items
                      }, 0)
                      const uniqueProducts = new Set()
                      filteredSales.forEach(sale => {
                        sale.sales_details?.forEach(detail => {
                          if (detail.product_id) {
                            uniqueProducts.add(detail.product_id)
                          }
                        })
                      })

                      // Get date range text
                      let dateRangeText = "All Product Sales"
                      if (productSalesQuickFilter === "today") {
                        dateRangeText = "Today's Product Sales"
                      } else if (productSalesQuickFilter === "thisWeek") {
                        dateRangeText = "This Week's Product Sales"
                      } else if (productSalesQuickFilter === "thisMonth") {
                        dateRangeText = "This Month's Product Sales"
                      } else if (productSalesStartDate && productSalesEndDate) {
                        dateRangeText = `${format(productSalesStartDate, "MMM dd, yyyy")} - ${format(productSalesEndDate, "MMM dd, yyyy")}`
                      } else if (productSalesStartDate) {
                        dateRangeText = `From ${format(productSalesStartDate, "MMM dd, yyyy")}`
                      } else if (productSalesEndDate) {
                        dateRangeText = `Until ${format(productSalesEndDate, "MMM dd, yyyy")}`
                      }

                      // Create print window
                      const printWindow = window.open('', '_blank')
                      const printDate = format(new Date(), "MMM dd, yyyy 'at' hh:mm a")

                      printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Product Sales Report - ${dateRangeText}</title>
                            <style>
                              @media print {
                                @page {
                                  size: A4 landscape;
                                  margin: 1cm;
                                }
                                body {
                                  margin: 0;
                                  padding: 0;
                                }
                              }
                              body {
                                font-family: Arial, sans-serif;
                                padding: 20px;
                                font-size: 12px;
                              }
                              .header {
                                text-align: center;
                                margin-bottom: 20px;
                                border-bottom: 2px solid #000;
                                padding-bottom: 10px;
                              }
                              .header h1 {
                                margin: 0;
                                font-size: 24px;
                                font-weight: bold;
                              }
                              .header p {
                                margin: 5px 0;
                                color: #666;
                              }
                              .summary {
                                display: grid;
                                grid-template-columns: repeat(3, 1fr);
                                gap: 15px;
                                margin-bottom: 20px;
                                padding: 15px;
                                background: #f5f5f5;
                                border-radius: 5px;
                              }
                              .summary-card {
                                text-align: center;
                                padding: 10px;
                                background: white;
                                border-radius: 5px;
                                border: 1px solid #ddd;
                              }
                              .summary-card h3 {
                                margin: 0 0 5px 0;
                                font-size: 11px;
                                color: #666;
                                text-transform: uppercase;
                              }
                              .summary-card p {
                                margin: 0;
                                font-size: 18px;
                                font-weight: bold;
                                color: #000;
                              }
                              table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 10px;
                              }
                              th, td {
                                border: 1px solid #ddd;
                                padding: 8px;
                                text-align: left;
                              }
                              th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                                font-size: 11px;
                                text-transform: uppercase;
                              }
                              td {
                                font-size: 11px;
                              }
                              .text-right {
                                text-align: right;
                              }
                              .footer {
                                margin-top: 20px;
                                padding-top: 10px;
                                border-top: 1px solid #ddd;
                                text-align: center;
                                font-size: 10px;
                                color: #666;
                              }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <h1>CNERGY GYM - PRODUCT SALES REPORT</h1>
                              <p>${dateRangeText}</p>
                              <p>Generated on ${printDate}</p>
                            </div>
                            
                            <div class="summary">
                              <div class="summary-card">
                                <h3>Total Sales</h3>
                                <p>${formatCurrency(totalSales)}</p>
                                <p style="font-size: 10px; color: #666; margin-top: 3px;">${filteredSales.length} transaction${filteredSales.length !== 1 ? 's' : ''}</p>
                              </div>
                              <div class="summary-card">
                                <h3>Items Sold</h3>
                                <p>${totalItems.toLocaleString()}</p>
                                <p style="font-size: 10px; color: #666; margin-top: 3px;">total items</p>
                              </div>
                              <div class="summary-card">
                                <h3>Unique Products</h3>
                                <p>${uniqueProducts.size}</p>
                                <p style="font-size: 10px; color: #666; margin-top: 3px;">products sold</p>
                              </div>
                            </div>

                            <table>
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Product</th>
                                  <th>Quantity</th>
                                  <th>Customer</th>
                                  <th>Payment</th>
                                  <th>Receipt</th>
                                  <th>Date</th>
                                  <th class="text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${filteredSales.length === 0 ? `
                                  <tr>
                                    <td colspan="8" style="text-align: center; padding: 20px;">
                                      No product sales found matching the selected filters.
                                    </td>
                                  </tr>
                                ` : filteredSales.flatMap((sale, saleIndex) => {
                        // Flatten sales details into individual rows
                        const productDetails = sale.sales_details?.filter(d => d.product_id) || []

                        if (productDetails.length === 0) {
                          // If no sales_details, show the sale as a single row
                          return [{
                            productName: sale.sale_type || "Product",
                            quantity: sale.quantity || 1,
                            sale: sale,
                            index: saleIndex
                          }]
                        }

                        return productDetails.map((detail, detailIndex) => ({
                          productName: detail.product?.name || products.find(p => p.id === detail.product_id)?.name || "Unknown Product",
                          quantity: detail.quantity || sale.quantity || 1,
                          sale: sale,
                          index: saleIndex * 1000 + detailIndex // Unique index for flattened rows
                        }))
                      }).map((item, index) => {
                        const customerName = item.sale.sale_type === "Product"
                          ? (formatName(item.sale.user_name) || formatName(item.sale.guest_name) || "Guest")
                          : (formatName(item.sale.user_name) || "N/A")

                        const paymentMethod = formatPaymentMethod(item.sale.payment_method)
                        const receiptNumber = (() => {
                          const paymentMethod = (item.sale.payment_method || 'cash').toLowerCase()
                          if (paymentMethod === 'gcash' || paymentMethod === 'digital') {
                            return item.sale.reference_number || item.sale.receipt_number || "N/A"
                          }
                          return item.sale.receipt_number || "N/A"
                        })()

                        const product = products.find(p => p.id === item.sale.sales_details?.find(d => d.product_id === p.id)?.product_id)
                        const unitPrice = product?.price || (item.sale.total_amount / item.quantity) || 0
                        const lineTotal = unitPrice * item.quantity

                        return `
                                    <tr>
                                      <td>${index + 1}</td>
                                      <td>${item.productName}</td>
                                      <td>${item.quantity}</td>
                                      <td>${customerName}</td>
                                      <td>${paymentMethod}</td>
                                      <td>${receiptNumber}</td>
                                      <td>${formatDate(item.sale.sale_date)}</td>
                                      <td class="text-right">${formatCurrency(lineTotal)}</td>
                                    </tr>
                                  `
                      }).join('')}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <th colspan="7" style="text-align: right;">Total:</th>
                                  <th class="text-right">${formatCurrency(totalSales)}</th>
                                </tr>
                              </tfoot>
                            </table>

                            <div class="footer">
                              <p>This is a computer-generated report. CNERGY GYM Sales Management System.</p>
                            </div>
                          </body>
                        </html>
                      `)

                      printWindow.document.close()
                      setTimeout(() => {
                        printWindow.print()
                      }, 250)
                    }}
                    className="h-9 px-3 text-sm"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setProductSalesDialogOpen(false)}
                className="h-8 w-8 rounded-md hover:bg-gray-100 text-gray-500"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col px-6 pt-4 pb-6 space-y-4">
            {/* Quick Access Filters */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className="text-sm font-medium text-gray-700 mr-2">Quick Access:</span>
              <Button
                variant={productSalesQuickFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setProductSalesQuickFilter("all")
                  setProductSalesStartDate(null)
                  setProductSalesEndDate(null)
                }}
                className={`h-8 text-xs ${productSalesQuickFilter === "all" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                All Sales
              </Button>
              <Button
                variant={productSalesQuickFilter === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setProductSalesQuickFilter("today")
                  const todayPH = getTodayInPHTime()
                  const todayDate = new Date(todayPH + "T00:00:00")
                  setProductSalesStartDate(todayDate)
                  setProductSalesEndDate(todayDate)
                }}
                className={`h-8 text-xs ${productSalesQuickFilter === "today" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                Today
              </Button>
              <Button
                variant={productSalesQuickFilter === "thisWeek" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setProductSalesQuickFilter("thisWeek")
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const today = new Date(phTime)
                  today.setHours(0, 0, 0, 0)
                  const dayOfWeek = today.getDay()
                  const startOfWeek = new Date(today)
                  startOfWeek.setDate(today.getDate() - dayOfWeek) // Sunday
                  const endOfWeek = new Date(startOfWeek)
                  endOfWeek.setDate(startOfWeek.getDate() + 6) // Saturday
                  endOfWeek.setHours(23, 59, 59, 999)
                  setProductSalesStartDate(startOfWeek)
                  setProductSalesEndDate(endOfWeek)
                }}
                className={`h-8 text-xs ${productSalesQuickFilter === "thisWeek" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                This Week
              </Button>
              <Button
                variant={productSalesQuickFilter === "thisMonth" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setProductSalesQuickFilter("thisMonth")
                  const now = new Date()
                  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
                  const startOfMonth = new Date(phTime.getFullYear(), phTime.getMonth(), 1)
                  startOfMonth.setHours(0, 0, 0, 0)
                  const endOfMonth = new Date(phTime.getFullYear(), phTime.getMonth() + 1, 0)
                  endOfMonth.setHours(23, 59, 59, 999)
                  setProductSalesStartDate(startOfMonth)
                  setProductSalesEndDate(endOfMonth)
                }}
                className={`h-8 text-xs ${productSalesQuickFilter === "thisMonth" ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
              >
                This Month
              </Button>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-3 flex-wrap pb-3 border-b">
              {/* Search */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search products, customers, receipt numbers..."
                  className="pl-10 h-9 text-sm border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  value={productSalesSearchQuery}
                  onChange={(e) => setProductSalesSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {getUniqueCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products
                      .filter(p => selectedCategoryFilter === "all" || p.category === selectedCategoryFilter)
                      .map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* Date Range Picker */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600 whitespace-nowrap">Start Date:</Label>
                    <Input
                      type="date"
                      value={productSalesStartDate ? format(productSalesStartDate, "yyyy-MM-dd") : ""}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        if (selectedDate) {
                          const date = new Date(selectedDate + "T00:00:00")
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          if (date.getTime() <= today.getTime()) {
                            setProductSalesStartDate(date)
                            setProductSalesQuickFilter("all") // Switch to "all" when custom date range is selected
                            // If end date is set and is before start date, clear it
                            if (productSalesEndDate && date > productSalesEndDate) {
                              setProductSalesEndDate(null)
                            }
                          }
                        } else {
                          setProductSalesStartDate(null)
                        }
                      }}
                      className="h-9 text-sm w-[140px] border-gray-300"
                      placeholder="Start date"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600 whitespace-nowrap">End Date:</Label>
                    <Input
                      type="date"
                      value={productSalesEndDate ? format(productSalesEndDate, "yyyy-MM-dd") : ""}
                      min={productSalesStartDate ? format(productSalesStartDate, "yyyy-MM-dd") : undefined}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        if (selectedDate) {
                          const date = new Date(selectedDate + "T00:00:00")
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)

                          if (date.getTime() <= today.getTime()) {
                            // If start date is set and selected date is before it, don't update
                            if (productSalesStartDate && date < productSalesStartDate) {
                              return
                            }
                            setProductSalesEndDate(date)
                            setProductSalesQuickFilter("all") // Switch to "all" when custom date range is selected
                          }
                        } else {
                          setProductSalesEndDate(null)
                        }
                      }}
                      className="h-9 text-sm w-[140px] border-gray-300"
                      placeholder="End date"
                    />
                  </div>
                  {(productSalesStartDate || productSalesEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setProductSalesStartDate(null)
                        setProductSalesEndDate(null)
                      }}
                      className="h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col px-6 pt-5 pb-6 space-y-5">

              {/* Product Sales Summary Cards */}
              {(() => {
                const filteredSales = sales.filter((sale) => {
                  // Filter by product sales - sales that have product items OR sale_type is Product
                  const hasProducts = sale.sales_details && sale.sales_details.some(detail => detail.product_id)
                  const isProductSale = sale.sale_type === 'Product'

                  if (!hasProducts && !isProductSale) return false

                  // Filter by search query
                  const matchesSearch = productSalesSearchQuery === "" ||
                    sale.user_name?.toLowerCase().includes(productSalesSearchQuery.toLowerCase()) ||
                    sale.guest_name?.toLowerCase().includes(productSalesSearchQuery.toLowerCase()) ||
                    sale.receipt_number?.toLowerCase().includes(productSalesSearchQuery.toLowerCase()) ||
                    sale.sales_details?.some(detail => {
                      if (!detail.product_id) return false
                      const product = detail.product || products.find(p => p.id === detail.product_id)
                      return product?.name?.toLowerCase().includes(productSalesSearchQuery.toLowerCase())
                    })

                  // Filter by category if selected
                  if (selectedCategoryFilter !== "all") {
                    const hasCategoryMatch = sale.sales_details?.some(detail => {
                      if (!detail.product_id) return false
                      const product = detail.product || products.find(p => p.id === detail.product_id)
                      return product?.category === selectedCategoryFilter
                    })
                    if (!hasCategoryMatch) return false
                  }

                  // Filter by product if selected
                  if (selectedProductFilter !== "all") {
                    const hasProductMatch = sale.sales_details?.some(detail =>
                      detail.product_id && detail.product_id.toString() === selectedProductFilter
                    )
                    if (!hasProductMatch) return false
                  }

                  // Filter by date range (works for all quick filters and custom range)
                  if (productSalesStartDate || productSalesEndDate) {
                    const saleDate = new Date(sale.sale_date)
                    saleDate.setHours(0, 0, 0, 0)

                    if (productSalesStartDate) {
                      const startDate = new Date(productSalesStartDate)
                      startDate.setHours(0, 0, 0, 0)
                      if (saleDate < startDate) return false
                    }

                    if (productSalesEndDate) {
                      const endDate = new Date(productSalesEndDate)
                      endDate.setHours(23, 59, 59, 999)
                      if (saleDate > endDate) return false
                    }
                  }

                  return matchesSearch
                })

                const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
                const totalItems = filteredSales.reduce((sum, sale) => {
                  if (!sale.sales_details || !Array.isArray(sale.sales_details)) return sum
                  const items = sale.sales_details
                    .filter(d => d.product_id)
                    .reduce((s, d) => s + (parseInt(d.quantity) || 1), 0)
                  return sum + items
                }, 0)
                const uniqueProducts = new Set()
                filteredSales.forEach(sale => {
                  sale.sales_details?.forEach(detail => {
                    if (detail.product_id) {
                      uniqueProducts.add(detail.product_id)
                    }
                  })
                })

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-600 mb-2">Total Sales</p>
                            <p className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(totalSales)}</p>
                            <p className="text-xs text-gray-500">{filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-blue-50 ml-3">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-600 mb-2">Items Sold</p>
                            <p className="text-2xl font-bold text-gray-900 mb-1">{totalItems.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">total items</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-green-50 ml-3">
                            <Package className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-600 mb-2">Products</p>
                            <p className="text-2xl font-bold text-gray-900 mb-1">{uniqueProducts.size}</p>
                            <p className="text-xs text-gray-500">unique products</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-purple-50 ml-3">
                            <Layers className="h-5 w-5 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })()}

              {/* Product Sales Table */}
              {(() => {
                const filteredSales = sales.filter((sale) => {
                  // Filter by product sales - sales that have product items OR sale_type is Product
                  const hasProducts = sale.sales_details && sale.sales_details.some(detail => detail.product_id)
                  const isProductSale = sale.sale_type === 'Product'

                  if (!hasProducts && !isProductSale) return false

                  // Filter by search query
                  const matchesSearch = productSalesSearchQuery === "" ||
                    sale.user_name?.toLowerCase().includes(productSalesSearchQuery.toLowerCase()) ||
                    sale.guest_name?.toLowerCase().includes(productSalesSearchQuery.toLowerCase()) ||
                    sale.receipt_number?.toLowerCase().includes(productSalesSearchQuery.toLowerCase()) ||
                    sale.sales_details?.some(detail => {
                      if (!detail.product_id) return false
                      const product = detail.product || products.find(p => p.id === detail.product_id)
                      return product?.name?.toLowerCase().includes(productSalesSearchQuery.toLowerCase())
                    })

                  // Filter by category if selected
                  if (selectedCategoryFilter !== "all") {
                    const hasCategoryMatch = sale.sales_details?.some(detail => {
                      if (!detail.product_id) return false
                      const product = detail.product || products.find(p => p.id === detail.product_id)
                      return product?.category === selectedCategoryFilter
                    })
                    if (!hasCategoryMatch) return false
                  }

                  // Filter by product if selected
                  if (selectedProductFilter !== "all") {
                    const hasProductMatch = sale.sales_details?.some(detail =>
                      detail.product_id && detail.product_id.toString() === selectedProductFilter
                    )
                    if (!hasProductMatch) return false
                  }

                  // Filter by date range
                  if (productSalesStartDate || productSalesEndDate) {
                    const saleDate = new Date(sale.sale_date)
                    saleDate.setHours(0, 0, 0, 0)

                    if (productSalesStartDate) {
                      const startDate = new Date(productSalesStartDate)
                      startDate.setHours(0, 0, 0, 0)
                      if (saleDate < startDate) return false
                    }

                    if (productSalesEndDate) {
                      const endDate = new Date(productSalesEndDate)
                      endDate.setHours(23, 59, 59, 999)
                      if (saleDate > endDate) return false
                    }
                  }

                  return matchesSearch
                })

                const totalPages = Math.ceil(filteredSales.length / productSalesItemsPerPage)
                const startIndex = (productSalesCurrentPage - 1) * productSalesItemsPerPage
                const endIndex = startIndex + productSalesItemsPerPage
                const paginatedSales = filteredSales.slice(startIndex, endIndex)

                return (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white shadow-sm">
                      <Table>
                        <TableHeader className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
                          <TableRow className="hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-900 text-sm py-3.5 px-5">Date & Time</TableHead>
                            <TableHead className="font-semibold text-gray-900 text-sm py-3.5 px-5">Products</TableHead>
                            <TableHead className="font-semibold text-gray-900 text-sm py-3.5 px-5">Payment</TableHead>
                            <TableHead className="font-semibold text-gray-900 text-sm py-3.5 px-5">Receipt</TableHead>
                            <TableHead className="text-right font-semibold text-gray-900 text-sm py-3.5 px-5">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSales.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-16">
                                <div className="flex flex-col items-center justify-center">
                                  <div className="p-3 rounded-full bg-gray-100 mb-3">
                                    <ShoppingCart className="h-6 w-6 text-gray-400" />
                                  </div>
                                  <p className="text-sm font-semibold text-gray-700 mb-1">No product sales found</p>
                                  <p className="text-xs text-gray-500">Try adjusting your filters or search query</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedSales.map((sale, index) => {
                              // Get product names from sales_details
                              const productDetails = sale.sales_details
                                ?.filter(detail => detail.product_id)
                                .map(detail => {
                                  const productName = detail.product?.name || products.find(p => p.id === detail.product_id)?.name || 'Unknown Product'
                                  const quantity = detail.quantity || 1
                                  return { name: productName, quantity }
                                }) || []

                              return (
                                <TableRow
                                  key={sale.id}
                                  className={`hover:bg-gray-50/80 transition-colors border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                                >
                                  <TableCell className="py-3.5 px-5">
                                    <div className="text-sm font-medium text-gray-900">{formatDate(sale.sale_date)}</div>
                                  </TableCell>
                                  <TableCell className="py-3.5 px-5">
                                    <div className="space-y-1.5">
                                      {productDetails.length > 0 ? (
                                        productDetails.map((detail, idx) => (
                                          <div key={idx} className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-gray-900">
                                              {detail.name}
                                            </span>
                                            {detail.quantity > 1 && (
                                              <Badge variant="outline" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 font-medium">
                                                {detail.quantity}x
                                              </Badge>
                                            )}
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-sm text-gray-500">N/A</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3.5 px-5">
                                    <Badge variant="outline" className="text-xs px-2.5 py-1 font-medium bg-gray-50 text-gray-700 border-gray-200">
                                      {formatPaymentMethod(sale.payment_method)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-3.5 px-5">
                                    <div className="text-xs font-mono font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded inline-block">
                                      {(() => {
                                        const paymentMethod = (sale.payment_method || 'cash').toLowerCase()
                                        if (paymentMethod === 'gcash' || paymentMethod === 'digital') {
                                          return sale.reference_number || sale.receipt_number || "N/A"
                                        }
                                        return sale.receipt_number || "N/A"
                                      })()}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right py-3.5 px-5">
                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(sale.total_amount)}</span>
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    {filteredSales.length > 0 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Showing <span className="font-semibold text-gray-900">{startIndex + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(endIndex, filteredSales.length)}</span> of <span className="font-semibold text-gray-900">{filteredSales.length}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProductSalesCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={productSalesCurrentPage === 1}
                            className="h-9 px-3 text-sm border border-gray-300 hover:bg-gray-50"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum
                              if (totalPages <= 5) {
                                pageNum = i + 1
                              } else if (productSalesCurrentPage <= 3) {
                                pageNum = i + 1
                              } else if (productSalesCurrentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i
                              } else {
                                pageNum = productSalesCurrentPage - 2 + i
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={productSalesCurrentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setProductSalesCurrentPage(pageNum)}
                                  className="h-9 w-9 p-0 text-sm font-medium border border-gray-300"
                                >
                                  {pageNum}
                                </Button>
                              )
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProductSalesCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={productSalesCurrentPage === totalPages}
                            className="h-9 px-3 text-sm border border-gray-300 hover:bg-gray-50"
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Sales
