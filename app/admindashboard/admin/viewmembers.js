"use client"

import { useState, useEffect, useMemo } from "react"
import axios from "axios"
import { formatDateToISO, safeDate, formatDateOnlyPH } from "@/lib/dateUtils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Search,
  Plus,
  Edit,
  User,
  Mail,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Eye,
  EyeOff,
  Ban,
  CalendarDays,
  PowerOff,
  RotateCw,
  RefreshCw,
  AlertTriangle,
  Tag,
  GraduationCap,
  UserCircle,
  X,
  UserPlus,
  FileText,
} from "lucide-react"

// Helper function to generate standard password from user's name
// Format: First2LettersOfFirstName(FirstCap) + First2LettersOfMiddleName(all lowercase, optional) + #2023 + First2LettersOfLastName(lowercase)
// Examples: "Rj Lo Ta" -> "Rjlo#2023ta", "John Doe" (no middle name) -> "Jo#2023do"
const generateStandardPassword = (fname, mname, lname) => {
  // Get first 2 letters of first name: first letter uppercase, second lowercase
  const first = (fname || "").trim()
  const firstNamePart = first.length > 0 
    ? (first.substring(0, 1).toUpperCase() + (first.length > 1 ? first.substring(1, 2).toLowerCase() : ""))
    : ""
  
  // Get first 2 letters of middle name ONLY if it exists: all lowercase (optional)
  const middle = (mname && mname.trim() !== "") ? mname.trim().toLowerCase() : ""
  const middleNamePart = middle.length > 0
    ? middle.substring(0, 2)
    : ""
  
  // Get first 2 letters of last name: all lowercase
  const last = (lname || "").trim()
  const lastNamePart = last.length > 0 
    ? last.substring(0, 2).toLowerCase()
    : ""
  
  // Combine: FirstName2(FirstCap) + MiddleName2(all lowercase, if exists) + #2023 + LastName2(lowercase)
  // If no middle name, middleNamePart will be empty string, so result will be: FirstName2#2023LastName2
  return `${firstNamePart}${middleNamePart}#2023${lastNamePart}`
}

const memberSchema = z.object({
  fname: z.string().min(1, "Required").max(50, "Maximum 50 characters"),
  mname: z.string().max(50, "Maximum 50 characters").optional(),
  lname: z.string().min(1, "Required").max(50, "Maximum 50 characters"),
  email: z.string().email("Invalid email format").max(255, "Maximum 255 characters"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must include uppercase letter")
    .regex(/[0-9]/, "Must include number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must include special character"),
  bday: z.string().min(1, "Required"),
  user_type_id: z.coerce.number().default(4),
  // Gender and account_status removed - not for admin to set
})

const editMemberSchema = z.object({
  fname: z.string().min(1, "Required").max(50, "Maximum 50 characters"),
  mname: z.string().max(50, "Maximum 50 characters").optional(),
  lname: z.string().min(1, "Required").max(50, "Maximum 50 characters"),
  email: z.string().email("Invalid email format").max(255, "Maximum 255 characters"),
  password: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true
      return val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[!@#$%^&*(),.?":{}|<>]/.test(val)
    }, "Must be 8+ characters with uppercase, number, and special character"),
  bday: z.string().min(1, "Required").refine((val) => {
    if (!val || val === "" || val === "0000-00-00") return false
    const date = new Date(val)
    return !isNaN(date.getTime()) && date.getFullYear() > 1900
  }, "Invalid date format"),
  user_type_id: z.coerce.number().default(4),
  // Gender and account_status removed - not for admin to edit
})

const ViewMembers = ({ userId }) => {
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

  // Normalize parent consent file URL (similar to profile photos)
  const normalizeConsentFileUrl = (url) => {
    if (!url || typeof url !== 'string') return undefined

    try {
      // If it's already a full URL with serve_image.php, return as is
      if (url.includes('serve_image.php')) {
        return url
      }

      // If it's a full URL (http/https), return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      }

      // Handle uploads/consents/ path (plural - this is the actual path used)
      if (url.startsWith('uploads/consents/') || url.startsWith('uploads%2Fconsents%2F')) {
        // Normalize the path - replace / with %2F
        const normalizedPath = url.replace(/\//g, '%2F')
        return `https://api.cnergy.site/serve_image.php?path=${normalizedPath}`
      }

      // Handle upload/consents/ path (singular - in case of typo or different path)
      if (url.startsWith('upload/consents/') || url.startsWith('upload%2Fconsents%2F')) {
        const normalizedPath = url.replace(/\//g, '%2F')
        return `https://api.cnergy.site/serve_image.php?path=${normalizedPath}`
      }

      // Handle any uploads/ path (for other files in uploads/)
      if (url.startsWith('uploads/') || url.startsWith('uploads%2F')) {
        const normalizedPath = url.replace(/\//g, '%2F')
        return `https://api.cnergy.site/serve_image.php?path=${normalizedPath}`
      }

      // Handle any upload/ path (singular)
      if (url.startsWith('upload/') || url.startsWith('upload%2F')) {
        const normalizedPath = url.replace(/\//g, '%2F')
        return `https://api.cnergy.site/serve_image.php?path=${normalizedPath}`
      }

      // If it's just a filename (e.g., consent_1764060859_69256ebb19e68.jpeg), assume it's in uploads/consents/
      if (url.match(/^consent_[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|gif|webp|pdf)$/i)) {
        const encodedPath = `uploads%2Fconsents%2F${encodeURIComponent(url)}`
        return `https://api.cnergy.site/serve_image.php?path=${encodedPath}`
      }

      // If it's any other filename, try uploads/consents/ first
      if (url.match(/^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|gif|webp|pdf)$/i)) {
        const encodedPath = `uploads%2Fconsents%2F${encodeURIComponent(url)}`
        return `https://api.cnergy.site/serve_image.php?path=${encodedPath}`
      }

      // Default: encode the entire URL (handles any other path format)
      return `https://api.cnergy.site/serve_image.php?path=${encodeURIComponent(url)}`
    } catch (error) {
      console.error('Error normalizing consent file URL:', error)
      return undefined
    }
  }

  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [discountFilter, setDiscountFilter] = useState("all") // "all", "student", "senior"
  const [sortBy, setSortBy] = useState("newest")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currentView, setCurrentView] = useState("active") // "active" or "archive"
  const [deactivationReasonFilter, setDeactivationReasonFilter] = useState("all") // "all", "account_sharing", "policy_violation", "inappropriate_behavior"
  const [userRole, setUserRole] = useState("admin") // Default to admin for admin dashboard
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [deactivationReason, setDeactivationReason] = useState("")
  const [customDeactivationReason, setCustomDeactivationReason] = useState("")
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false)
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [isConsentImageModalOpen, setIsConsentImageModalOpen] = useState(false)
  const [consentImageUrl, setConsentImageUrl] = useState("")
  const [errorDialogData, setErrorDialogData] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showAgeRestrictionModal, setShowAgeRestrictionModal] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [parentConsentFile, setParentConsentFile] = useState(null)
  const [parentConsentPreview, setParentConsentPreview] = useState(null)
  const [calculatedAge, setCalculatedAge] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const membersPerPage = 5
  const { toast } = useToast()
  const showClientToast = (title, description) =>
    toast({
      title,
      description,
      duration: 5000,
    })
  const showClientErrorToast = (description) =>
    toast({
      title: "Error",
      description,
      variant: "destructive",
    })
  const isCardActive = (status, view = "active") => statusFilter === status && currentView === view
  const isAllCardActive = statusFilter === "all" && currentView === "active"
  
  // Discount management states
  const [memberDiscounts, setMemberDiscounts] = useState({}) // { userId: [{ discount_type, is_active, ... }] }
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [discountDialogMember, setDiscountDialogMember] = useState(null)
  const [discountLoading, setDiscountLoading] = useState(false)

  // Subscription assignment states (for Add Client modal)
  const [showSubscriptionAssignment, setShowSubscriptionAssignment] = useState(false)
  const [pendingClientData, setPendingClientData] = useState(null) // Store client data before account creation
  // Subscription assignment states (for Verification/Approval dialog)
  const [showSubscriptionAssignmentInVerification, setShowSubscriptionAssignmentInVerification] = useState(false)
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [subscriptionForm, setSubscriptionForm] = useState({
    selected_plan_ids: [], // Changed to array for multiple selection
    start_date: new Date().toISOString().split("T")[0],
    discount_type: "none",
    amount_paid: "",
    payment_method: "cash",
    amount_received: "",
    gcash_reference: "",
    notes: ""
  })
  // Separate subscription form for verification dialog
  const [verificationSubscriptionForm, setVerificationSubscriptionForm] = useState({
    selected_plan_ids: [],
    start_date: new Date().toISOString().split("T")[0],
    discount_type: "none",
    amount_paid: "",
    payment_method: "cash",
    amount_received: "",
    gcash_reference: "",
    notes: ""
  })
  const [planQuantities, setPlanQuantities] = useState({}) // Object to store quantity per plan: { planId: quantity }
  const [verificationPlanQuantities, setVerificationPlanQuantities] = useState({}) // For verification dialog
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)

  // Discount configuration - load from localStorage (same as monitorsubscription.js)
  const [discountConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gym-discounts')
      if (saved) {
        try {
          const discounts = JSON.parse(saved)
          const config = {}
          discounts.forEach((discount) => {
            let key
            if (discount.name.toLowerCase().includes('regular')) {
              key = 'regular'
            } else if (discount.name.toLowerCase().includes('student')) {
              key = 'student'
            } else if (discount.name.toLowerCase().includes('senior')) {
              key = 'senior'
            } else {
              key = discount.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            }

            config[key] = {
              name: discount.name,
              discount: discount.amount,
            }
          })
          return config
        } catch (e) {
          console.error('Error parsing saved discounts:', e)
        }
      }
    }
    // Fallback to default discounts
    return {
      regular: { name: "Regular Rate", discount: 0 },
      student: { name: "Student Discount", discount: 150 },
      senior: { name: "Senior Discount", discount: 200 }
    }
  })

  // Calculate discounted price using plan-specific amounts
  const calculateDiscountedPrice = (originalPrice, discountType, planId) => {
    // Plan-specific discounts
    if (planId === 2) {
      // Premium plan (ID 2): Student = 149 discount (850 final from 999), Senior = 400 discount (599 final from 999)
      if (discountType === 'student') {
        return Math.max(0, originalPrice - 149)
      } else if (discountType === 'senior') {
        return Math.max(0, originalPrice - 400)
      }
      // For other discount types, use default discount
      const discount = discountConfig[discountType]?.discount || 0
      return Math.max(0, originalPrice - discount)
    } else if (planId === 3) {
      // Standard plan (ID 3): Student = 301 discount (999 final), Senior = 601 discount (699 final)
      if (discountType === 'student') {
        return Math.max(0, originalPrice - 301)
      } else if (discountType === 'senior') {
        return Math.max(0, originalPrice - 601)
      }
    }
    
    // For other plans (5), use default discounts
    const discount = discountConfig[discountType]?.discount || 0
    return Math.max(0, originalPrice - discount)
  }

  const form = useForm({
    resolver: zodResolver(memberSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      bday: "",
      user_type_id: 4,
    },
  })

  const editForm = useForm({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      bday: "",
      user_type_id: 4,
    },
  })

  // Watch birthday field and calculate age for parent consent requirement
  const watchedBday = form.watch("bday")
  useEffect(() => {
    if (watchedBday) {
      const today = new Date()
      const birthDate = new Date(watchedBday)
      if (!isNaN(birthDate.getTime())) {
        const age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        const dayDiff = today.getDate() - birthDate.getDate()
        
        let exactAge = age
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          exactAge--
        }
        
        setCalculatedAge(exactAge)
        // Clear consent file if age >= 18
        if (exactAge >= 18) {
          setParentConsentFile(null)
        }
      } else {
        setCalculatedAge(null)
        setParentConsentFile(null)
      }
    } else {
      setCalculatedAge(null)
      setParentConsentFile(null)
    }
  }, [watchedBday])

  // Gender mapping
  const genderOptions = [
    { id: "1", name: "Male" },
    { id: "2", name: "Female" },
  ]

  // Account status options
  const statusOptions = [
    { value: "pending", label: "Pending", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { value: "approved", label: "Approved", color: "bg-green-50 text-green-700 border-green-200" },
    { value: "rejected", label: "Expired", color: "bg-red-50 text-red-700 border-red-200" },
    { value: "deactivated", label: "Deactivated", color: "bg-gray-50 text-gray-700 border-gray-200" },
  ]
  const getStatusLabel = (status) => statusOptions.find((s) => s.value === status)?.label || status

  const validateEmail = async (email, excludeId = null) => {
    try {
      const response = await fetch("https://api.cnergy.site/member_management.php")
      const existingMembers = await response.json()
      const emailExists = existingMembers.some(
        (member) => member.email.toLowerCase() === email.toLowerCase() && (excludeId ? member.id !== excludeId : true),
      )
      return !emailExists
    } catch (error) {
      console.error("Error validating email:", error)
      return true // Allow if validation fails
    }
  }

  // Move fetchMembers outside useEffect so it can be called from the refresh button
  const fetchMembers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("https://api.cnergy.site/member_management.php")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setMembers(Array.isArray(data) ? data : [])
      setFilteredMembers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching members:", error)
      showClientErrorToast("Unable to load the client list. Please check your connection and try again.")
      setMembers([])
      setFilteredMembers([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch discount eligibility for a member
  const fetchMemberDiscounts = async (memberId) => {
    try {
      const response = await fetch(`https://api.cnergy.site/user_discount.php?action=get&user_id=${memberId}`)
      if (!response.ok) throw new Error('Failed to fetch discounts')
      const result = await response.json()
      if (result.success) {
        setMemberDiscounts(prev => ({
          ...prev,
          [memberId]: result.data || []
        }))
      }
    } catch (error) {
      console.error('Error fetching member discounts:', error)
    }
  }

  // Fetch discounts for all members
  const fetchAllMemberDiscounts = async () => {
    const memberIds = members.map(m => m.id)
    for (const memberId of memberIds) {
      await fetchMemberDiscounts(memberId)
    }
  }

  // Get active discount for a member (not expired)
  const getActiveDiscount = (memberId) => {
    const discounts = memberDiscounts[memberId] || []
    if (discounts.length === 0) {
      return null
    }
    
    const now = new Date()
    
    const activeDiscount = discounts.find(d => {
      // Check if discount is active (handle both number and string formats)
      const isActive = d.is_active === 1 || d.is_active === true || d.is_active === '1'
      if (!isActive) {
        return false
      }
      
      // If expires_at is null, it's a senior discount (never expires)
      if (!d.expires_at || d.expires_at === null) {
        return true
      }
      
      // Check if expiration date is in the future
      const expiresAt = new Date(d.expires_at)
      return expiresAt >= now
    })
    
    return activeDiscount || null
  }

  // Open discount management dialog
  const handleManageDiscount = async (member) => {
    setDiscountDialogMember(member)
    setIsDiscountDialogOpen(true)
    await fetchMemberDiscounts(member.id)
  }

  // Add discount tag
  const handleAddDiscount = async (discountType, expiresAt = null, notes = null) => {
    if (!discountDialogMember) return
    
    setDiscountLoading(true)
    try {
      const response = await fetch('https://api.cnergy.site/user_discount.php?action=add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: discountDialogMember.id,
          discount_type: discountType,
          verified_by: userId,
          expires_at: expiresAt,
          notes: notes
        })
      })
      
      const result = await response.json()
      if (result.success) {
        const clientName = formatName(`${discountDialogMember.fname} ${discountDialogMember.mname || ''} ${discountDialogMember.lname}`).trim()
        const discountLabel = discountType === "student" ? "Student" : "Senior (55+)"
        showClientToast("Discount applied", `${clientName} now has the ${discountLabel} discount.`)
        await fetchMemberDiscounts(discountDialogMember.id)
        await fetchAllMemberDiscounts() // Refresh all discounts
      } else {
        throw new Error(result.error || 'Failed to add discount')
      }
    } catch (error) {
      showClientErrorToast(error.message || "Failed to add the discount tag")
    } finally {
      setDiscountLoading(false)
    }
  }

  // Remove discount tag
  const handleRemoveDiscount = async (discountId) => {
    if (!discountDialogMember) return
    
    setDiscountLoading(true)
    try {
      const response = await fetch('https://api.cnergy.site/user_discount.php?action=remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_id: discountId,
          user_id: discountDialogMember.id,
          verified_by: userId
        })
      })
      
      const result = await response.json()
      if (result.success) {
        showClientToast("Discount removed", "The discount tag has been removed successfully.")
        await fetchMemberDiscounts(discountDialogMember.id)
        await fetchAllMemberDiscounts() // Refresh all discounts
      } else {
        throw new Error(result.error || 'Failed to remove discount')
      }
    } catch (error) {
      showClientErrorToast(error.message || "Failed to remove the discount tag")
    } finally {
      setDiscountLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
    // Get user role from sessionStorage
    if (typeof window !== 'undefined') {
      const role = sessionStorage.getItem('user_role') || 'admin'
      setUserRole(role)
      
      // Check for navigation parameters from home page
      const navParams = localStorage.getItem('adminNavParams')
      if (navParams) {
        try {
          const params = JSON.parse(navParams)
          if (params.filter) {
            setStatusFilter(params.filter === 'all' ? 'all' : 'approved')
          }
          // Clear the navigation params after using them
          localStorage.removeItem('adminNavParams')
          localStorage.removeItem('adminNavTarget')
        } catch (e) {
          console.error('Error parsing nav params:', e)
        }
      }
    }
  }, [toast])

  // Fetch discounts when members are loaded
  useEffect(() => {
    if (members.length > 0) {
      fetchAllMemberDiscounts()
    }
  }, [members.length])

  // Also fetch discounts when members array changes (not just length)
  useEffect(() => {
    if (members.length > 0 && Object.keys(memberDiscounts).length === 0) {
      fetchAllMemberDiscounts()
    }
  }, [members])

  // Reset deactivation reason filter when switching away from archive tab
  useEffect(() => {
    if (currentView !== "archive") {
      setDeactivationReasonFilter("all")
    }
  }, [currentView])

  useEffect(() => {
    let filtered = members

    console.log("Filtering members - currentView:", currentView)
    console.log("All members before filtering:", members.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))

    // Filter by current view (active vs archive)
    if (currentView === "active") {
      // In active view, exclude deactivated accounts
      filtered = filtered.filter((member) => member.account_status !== "deactivated")
      
      // By default, exclude rejected accounts unless statusFilter is specifically set to "rejected"
      // This ensures only approved clients are shown in the active view by default
      if (statusFilter === "all" || statusFilter === "") {
        // When showing "all" status, only show approved clients (not rejected)
        filtered = filtered.filter((member) => member.account_status === "approved")
      } else if (statusFilter === "rejected") {
        // Only show rejected when explicitly filtered
        filtered = filtered.filter((member) => member.account_status === "rejected")
      } else if (statusFilter !== "all") {
        // For other status filters (pending, approved), show only that status
        filtered = filtered.filter((member) => member.account_status === statusFilter)
      }
      console.log("Active members after filtering:", filtered.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))
    } else if (currentView === "archive") {
      filtered = filtered.filter((member) => member.account_status === "deactivated")
      console.log("Archived members after filtering:", filtered.map(m => ({ id: m.id, name: `${m.fname} ${m.lname}`, account_status: m.account_status })))
      
      // Filter by deactivation reason
      if (deactivationReasonFilter !== "all") {
        const reasonMap = {
          "account_sharing": "Account Sharing - Client allowed unauthorized use of their account",
          "policy_violation": "Policy/Rules Violation - Client violated gym policies/rules",
          "inappropriate_behavior": "Inappropriate Behavior - Client engaged in unacceptable conduct"
        }
        
        if (deactivationReasonFilter === "other") {
          // Filter for reasons that don't match any of the predefined ones
          const predefinedReasons = Object.values(reasonMap)
          filtered = filtered.filter((member) => 
            member.deactivation_reason && 
            !predefinedReasons.includes(member.deactivation_reason)
          )
        } else {
          const targetReason = reasonMap[deactivationReasonFilter]
          if (targetReason) {
            filtered = filtered.filter((member) => 
              member.deactivation_reason && member.deactivation_reason === targetReason
            )
          }
        }
      }
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const lowercaseQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (member) =>
          `${member.fname} ${member.lname}`.toLowerCase().includes(lowercaseQuery) ||
          member.email?.toLowerCase().includes(lowercaseQuery),
      )
    }

    // Filter by discount type
    if (discountFilter !== "all") {
      filtered = filtered.filter((member) => {
        const activeDiscount = getActiveDiscount(member.id)
        if (!activeDiscount) {
          return false // No active discount, exclude
        }
        
        const discountType = activeDiscount.discount_type
        
        if (discountFilter === "student") {
          return discountType === "student"
        } else if (discountFilter === "senior") {
          return discountType === "senior"
        }
        
        return false
      })
    }

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter((member) => {
        if (!member.created_at) return false
        const createdDate = safeDate(member.created_at)
        if (!createdDate) return false

        const memberDate = new Date(createdDate)
        memberDate.setHours(0, 0, 0, 0)

        let matchesStart = true
        let matchesEnd = true

        if (startDate) {
          const filterStartDate = new Date(startDate)
          filterStartDate.setHours(0, 0, 0, 0)
          matchesStart = memberDate >= filterStartDate
        }

        if (endDate) {
          const filterEndDate = new Date(endDate)
          filterEndDate.setHours(0, 0, 0, 0)
          matchesEnd = memberDate <= filterEndDate
        }

        return matchesStart && matchesEnd
      })
    }

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (b.id || 0) - (a.id || 0) // Higher ID first (newest)
        case "oldest":
          return (a.id || 0) - (b.id || 0) // Lower ID first (oldest)
        case "name_asc":
          return `${a.fname} ${a.lname}`.localeCompare(`${b.fname} ${b.lname}`) // A-Z
        case "name_desc":
          return `${b.fname} ${b.lname}`.localeCompare(`${a.fname} ${a.lname}`) // Z-A
        case "email_asc":
          return (a.email || "").localeCompare(b.email || "") // A-Z
        case "email_desc":
          return (b.email || "").localeCompare(a.email || "") // Z-A
        default:
          return (b.id || 0) - (a.id || 0) // Default to newest
      }
    })

    setFilteredMembers(filtered)
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, discountFilter, sortBy, startDate, endDate, members, currentView, memberDiscounts, deactivationReasonFilter])

  // Filtered members for card counts - respects date range, search, and discount filters but NOT status/view filters
  const membersForCardCounts = useMemo(() => {
    let filtered = [...members]

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const lowercaseQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (member) =>
          `${member.fname} ${member.lname}`.toLowerCase().includes(lowercaseQuery) ||
          member.email?.toLowerCase().includes(lowercaseQuery),
      )
    }

    // Filter by discount type
    if (discountFilter !== "all") {
      filtered = filtered.filter((member) => {
        const activeDiscount = getActiveDiscount(member.id)
        if (!activeDiscount) {
          return false
        }
        
        const discountType = activeDiscount.discount_type
        
        if (discountFilter === "student") {
          return discountType === "student"
        } else if (discountFilter === "senior") {
          return discountType === "senior"
        }
        
        return false
      })
    }

    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter((member) => {
        if (!member.created_at) return false
        const createdDate = safeDate(member.created_at)
        if (!createdDate) return false

        const memberDate = new Date(createdDate)
        memberDate.setHours(0, 0, 0, 0)

        let matchesStart = true
        let matchesEnd = true

        if (startDate) {
          const filterStartDate = new Date(startDate)
          filterStartDate.setHours(0, 0, 0, 0)
          matchesStart = memberDate >= filterStartDate
        }

        if (endDate) {
          const filterEndDate = new Date(endDate)
          filterEndDate.setHours(0, 0, 0, 0)
          matchesEnd = memberDate <= filterEndDate
        }

        return matchesStart && matchesEnd
      })
    }

    return filtered
  }, [members, searchQuery, discountFilter, startDate, endDate, memberDiscounts])

  const indexOfLastMember = currentPage * membersPerPage
  const indexOfFirstMember = indexOfLastMember - membersPerPage
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember)
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage)

  const getGenderName = (genderId) => {
    if (!genderId || genderId === null || genderId === undefined || genderId === '') {
      return null
    }
    const gender = genderOptions.find((g) => g.id === genderId?.toString())
    return gender ? gender.name : null
  }

  const formatName = (name) => {
    if (!name) return ""
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find((s) => s.value === status)
    if (!statusOption) return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Unknown</Badge>

    return (
      <Badge className={`${statusOption.color} font-medium px-2.5 py-1 border`} variant="outline">
        {status === "pending" && <Clock className="w-3 h-3 mr-1.5" />}
        {status === "approved" && <CheckCircle className="w-3 h-3 mr-1.5" />}
        {status === "rejected" && <Clock className="w-3 h-3 mr-1.5" />}
        {status === "deactivated" && <Ban className="w-3 h-3 mr-1.5" />}
        {statusOption.label}
      </Badge>
    )
  }

  const isNewMember = (member) => {
    if (!member.created_at) return false
    const createdDate = safeDate(member.created_at)
    if (!createdDate) return false

    // Get today's date at midnight (00:00:00)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get creation date at midnight (00:00:00)
    const createdDateMidnight = new Date(createdDate)
    createdDateMidnight.setHours(0, 0, 0, 0)

    // Show "NEW" badge only if created on the same calendar day (disappears after midnight)
    return createdDateMidnight.getTime() === today.getTime()
  }

  const handleViewMember = async (member) => {
    setSelectedMember(member)
    setIsViewDialogOpen(true)
    // Fetch discount data for this member
    await fetchMemberDiscounts(member.id)
  }

  const handleEditMember = (member) => {
    setSelectedMember(member)

    // Handle invalid dates properly
    let safeBday = ""
    if (member.bday && member.bday !== "0000-00-00") {
      const date = safeDate(member.bday)
      if (date) {
        safeBday = formatDateToISO(date)
      }
    }

    editForm.reset({
      fname: member.fname || "",
      mname: member.mname || "",
      lname: member.lname || "",
      email: member.email || "",
      password: "",
      bday: safeBday,
      user_type_id: member.user_type_id || 4,
    })
    setIsEditDialogOpen(true)
  }


  const handleVerifyMember = (member) => {
    console.log('🔵 [TRACK] Blue button clicked - Opening verification dialog for member:', member.id, member.fname)
    console.log('🔵 [TRACK] Full member object:', JSON.stringify(member, null, 2))
    console.log('🔵 [TRACK] All member keys:', Object.keys(member))
    console.log('🔵 [TRACK] Parent consent file URL:', member.parent_consent_file_url)
    console.log('🔵 [TRACK] Parent consent file (no _url):', member.parent_consent_file)
    console.log('🔵 [TRACK] Birthday:', member.bday)
    setSelectedMember(member)
    setIsVerificationDialogOpen(true)
  }

  const handleUpdateAccountStatus = async (status) => {
    if (!selectedMember) return
    
    console.log('🔵 [TRACK] Proceed button clicked in verification dialog, status:', status)
    console.log('🔵 [TRACK] Selected member:', selectedMember.id, selectedMember.fname)
    
    // If approving, close verification dialog and open Add Client modal in subscription assignment mode
    if (status === "approved") {
      console.log('🔵 [TRACK] Opening Add Client modal for subscription assignment')
      // Close verification dialog
      setIsVerificationDialogOpen(false)
      
      // Set up the member data as if they were being added as a new client
      // This allows us to reuse the Add Client subscription assignment UI
      setPendingClientData({
        fname: selectedMember.fname,
        mname: selectedMember.mname || '',
        lname: selectedMember.lname,
        email: selectedMember.email,
        password: '', // Not needed for approval flow
        bday: selectedMember.bday,
        user_type_id: selectedMember.user_type_id || 4,
        account_status: "approved",
        failed_attempt: 0,
        staff_id: userId,
        parent_consent_file: null,
        isApprovalFlow: true, // Flag to indicate this is from approval flow
        memberId: selectedMember.id // Store the member ID for approval
      })
      
      // Open Add Client dialog and switch to subscription assignment mode
      setIsAddDialogOpen(true)
      setShowSubscriptionAssignment(true)
      
      // Fetch ALL subscription plans (use 0 to get all plans, same as Add Client flow)
      // During approval, we should be able to assign any plan including member-only plans
      await fetchSubscriptionPlansForUser(0)
      
      // Reset subscription form
      setSubscriptionForm({
        selected_plan_ids: [],
        start_date: new Date().toISOString().split("T")[0],
        discount_type: "none",
        amount_paid: "",
        payment_method: "cash",
        amount_received: "",
        gcash_reference: "",
        notes: ""
      })
      setPlanQuantities({})
      
      // Clear selected member
      setSelectedMember(null)
      return
    }
    
    // For other statuses (rejected, etc.), proceed with normal update
    setIsLoading(true)

    try {
      const response = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedMember.id,
          account_status: status,
          staff_id: userId,
        }),
      })

      const result = await response.json()
      if (response.ok) {
        // Format client name before clearing selectedMember
        const clientName = selectedMember 
          ? formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()
          : "Client"
        
        // Refresh the members list
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)
        setIsVerificationDialogOpen(false)
        setSelectedMember(null)
        
        // Improved toast messages based on status
        const statusLabel = getStatusLabel(status)
        showClientToast("Status updated", `${clientName}'s account is now ${statusLabel}.`)
      } else {
        throw new Error(result.message || "Failed to update account status")
      }
    } catch (error) {
      console.error("Error updating account status:", error)
      showClientErrorToast("Failed to update the account status. Please try again.")
    }
    setIsLoading(false)
  }

  // Handle approval with subscription assignment
  const handleApproveWithSubscription = async () => {
    if (!selectedMember) return
    
    // Validate subscription form
    if (!verificationSubscriptionForm.selected_plan_ids || verificationSubscriptionForm.selected_plan_ids.length === 0 || !verificationSubscriptionForm.amount_paid) {
      toast({
        title: "Error",
        description: "Please select at least one plan and fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    // Validate payment for cash transactions
    if (verificationSubscriptionForm.payment_method === 'cash') {
      const totalAmount = parseFloat(verificationSubscriptionForm.amount_paid || 0)
      const amountReceived = parseFloat(verificationSubscriptionForm.amount_received || 0)
      
      if (!verificationSubscriptionForm.amount_received || amountReceived === 0) {
        toast({
          title: "Error",
          description: "Please enter the amount received.",
          variant: "destructive",
        })
        return
      }
      
      if (amountReceived < totalAmount) {
        toast({
          title: "Error",
          description: `Amount received (₱${amountReceived.toFixed(2)}) is less than total amount (₱${totalAmount.toFixed(2)}).`,
          variant: "destructive",
        })
        return
      }
    }
    
    // Validate GCash reference if payment method is GCash
    if (verificationSubscriptionForm.payment_method === 'gcash' && !verificationSubscriptionForm.gcash_reference) {
      toast({
        title: "Error",
        description: "Please enter the GCash reference number.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // Step 1: Approve the account
      const approveResponse = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedMember.id,
          account_status: "approved",
          staff_id: userId,
        }),
      })

      const approveResult = await approveResponse.json()
      if (!approveResponse.ok) {
        throw new Error(approveResult.message || "Failed to approve account")
      }

      // Step 2: Add discount tag if selected
      if (verificationSubscriptionForm.discount_type && verificationSubscriptionForm.discount_type !== 'none' && verificationSubscriptionForm.discount_type !== 'regular') {
        try {
          const verifiedById = userId ? Number(userId) : null
          if (verifiedById && !isNaN(verifiedById)) {
            const discountResponse = await fetch('https://api.cnergy.site/user_discount.php?action=add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: selectedMember.id,
                discount_type: verificationSubscriptionForm.discount_type,
                verified_by: verifiedById,
                expires_at: null,
                notes: 'Applied during account approval with subscription'
              })
            })
            
            if (discountResponse.ok) {
              const discountData = await discountResponse.json()
              if (!discountData.success) {
                console.warn("Discount tag may not have been added:", discountData.message || "Unknown error")
              }
            }
          }
        } catch (discountError) {
          console.warn("Error adding discount tag:", discountError.message)
          // Continue even if discount fails - subscription creation is more important
        }
      }

      // Step 3: Create subscriptions for each selected plan
      let totalExpectedAmount = 0
      const planDataArray = verificationSubscriptionForm.selected_plan_ids.map((planIdStr) => {
        const planId = parseInt(planIdStr)
        const quantity = verificationPlanQuantities[planIdStr] || 1
        
        const plan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
        let planPrice = parseFloat(plan?.price || 0)
        
        // Apply discount if applicable
        if (verificationSubscriptionForm.discount_type && verificationSubscriptionForm.discount_type !== 'none' && verificationSubscriptionForm.discount_type !== 'regular') {
          if (planId == 2 || planId == 3 || planId == 5) {
            planPrice = calculateDiscountedPrice(planPrice, verificationSubscriptionForm.discount_type, planId)
          }
        }
        
        const planTotalPrice = planPrice * quantity
        totalExpectedAmount += planTotalPrice
        
        return {
          planId,
          planIdStr,
          quantity,
          planTotalPrice
        }
      })
      
      const totalAmountReceived = parseFloat(verificationSubscriptionForm.amount_received || verificationSubscriptionForm.amount_paid || 0)
      const totalChange = Math.max(0, totalAmountReceived - totalExpectedAmount)
      
      const subscriptionPromises = planDataArray.map(async (planData, index) => {
        const { planId, planIdStr, quantity, planTotalPrice } = planData
        
        let amountReceivedForPlan = planTotalPrice
        let changeForPlan = 0
        
        if (verificationSubscriptionForm.payment_method === 'cash') {
          const proportion = planTotalPrice / totalExpectedAmount
          amountReceivedForPlan = totalAmountReceived * proportion
          
          if (index === 0) {
            changeForPlan = totalChange
            amountReceivedForPlan = planTotalPrice + totalChange
          }
        } else {
          amountReceivedForPlan = planTotalPrice
        }
        
        const subscriptionData = {
          user_id: selectedMember.id,
          plan_id: planId,
          start_date: verificationSubscriptionForm.start_date,
          discount_type: verificationSubscriptionForm.discount_type || 'none',
          amount_paid: planTotalPrice.toFixed(2),
          payment_method: verificationSubscriptionForm.payment_method || 'cash',
          amount_received: amountReceivedForPlan.toFixed(2),
          change_given: changeForPlan.toFixed(2),
          reference_number: verificationSubscriptionForm.payment_method === 'gcash' ? (verificationSubscriptionForm.gcash_reference || '') : null,
          notes: verificationSubscriptionForm.notes || '',
          quantity: quantity,
          created_by: 'Admin',
          staff_id: userId,
          transaction_status: 'confirmed'
        }

        return axios.post('https://api.cnergy.site/monitor_subscription.php?action=create_manual', subscriptionData)
      })
      
      const subscriptionResponses = await Promise.all(subscriptionPromises)
      const allSuccess = subscriptionResponses.every(response => response.data && response.data.success)
      
      if (allSuccess) {
        const clientName = formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()
        const planCount = verificationSubscriptionForm.selected_plan_ids.length
        
        // Refresh the members list
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)
        
        // Close dialog and reset states
        setIsVerificationDialogOpen(false)
        setShowSubscriptionAssignmentInVerification(false)
        setSelectedMember(null)
        setVerificationSubscriptionForm({
          selected_plan_ids: [],
          start_date: new Date().toISOString().split("T")[0],
          discount_type: "none",
          amount_paid: "",
          payment_method: "cash",
          amount_received: "",
          gcash_reference: "",
          notes: ""
        })
        setVerificationPlanQuantities({})
        
        toast({
          title: "Account Approved & Subscription Assigned",
          description: `${clientName}'s account has been approved and ${planCount} ${planCount === 1 ? 'subscription' : 'subscriptions'} assigned successfully!`,
          duration: 5000,
        })
      } else {
        throw new Error("Failed to create one or more subscriptions")
      }
    } catch (error) {
      console.error("Error approving account with subscription:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to approve account and assign subscription. Please try again.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handleAddMember = async (data) => {
    // Validate age before submitting
    let exactAge = null
    if (data.bday) {
      const today = new Date()
      const birthDate = new Date(data.bday)
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()
      
      // Calculate exact age
      exactAge = age
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        exactAge--
      }
      
      if (exactAge < 13) {
        setShowAgeRestrictionModal(true)
        setIsLoading(false)
        return
      }
      
      // Validate consent file for users under 18
      if (exactAge < 18 && !parentConsentFile) {
        toast({
          title: "Parent Consent Required",
          description: "Please upload a parent consent letter/waiver for users under 18 years old.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
    }
    
    // Store client data and switch to subscription assignment mode (don't create account yet)
    const password = generateStandardPassword(data.fname, data.mname, data.lname)
    
    setPendingClientData({
      fname: data.fname.trim(),
      mname: data.mname && data.mname.trim() !== '' ? data.mname.trim() : '',
      lname: data.lname.trim(),
      email: data.email.trim().toLowerCase(),
      password: password,
      bday: data.bday,
      user_type_id: data.user_type_id,
      account_status: "approved", // Admin-added clients are always approved
      failed_attempt: 0,
      staff_id: userId,
      parent_consent_file: parentConsentFile, // Include consent file
    })
    
    // Switch to subscription assignment mode
    setShowSubscriptionAssignment(true)
    
    // Fetch available subscription plans (for a new user, we'll use user_id=0 or fetch all plans)
    await fetchSubscriptionPlansForUser(0) // Use 0 for new user to get all available plans
  }

  // Fetch subscription plans for a user
  const fetchSubscriptionPlansForUser = async (userId) => {
    try {
      // For new users (userId = 0), fetch all plans directly without filtering
      // For existing users, use available-plans endpoint
      let url
      if (userId === 0) {
        // Fetch all plans for new user - use plans endpoint which returns all plans
        url = `https://api.cnergy.site/monitor_subscription.php?action=plans`
      } else {
        url = `https://api.cnergy.site/monitor_subscription.php?action=available-plans&user_id=${userId}`
      }
      
      const response = await axios.get(url)
      if (response.data && response.data.success) {
        const plans = response.data.plans || []
        // For new users, mark ALL plans as available (no filtering)
        // For existing users, use the availability from the API
        const plansWithAvailability = plans.map(plan => ({
          ...plan,
          is_available: userId === 0 ? true : (plan.is_available !== false),
          duration_days: plan.duration_days || null // Ensure duration_days is included
        }))
        setSubscriptionPlans(plansWithAvailability)
      }
    } catch (error) {
      console.error("Error fetching subscription plans:", error)
      toast({
        title: "Error",
        description: "Failed to fetch subscription plans. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle plan selection (toggle) for multiple plans
  const handlePlanToggle = (planId) => {
    const planIdStr = planId.toString()
    console.log('🟢 [TRACK] Plan clicked in Add Client modal - planId:', planId, 'planIdStr:', planIdStr, 'planName:', subscriptionPlans.find(p => p.id.toString() === planIdStr)?.plan_name)
    const plan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
    
    if (!plan) {
      console.error("Plan not found:", planId)
      return
    }
    
    setSubscriptionForm(prev => {
      const currentPlans = prev.selected_plan_ids || []
      console.log('🟢 [TRACK] Current selected plans BEFORE toggle:', currentPlans)
      // Normalize current plans to strings for consistent comparison
      const normalizedPlans = currentPlans.map(id => String(id))
      const isSelected = normalizedPlans.includes(planIdStr)
      console.log('🟢 [TRACK] Normalized plans:', normalizedPlans, 'isSelected:', isSelected)
      
      // Check for mutual exclusivity: Plan 1 (Gym Membership) and Plan 3 (Monthly Access Standard)
      const planIdNum = parseInt(planIdStr)
      if (!isSelected) {
        // If trying to add a plan, check for conflicts
        if (planIdNum === 1) {
          // Trying to add Gym Membership - check if Plan 3 is selected
          if (normalizedPlans.includes('3')) {
            toast({
              title: "Cannot select both plans",
              description: "Gym Membership and Monthly Access (Standard) cannot be selected together. Please deselect Monthly Access (Standard) first.",
              variant: "destructive",
            })
            return prev
          }
        } else if (planIdNum === 3) {
          // Trying to add Monthly Access Standard - check if Plan 1 is selected
          if (normalizedPlans.includes('1')) {
            toast({
              title: "Cannot select both plans",
              description: "Monthly Access (Standard) and Gym Membership cannot be selected together. Please deselect Gym Membership first.",
              variant: "destructive",
            })
            return prev
          }
        }
      }
      
      let newPlans
      if (isSelected) {
        // Remove plan - use normalized plans
        newPlans = normalizedPlans.filter(id => id !== planIdStr)
        
        // If removing Plan 1 (Gym Membership), also remove Plan 2 (Premium) since Premium requires Membership
        if (planIdNum === 1 && newPlans.includes('2')) {
          newPlans = newPlans.filter(id => id !== '2')
          // Also remove quantity for Plan 2
          setPlanQuantities(prevQty => {
            const newQty = { ...prevQty }
            delete newQty[planIdStr]
            delete newQty['2']
            return newQty
          })
        } else {
          // Remove quantity for this plan only
          setPlanQuantities(prevQty => {
            const newQty = { ...prevQty }
            delete newQty[planIdStr]
            return newQty
          })
        }
      } else {
        // Add plan - use normalized plans and ensure no duplicates
        if (!normalizedPlans.includes(planIdStr)) {
          newPlans = [...normalizedPlans, planIdStr]
        } else {
          newPlans = normalizedPlans
        }
        // Set default quantity to 1 for this plan
        setPlanQuantities(prevQty => ({
          ...prevQty,
          [planIdStr]: 1
        }))
      }
      
      // Calculate total price for all selected plans
      // Get current quantities to use in calculation
      let totalPrice = 0
      newPlans.forEach(selectedPlanId => {
        const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
        if (selectedPlan) {
          const basePrice = parseFloat(selectedPlan.price || 0)
          // Use quantity: 1 for newly added plan, or existing quantity from state
          const quantity = (selectedPlanId === planIdStr && !isSelected) ? 1 : (planQuantities[selectedPlanId] || 1)
          
          let pricePerUnit = basePrice
          if (prev.discount_type && prev.discount_type !== 'none' && prev.discount_type !== 'regular') {
            const selectedPlanIdNum = parseInt(selectedPlanId)
            if (selectedPlanIdNum == 2 || selectedPlanIdNum == 3 || selectedPlanIdNum == 5) {
              pricePerUnit = calculateDiscountedPrice(basePrice, prev.discount_type, selectedPlanIdNum)
            }
          }
          
          totalPrice += pricePerUnit * quantity
        }
      })
      
      // Always return a new array reference to ensure React detects the change
      console.log('🟢 [TRACK] New plans AFTER toggle:', newPlans)
      console.log('🟢 [TRACK] Has Gym Membership (1) in newPlans?', newPlans.includes('1'))
      console.log('🟢 [TRACK] Will Premium (2) be unlocked?', planIdStr === '1' ? 'YES - Gym Membership was just added' : 'Check if 1 is in array: ' + newPlans.includes('1'))
      return {
        ...prev,
        selected_plan_ids: [...newPlans], // Create new array reference to trigger re-render
        amount_paid: totalPrice.toFixed(2)
      }
    })
  }

  // Handle quantity change for a specific plan
  const handleQuantityChange = (planId, value) => {
    const quantity = parseInt(value) || 1
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
          if (prev.discount_type && prev.discount_type !== 'none' && prev.discount_type !== 'regular') {
            const selectedPlanIdNum = parseInt(selectedPlanId)
            if (selectedPlanIdNum == 2 || selectedPlanIdNum == 3 || selectedPlanIdNum == 5) {
              pricePerUnit = calculateDiscountedPrice(basePrice, prev.discount_type, selectedPlanIdNum)
            }
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

  // Handle plan selection (toggle) for verification dialog
  const handleVerificationPlanToggle = (planId) => {
    const planIdStr = planId.toString()
    const plan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
    
    if (!plan) {
      console.error("Plan not found:", planId)
      return
    }
    
    setVerificationSubscriptionForm(prev => {
      const currentPlans = prev.selected_plan_ids || []
      const isSelected = currentPlans.includes(planIdStr)
      
      // Check for mutual exclusivity: Plan 1 (Gym Membership) and Plan 3 (Monthly Access Standard)
      const planIdNum = parseInt(planIdStr)
      if (!isSelected) {
        // If trying to add a plan, check for conflicts
        if (planIdNum === 1) {
          // Trying to add Gym Membership - check if Plan 3 is selected
          if (currentPlans.includes('3')) {
            toast({
              title: "Cannot select both plans",
              description: "Gym Membership and Monthly Access (Standard) cannot be selected together. Please deselect Monthly Access (Standard) first.",
              variant: "destructive",
            })
            return prev
          }
        } else if (planIdNum === 3) {
          // Trying to add Monthly Access Standard - check if Plan 1 is selected
          if (currentPlans.includes('1')) {
            toast({
              title: "Cannot select both plans",
              description: "Monthly Access (Standard) and Gym Membership cannot be selected together. Please deselect Gym Membership first.",
              variant: "destructive",
            })
            return prev
          }
        }
      }
      
      let newPlans
      if (isSelected) {
        // Remove plan - ensure we're comparing strings
        newPlans = currentPlans.filter(id => String(id) !== planIdStr).map(id => String(id))
        
        // If removing Plan 1 (Gym Membership), also remove Plan 2 (Premium) since Premium requires Membership
        const hasPlan2 = newPlans.includes('2') || newPlans.some(id => String(id) === '2')
        if (planIdNum === 1 && hasPlan2) {
          newPlans = newPlans.filter(id => String(id) !== '2')
          // Also remove quantity for Plan 2
          setVerificationPlanQuantities(prevQty => {
            const newQty = { ...prevQty }
            delete newQty[planIdStr]
            delete newQty['2']
            return newQty
          })
        } else {
          // Remove quantity for this plan only
          setVerificationPlanQuantities(prevQty => {
            const newQty = { ...prevQty }
            delete newQty[planIdStr]
            return newQty
          })
        }
      } else {
        // Add plan - ensure it's stored as a string
        // Filter out any existing instances and add as string
        const cleanedPlans = currentPlans.map(id => String(id))
        if (!cleanedPlans.includes(planIdStr)) {
          newPlans = [...cleanedPlans, planIdStr]
        } else {
          newPlans = cleanedPlans
        }
        // Set default quantity to 1 for this plan
        setVerificationPlanQuantities(prevQty => ({
          ...prevQty,
          [planIdStr]: 1
        }))
      }
      
      // Calculate total price for all selected plans
      // Use a functional update to get the latest quantities state
      let totalPrice = 0
      const currentQuantities = verificationPlanQuantities
      newPlans.forEach(selectedPlanId => {
        const selectedPlan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
        if (selectedPlan) {
          const basePrice = parseFloat(selectedPlan.price || 0)
          // Use current quantities, or default to 1 for newly added plan
          const quantity = currentQuantities[selectedPlanId] || (selectedPlanId === planIdStr && !isSelected ? 1 : (currentQuantities[selectedPlanId] || 1))
          
          let pricePerUnit = basePrice
          if (prev.discount_type && prev.discount_type !== 'none' && prev.discount_type !== 'regular') {
            const selectedPlanIdNum = parseInt(selectedPlanId)
            if (selectedPlanIdNum == 2 || selectedPlanIdNum == 3 || selectedPlanIdNum == 5) {
              pricePerUnit = calculateDiscountedPrice(basePrice, prev.discount_type, selectedPlanIdNum)
            }
          }
          
          totalPrice += pricePerUnit * quantity
        }
      })
      
      // Return updated state - this will trigger a re-render
      return {
        ...prev,
        selected_plan_ids: newPlans,
        amount_paid: totalPrice.toFixed(2)
      }
      
      return {
        ...prev,
        selected_plan_ids: newPlans,
        amount_paid: totalPrice.toFixed(2)
      }
    })
  }

  // Handle quantity change for verification dialog
  const handleVerificationQuantityChange = (planId, value) => {
    const quantity = parseInt(value) || 1
    const planIdStr = planId.toString()
    
    setVerificationPlanQuantities(prev => ({
      ...prev,
      [planIdStr]: quantity
    }))
    
    setVerificationSubscriptionForm(prev => {
      let totalPrice = 0
      prev.selected_plan_ids.forEach(selectedPlanId => {
        const plan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
        if (plan) {
          const basePrice = parseFloat(plan.price || 0)
          const qty = selectedPlanId === planIdStr ? quantity : (verificationPlanQuantities[selectedPlanId] || 1)
          
          let pricePerUnit = basePrice
          if (prev.discount_type && prev.discount_type !== 'none' && prev.discount_type !== 'regular') {
            const selectedPlanIdNum = parseInt(selectedPlanId)
            if (selectedPlanIdNum == 2 || selectedPlanIdNum == 3 || selectedPlanIdNum == 5) {
              pricePerUnit = calculateDiscountedPrice(basePrice, prev.discount_type, selectedPlanIdNum)
            }
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
  
  // Recalculate total price when discount changes
  const recalculateTotalPrice = () => {
    setSubscriptionForm(prev => {
      let totalPrice = 0
      const currentPlans = prev.selected_plan_ids || []
      currentPlans.forEach(selectedPlanId => {
        const plan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
        if (plan) {
          const basePrice = parseFloat(plan.price || 0)
          const quantity = planQuantities[selectedPlanId] || 1
          
          let pricePerUnit = basePrice
          if (prev.discount_type && prev.discount_type !== 'none' && prev.discount_type !== 'regular') {
            const selectedPlanIdNum = parseInt(selectedPlanId)
            if (selectedPlanIdNum == 2 || selectedPlanIdNum == 3 || selectedPlanIdNum == 5) {
              pricePerUnit = calculateDiscountedPrice(basePrice, prev.discount_type, selectedPlanIdNum)
            }
          }
          
          totalPrice += pricePerUnit * quantity
        }
      })
      
      return {
        ...prev,
        amount_paid: totalPrice.toFixed(2)
      }
    })
  }

  // Handle subscription creation - this will create account AND subscription together
  // OR approve existing account and create subscription (if coming from approval flow)
  const handleCreateSubscription = async () => {
    if (!pendingClientData || !subscriptionForm.selected_plan_ids || subscriptionForm.selected_plan_ids.length === 0 || !subscriptionForm.amount_paid) {
      toast({
        title: "Error",
        description: "Please select at least one plan and fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    // Validate payment for cash transactions
    if (subscriptionForm.payment_method === 'cash') {
      const totalAmount = parseFloat(subscriptionForm.amount_paid || 0)
      const amountReceived = parseFloat(subscriptionForm.amount_received || 0)
      
      if (!subscriptionForm.amount_received || amountReceived === 0) {
        toast({
          title: "Error",
          description: "Please enter the amount received.",
          variant: "destructive",
        })
        return
      }
      
      if (amountReceived < totalAmount) {
        toast({
          title: "Error",
          description: `Amount received (₱${amountReceived.toFixed(2)}) is less than total amount (₱${totalAmount.toFixed(2)}).`,
          variant: "destructive",
        })
        return
      }
    }
    
    // Validate GCash reference if payment method is GCash
    if (subscriptionForm.payment_method === 'gcash' && !subscriptionForm.gcash_reference) {
      toast({
        title: "Error",
        description: "Please enter the GCash reference number.",
        variant: "destructive",
      })
      return
    }

    setSubscriptionLoading(true)
    try {
      let newMemberId
      
      // Check if this is from approval flow (existing member being approved)
      if (pendingClientData.isApprovalFlow && pendingClientData.memberId) {
        // Step 1: Approve the existing account
        const approveResponse = await fetch(`https://api.cnergy.site/member_management.php?id=${pendingClientData.memberId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: pendingClientData.memberId,
            account_status: "approved",
            staff_id: userId,
          }),
        })

        const approveResult = await approveResponse.json()
        if (!approveResponse.ok) {
          throw new Error(approveResult.message || "Failed to approve account")
        }
        
        newMemberId = pendingClientData.memberId
      } else {
        // Step 1: Create the client account (new member)
        // Use FormData if there's a consent file, otherwise use JSON
        let requestBody
        let headers
        
        if (pendingClientData.parent_consent_file) {
          const formData = new FormData()
          Object.keys(pendingClientData).forEach(key => {
            if (key === 'parent_consent_file' || key === 'isApprovalFlow' || key === 'memberId') {
              if (key === 'parent_consent_file') {
                formData.append('parent_consent_file', pendingClientData[key])
              }
              // Skip isApprovalFlow and memberId - these are only for frontend logic
            } else {
              formData.append(key, pendingClientData[key])
            }
          })
          requestBody = formData
          // Don't set Content-Type header - browser will set it with boundary for FormData
          headers = {}
        } else {
          // Remove isApprovalFlow and memberId from the data before sending
          const { isApprovalFlow, memberId, ...clientData } = pendingClientData
          requestBody = JSON.stringify(clientData)
          headers = {
            "Content-Type": "application/json",
          }
        }
        
        const clientResponse = await fetch("https://api.cnergy.site/member_management.php", {
          method: "POST",
          headers: headers,
          body: requestBody,
        })

        if (!clientResponse.ok) {
          let result
          try {
            const contentType = clientResponse.headers.get("content-type")
            if (contentType && contentType.includes("application/json")) {
              result = await clientResponse.json()
            } else {
              const text = await clientResponse.text()
              result = { error: "Server error", message: text || "Failed to create client account" }
            }
          } catch (parseError) {
            result = { 
              error: "Response parse error", 
              message: `Failed to parse server response. Status: ${clientResponse.status}` 
            }
          }
          
          if (clientResponse.status === 409) {
            setErrorDialogData({
              title: result.error || "Duplicate Entry Detected",
              message: result.message || "This client already exists in the system.",
              duplicateType: result.duplicate_type || "unknown",
              existingUser: result.existing_user || null
            })
            setIsErrorDialogOpen(true)
            setSubscriptionLoading(false)
            return
          }
          throw new Error(result.message || result.error || "Failed to create client account")
        }

        let clientResult
        try {
          const contentType = clientResponse.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            clientResult = await clientResponse.json()
          } else {
            const text = await clientResponse.text()
            throw new Error(`Unexpected response format: ${text}`)
          }
        } catch (parseError) {
          throw new Error(`Failed to parse server response: ${parseError.message}`)
        }
        newMemberId = clientResult.member?.id || clientResult.data?.id || null

        if (!newMemberId) {
          throw new Error("Failed to get client ID after account creation")
        }
      }

      // Step 2: Add discount tag if selected
      if (subscriptionForm.discount_type && subscriptionForm.discount_type !== 'none' && subscriptionForm.discount_type !== 'regular') {
        try {
          const verifiedById = userId ? Number(userId) : null
          if (verifiedById && !isNaN(verifiedById)) {
            const discountResponse = await fetch('https://api.cnergy.site/user_discount.php?action=add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: newMemberId,
                discount_type: subscriptionForm.discount_type,
                verified_by: verifiedById,
                expires_at: null,
                notes: pendingClientData.isApprovalFlow 
                  ? 'Applied during account approval with subscription'
                  : 'Applied during account creation with subscription'
              })
            })
            
            // Parse response to check if it was actually successful
            if (discountResponse.ok) {
              const discountData = await discountResponse.json()
              if (!discountData.success) {
                // Only log if there's an actual error in the response
                console.warn("Discount tag may not have been added:", discountData.message || "Unknown error")
              }
            } else {
              // Only log if HTTP status indicates an error
              const errorText = await discountResponse.text()
              console.warn("Discount tag API returned error status:", discountResponse.status, errorText)
            }
          } else {
            // If verifiedById is missing, silently skip (this is expected for new accounts)
            // The discount can be added manually later if needed
          }
        } catch (discountError) {
          // Only log actual network/parsing errors, not expected failures
          if (discountError instanceof TypeError && discountError.message.includes('fetch')) {
            console.warn("Network error adding discount tag:", discountError.message)
          } else {
            console.warn("Error adding discount tag:", discountError.message)
          }
          // Continue even if discount fails - subscription creation is more important
        }
      }

      // Step 3: Create subscriptions for each selected plan
      // First, calculate total expected amount and payment distribution
      let totalExpectedAmount = 0
      const planDataArray = subscriptionForm.selected_plan_ids.map((planIdStr) => {
        const planId = parseInt(planIdStr)
        const quantity = planQuantities[planIdStr] || 1
        
        // Calculate price for this specific plan
        const plan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
        let planPrice = parseFloat(plan?.price || 0)
        
        // Apply discount if applicable
        if (subscriptionForm.discount_type && subscriptionForm.discount_type !== 'none' && subscriptionForm.discount_type !== 'regular') {
          if (planId == 2 || planId == 3 || planId == 5) {
            planPrice = calculateDiscountedPrice(planPrice, subscriptionForm.discount_type, planId)
          }
        }
        
        const planTotalPrice = planPrice * quantity
        totalExpectedAmount += planTotalPrice
        
        return {
          planId,
          planIdStr,
          quantity,
          planTotalPrice
        }
      })
      
      // Calculate total amount received and change
      const totalAmountReceived = parseFloat(subscriptionForm.amount_received || subscriptionForm.amount_paid || 0)
      const totalChange = Math.max(0, totalAmountReceived - totalExpectedAmount)
      
      // Distribute payment proportionally across subscriptions
      // For cash: distribute amount_received proportionally, apply change to first subscription
      // For GCash: each subscription gets its full amount (no change)
      const subscriptionPromises = planDataArray.map(async (planData, index) => {
        const { planId, planIdStr, quantity, planTotalPrice } = planData
        
        // Calculate proportional amount received for this plan
        let amountReceivedForPlan = planTotalPrice
        let changeForPlan = 0
        
        if (subscriptionForm.payment_method === 'cash') {
          // Distribute amount_received proportionally
          const proportion = planTotalPrice / totalExpectedAmount
          amountReceivedForPlan = totalAmountReceived * proportion
          
          // Apply all change to the first subscription
          if (index === 0) {
            changeForPlan = totalChange
            // Adjust amount_received to account for change
            amountReceivedForPlan = planTotalPrice + totalChange
          }
        } else {
          // For GCash, amount received equals amount paid (no change)
          amountReceivedForPlan = planTotalPrice
        }
        
        const subscriptionData = {
          user_id: newMemberId,
          plan_id: planId,
          start_date: subscriptionForm.start_date,
          discount_type: subscriptionForm.discount_type || 'none',
          amount_paid: planTotalPrice.toFixed(2),
          payment_method: subscriptionForm.payment_method || 'cash',
          amount_received: amountReceivedForPlan.toFixed(2),
          change_given: changeForPlan.toFixed(2),
          reference_number: subscriptionForm.payment_method === 'gcash' ? (subscriptionForm.gcash_reference || '') : null,
          notes: subscriptionForm.notes || '',
          quantity: quantity,
          created_by: 'Admin',
          staff_id: userId,
          transaction_status: 'confirmed'
        }

        return axios.post('https://api.cnergy.site/monitor_subscription.php?action=create_manual', subscriptionData)
      })
      
      const subscriptionResponses = await Promise.all(subscriptionPromises)
      
      // Check if all subscriptions were created successfully
      const allSuccess = subscriptionResponses.every(response => response.data && response.data.success)
      
      if (allSuccess) {
        const fullName = `${pendingClientData.fname}${pendingClientData.mname ? ` ${pendingClientData.mname}` : ''} ${pendingClientData.lname}`.trim()
        
        const planCount = subscriptionForm.selected_plan_ids.length
        const planLabel = planCount === 1 ? "subscription" : "subscriptions"
        if (pendingClientData.isApprovalFlow) {
          showClientToast(
            "Account approved",
            `${fullName}'s account is approved and ${planCount} ${planLabel} assigned successfully.`,
          )
        } else {
          showClientToast(
            "Client setup complete",
            `${fullName} has been created and ${planCount} ${planLabel} assigned successfully.`,
          )
        }
        
        // Close modal and reset everything
        setIsAddDialogOpen(false)
        setShowSubscriptionAssignment(false)
        setPendingClientData(null)
        setSubscriptionForm({
          selected_plan_ids: [],
          start_date: new Date().toISOString().split("T")[0],
          discount_type: "none",
          amount_paid: "",
          payment_method: "cash",
          amount_received: "",
          gcash_reference: "",
          notes: ""
        })
        setPlanQuantities({})
        if (!pendingClientData.isApprovalFlow) {
          form.reset()
        }
        
        // Refresh members list
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        const membersArray = Array.isArray(updatedMembers) ? updatedMembers : []
        setMembers(membersArray)
        setFilteredMembers(membersArray)
      } else {
        throw new Error(subscriptionResponse.data.error || "Failed to create subscription")
      }
    } catch (error) {
      console.error("Error creating account and subscription:", error)
      showClientErrorToast(error.response?.data?.error || error.message || "Failed to create the account and subscriptions. Please try again.")
    } finally {
      setSubscriptionLoading(false)
    }
  }

  const handleUpdateMember = async (data) => {
    console.log("handleUpdateMember called with data:", data)
    
    // Validate age before submitting
    if (data.bday) {
      const today = new Date()
      const birthDate = new Date(data.bday)
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()
      
      // Calculate exact age
      let exactAge = age
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        exactAge--
      }
      
      if (exactAge < 13) {
        setShowAgeRestrictionModal(true)
        return
      }
    }
    console.log("selectedMember:", selectedMember)

    if (!selectedMember) {
      console.error("No selected member")
      return
    }

    setIsLoading(true)
    try {
      if (data.email.toLowerCase() !== selectedMember.email.toLowerCase()) {
        const isEmailValid = await validateEmail(data.email, selectedMember.id)
        if (!isEmailValid) {
          toast({
            title: "Error",
            description: "Email address already exists. Please use a different email.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      }

      const updateData = {
        id: selectedMember.id,
        fname: data.fname.trim(),
        mname: data.mname && data.mname.trim() !== '' ? data.mname.trim() : '',
        lname: data.lname.trim(),
        email: data.email.trim().toLowerCase(),
        bday: data.bday,
        user_type_id: data.user_type_id,
        staff_id: userId,
        // Not updating: gender_id, account_status (user settings only)
      }

      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password
      }

      console.log("Sending update request with data:", updateData)

      const response = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      console.log("Update response status:", response.status)
      const result = await response.json()
      console.log("Update response result:", result)

      if (response.ok) {
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
        setFilteredMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
        setIsEditDialogOpen(false)
        setSelectedMember(null)
        showClientToast("Client updated", "Client profile has been updated successfully.")
      } else {
        throw new Error(result.error || result.message || "Failed to update client")
      }
    } catch (error) {
      console.error("Error updating member:", error)
      showClientErrorToast(error.message || "Failed to update the client. Please try again.")
    }
    setIsLoading(false)
  }

  const handleDeactivateMember = (member) => {
    setSelectedMember(member)
    setIsDeactivateDialogOpen(true)
  }

  const handleConfirmDeactivate = async () => {
    if (!selectedMember) return
    
    // Validate reason is provided when deactivating
    if (selectedMember.account_status !== "deactivated") {
      if (!deactivationReason) {
        toast({
          title: "Validation Error",
          description: "Please select a reason for deactivation.",
          variant: "destructive",
        })
        return
      }
      // If "other" is selected, validate custom reason is provided
      if (deactivationReason === "other" && !customDeactivationReason.trim()) {
        toast({
          title: "Validation Error",
          description: "Please specify the deactivation reason.",
          variant: "destructive",
        })
        return
      }
    }
    
    setIsLoading(true)
    try {
      const newStatus = selectedMember.account_status === "deactivated" ? "approved" : "deactivated"
      
      // Prepare the reason text
      let reasonText = ""
      if (newStatus === "deactivated") {
        if (deactivationReason === "other") {
          // Use custom reason text
          reasonText = customDeactivationReason.trim()
        } else {
          // Map reason value to readable text
          const reasonMap = {
            "account_sharing": "Account Sharing - Client allowed unauthorized use of their account",
            "policy_violation": "Policy/Rules Violation - Client violated gym policies/rules",
            "inappropriate_behavior": "Inappropriate Behavior - Client engaged in unacceptable conduct"
          }
          reasonText = reasonMap[deactivationReason] || deactivationReason
        }
      }
      
      const response = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedMember.id,
          account_status: newStatus,
          staff_id: userId,
          deactivation_reason: reasonText || null,
        }),
      })

      const result = await response.json()
      if (response.ok) {
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)
        setIsDeactivateDialogOpen(false)
        setSelectedMember(null)
        // Reset reason fields
        setDeactivationReason("")
        setCustomDeactivationReason("")
        const memberName = formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()
        const reasonDisplay = newStatus === "deactivated" && reasonText ? ` Reason: ${reasonText}` : ""
        toast({
          title: newStatus === "deactivated" ? "Account Deactivated" : "Account Reactivated",
          description: newStatus === "deactivated" 
            ? `${memberName}'s account has been successfully deactivated.${reasonDisplay} They will no longer be able to access the system.`
            : `${memberName}'s account has been successfully reactivated. They can now access the system again.`,
        })
      } else {
        throw new Error(result.message || `Failed to ${newStatus === "deactivated" ? "deactivate" : "reactivate"} account`)
      }
    } catch (error) {
      console.error("Error updating account status:", error)
      toast({
        title: "Error",
        description: `Failed to ${selectedMember.account_status === "deactivated" ? "reactivate" : "deactivate"} account. Please try again.`,
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handleRestoreMember = (member) => {
    setSelectedMember(member)
    setIsRestoreDialogOpen(true)
  }

  const handleConfirmRestore = async () => {
    if (!selectedMember) return
    setIsLoading(true)
    try {
      const response = await fetch(`https://api.cnergy.site/member_management.php?id=${selectedMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedMember.id,
          account_status: "approved",
          staff_id: userId,
        }),
      })

      const result = await response.json()
      if (response.ok) {
        // Format client name before clearing selectedMember
        const clientName = selectedMember 
          ? formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()
          : "Client"
        
        const getResponse = await fetch("https://api.cnergy.site/member_management.php")
        const updatedMembers = await getResponse.json()
        setMembers(updatedMembers)
        setFilteredMembers(updatedMembers)
        setIsRestoreDialogOpen(false)
        setSelectedMember(null)
        toast({
          title: "Account Restored",
          description: `${clientName}'s account has been restored and is now active. They can now access the web and mobile application.`,
          duration: 5000,
        })
      } else {
        throw new Error(result.message || "Failed to restore account")
      }
    } catch (error) {
      console.error("Error restoring member:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to restore account. Please try again.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const handleOpenAddDialog = () => {
    form.reset({
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      bday: "",
      user_type_id: 4,
    })
    setShowPassword(false)
    setIsAddDialogOpen(true)
  }

  // Generate and update password when form values change
  useEffect(() => {
    if (isAddDialogOpen) {
      const currentValues = form.getValues()
      if (currentValues.fname || currentValues.lname) {
        const generatedPassword = generateStandardPassword(
          currentValues.fname || "",
          currentValues.mname || "",
          currentValues.lname || ""
        )
        // Don't trigger validation when auto-updating password - only validate on submit
        form.setValue("password", generatedPassword, { shouldValidate: false, shouldDirty: false })
      }
    }
  }, [isAddDialogOpen, form.watch("fname"), form.watch("mname"), form.watch("lname")])

  return (
    <div className="space-y-6 pb-6">
      {/* Statistics Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl font-bold text-gray-800">
            <div className="p-2 bg-primary/10 rounded-lg mr-3">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Client Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("all")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className={`absolute inset-x-0 top-0 h-1 ${isAllCardActive ? "bg-primary" : "bg-transparent"}`}></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-gray-200 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-gray-900 mb-0.5">
                    {membersForCardCounts.filter((m) => m.account_status === "approved").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Clients</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-orange-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("pending")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className={`absolute inset-x-0 top-0 h-1 ${isCardActive("pending") ? "bg-primary" : "bg-transparent"}`}></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <Clock className="h-4 w-4 text-orange-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-orange-600 mb-0.5">
                    {membersForCardCounts.filter((m) => m.account_status === "pending").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("approved")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className={`absolute inset-x-0 top-0 h-1 ${isCardActive("approved") ? "bg-primary" : "bg-transparent"}`}></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-100 to-green-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <CheckCircle className="h-4 w-4 text-green-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-green-700 mb-0.5">
                    {membersForCardCounts.filter((m) => m.account_status === "approved").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-red-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("rejected")
                setCurrentView("active")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className={`absolute inset-x-0 top-0 h-1 ${isCardActive("rejected") ? "bg-primary" : "bg-transparent"}`}></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-red-100 to-red-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <XCircle className="h-4 w-4 text-red-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-red-700 mb-0.5">
                    {membersForCardCounts.filter((m) => m.account_status === "rejected").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expired</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-slate-50 to-white overflow-hidden group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => {
                setStatusFilter("deactivated")
                setCurrentView("archive")
              }}
            >
              <CardContent className="flex flex-col items-center justify-center p-4 relative">
                <div className={`absolute inset-x-0 top-0 h-1 ${isCardActive("deactivated", "archive") ? "bg-primary" : "bg-transparent"}`}></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-slate-100 rounded-full -mr-10 -mt-10 opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 mb-2 shadow-sm group-hover:scale-105 transition-transform relative z-10">
                  <PowerOff className="h-4 w-4 text-slate-700" />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-2xl font-bold text-slate-700 mb-0.5">
                    {membersForCardCounts.filter((m) => m.account_status === "deactivated").length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deactivated</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center text-xl font-bold text-gray-800 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                Client Account Management
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 ml-11">
                Manage and verify client accounts
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={fetchMembers}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 shadow-md hover:shadow-lg hover:bg-slate-50 transition-all border-slate-300"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setCurrentView(currentView === "active" ? "archive" : "active")}
                className={`h-10 px-4 font-medium transition-all ${
                  currentView === "active" 
                    ? "bg-white text-gray-900 border-2 border-gray-200 hover:bg-gray-50 shadow-sm" 
                    : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {currentView === "active" ? "Active" : "Deactivated"}
              </Button>
              <Button
                onClick={handleOpenAddDialog}
                className="h-10 px-4 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Client
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="flex gap-3 flex-wrap items-center bg-gray-50/50 p-4 rounded-lg border border-gray-200/50">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search clients by name or email..."
                className="pl-10 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {currentView !== "active" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Expired</SelectItem>
              </SelectContent>
            </Select>
            )}
            {currentView === "archive" && (
              <Select value={deactivationReasonFilter} onValueChange={setDeactivationReasonFilter}>
                <SelectTrigger className="w-56 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Filter by reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="account_sharing">Account Sharing</SelectItem>
                  <SelectItem value="policy_violation">Policy/Rules Violation</SelectItem>
                  <SelectItem value="inappropriate_behavior">Inappropriate Behavior</SelectItem>
                  <SelectItem value="other">Other Reasons</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={discountFilter} onValueChange={setDiscountFilter}>
              <SelectTrigger className="w-48 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Filter by discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Discounts</SelectItem>
                <SelectItem value="student">🎓 Student Discount</SelectItem>
                <SelectItem value="senior">👤 Senior (55+) Discount</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
                <SelectItem value="name_desc">Name Z-A</SelectItem>
                <SelectItem value="email_asc">Email A-Z</SelectItem>
                <SelectItem value="email_desc">Email Z-A</SelectItem>
              </SelectContent>
            </Select>
            {/* Date Range Filter */}
            <Label htmlFor="start-date-filter" className="flex items-center gap-2 whitespace-nowrap">
              <CalendarIcon className="h-4 w-4 text-slate-600" />
              Start Date:
            </Label>
            <Input
              type="date"
              id="start-date-filter"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
              max={endDate || undefined}
            />
            <Label htmlFor="end-date-filter" className="flex items-center gap-2 whitespace-nowrap">
              <CalendarIcon className="h-4 w-4 text-slate-600" />
              End Date:
            </Label>
            <Input
              type="date"
              id="end-date-filter"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40 h-11 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                className="h-11 px-3 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading clients...</p>
            </div>
          ) : currentMembers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {currentView === "archive"
                  ? "No deactivated clients found"
                  : statusFilter === "pending"
                  ? "No pending client requests"
                  : statusFilter === "approved"
                  ? "No approved clients found"
                  : statusFilter === "rejected"
                  ? "No rejected clients found"
                  : statusFilter === "all"
                  ? "No clients found"
                  : "No clients found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentView === "archive"
                  ? "There are no deactivated client accounts in the system."
                  : statusFilter === "pending"
                  ? "All client verification requests have been processed. New requests will appear here when clients register."
                  : statusFilter === "approved"
                  ? searchQuery.trim() !== ""
                  ? "No approved clients match your search. Try a different search term."
                  : "There are no approved clients in the system."
                  : statusFilter === "rejected"
                  ? searchQuery.trim() !== ""
                  ? "No expired clients match your search. Try a different search term."
                  : "There are no expired client requests in the system."
                  : statusFilter === "all"
                  ? searchQuery.trim() !== ""
                  ? "No clients match your search. Try a different search term or filter."
                  : "There are no clients in the system."
                  : searchQuery.trim() !== ""
                  ? "No clients match your search. Try a different search term."
                  : "There are no clients in the system."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Name</h3>
              </div>
              {currentMembers.map((member, index) => {
                const initials = `${member.fname?.[0] || ''}${member.lname?.[0] || ''}`.toUpperCase()
                return (
                  <div
                    key={member.id || `member-${index}`}
                    className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-primary/50 hover:shadow-md transition-all duration-200"
                  >
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start p-0 h-auto hover:bg-transparent"
                      onClick={() => handleViewMember(member)}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <Avatar className="flex-shrink-0 w-12 h-12 border-2 border-primary/20">
                          <AvatarImage src={normalizeProfilePhotoUrl(member.profile_photo_url)} alt={`${member.fname} ${member.lname}`} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="font-semibold text-gray-900 truncate">
                              {member.fname} {member.mname} {member.lname}
                            </div>
                            {isNewMember(member) && (
                              <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 font-semibold" variant="default">
                                NEW
                              </Badge>
                            )}
                            {member.account_status === "deactivated" && member.deactivation_reason && (
                              <div className="text-xs text-gray-500 ml-2 pl-2 border-l border-gray-300">
                                <span className="italic whitespace-nowrap">{member.deactivation_reason}</span>
                              </div>
                            )}
                            {(() => {
                              const activeDiscount = getActiveDiscount(member.id)
                              if (activeDiscount) {
                                return (
                                  <Badge 
                                    className={`text-xs px-2 py-1 font-semibold border ${
                                      activeDiscount.discount_type === 'student' 
                                        ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                        : 'bg-purple-100 text-purple-700 border-purple-300'
                                    }`}
                                    variant="outline"
                                  >
                                    {activeDiscount.discount_type === 'student' ? (
                                      <>
                                        <GraduationCap className="h-3 w-3 mr-1 inline" />
                                        Student
                                      </>
                                    ) : (
                                      <>
                                        <UserCircle className="h-3 w-3 mr-1 inline" />
                                        55+
                                      </>
                                    )}
                                  </Badge>
                                )
                              }
                              return null
                            })()}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{member.email}</span>
                          </div>
                          {member.created_at && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <CalendarDays className="h-3 w-3" />
                              <span>Created: {formatDateOnlyPH(member.created_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusBadge(member.account_status)}
                      {member.account_status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVerifyMember(member)}
                          className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Verify Account"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Only show Edit button for approved accounts in the Approved tab */}
                      {member.account_status === "approved" && statusFilter === "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMember(member)}
                          className="h-9 w-9 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Edit Client"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Show Restore button for expired (rejected) accounts in the Expired tab */}
                      {member.account_status === "rejected" && statusFilter === "rejected" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestoreMember(member)}
                          className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Restore Account"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Show Deactivate button only for approved accounts */}
                      {member.account_status === "approved" && statusFilter === "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateMember(member)}
                          className="h-9 w-9 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Deactivate Account"
                        >
                          <PowerOff className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Show Reactivate button for deactivated accounts */}
                      {member.account_status === "deactivated" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivateMember(member)}
                          className="h-9 w-9 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Reactivate Account"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Show Discount Management button for approved accounts */}
                      {member.account_status === "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleManageDiscount(member)}
                          className="h-9 w-9 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Manage Discount Tags"
                        >
                          <Tag className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!isLoading && filteredMembers.length > membersPerPage && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm font-medium text-gray-700">
                Showing <span className="text-primary font-semibold">{indexOfFirstMember + 1}</span> to{" "}
                <span className="text-primary font-semibold">{Math.min(indexOfLastMember, filteredMembers.length)}</span> of{" "}
                <span className="text-primary font-semibold">{filteredMembers.length}</span> clients
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9 border-gray-300 hover:border-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-md border border-gray-200">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 border-gray-300 hover:border-primary hover:bg-primary/10 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Creation Dialog */}
      <Dialog open={isVerificationDialogOpen} onOpenChange={(open) => {
        setIsVerificationDialogOpen(open)
        if (!open) {
          // Reset states when dialog closes
          setShowSubscriptionAssignmentInVerification(false)
          setVerificationSubscriptionForm({
            selected_plan_ids: [],
            start_date: new Date().toISOString().split("T")[0],
            discount_type: "none",
            amount_paid: "",
            payment_method: "cash",
            amount_received: "",
            gcash_reference: "",
            notes: ""
          })
          setVerificationPlanQuantities({})
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              {showSubscriptionAssignmentInVerification ? "Assign Subscription" : "Account Creation"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {showSubscriptionAssignmentInVerification 
                ? "Select discount eligibility and subscription plan to create the user account"
                : "Enter the basic details for the new client account."}
            </DialogDescription>
          </DialogHeader>
          {!showSubscriptionAssignmentInVerification ? (
            selectedMember && (
              <div className="space-y-6 py-4">
                {/* Member Information Display */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {selectedMember.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div className="grid grid-cols-2 gap-6">
                  {getGenderName(selectedMember.gender_id) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Gender</Label>
                      <p className="text-sm text-gray-900">{getGenderName(selectedMember.gender_id)}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Date of Birth
                    </Label>
                    <p className="text-sm text-gray-900">
                      {selectedMember.bday ? formatDateOnlyPH(selectedMember.bday) : "Not provided"}
                    </p>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-sm font-medium">Current Status</Label>
                    <div>
                      {getStatusBadge(selectedMember.account_status)}
                    </div>
                  </div>
                  
                  {/* Parent Consent File - Show if user is under 18 and has consent file */}
                  {(() => {
                    console.log('🔵 [DEBUG] Checking parent consent for member:', selectedMember.id)
                    console.log('🔵 [DEBUG] Birthday:', selectedMember.bday)
                    console.log('🔵 [DEBUG] Parent consent URL:', selectedMember.parent_consent_file_url)
                    
                    if (!selectedMember.bday) {
                      console.log('🔵 [DEBUG] No birthday, returning null')
                      return null
                    }
                    
                    const today = new Date()
                    const birthDate = new Date(selectedMember.bday)
                    const age = today.getFullYear() - birthDate.getFullYear()
                    const monthDiff = today.getMonth() - birthDate.getMonth()
                    const dayDiff = today.getDate() - birthDate.getDate()
                    const exactAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
                    
                    console.log('🔵 [DEBUG] Calculated age:', exactAge)
                    console.log('🔵 [DEBUG] Is under 18?', exactAge < 18)
                    console.log('🔵 [DEBUG] Has consent file?', !!selectedMember.parent_consent_file_url)
                    
                    if (exactAge < 18 && selectedMember.parent_consent_file_url) {
                      const normalizedConsentUrl = normalizeConsentFileUrl(selectedMember.parent_consent_file_url)
                      
                      console.log('🔵 [DEBUG] Rendering parent consent image:', normalizedConsentUrl)
                      console.log('🔵 [DEBUG] Original URL:', selectedMember.parent_consent_file_url)
                      
                      if (!normalizedConsentUrl) {
                        console.log('🔵 [DEBUG] Failed to normalize consent URL')
                        return null
                      }
                      
                      return (
                        <div className="col-span-2 space-y-2 mt-4 pt-4 border-t border-gray-200">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-600" />
                            Parent Consent Document
                          </Label>
                          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-white hover:border-gray-300 transition-colors group shadow-sm">
                            <div className="relative">
                              <img 
                                src={normalizedConsentUrl} 
                                alt="Parent Consent Document" 
                                className="w-full h-auto max-h-[500px] object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                                onClick={() => {
                                  setConsentImageUrl(normalizedConsentUrl)
                                  setIsConsentImageModalOpen(true)
                                }}
                                onError={(e) => {
                                  console.log('🔵 [DEBUG] Image failed to load, URL:', normalizedConsentUrl)
                                  e.target.style.display = 'none'
                                  const errorDiv = e.target.nextElementSibling
                                  if (errorDiv) {
                                    errorDiv.style.display = 'flex'
                                  }
                                }}
                                onLoad={() => console.log('🔵 [DEBUG] Image loaded successfully:', normalizedConsentUrl)}
                              />
                              <div className="hidden flex-col items-center justify-center p-8 text-center text-gray-500 min-h-[200px]">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                <p className="text-sm font-medium mb-2">Unable to load image</p>
                                <a 
                                  href={normalizedConsentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm"
                                >
                                  Try opening in new tab
                                </a>
                              </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <span>Click image to view in full size</span>
                          </p>
                        </div>
                      )
                    }
                    console.log('🔵 [DEBUG] Not showing parent consent - age:', exactAge, 'has file:', !!selectedMember.parent_consent_file_url)
                    return null
                  })()}
                </div>
              </div>
            )
          ) : (
            selectedMember && (
              <div className="space-y-6 py-4">
                {/* User Info Display */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Complete the form below to create the account
                      </p>
                    </div>
                  </div>
                </div>

                {/* Discount Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-blue-600" />
                    <Label className="text-sm font-semibold text-gray-900">Discount Eligibility</Label>
                  </div>
                  <p className="text-xs text-gray-600">
                    Verify the user's ID and select if eligible. Discounts automatically apply to Monthly Access plans.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newDiscount = verificationSubscriptionForm.discount_type === 'student' ? 'none' : 'student'
                        setVerificationSubscriptionForm(prev => {
                          let totalPrice = 0
                          const currentPlans = prev.selected_plan_ids || []
                          currentPlans.forEach(selectedPlanId => {
                            const plan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
                            if (plan) {
                              const basePrice = parseFloat(plan.price || 0)
                              const quantity = verificationPlanQuantities[selectedPlanId] || 1
                              
                              let pricePerUnit = basePrice
                              if (newDiscount !== 'none' && newDiscount !== 'regular') {
                                if (selectedPlanId == 2 || selectedPlanId == 3 || selectedPlanId == 5) {
                                  const selectedPlanIdNum = parseInt(selectedPlanId)
                                  pricePerUnit = calculateDiscountedPrice(basePrice, newDiscount, selectedPlanIdNum)
                                }
                              }
                              
                              totalPrice += pricePerUnit * quantity
                            }
                          })
                          
                          return {
                            ...prev,
                            discount_type: newDiscount,
                            amount_paid: totalPrice.toFixed(2)
                          }
                        })
                      }}
                      className={`h-auto py-4 flex flex-col items-center gap-2 border-2 transition-all ${
                        verificationSubscriptionForm.discount_type === 'student'
                          ? 'border-blue-400 bg-blue-50 hover:bg-blue-100 shadow-md'
                          : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <GraduationCap className={`h-6 w-6 ${verificationSubscriptionForm.discount_type === 'student' ? 'text-blue-700' : 'text-blue-600'}`} />
                      <span className={`font-semibold text-sm ${verificationSubscriptionForm.discount_type === 'student' ? 'text-blue-800' : 'text-blue-700'}`}>Student</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newDiscount = verificationSubscriptionForm.discount_type === 'senior' ? 'none' : 'senior'
                        setVerificationSubscriptionForm(prev => {
                          let totalPrice = 0
                          const currentPlans = prev.selected_plan_ids || []
                          currentPlans.forEach(selectedPlanId => {
                            const plan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
                            if (plan) {
                              const basePrice = parseFloat(plan.price || 0)
                              const quantity = verificationPlanQuantities[selectedPlanId] || 1
                              
                              let pricePerUnit = basePrice
                              if (newDiscount !== 'none' && newDiscount !== 'regular') {
                                if (selectedPlanId == 2 || selectedPlanId == 3 || selectedPlanId == 5) {
                                  const selectedPlanIdNum = parseInt(selectedPlanId)
                                  pricePerUnit = calculateDiscountedPrice(basePrice, newDiscount, selectedPlanIdNum)
                                }
                              }
                              
                              totalPrice += pricePerUnit * quantity
                            }
                          })
                          
                          return {
                            ...prev,
                            discount_type: newDiscount,
                            amount_paid: totalPrice.toFixed(2)
                          }
                        })
                      }}
                      className={`h-auto py-4 flex flex-col items-center gap-2 border-2 transition-all ${
                        verificationSubscriptionForm.discount_type === 'senior'
                          ? 'border-purple-400 bg-purple-50 hover:bg-purple-100 shadow-md'
                          : 'border-purple-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <UserCircle className={`h-6 w-6 ${verificationSubscriptionForm.discount_type === 'senior' ? 'text-purple-700' : 'text-purple-600'}`} />
                      <span className={`font-semibold text-sm ${verificationSubscriptionForm.discount_type === 'senior' ? 'text-purple-800' : 'text-purple-700'}`}>Senior 55+</span>
                    </Button>
                  </div>
                  <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3">
                    <p className="text-xs text-amber-900 leading-relaxed">
                      <strong className="font-semibold">Important:</strong> Only tag users after verifying their ID and eligibility. ID verification must be done outside the system before applying discount tags.
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Plan Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-900">Select Plan(s)</Label>
                  <p className="text-xs text-gray-600">
                    You can select multiple plans to assign to this user
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {subscriptionPlans.map((plan) => {
                      const isAvailable = plan.is_available !== false
                      const planIdStr = plan.id.toString()
                      const selectedPlans = verificationSubscriptionForm.selected_plan_ids || []
                      const isSelected = selectedPlans.includes(planIdStr) || false
                      const quantity = verificationPlanQuantities[planIdStr] || 1
                      
                      const planIdNum = parseInt(planIdStr)
                      const isMutuallyExclusive = 
                        (planIdNum === 1 && (selectedPlans.includes('3') || selectedPlans.includes(3))) ||
                        (planIdNum === 3 && (selectedPlans.includes('1') || selectedPlans.includes(1)))
                      
                      // Premium (Plan ID 2) requires Gym Membership (Plan ID 1)
                      // Check for both string '1' and number 1 to handle any type inconsistencies
                      const hasGymMembership = selectedPlans.includes('1') || selectedPlans.includes(1) || selectedPlans.some(id => String(id) === '1')
                      const requiresMembership = planIdNum === 2 && !hasGymMembership
                      
                      const isDisabled = !isAvailable || (isMutuallyExclusive && !isSelected) || requiresMembership
                      
                      return (
                        <div 
                          key={plan.id}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isSelected 
                              ? 'border-blue-400 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          onClick={(e) => {
                            if (e.target.type === 'number' || e.target.tagName === 'INPUT') {
                              return
                            }
                            if (!isDisabled) {
                              handleVerificationPlanToggle(plan.id)
                            } else if (requiresMembership) {
                              toast({
                                title: "Membership Required",
                                description: "Monthly Access (Premium) requires Gym Membership. Please select Gym Membership first.",
                                variant: "destructive",
                              })
                            } else if (isMutuallyExclusive && !isSelected) {
                              const conflictingPlan = planIdNum === 1 ? 'Monthly Access (Standard)' : 'Gym Membership'
                              toast({
                                title: "Cannot select both plans",
                                description: `${plan.plan_name} cannot be selected with ${conflictingPlan}. Please deselect ${conflictingPlan} first.`,
                                variant: "destructive",
                              })
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <Label className={`text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'} cursor-pointer`}>
                                  {plan.plan_name}
                                </Label>
                                <span className={`text-sm font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                                  ₱{parseFloat(plan.price || 0).toFixed(2)}
                                </span>
                              </div>
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
                                      handleVerificationQuantityChange(plan.id, e.target.value)
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
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Payment Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Payment Details</h3>
                  
                  {/* Detailed Breakdown */}
                  {verificationSubscriptionForm.selected_plan_ids && verificationSubscriptionForm.selected_plan_ids.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Breakdown</h4>
                      <div className="space-y-2.5">
                        {verificationSubscriptionForm.selected_plan_ids.map((planIdStr) => {
                          const plan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
                          if (!plan) return null
                          
                          const quantity = verificationPlanQuantities[planIdStr] || 1
                          const basePrice = parseFloat(plan.price || 0)
                          const planId = parseInt(planIdStr)
                          
                          // Check if discount applies to this plan
                          const discountApplies = (planId === 2 || planId === 3 || planId === 5) && 
                                                 verificationSubscriptionForm.discount_type && 
                                                 verificationSubscriptionForm.discount_type !== 'none' && 
                                                 verificationSubscriptionForm.discount_type !== 'regular'
                          
                          const pricePerUnit = discountApplies ? calculateDiscountedPrice(basePrice, verificationSubscriptionForm.discount_type, planId) : basePrice
                          const discountAmount = discountApplies ? (basePrice - pricePerUnit) : 0
                          const subtotal = basePrice * quantity
                          const discountTotal = discountAmount * quantity
                          const finalPrice = pricePerUnit * quantity
                          
                          return (
                            <div key={planIdStr} className="bg-white border border-gray-200 rounded-md p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">{plan.plan_name}</span>
                                {quantity > 1 && (
                                  <span className="text-xs text-gray-500">× {quantity}</span>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                {quantity > 1 ? (
                                  <>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">Price per unit</span>
                                      <span className="font-medium text-gray-900">₱{basePrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">Subtotal</span>
                                      <span className="font-medium text-gray-900">₱{subtotal.toFixed(2)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Price</span>
                                    <span className="font-medium text-gray-900">₱{basePrice.toFixed(2)}</span>
                                  </div>
                                )}
                                {discountApplies && (
                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                                    <span className="text-green-600">
                                      {verificationSubscriptionForm.discount_type === 'student' ? '🎓 Student' : '👤 Senior'} Discount
                                    </span>
                                    <span className="text-green-600 font-medium">-₱{discountTotal.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                                  <span className="text-xs font-semibold text-gray-700">Total</span>
                                  <span className="text-sm font-bold text-gray-900">₱{finalPrice.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* Total Summary */}
                      <div className="pt-3 border-t-2 border-gray-300 space-y-1.5">
                        {verificationSubscriptionForm.discount_type && verificationSubscriptionForm.discount_type !== 'none' && verificationSubscriptionForm.discount_type !== 'regular' && (
                          (() => {
                            const totalDiscount = verificationSubscriptionForm.selected_plan_ids.reduce((sum, planIdStr) => {
                              const plan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
                              if (!plan) return sum
                              const planId = parseInt(planIdStr)
                              const quantity = verificationPlanQuantities[planIdStr] || 1
                              if (planId === 2 || planId === 3 || planId === 5) {
                                const basePrice = parseFloat(plan.price || 0)
                                const discountedPrice = calculateDiscountedPrice(basePrice, verificationSubscriptionForm.discount_type, planId)
                                const discountAmount = basePrice - discountedPrice
                                return sum + (discountAmount * quantity)
                              }
                              return sum
                            }, 0)
                            
                            if (totalDiscount > 0) {
                              return (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">Discount</span>
                                  <span className="text-green-600 font-semibold">-₱{totalDiscount.toFixed(2)}</span>
                                </div>
                              )
                            }
                            return null
                          })()
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-base font-semibold text-gray-900">Total</span>
                          <span className="text-lg font-bold text-gray-900">₱{parseFloat(verificationSubscriptionForm.amount_paid || 0).toFixed(2)}</span>
                        </div>
                        {/* Payment Summary Section */}
                        {verificationSubscriptionForm.payment_method === "cash" && verificationSubscriptionForm.amount_received && parseFloat(verificationSubscriptionForm.amount_received) > 0 && (
                          <>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-gray-400">
                              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment Summary</span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-sm font-medium text-gray-700">Amount Received</span>
                              <span className="text-sm font-semibold text-gray-900">₱{parseFloat(verificationSubscriptionForm.amount_received || 0).toFixed(2)}</span>
                            </div>
                            {parseFloat(verificationSubscriptionForm.amount_received || 0) > parseFloat(verificationSubscriptionForm.amount_paid || 0) && (
                              <div className="flex items-center justify-between pt-1 pb-1 bg-gray-100 -mx-2 px-2 rounded">
                                <span className="text-sm font-semibold text-gray-900">Change</span>
                                <span className="text-base font-bold text-gray-900">₱{(
                                  Math.max(0, parseFloat(verificationSubscriptionForm.amount_received || 0) - parseFloat(verificationSubscriptionForm.amount_paid || 0))
                                ).toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Total Amount</Label>
                      <Input
                        value={verificationSubscriptionForm.amount_paid || '0.00'}
                        disabled
                        className="h-11 text-sm border border-gray-300 bg-gray-50 text-gray-900 font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Payment Method</Label>
                      <Select 
                        value={verificationSubscriptionForm.payment_method} 
                        onValueChange={(value) => setVerificationSubscriptionForm(prev => ({ 
                          ...prev, 
                          payment_method: value,
                          gcash_reference: value === "cash" ? "" : prev.gcash_reference,
                          amount_received: value === "gcash" ? "" : prev.amount_received
                        }))}
                      >
                        <SelectTrigger className="h-11 text-sm border border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="gcash">GCash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Cash Payment - Amount Received */}
                  {verificationSubscriptionForm.payment_method === "cash" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Amount Received</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={verificationSubscriptionForm.amount_received}
                        onChange={(e) => setVerificationSubscriptionForm(prev => ({ ...prev, amount_received: e.target.value }))}
                        placeholder="0.00"
                        className="h-11 text-sm border border-gray-300"
                      />
                    </div>
                  )}

                  {/* GCash Payment - Reference Number */}
                  {verificationSubscriptionForm.payment_method === "gcash" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Reference Number
                      </Label>
                      <Input
                        type="text"
                        value={verificationSubscriptionForm.gcash_reference}
                        onChange={(e) => setVerificationSubscriptionForm(prev => ({ ...prev, gcash_reference: e.target.value }))}
                        placeholder="Enter transaction reference"
                        className="h-11 text-sm border border-gray-300"
                        required
                      />
                      <p className="text-xs text-gray-500">Required for GCash transactions</p>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          <DialogFooter className="gap-3 pt-4 border-t">
            {!showSubscriptionAssignmentInVerification ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsVerificationDialogOpen(false)}
                  className="h-11 px-6"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleUpdateAccountStatus("approved")} 
                  disabled={isLoading}
                  className="h-11 px-6 bg-black hover:bg-black/90 text-white"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <User className="mr-2 h-4 w-4" />
                  Proceed
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowSubscriptionAssignmentInVerification(false)
                    setVerificationSubscriptionForm({
                      selected_plan_ids: [],
                      start_date: new Date().toISOString().split("T")[0],
                      discount_type: "none",
                      amount_paid: "",
                      payment_method: "cash",
                      amount_received: "",
                      gcash_reference: "",
                      notes: ""
                    })
                    setVerificationPlanQuantities({})
                  }}
                  className="h-11 px-6"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleApproveWithSubscription} 
                  disabled={
                    isLoading || 
                    !verificationSubscriptionForm.selected_plan_ids || 
                    verificationSubscriptionForm.selected_plan_ids.length === 0 || 
                    !verificationSubscriptionForm.amount_paid || 
                    (verificationSubscriptionForm.payment_method === "cash" && (!verificationSubscriptionForm.amount_received || parseFloat(verificationSubscriptionForm.amount_received || 0) < parseFloat(verificationSubscriptionForm.amount_paid || 0))) ||
                    (verificationSubscriptionForm.payment_method === "gcash" && !verificationSubscriptionForm.gcash_reference)
                  }
                  className="h-11 px-6 bg-primary hover:bg-primary/90"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Client Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto" hideClose>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="flex items-center text-2xl font-semibold">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mr-3">
                <User className="h-5 w-5 text-primary" />
              </div>
              Client Details
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              View comprehensive information about this client's account.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-5 py-4">
              {/* Client Information Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={normalizeProfilePhotoUrl(selectedMember?.profile_photo_url)} alt={`${selectedMember?.fname} ${selectedMember?.lname}`} />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedMember.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                  {getGenderName(selectedMember.gender_id) && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</span>
                      <p className="text-sm font-medium text-gray-900">{getGenderName(selectedMember.gender_id)}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedMember.bday ? formatDateOnlyPH(selectedMember.bday) : "Not provided"}
                    </p>
                  </div>
                  {selectedMember.created_at && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Created</span>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateOnlyPH(selectedMember.created_at)}
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Status</span>
                    <div className="mt-1">
                      {getStatusBadge(selectedMember.account_status)}
                    </div>
                  </div>
                  {selectedMember.account_status === "deactivated" && selectedMember.deactivation_reason && (
                    <div className="col-span-2 space-y-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deactivation Reason</span>
                      <div className="mt-1 flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-900">{selectedMember.deactivation_reason}</p>
                      </div>
                    </div>
                  )}
                  {/* Discount Duration */}
                  {(() => {
                    const activeDiscount = getActiveDiscount(selectedMember.id)
                    if (activeDiscount) {
                      const discountType = activeDiscount.discount_type
                      const expiresAt = activeDiscount.expires_at
                      
                      return (
                        <div className="col-span-2 space-y-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount Duration</span>
                          <div className="mt-1 flex items-center gap-2">
                            {discountType === 'student' ? (
                              <Badge className="bg-blue-100 text-blue-700 border border-blue-300 px-3 py-1">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                Student Discount
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-100 text-purple-700 border border-purple-300 px-3 py-1">
                                <UserCircle className="h-3 w-3 mr-1" />
                                Senior (55+) Discount
                              </Badge>
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              {expiresAt 
                                ? `Expires: ${formatDateOnlyPH(expiresAt)}`
                                : 'Permanent (Never expires)'
                              }
                            </span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                  
                  {/* Parent Consent File - Show if user is under 18 and has consent file */}
                  {(() => {
                    if (!selectedMember.bday || !selectedMember.parent_consent_file_url) {
                      return null
                    }
                    
                    const today = new Date()
                    const birthDate = new Date(selectedMember.bday)
                    const age = today.getFullYear() - birthDate.getFullYear()
                    const monthDiff = today.getMonth() - birthDate.getMonth()
                    const dayDiff = today.getDate() - birthDate.getDate()
                    const exactAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
                    
                    if (exactAge < 18 && selectedMember.parent_consent_file_url) {
                      const normalizedConsentUrl = normalizeConsentFileUrl(selectedMember.parent_consent_file_url)
                      
                      if (!normalizedConsentUrl) {
                        return null
                      }
                      
                      return (
                        <div className="col-span-2 space-y-2 mt-4 pt-4 border-t border-gray-200">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-600" />
                            Parent Consent Document
                          </Label>
                          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-white hover:border-gray-300 transition-colors group shadow-sm">
                            <div className="relative">
                              <img 
                                src={normalizedConsentUrl} 
                                alt="Parent Consent Document" 
                                className="w-full h-auto max-h-[500px] object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                                onClick={() => {
                                  setConsentImageUrl(normalizedConsentUrl)
                                  setIsConsentImageModalOpen(true)
                                }}
                                onError={(e) => {
                                  console.log('🔵 [DEBUG] Image failed to load, URL:', normalizedConsentUrl)
                                  e.target.style.display = 'none'
                                  const errorDiv = e.target.nextElementSibling
                                  if (errorDiv) {
                                    errorDiv.style.display = 'flex'
                                  }
                                }}
                                onLoad={() => console.log('🔵 [DEBUG] Image loaded successfully:', normalizedConsentUrl)}
                              />
                              <div className="hidden flex-col items-center justify-center p-8 text-center text-gray-500 min-h-[200px]">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                <p className="text-sm font-medium mb-2">Unable to load image</p>
                                <a 
                                  href={normalizedConsentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm"
                                >
                                  Try opening in new tab
                                </a>
                              </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <span>Click image to view in full size</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsViewDialogOpen(false)}
              className="border-2 border-gray-300 hover:bg-gray-50"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsViewDialogOpen(false)
                if (selectedMember) handleEditMember(selectedMember)
              }}
              disabled={!selectedMember || selectedMember.account_status !== "approved"}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open)
        if (!open) {
          // Reset all states when modal closes
          setShowSubscriptionAssignment(false)
          setPendingClientData(null)
          setSubscriptionForm({
            selected_plan_ids: [],
            start_date: new Date().toISOString().split("T")[0],
            discount_type: "none",
            amount_paid: "",
            payment_method: "cash",
            amount_received: "",
            notes: ""
          })
          setPlanQuantities({})
          form.reset()
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              {showSubscriptionAssignment ? "Assign Subscription" : "Add New Client"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {showSubscriptionAssignment 
                ? "Select discount eligibility and subscription plan to create the user account"
                : "Enter the basic details for the new client account."}
            </DialogDescription>
          </DialogHeader>
          {!showSubscriptionAssignment ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddMember)} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">First Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Middle Name (optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Michael"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="lname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => {
                  // Generate password from form values
                  const formValues = form.watch()
                  const displayValue = field.value || generateStandardPassword(
                    formValues.fname || "",
                    formValues.mname || "",
                    formValues.lname || ""
                  )

                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={displayValue}
                            readOnly
                            className="bg-blue-50 border-blue-200 text-blue-900 cursor-not-allowed h-11 pr-36 font-mono"
                            onFocus={(e) => e.target.blur()}
                            tabIndex={-1}
                            onChange={(e) => {
                              // Always reset to generated password if user tries to change it
                              const generatedPwd = generateStandardPassword(
                                formValues.fname || "",
                                formValues.mname || "",
                                formValues.lname || ""
                              )
                              field.onChange(generatedPwd)
                            }}
                            onBlur={() => {
                              // Ensure value is always set on blur
                              const generatedPwd = generateStandardPassword(
                                formValues.fname || "",
                                formValues.mname || "",
                                formValues.lname || ""
                              )
                              field.onChange(generatedPwd)
                            }}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                              Auto-set
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-transparent"
                              onClick={(e) => {
                                e.preventDefault()
                                setShowPassword(!showPassword)
                              }}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                          </div>
                        </div>
                      </FormControl>
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                        <p className="text-xs text-blue-800 flex items-start gap-2">
                          <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Standard password is automatically set.</strong> The default password meets all security requirements.
                          </span>
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              <FormField
                control={form.control}
                name="bday"
                render={({ field }) => {
                  // Calculate maximum date for minimum age of 13 years
                  const today = new Date()
                  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())
                  const maxDateStr = maxDate.toISOString().split('T')[0]
                  
                  const handleDateChange = (e) => {
                    const selectedDate = e.target.value
                    if (selectedDate) {
                      const birthDate = new Date(selectedDate)
                      const age = today.getFullYear() - birthDate.getFullYear()
                      const monthDiff = today.getMonth() - birthDate.getMonth()
                      const dayDiff = today.getDate() - birthDate.getDate()
                      
                      // Calculate exact age
                      let exactAge = age
                      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                        exactAge--
                      }
                      
                      if (exactAge < 13) {
                        setShowAgeRestrictionModal(true)
                        // Reset the field to empty
                        field.onChange("")
                        setCalculatedAge(null)
                        setParentConsentFile(null)
                        return
                      }
                      
                      // Update calculated age
                      setCalculatedAge(exactAge)
                      // Clear consent file if age >= 18
                      if (exactAge >= 18) {
                        setParentConsentFile(null)
                      }
                    } else {
                      setCalculatedAge(null)
                      setParentConsentFile(null)
                    }
                    field.onChange(selectedDate)
                  }
                  
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Date of Birth
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-11"
                          max={maxDateStr}
                          value={field.value}
                          onChange={handleDateChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              
              {/* Parent Consent Upload - Show only if age < 18 */}
              {calculatedAge !== null && calculatedAge < 18 && (
                <FormField
                  control={form.control}
                  name="parent_consent_file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-500" />
                        Parent Consent Letter/Waiver
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input
                            type="file"
                            accept="image/*"
                            className="h-11 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                // Validate file size (max 5MB)
                                if (file.size > 5 * 1024 * 1024) {
                                  toast({
                                    title: "File too large",
                                    description: "Please upload an image smaller than 5MB",
                                    variant: "destructive",
                                  })
                                  e.target.value = ""
                                  setParentConsentFile(null)
                                  setParentConsentPreview(null)
                                  return
                                }
                                // Validate file type - only images
                                const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
                                if (!validTypes.includes(file.type)) {
                                  toast({
                                    title: "Invalid file type",
                                    description: "Please upload an image file (JPG, PNG, or GIF)",
                                    variant: "destructive",
                                  })
                                  e.target.value = ""
                                  setParentConsentFile(null)
                                  setParentConsentPreview(null)
                                  return
                                }
                                setParentConsentFile(file)
                                field.onChange(file)
                                
                                // Create preview for images
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setParentConsentPreview(reader.result)
                                }
                                reader.readAsDataURL(file)
                              } else {
                                setParentConsentFile(null)
                                setParentConsentPreview(null)
                                field.onChange(null)
                              }
                            }}
                          />
                          {parentConsentFile && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-start gap-4">
                                {parentConsentPreview ? (
                                  <div className="flex-shrink-0">
                                    <img 
                                      src={parentConsentPreview} 
                                      alt="Preview" 
                                      className="w-24 h-24 object-cover rounded-md border border-blue-300"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-md border border-gray-300 flex items-center justify-center">
                                    <Shield className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                    <p className="text-sm font-medium text-blue-900 truncate">
                                      {parentConsentFile.name}
                                    </p>
                                  </div>
                                  <p className="text-xs text-blue-700">
                                    File size: {(parentConsentFile.size / 1024).toFixed(2)} KB
                                  </p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 h-7 text-xs text-blue-700 hover:text-blue-900"
                                    onClick={() => {
                                      setParentConsentFile(null)
                                      setParentConsentPreview(null)
                                      field.onChange(null)
                                      const fileInput = document.querySelector('input[type="file"][accept="image/*,.pdf"]')
                                      if (fileInput) fileInput.value = ""
                                    }}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Remove file
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        Required for clients under 18 years of age. Please upload a clear photo of the signed parent/guardian consent form or waiver.
                      </p>
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter className="pt-4 border-t gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                  }}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 px-6 bg-primary hover:bg-primary/90"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <User className="mr-2 h-4 w-4" />
                  Proceed
                </Button>
              </DialogFooter>
            </form>
          </Form>
          ) : (
            <div className="space-y-6 py-4">
              {/* User Info Display */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {pendingClientData ? `${pendingClientData.fname} ${pendingClientData.mname || ''} ${pendingClientData.lname}`.trim() : 'New User'}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {pendingClientData?.isApprovalFlow 
                        ? "Complete the form below to approve the account and assign subscription"
                        : "Complete the form below to create the account"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Discount Selection - MOVED TO TOP */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-blue-600" />
                  <Label className="text-sm font-semibold text-gray-900">Discount Eligibility</Label>
                </div>
                <p className="text-xs text-gray-600">
                  Verify the user's ID and select if eligible. Discounts automatically apply to Monthly Access plans.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newDiscount = subscriptionForm.discount_type === 'student' ? 'none' : 'student'
                      setSubscriptionForm(prev => {
                        // Recalculate total price with new discount
                        let totalPrice = 0
                        const currentPlans = prev.selected_plan_ids || []
                        currentPlans.forEach(selectedPlanId => {
                          const plan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
                          if (plan) {
                            const basePrice = parseFloat(plan.price || 0)
                            const quantity = planQuantities[selectedPlanId] || 1
                            
                              let pricePerUnit = basePrice
                              if (newDiscount !== 'none' && newDiscount !== 'regular') {
                                const selectedPlanIdNum = parseInt(selectedPlanId)
                                if (selectedPlanIdNum == 2 || selectedPlanIdNum == 3 || selectedPlanIdNum == 5) {
                                  pricePerUnit = calculateDiscountedPrice(basePrice, newDiscount, selectedPlanIdNum)
                                }
                              }
                            
                            totalPrice += pricePerUnit * quantity
                          }
                        })
                        
                        return {
                          ...prev,
                          discount_type: newDiscount,
                          amount_paid: totalPrice.toFixed(2)
                        }
                      })
                    }}
                    className={`h-auto py-4 flex flex-col items-center gap-2 border-2 transition-all ${
                      subscriptionForm.discount_type === 'student'
                        ? 'border-blue-400 bg-blue-50 hover:bg-blue-100 shadow-md'
                        : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <GraduationCap className={`h-6 w-6 ${subscriptionForm.discount_type === 'student' ? 'text-blue-700' : 'text-blue-600'}`} />
                    <span className={`font-semibold text-sm ${subscriptionForm.discount_type === 'student' ? 'text-blue-800' : 'text-blue-700'}`}>Student</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newDiscount = subscriptionForm.discount_type === 'senior' ? 'none' : 'senior'
                      setSubscriptionForm(prev => {
                        // Recalculate total price with new discount
                        let totalPrice = 0
                        const currentPlans = prev.selected_plan_ids || []
                        currentPlans.forEach(selectedPlanId => {
                          const plan = subscriptionPlans.find(p => p.id.toString() === selectedPlanId)
                          if (plan) {
                            const basePrice = parseFloat(plan.price || 0)
                            const quantity = planQuantities[selectedPlanId] || 1
                            
                              let pricePerUnit = basePrice
                              if (newDiscount !== 'none' && newDiscount !== 'regular') {
                                const selectedPlanIdNum = parseInt(selectedPlanId)
                                if (selectedPlanIdNum == 2 || selectedPlanIdNum == 3 || selectedPlanIdNum == 5) {
                                  pricePerUnit = calculateDiscountedPrice(basePrice, newDiscount, selectedPlanIdNum)
                                }
                              }
                            
                            totalPrice += pricePerUnit * quantity
                          }
                        })
                        
                        return {
                          ...prev,
                          discount_type: newDiscount,
                          amount_paid: totalPrice.toFixed(2)
                        }
                      })
                    }}
                    className={`h-auto py-4 flex flex-col items-center gap-2 border-2 transition-all ${
                      subscriptionForm.discount_type === 'senior'
                        ? 'border-purple-400 bg-purple-50 hover:bg-purple-100 shadow-md'
                        : 'border-purple-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <UserCircle className={`h-6 w-6 ${subscriptionForm.discount_type === 'senior' ? 'text-purple-700' : 'text-purple-600'}`} />
                    <span className={`font-semibold text-sm ${subscriptionForm.discount_type === 'senior' ? 'text-purple-800' : 'text-purple-700'}`}>Senior 55+</span>
                  </Button>
                </div>
                <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3">
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <strong className="font-semibold">Important:</strong> Only tag users after verifying their ID and eligibility. ID verification must be done outside the system before applying discount tags.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Plan Selection - Multiple Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-900">Select Plan(s)</Label>
                <p className="text-xs text-gray-600">
                  You can select multiple plans to assign to this user
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {subscriptionPlans.map((plan) => {
                    const isAvailable = plan.is_available !== false
                    const planIdStr = plan.id.toString() // Ensure plan ID is string
                    const selectedPlans = subscriptionForm.selected_plan_ids || []
                    // Normalize all plan IDs to strings for consistent comparison
                    const normalizedSelectedPlans = selectedPlans.map(id => String(id))
                    const isSelected = normalizedSelectedPlans.includes(planIdStr)
                    const quantity = planQuantities[planIdStr] || 1
                    
                    // Check mutual exclusivity: Plan 1 (Gym Membership) and Plan 3 (Monthly Access Standard)
                    const planIdNum = parseInt(planIdStr)
                    const isMutuallyExclusive = 
                      (planIdNum === 1 && normalizedSelectedPlans.includes('3')) ||
                      (planIdNum === 3 && normalizedSelectedPlans.includes('1'))
                    
                    // Premium (Plan ID 2) requires Gym Membership (Plan ID 1)
                    const hasGymMembership = normalizedSelectedPlans.includes('1')
                    const requiresMembership = planIdNum === 2 && !hasGymMembership
                    const isDisabled = !isAvailable || (isMutuallyExclusive && !isSelected) || requiresMembership
                    
                    // Debug logging for Premium plan
                    if (planIdNum === 2) {
                      console.log('🟢 [TRACK] Premium Plan (ID 2) disabled check:')
                      console.log('  - selectedPlans:', selectedPlans)
                      console.log('  - normalizedSelectedPlans:', normalizedSelectedPlans)
                      console.log('  - hasGymMembership:', hasGymMembership)
                      console.log('  - requiresMembership:', requiresMembership)
                      console.log('  - isAvailable:', isAvailable, 'plan.is_available:', plan.is_available)
                      console.log('  - isMutuallyExclusive:', isMutuallyExclusive)
                      console.log('  - isSelected:', isSelected)
                      console.log('  - isDisabled breakdown:')
                      console.log('    - !isAvailable:', !isAvailable)
                      console.log('    - (isMutuallyExclusive && !isSelected):', (isMutuallyExclusive && !isSelected))
                      console.log('    - requiresMembership:', requiresMembership)
                      console.log('  - FINAL isDisabled:', isDisabled)
                    }
                    
                    return (
                      <div 
                        key={`${plan.id}-${normalizedSelectedPlans.join('-')}`}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-blue-400 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={(e) => {
                          // Don't trigger if clicking on input field (quantity)
                          if (e.target.type === 'number' || e.target.tagName === 'INPUT') {
                            return
                          }
                          // Toggle the plan when clicking on the card
                          if (!isDisabled) {
                            handlePlanToggle(plan.id)
                          } else if (requiresMembership) {
                            // Show toast when trying to select Premium without Membership
                            toast({
                              title: "Membership Required",
                              description: "Monthly Access (Premium) requires Gym Membership. Please select Gym Membership first.",
                              variant: "destructive",
                            })
                          } else if (isMutuallyExclusive && !isSelected) {
                            // Show toast when trying to click disabled plan
                            const conflictingPlan = planIdNum === 1 ? 'Monthly Access (Standard)' : 'Gym Membership'
                            toast({
                              title: "Cannot select both plans",
                              description: `${plan.plan_name} cannot be selected with ${conflictingPlan}. Please deselect ${conflictingPlan} first.`,
                              variant: "destructive",
                            })
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <Label className={`text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-900'} cursor-pointer`}>
                                {plan.plan_name}
                              </Label>
                              <span className={`text-sm font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                                ₱{parseFloat(plan.price || 0).toFixed(2)}
                              </span>
                            </div>
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
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200"></div>

              {/* Payment Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Payment Details</h3>
                
                {/* Detailed Breakdown */}
                {subscriptionForm.selected_plan_ids && subscriptionForm.selected_plan_ids.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Breakdown</h4>
                    <div className="space-y-2.5">
                      {subscriptionForm.selected_plan_ids.map((planIdStr) => {
                        const plan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
                        if (!plan) return null
                        
                        const quantity = planQuantities[planIdStr] || 1
                        const basePrice = parseFloat(plan.price || 0)
                        const planId = parseInt(planIdStr)
                        
                        // Check if discount applies to this plan
                        const discountApplies = (planId === 2 || planId === 3 || planId === 5) && 
                                               subscriptionForm.discount_type && 
                                               subscriptionForm.discount_type !== 'none' && 
                                               subscriptionForm.discount_type !== 'regular'
                        
                        const pricePerUnit = discountApplies ? calculateDiscountedPrice(basePrice, subscriptionForm.discount_type, planId) : basePrice
                        const discountAmount = discountApplies ? (basePrice - pricePerUnit) : 0
                        const subtotal = basePrice * quantity
                        const discountTotal = discountAmount * quantity
                        const finalPrice = pricePerUnit * quantity
                        
                        return (
                          <div key={planIdStr} className="bg-white border border-gray-200 rounded-md p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{plan.plan_name}</span>
                              {quantity > 1 && (
                                <span className="text-xs text-gray-500">× {quantity}</span>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {quantity > 1 ? (
                                <>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Price per unit</span>
                                    <span className="font-medium text-gray-900">₱{basePrice.toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span className="font-medium text-gray-900">₱{subtotal.toFixed(2)}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Price</span>
                                  <span className="font-medium text-gray-900">₱{basePrice.toFixed(2)}</span>
                                </div>
                              )}
                              {discountApplies && (
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                                  <span className="text-green-600">
                                    {subscriptionForm.discount_type === 'student' ? '🎓 Student' : '👤 Senior'} Discount
                                  </span>
                                  <span className="text-green-600 font-medium">-₱{discountTotal.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                                <span className="text-xs font-semibold text-gray-700">Total</span>
                                <span className="text-sm font-bold text-gray-900">₱{finalPrice.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Total Summary */}
                    <div className="pt-3 border-t-2 border-gray-300 space-y-1.5">
                      {subscriptionForm.discount_type && subscriptionForm.discount_type !== 'none' && subscriptionForm.discount_type !== 'regular' && (
                        (() => {
                          const totalDiscount = subscriptionForm.selected_plan_ids.reduce((sum, planIdStr) => {
                            const plan = subscriptionPlans.find(p => p.id.toString() === planIdStr)
                            if (!plan) return sum
                            const planId = parseInt(planIdStr)
                            const quantity = planQuantities[planIdStr] || 1
                            if (planId === 2 || planId === 3 || planId === 5) {
                              const basePrice = parseFloat(plan.price || 0)
                              const discountedPrice = calculateDiscountedPrice(basePrice, subscriptionForm.discount_type, planId)
                              const discountAmount = basePrice - discountedPrice
                              return sum + (discountAmount * quantity)
                            }
                            return sum
                          }, 0)
                          
                          if (totalDiscount > 0) {
                            return (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Discount</span>
                                <span className="text-green-600 font-semibold">-₱{totalDiscount.toFixed(2)}</span>
                              </div>
                            )
                          }
                          return null
                        })()
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-base font-semibold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-gray-900">₱{parseFloat(subscriptionForm.amount_paid || 0).toFixed(2)}</span>
                      </div>
                      {/* Payment Summary Section */}
                      {subscriptionForm.payment_method === "cash" && subscriptionForm.amount_received && parseFloat(subscriptionForm.amount_received) > 0 && (
                        <>
                          <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-gray-400">
                            <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment Summary</span>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-sm font-medium text-gray-700">Amount Received</span>
                            <span className="text-sm font-semibold text-gray-900">₱{parseFloat(subscriptionForm.amount_received || 0).toFixed(2)}</span>
                          </div>
                          {parseFloat(subscriptionForm.amount_received || 0) > parseFloat(subscriptionForm.amount_paid || 0) && (
                            <div className="flex items-center justify-between pt-1 pb-1 bg-gray-100 -mx-2 px-2 rounded">
                              <span className="text-sm font-semibold text-gray-900">Change</span>
                              <span className="text-base font-bold text-gray-900">₱{(
                                Math.max(0, parseFloat(subscriptionForm.amount_received || 0) - parseFloat(subscriptionForm.amount_paid || 0))
                              ).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Total Amount</Label>
                    <Input
                      value={subscriptionForm.amount_paid || '0.00'}
                      disabled
                      className="h-11 text-sm border border-gray-300 bg-gray-50 text-gray-900 font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Payment Method</Label>
                    <Select 
                      value={subscriptionForm.payment_method} 
                      onValueChange={(value) => setSubscriptionForm(prev => ({ 
                        ...prev, 
                        payment_method: value,
                        gcash_reference: value === "cash" ? "" : prev.gcash_reference,
                        amount_received: value === "gcash" ? "" : prev.amount_received
                      }))}
                    >
                      <SelectTrigger className="h-11 text-sm border border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="gcash">GCash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cash Payment - Amount Received */}
                {subscriptionForm.payment_method === "cash" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Amount Received</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={subscriptionForm.amount_received}
                      onChange={(e) => setSubscriptionForm(prev => ({ ...prev, amount_received: e.target.value }))}
                      placeholder="0.00"
                      className="h-11 text-sm border border-gray-300"
                    />
                  </div>
                )}

                {/* GCash Payment - Reference Number */}
                {subscriptionForm.payment_method === "gcash" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Reference Number
                    </Label>
                    <Input
                      type="text"
                      value={subscriptionForm.gcash_reference}
                      onChange={(e) => setSubscriptionForm(prev => ({ ...prev, gcash_reference: e.target.value }))}
                      placeholder="Enter transaction reference"
                      className="h-11 text-sm border border-gray-300"
                      required
                    />
                    <p className="text-xs text-gray-500">Required for GCash transactions</p>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (pendingClientData?.isApprovalFlow) {
                      setIsAddDialogOpen(false)
                      setShowSubscriptionAssignment(false)
                      const memberId = pendingClientData.memberId
                      const member = members.find(m => m.id === memberId)
                      if (member) {
                        setSelectedMember(member)
                        setIsVerificationDialogOpen(true)
                      }
                      setPendingClientData(null)
                      setPlanQuantities({})
                      setSubscriptionForm({
                        plan_id: "",
                        start_date: new Date().toISOString().split("T")[0],
                        discount_type: "none",
                        amount_paid: "",
                        payment_method: "cash",
                        amount_received: "",
                        notes: ""
                      })
                      return
                    }

                    if (showSubscriptionAssignment) {
                      setShowSubscriptionAssignment(false)
                      return
                    }

                    setIsAddDialogOpen(false)
                    setShowSubscriptionAssignment(false)
                    setPendingClientData(null)
                    setSubscriptionForm({
                      plan_id: "",
                      start_date: new Date().toISOString().split("T")[0],
                      discount_type: "none",
                      amount_paid: "",
                      payment_method: "cash",
                      amount_received: "",
                      notes: ""
                    })
                    setPlanQuantities({})
                    form.reset()
                  }}
                  className="h-11 px-6"
                >
                  {showSubscriptionAssignment ? "Back" : "Cancel"}
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateSubscription}
                  disabled={
                    subscriptionLoading || 
                    !pendingClientData || 
                    !subscriptionForm.selected_plan_ids || 
                    subscriptionForm.selected_plan_ids.length === 0 || 
                    !subscriptionForm.amount_paid || 
                    (subscriptionForm.payment_method === "cash" && (!subscriptionForm.amount_received || parseFloat(subscriptionForm.amount_received || 0) < parseFloat(subscriptionForm.amount_paid || 0))) ||
                    (subscriptionForm.payment_method === "gcash" && !subscriptionForm.gcash_reference)
                  }
                  className="h-11 px-6 bg-primary hover:bg-primary/90"
                >
                  {subscriptionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <Edit className="h-6 w-6 text-primary" />
              Edit Client
            </DialogTitle>
            <DialogDescription className="text-base">
              Update the client's information and account details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateMember, (errors) => {
              console.log("Form validation errors:", errors)
              console.log("Form values:", editForm.getValues())
            })} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={editForm.control}
                  name="fname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="mname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Middle Name (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Michael" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="lname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      New Password (leave blank to keep current)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showEditPassword ? "text" : "password"}
                          placeholder="********"
                          className="h-11 pr-12"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowEditPassword(!showEditPassword)}
                        >
                          {showEditPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2">
                      <p className="text-xs text-gray-700">
                        <strong>Password Requirements:</strong> If changing password, it must be at least 8 characters with 1 uppercase letter, 1 number, and 1 special character.
                      </p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="bday"
                render={({ field }) => {
                  // Calculate maximum date for minimum age of 13 years
                  const today = new Date()
                  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())
                  const maxDateStr = maxDate.toISOString().split('T')[0]
                  
                  const handleDateChange = (e) => {
                    const selectedDate = e.target.value
                    if (selectedDate) {
                      const birthDate = new Date(selectedDate)
                      const age = today.getFullYear() - birthDate.getFullYear()
                      const monthDiff = today.getMonth() - birthDate.getMonth()
                      const dayDiff = today.getDate() - birthDate.getDate()
                      
                      // Calculate exact age
                      let exactAge = age
                      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                        exactAge--
                      }
                      
                      if (exactAge < 13) {
                        setShowAgeRestrictionModal(true)
                        // Reset the field to its previous value
                        field.onChange(field.value)
                        return
                      }
                    }
                    field.onChange(selectedDate)
                  }
                  
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Date of Birth
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          className="h-11" 
                          max={maxDateStr}
                          value={field.value}
                          onChange={handleDateChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              
              {/* Parent Consent File Display - Show if user is under 18 and has consent file */}
              {(() => {
                if (!selectedMember?.bday || !selectedMember?.parent_consent_file_url) {
                  return null
                }
                
                const today = new Date()
                const birthDate = new Date(selectedMember.bday)
                const age = today.getFullYear() - birthDate.getFullYear()
                const monthDiff = today.getMonth() - birthDate.getMonth()
                const dayDiff = today.getDate() - birthDate.getDate()
                const exactAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
                
                if (exactAge < 18 && selectedMember.parent_consent_file_url) {
                  const normalizedConsentUrl = normalizeConsentFileUrl(selectedMember.parent_consent_file_url)
                  
                  if (!normalizedConsentUrl) {
                    return null
                  }
                  
                  return (
                    <div className="space-y-2 pt-4 border-t border-gray-200">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-orange-600" />
                        Parent Consent Document
                      </Label>
                      <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden bg-white hover:border-gray-300 transition-colors group shadow-sm">
                        <div className="relative">
                          <img 
                            src={normalizedConsentUrl} 
                            alt="Parent Consent Document" 
                            className="w-full h-auto max-h-[500px] object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setConsentImageUrl(normalizedConsentUrl)
                              setIsConsentImageModalOpen(true)
                            }}
                            onError={(e) => {
                              console.log('🔵 [DEBUG] Image failed to load, URL:', normalizedConsentUrl)
                              e.target.style.display = 'none'
                              const errorDiv = e.target.nextElementSibling
                              if (errorDiv) {
                                errorDiv.style.display = 'flex'
                              }
                            }}
                            onLoad={() => console.log('🔵 [DEBUG] Image loaded successfully:', normalizedConsentUrl)}
                          />
                          <div className="hidden flex-col items-center justify-center p-8 text-center text-gray-500 min-h-[200px]">
                            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                            <p className="text-sm font-medium mb-2">Unable to load image</p>
                            <a 
                              href={normalizedConsentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              Try opening in new tab
                            </a>
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span>Click image to view in full size</span>
                      </p>
                    </div>
                  )
                }
                return null
              })()}
              
              <DialogFooter className="pt-4 border-t gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="h-11 px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    console.log("Update button clicked - manual submission")
                    console.log("Form is valid:", editForm.formState.isValid)
                    console.log("Form errors:", JSON.stringify(editForm.formState.errors, null, 2))
                    console.log("Form values:", JSON.stringify(editForm.getValues(), null, 2))

                    // Try manual form submission
                    const isValid = await editForm.trigger()
                    console.log("Form validation result:", isValid)

                    if (isValid) {
                      const formData = editForm.getValues()
                      console.log("Submitting form data:", formData)
                      await handleUpdateMember(formData)
                    } else {
                      console.log("Form validation failed, errors:", JSON.stringify(editForm.formState.errors, null, 2))
                      // Show user-friendly error message
                      toast({
                        title: "Validation Error",
                        description: "Please check all fields and try again. Check console for details.",
                        variant: "destructive",
                      })
                    }
                  }}
                  className="h-11 px-6 bg-primary hover:bg-primary/90"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Edit className="mr-2 h-4 w-4" />
                  Update
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Account Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={(open) => {
        setIsDeactivateDialogOpen(open)
        if (!open) {
          // Reset reason fields when dialog closes
          setDeactivationReason("")
          setCustomDeactivationReason("")
        }
      }}>
        <DialogContent className="sm:max-w-lg" hideClose>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="flex items-center text-2xl font-semibold">
              {selectedMember?.account_status === "deactivated" ? (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mr-3">
                    <RotateCw className="h-5 w-5 text-green-600" />
                  </div>
                  Reactivate Account
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 mr-3">
                    <PowerOff className="h-5 w-5 text-orange-600" />
                  </div>
                  Deactivate Account
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              {selectedMember?.account_status === "deactivated"
                ? "Restore access to this client's account and allow them to use the system again."
                : "Temporarily disable this client's account access. They will not be able to use the system until you reactivate the account."}
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-5 py-4">
              {/* Client Information Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={normalizeProfilePhotoUrl(selectedMember?.profile_photo_url)} alt={`${selectedMember?.fname} ${selectedMember?.lname}`} />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedMember.email}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Status</span>
                    <div>
                      {selectedMember.account_status === "approved" ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200 font-medium px-2.5 py-1 border" variant="outline">
                          <CheckCircle className="w-3 h-3 mr-1.5" />
                          Active
                        </Badge>
                      ) : (
                        getStatusBadge(selectedMember.account_status)
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Warning/Info Note */}
              <div className={cn(
                "border-l-4 rounded-r-lg p-4",
                selectedMember.account_status === "deactivated"
                  ? "bg-green-50 border-green-400"
                  : "bg-orange-50 border-orange-400"
              )}>
                <p className={cn(
                  "text-sm leading-relaxed",
                  selectedMember.account_status === "deactivated"
                    ? "text-green-900"
                    : "text-orange-900"
                )}>
                  <strong className="font-semibold">Important:</strong>{" "}
                  {selectedMember.account_status === "deactivated"
                    ? "Reactivating this account will restore full access to the mobile application and all system features. The client will be able to log in and use all services immediately."
                    : "Deactivating this account will immediately prevent the client from accessing the mobile application and all system features. The client will not be able to log in or use any services. You can reactivate this account at any time from the client list."}
                </p>
              </div>

              {/* Deactivation Reason Fields - Only show when deactivating */}
              {selectedMember.account_status !== "deactivated" && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="deactivation-reason" className="text-sm font-semibold text-gray-700">
                      Reason for Deactivation <span className="text-red-500">*</span>
                    </Label>
                    <Select value={deactivationReason} onValueChange={(value) => {
                      setDeactivationReason(value)
                      if (value !== "other") {
                        setCustomDeactivationReason("")
                      }
                    }}>
                      <SelectTrigger id="deactivation-reason" className="w-full">
                        <SelectValue placeholder="Select a reason for deactivation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account_sharing">Account Sharing - Client allowed unauthorized use of their account</SelectItem>
                        <SelectItem value="policy_violation">Policy/Rules Violation - Client violated gym policies/rules</SelectItem>
                        <SelectItem value="inappropriate_behavior">Inappropriate Behavior - Client engaged in unacceptable conduct</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {deactivationReason === "other" && (
                    <div className="space-y-2">
                      <Label htmlFor="custom-deactivation-reason" className="text-sm font-semibold text-gray-700">
                        Specify Reason <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="custom-deactivation-reason"
                        placeholder="Enter the reason for deactivation..."
                        value={customDeactivationReason}
                        onChange={(e) => setCustomDeactivationReason(e.target.value)}
                        className="w-full min-h-[80px] border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsDeactivateDialogOpen(false)}
              className="border-2 border-gray-300 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeactivate}
              disabled={
                isLoading || 
                (selectedMember?.account_status !== "deactivated" && (
                  !deactivationReason || 
                  (deactivationReason === "other" && !customDeactivationReason.trim())
                ))
              }
              className={cn(
                "shadow-md hover:shadow-lg transition-all duration-200 px-6 text-white",
                selectedMember?.account_status === "deactivated"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : selectedMember?.account_status === "deactivated" ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Reactivate Account
                </>
              ) : (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Account Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="sm:max-w-lg" hideClose>
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="flex items-center text-2xl font-semibold">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mr-3">
                <RotateCw className="h-5 w-5 text-green-600" />
              </div>
              Restore Account
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Restore this expired client account and grant immediate access to the web and mobile application.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-5 py-4">
              {/* Client Information Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={normalizeProfilePhotoUrl(selectedMember?.profile_photo_url)} alt={`${selectedMember?.fname} ${selectedMember?.lname}`} />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {formatName(`${selectedMember.fname} ${selectedMember.mname || ''} ${selectedMember.lname}`).trim()}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedMember.email}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Status</span>
                    <div>{getStatusBadge(selectedMember.account_status)}</div>
                  </div>
                </div>
              </div>
              
              {/* Info Note */}
              <div className="bg-green-50 border-l-4 border-green-400 rounded-r-lg p-4">
                <p className="text-sm text-green-900 leading-relaxed">
                  <strong className="font-semibold">Account Recovery:</strong>{" "}
                  Restoring this account will immediately approve the client and grant access to the web and mobile application. 
                  The client will be able to log in and use the system. This action is typically used when a client 
                  requests account recovery after their pending request has expired.
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setIsRestoreDialogOpen(false)}
              className="border-2 border-gray-300 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRestore}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Restore Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog for Duplicate User/Name */}
      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="sm:max-w-2xl" hideClose={true}>
          <DialogHeader className="space-y-4 pb-2">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center border-2 border-red-200">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <div className="flex-1 pt-1">
                <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  {errorDialogData?.title || "Duplicate Name Combination"}
                </DialogTitle>
                <DialogDescription className="text-base text-slate-600 mt-2 leading-relaxed">
                  Cannot Create Client Account
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-red-50/50 border-l-4 border-red-500 rounded-r-lg p-5">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                Why This Error Occurred
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {errorDialogData?.message || "A client with this information already exists in the system. Please use a different name combination or email address to create a new account."}
              </p>
            </div>
            
            {errorDialogData?.existingUser && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
                <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-600" />
                  Existing Client Information
                </h4>
                <div className="space-y-2.5 text-sm text-slate-700 bg-white rounded-md p-4 border border-slate-100">
                  <div className="flex items-start gap-3">
                    <span className="font-semibold text-slate-900 min-w-[60px]">Name:</span>
                    <span className="text-slate-700">
                      {errorDialogData.existingUser.fname} {errorDialogData.existingUser.mname || ""} {errorDialogData.existingUser.lname}
                    </span>
                  </div>
                  {errorDialogData.existingUser.email && (
                    <div className="flex items-start gap-3">
                      <span className="font-semibold text-slate-900 min-w-[60px]">Email:</span>
                      <span className="text-slate-700 break-all">{errorDialogData.existingUser.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                What You Can Do
              </p>
              <ul className="space-y-2 text-sm text-slate-700 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1.5">•</span>
                  <span>Use a different first name or last name combination</span>
                </li>
                {errorDialogData?.duplicateType === 'email' && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1.5">•</span>
                    <span>Use a different email address if creating a new account</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1.5">•</span>
                  <span>Verify if this is the same person and update their existing account instead</span>
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button 
              onClick={() => setIsErrorDialogOpen(false)}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-medium px-8 py-2.5 shadow-sm hover:shadow-md transition-all"
            >
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Age Restriction Modal */}
      <Dialog open={showAgeRestrictionModal} onOpenChange={setShowAgeRestrictionModal}>
        <DialogContent className="sm:max-w-lg" hideClose={true}>
          <DialogHeader className="space-y-4 pb-2">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center border-2 border-orange-200">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1 pt-1">
                <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  Age Requirement Not Met
                </DialogTitle>
                <DialogDescription className="text-base text-slate-600 mt-2 leading-relaxed">
                  We cannot create this client account at this time.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="py-2 space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-orange-50/50 border-l-4 border-orange-500 rounded-r-lg p-4">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                Minimum Age Requirement
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Clients must be at least <span className="font-bold text-orange-600 text-base">13 years old</span> to create an account in our system.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Why is this required?
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1.5">•</span>
                  <span>Safety and liability protection for all clients</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1.5">•</span>
                  <span>Compliance with platform usage policies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1.5">•</span>
                  <span>Insurance and legal requirements</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <p className="text-sm text-slate-600 leading-relaxed">
                Please select a different date of birth that meets our minimum age requirement to continue with account creation.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-200">
            <Button
              onClick={() => setShowAgeRestrictionModal(false)}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 py-2.5 shadow-sm hover:shadow-md transition-all"
            >
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Management Dialog */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="flex items-center text-2xl font-semibold">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mr-3">
                <Tag className="h-5 w-5 text-blue-600" />
              </div>
              Manage Discount Tags
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Tag this member for discounted pricing. ID verification is done outside the system.
            </DialogDescription>
          </DialogHeader>
          {discountDialogMember && (
            <div className="space-y-5 py-4">
              {/* Member Information */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={normalizeProfilePhotoUrl(discountDialogMember.profile_photo_url)} alt={`${discountDialogMember.fname} ${discountDialogMember.lname}`} />
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-900 mb-1">
                      {discountDialogMember.fname} {discountDialogMember.mname || ''} {discountDialogMember.lname}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {discountDialogMember.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Discount Tags */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Current Discount Tags</h3>
                {(() => {
                  const activeDiscount = getActiveDiscount(discountDialogMember.id)
                  
                  if (!activeDiscount) {
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600">No active discount tags</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-2">
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          activeDiscount.discount_type === 'student'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-purple-50 border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {activeDiscount.discount_type === 'student' ? (
                            <GraduationCap className="h-5 w-5 text-blue-600" />
                          ) : (
                            <UserCircle className="h-5 w-5 text-purple-600" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {activeDiscount.discount_type === 'student' ? 'Student Discount' : 'Senior (55+) Discount'}
                            </p>
                            {activeDiscount.verified_at && (
                              <p className="text-xs text-gray-600">
                                Verified: {formatDateOnlyPH(activeDiscount.verified_at)}
                              </p>
                            )}
                            {activeDiscount.expires_at ? (
                              <p className="text-xs text-gray-600">
                                Expires: {formatDateOnlyPH(activeDiscount.expires_at)}
                              </p>
                            ) : (
                              <p className="text-xs text-green-600 font-medium">
                                Permanent (Never expires)
                              </p>
                            )}
                          </div>
                        </div>
                        {userRole === 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDiscount(activeDiscount.id)}
                            disabled={discountLoading}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {userRole === 'staff' && (
                          <div className="text-xs text-gray-500 italic px-2">
                            Only admins can remove
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Add Discount Tags */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-gray-900">Add Discount Tag</h3>
                {(() => {
                  const activeDiscount = getActiveDiscount(discountDialogMember.id)
                  const hasActiveDiscount = !!activeDiscount
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleAddDiscount('student')}
                          disabled={discountLoading || hasActiveDiscount}
                          className={`h-auto py-4 flex flex-col items-center gap-2 border-2 ${
                            hasActiveDiscount
                              ? 'border-gray-200 opacity-50 cursor-not-allowed'
                              : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          <GraduationCap className={`h-6 w-6 ${hasActiveDiscount ? 'text-gray-400' : 'text-blue-600'}`} />
                          <span className={`font-semibold ${hasActiveDiscount ? 'text-gray-500' : 'text-blue-700'}`}>Student</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleAddDiscount('senior')}
                          disabled={discountLoading || hasActiveDiscount}
                          className={`h-auto py-4 flex flex-col items-center gap-2 border-2 ${
                            hasActiveDiscount
                              ? 'border-gray-200 opacity-50 cursor-not-allowed'
                              : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                          }`}
                        >
                          <UserCircle className={`h-6 w-6 ${hasActiveDiscount ? 'text-gray-400' : 'text-purple-600'}`} />
                          <span className={`font-semibold ${hasActiveDiscount ? 'text-gray-500' : 'text-purple-700'}`}>55+</span>
                        </Button>
                      </div>
                      {hasActiveDiscount && (
                        <p className="text-xs text-orange-600 text-center font-medium">
                          Remove the current discount tag before adding a new one. Members can only have one active discount at a time.
                        </p>
                      )}
                    </>
                  )
                })()}
                <p className="text-xs text-gray-500 text-center">
                  Note: ID verification is done outside the system. Only tag members after verifying their eligibility.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDiscountDialogOpen(false)}
              disabled={discountLoading}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parent Consent Image Modal */}
      <Dialog open={isConsentImageModalOpen} onOpenChange={setIsConsentImageModalOpen}>
        <DialogContent 
          className="p-0 bg-white border shadow-lg w-auto h-auto max-w-[98vw] max-h-[98vh]"
          hideClose
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Parent Consent Document</DialogTitle>
          </DialogHeader>
          <div className="relative inline-block">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white rounded-full h-8 w-8 shadow-lg border border-gray-200"
              onClick={() => setIsConsentImageModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            {consentImageUrl && (
              <img 
                src={consentImageUrl} 
                alt="Parent Consent Document - Full Size" 
                className="max-w-[98vw] max-h-[98vh] w-auto h-auto object-contain block"
                onError={(e) => {
                  console.log('🔵 [DEBUG] Image failed to load in modal, URL:', consentImageUrl)
                  e.target.style.display = 'none'
                  const errorDiv = e.target.nextElementSibling
                  if (errorDiv) {
                    errorDiv.style.display = 'flex'
                  }
                }}
              />
            )}
            <div className="hidden flex-col items-center justify-center p-12 text-center text-gray-500 min-h-[400px] bg-white rounded-lg">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-base font-medium mb-3">Unable to load image</p>
              <a 
                href={consentImageUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Try opening in new tab
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ViewMembers
