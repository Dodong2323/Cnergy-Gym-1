"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import {
  Search,
  Plus,
  Edit,
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Award,
  User,
  Star,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Shield,
  Mail,
  CalendarDays,
  PowerOff,
  RotateCw,
} from "lucide-react"

const API_URL = "https://api.cnergy.site/addcoach.php"

const validatePassword = (password) => {
  const errors = []
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }
  return errors
}

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Helper function to generate standard password for coach
// Format: Co + First2LettersOfFirstName(lowercase) + First2LettersOfMiddleName(lowercase, optional) + #2023 + First2LettersOfLastName(lowercase)
// Examples: "John Michael Doe" -> "CojoMi#2023do", "Jane Doe" (no middle name) -> "Coja#2023do"
const generateCoachPassword = (fname, mname, lname) => {
  // Get first 2 letters of first name: both lowercase
  const first = (fname || "").trim()
  const firstNamePart = first.length > 0 
    ? (first.substring(0, 2).toLowerCase())
    : ""
  
  // Get first 2 letters of middle name ONLY if it exists: both lowercase (optional)
  const middle = (mname && mname.trim() !== "") ? mname.trim() : ""
  const middleNamePart = middle.length > 0
    ? (middle.substring(0, 2).toLowerCase())
    : ""
  
  // Get first 2 letters of last name: all lowercase
  const last = (lname || "").trim()
  const lastNamePart = last.length > 0 
    ? last.substring(0, 2).toLowerCase()
    : ""
  
  // Combine: Co + FirstName2(lowercase) + MiddleName2(lowercase, if exists) + #2023 + LastName2(lowercase)
  return `Co${firstNamePart}${middleNamePart}#2023${lastNamePart}`
}

const ViewCoach = () => {
  const [coaches, setCoaches] = useState([])
  const [filteredCoaches, setFilteredCoaches] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [currentView, setCurrentView] = useState("active") // "active" or "archive"
  const [currentPage, setCurrentPage] = useState(1)
  const [activities, setActivities] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [coachStats, setCoachStats] = useState({
    totalCoaches: 0,
    availableCoaches: 0,
    unavailableCoaches: 0,
    averageRating: 0,
    averagePerSessionRate: 0,
    totalClients: 0,
    specialtyDistribution: [],
    recentActivities: []
  })
  const [activityFilter, setActivityFilter] = useState('all')
  const [validationErrors, setValidationErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [selectedSpecialties, setSelectedSpecialties] = useState([])
  const [customSpecialty, setCustomSpecialty] = useState("")
  const [touchedFields, setTouchedFields] = useState({
    per_session_rate: false,
    monthly_rate: false,
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      specialty: selectedSpecialties.join(", "),
    }))
  }, [selectedSpecialties])

  const coachesPerPage = 5
  const indexOfLastCoach = currentPage * coachesPerPage
  const indexOfFirstCoach = indexOfLastCoach - coachesPerPage
  const currentCoaches = filteredCoaches.slice(indexOfFirstCoach, indexOfLastCoach)
  const totalPages = Math.ceil(filteredCoaches.length / coachesPerPage)

  const { toast } = useToast()

  const [formData, setFormData] = useState({
    fname: "",
    mname: "",
    lname: "",
    email: "",
    password: "",
    gender_id: "",
    bday: "",
    user_type_id: 3,
    bio: "",
    specialty: "",
    experience: "",
    per_session_rate: "300",
    monthly_rate: "3200",
    certifications: "",
    is_available: true,
    image_url: "",
    account_status: "approved",
  })

  const genderOptions = [
    { id: "1", name: "Male" },
    { id: "2", name: "Female" },
    // Note: "Other" option removed until added to database
  ]

  const specialtyOptions = [
    "Personal Training",
    "Weight Loss",
    "Muscle Building",
    "Cardio Training",
    "Strength Training",
    "Yoga",
    "Pilates",
    "CrossFit",
    "Sports Training",
    "Rehabilitation",
    "Nutrition Coaching",
    "Group Fitness",
  ]

  const experienceOptions = [
    "Beginner (0-1 years)",
    "Intermediate (2-5 years)",
    "Advanced (6-10 years)",
    "Expert (10+ years)",
  ]

  const validateForm = (data, isEdit = false) => {
    const errors = {}

    // Name validations
    if (!data.fname.trim()) errors.fname = "First name is required"
    // Middle name is optional - no validation needed
    if (!data.lname.trim()) errors.lname = "Last name is required"

    // Email validation
    if (!data.email.trim()) {
      errors.email = "Email is required"
    } else if (!validateEmail(data.email)) {
      errors.email = "Please enter a valid email address"
    }

    // Password validation (only for new coaches or when password is provided in edit)
    if (!isEdit || (isEdit && data.password && data.password.trim())) {
      if (!data.password || !data.password.trim()) {
        errors.password = "Password is required"
      } else {
        const passwordErrors = validatePassword(data.password)
        if (passwordErrors.length > 0) {
          errors.password = passwordErrors[0]
        }
      }
    }

    // Date validation
    if (!data.bday) {
      errors.bday = "Date of birth is required"
    } else {
      // Validate age - must be at least 18 years old
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
      
      if (exactAge < 18) {
        errors.bday = "Coach must be at least 18 years old"
      }
    }
    // Gender validation removed - coaches will set it themselves
    if (!data.specialty && selectedSpecialties.length === 0) errors.specialty = "Please specify at least one specialty"
    if (!data.experience) errors.experience = "Please specify experience level"
    // Per session rate has default value (300), so validation not required
    // Monthly rate has default value (3200), so validation not required

    // Package sessions validation
    if (data.package_sessions && (isNaN(data.package_sessions) || data.package_sessions < 1)) {
      errors.package_sessions = "Package sessions must be a positive number"
    }

    // Rate validations
    if (data.package_rate && (isNaN(data.package_rate) || data.package_rate < 0)) {
      errors.package_rate = "Package rate must be a positive number"
    }
    if (data.monthly_rate && (isNaN(data.monthly_rate) || data.monthly_rate < 0)) {
      errors.monthly_rate = "Monthly rate must be a positive number"
    }

    return errors
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Mark field as touched if it's one of the rate fields and the value has changed from default
    if (name === "per_session_rate") {
      if (value !== "300") {
        setTouchedFields((prev) => ({
          ...prev,
          per_session_rate: true,
        }))
      }
    } else if (name === "monthly_rate") {
      if (value !== "3200") {
        setTouchedFields((prev) => ({
          ...prev,
          monthly_rate: true,
        }))
      }
    }

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear validation error
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSwitchChange = (name, checked) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSpecialtyToggle = (specialty) => {
    setSelectedSpecialties(prev => {
      if (prev.includes(specialty)) {
        return prev.filter(s => s !== specialty)
      } else {
        return [...prev, specialty]
      }
    })
  }

  const handleAddCustomSpecialty = () => {
    if (customSpecialty.trim() && !selectedSpecialties.includes(customSpecialty.trim())) {
      setSelectedSpecialties(prev => [...prev, customSpecialty.trim()])
      setCustomSpecialty("")
    }
  }

  const handleRemoveSpecialty = (specialty) => {
    setSelectedSpecialties(prev => prev.filter(s => s !== specialty))
  }

  const resetForm = () => {
    setFormData({
      fname: "",
      mname: "",
      lname: "",
      email: "",
      password: "",
      gender_id: "",
      bday: "",
      user_type_id: 3,
      bio: "",
      specialty: "",
      experience: "",
      per_session_rate: "300",
      package_rate: "",
      package_sessions: "",
      monthly_rate: "3200",
      certifications: "",
      is_available: true,
      image_url: "",
    })
    setValidationErrors({})
    setSelectedSpecialties([])
    setCustomSpecialty("")
    setTouchedFields({
      per_session_rate: false,
      monthly_rate: false,
    })
  }

  // Fetch activity logs from backend
  const fetchActivityLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}?log=true`)
      if (response.data.logs) {
        setActivityLogs(response.data.logs.slice(0, 5))
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error)
    }
  }

  // Calculate coach statistics from coaches data
  const fetchCoachStats = () => {
    try {
      // Ensure coaches is an array
      if (!Array.isArray(coaches)) {
        setCoachStats({
          totalCoaches: 0,
          availableCoaches: 0,
          unavailableCoaches: 0,
          averageRating: '0.0',
          averagePerSessionRate: '0.00',
          totalClients: 0,
          specialtyDistribution: [],
          recentActivities: []
        })
        setActivities([])
        return
      }

      // Calculate stats from the coaches array
      const activeCoaches = coaches.filter(c => c.account_status !== 'deactivated')
      const availableCoaches = activeCoaches.filter(c => c.is_available)
      const unavailableCoaches = activeCoaches.filter(c => !c.is_available)

      const totalCoaches = activeCoaches.length
      const availableCount = availableCoaches.length
      const unavailableCount = unavailableCoaches.length

      // Calculate average rating
      const ratings = activeCoaches.map(c => parseFloat(c.rating) || 0).filter(r => r > 0)
      const averageRating = ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
        : '0.0'

      // Calculate average per session rate
      const rates = activeCoaches.map(c => parseFloat(c.per_session_rate) || 0).filter(r => r > 0)
      const averagePerSessionRate = rates.length > 0
        ? (rates.reduce((sum, r) => sum + r, 0) / rates.length).toFixed(2)
        : '0.00'

      // Calculate total clients
      const totalClients = activeCoaches.reduce((sum, c) => sum + (parseInt(c.total_clients) || 0), 0)

      // Calculate specialty distribution
      const specialtyMap = {}
      activeCoaches.forEach(coach => {
        const specialties = coach.specialty ? coach.specialty.split(',').map(s => s.trim()) : []
        specialties.forEach(spec => {
          specialtyMap[spec] = (specialtyMap[spec] || 0) + 1
        })
      })
      const specialtyDistribution = Object.entries(specialtyMap)
        .map(([specialty, count]) => ({ specialty, count }))
        .sort((a, b) => b.count - a.count)

      // Generate recent activities (mock data based on coach updates)
      const recentActivities = activeCoaches
        .slice(0, 10)
        .map(coach => ({
          activity: `${coach.fullName} is available for training`,
          timestamp: new Date().toISOString()
        }))

      setCoachStats({
        totalCoaches,
        availableCoaches: availableCount,
        unavailableCoaches: unavailableCount,
        averageRating,
        averagePerSessionRate,
        totalClients,
        specialtyDistribution,
        recentActivities
      })

      // Update activities
      setActivities(recentActivities)
    } catch (error) {
      console.error("Error calculating coach statistics:", error)
      // Set default stats on error
      setCoachStats({
        totalCoaches: 0,
        availableCoaches: 0,
        unavailableCoaches: 0,
        averageRating: '0.0',
        averagePerSessionRate: '0.00',
        totalClients: 0,
        specialtyDistribution: [],
        recentActivities: []
      })
    }
  }

  // Filter activities based on time period
  const getFilteredActivities = () => {
    const activities = coachStats.recentActivities || []
    if (!Array.isArray(activities) || activities.length === 0) {
      return []
    }

    if (activityFilter === 'all') return activities

    const now = new Date()
    const filterDate = new Date()

    switch (activityFilter) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        filterDate.setDate(now.getDate() - 7)
        break
      case 'month':
        filterDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        return activities
    }

    return activities.filter(activity => {
      if (!activity || !activity.timestamp) return false
      const activityDate = new Date(activity.timestamp)
      return !isNaN(activityDate.getTime()) && activityDate >= filterDate
    })
  }

  useEffect(() => {
    fetchCoaches()
    fetchActivityLogs()
  }, [])

  // Calculate stats when coaches data changes
  useEffect(() => {
    fetchCoachStats()
  }, [coaches])

  // Auto-generate password when name fields change
  useEffect(() => {
    if (formData.fname || formData.lname) {
      const generatedPassword = generateCoachPassword(formData.fname, formData.mname, formData.lname)
      setFormData((prev) => ({
        ...prev,
        password: generatedPassword,
      }))
    }
  }, [formData.fname, formData.mname, formData.lname])

  const fetchCoaches = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(API_URL)
      const coachesData = response.data.coaches || []
      console.log("Fetched coaches from API:", coachesData)

      const enhancedCoaches = coachesData.map((coach) => ({
        ...coach,
        fullName: `${coach.fname} ${coach.mname} ${coach.lname}`,
        bio: coach.bio || "",
        specialty: coach.specialty || "General Training",
        experience: coach.experience || "Not specified",
        rating: coach.rating || 0.0,
        total_clients: coach.total_clients || 0,
        per_session_rate: coach.per_session_rate || 0.0,
        monthly_rate: coach.monthly_rate || 0.0,
        certifications: coach.certifications || "",
        is_available: coach.is_available !== undefined ? coach.is_available : true,
        image_url: coach.image_url || "",
        account_status: coach.account_status || "approved",
      }))

      console.log("Enhanced coaches with account_status:", enhancedCoaches.map(c => ({ id: c.id, name: c.fullName, account_status: c.account_status })))

      setCoaches(enhancedCoaches)
      setFilteredCoaches(enhancedCoaches)
    } catch (error) {
      console.error("Error fetching coaches:", error)
      toast({
        title: "Error",
        description: "Failed to load coaches data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCoach = async (e) => {
    e.preventDefault()

    const errors = validateForm(formData)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setIsLoading(true)

      // Generate standard password from name
      // Prepare data for both User and Coaches tables
      const generatedPassword = generateCoachPassword(formData.fname, formData.mname, formData.lname)
      const formattedData = {
        // User table data
        fname: formData.fname,
        mname: formData.mname && formData.mname.trim() !== '' ? formData.mname.trim() : '',
        lname: formData.lname,
        email: formData.email,
        password: generatedPassword,
        gender_id: 1, // Default to Male (1) - coaches will update it themselves
        bday: formData.bday,
        user_type_id: Number.parseInt(formData.user_type_id),
        failed_attempt: 0,

        // Coaches table data
        bio: formData.bio || "",
        specialty: selectedSpecialties.length > 0 ? selectedSpecialties : formData.specialty,
        experience: formData.experience,
        per_session_rate: Number.parseFloat(formData.per_session_rate) || 300.0,
        package_rate: formData.package_rate ? Number.parseFloat(formData.package_rate) : null,
        package_sessions: formData.package_sessions ? Number.parseInt(formData.package_sessions) : null,
        monthly_rate: Number.parseFloat(formData.monthly_rate) || 3200.0,
        certifications: "", // Coaches will set this themselves
        is_available: true, // Default to available - coaches will update it themselves
        image_url: "", // Coaches will set this themselves
      }

      const response = await axios.post(API_URL, formattedData)
      if (response.data.success) {
        // Format coach's full name for toast notification
        const fullName = `${formData.fname}${formData.mname ? ` ${formData.mname}` : ''} ${formData.lname}`.trim()

        // Show success toast with better formatting
        toast({
          title: "Coach Successfully Added",
          description: `${fullName} has been added to the system. Email: ${formData.email}. Account is ready to use.`,
        })

        // Refresh coaches list
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        const enhancedCoaches = updatedCoaches.map((coach) => ({
          ...coach,
          fullName: `${coach.fname} ${coach.mname} ${coach.lname}`,
          bio: coach.bio || "",
          specialty: coach.specialty || "General Training",
          experience: coach.experience || "Not specified",
          rating: coach.rating || 0.0,
          total_clients: coach.total_clients || 0,
          hourly_rate: coach.hourly_rate || 0.0,
          certifications: coach.certifications || "",
          is_available: coach.is_available !== undefined ? coach.is_available : true,
          image_url: coach.image_url || "",
        }))

        setCoaches(enhancedCoaches)
        setFilteredCoaches(enhancedCoaches)
        resetForm()
        setIsAddDialogOpen(false)

        // Refresh activity logs (stats will be recalculated automatically via useEffect)
        await fetchActivityLogs()
      } else {
        // Handle API error response (like email already exists)
        console.error("Coach creation failed:", response.data)
        console.error("Error response data:", response.data)

        // Check if it's an email-related error (case insensitive)
        const errorText = (response.data.error || "").toLowerCase()
        console.log("Error text to check:", errorText)
        console.log("Contains email:", errorText.includes("email"))
        console.log("Contains already exists:", errorText.includes("already exists"))

        if (errorText.includes("email") || errorText.includes("already exists")) {
          // Show the detailed error message from backend
          const errorMessage = response.data.message || response.data.error || "Email address already exists"
          console.log("Showing email error message:", errorMessage)
          setValidationErrors({ email: errorMessage })
          toast({
            title: "Email Already Exists",
            description: errorMessage,
            variant: "destructive",
          })
        } else {
          console.log("Showing generic error message")
          toast({
            title: "Error",
            description: response.data.message || response.data.error || "Failed to add coach.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error adding coach:", error.response?.data || error.message)
      console.error("Error response data:", error.response?.data)
      console.error("Error response status:", error.response?.status)
      console.error("Full error object:", error)

      // Check if it's an email-related error
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to add coach. Please try again."
      const isEmailError = errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("already exists")

      // Show error message in alert (simple approach)
      alert((isEmailError ? "Email Already Exists: " : "Error: ") + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateCoach = async (e) => {
    e.preventDefault()

    const errors = validateForm(formData, true)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    if (!selectedCoach) return

    try {
      setIsLoading(true)
      const updateData = {
        id: selectedCoach.id,
        // User table data
        fname: formData.fname,
        mname: formData.mname && formData.mname.trim() !== '' ? formData.mname.trim() : '',
        lname: formData.lname,
        email: formData.email,
        gender_id: selectedCoach.gender_id || 1, // Keep existing coach gender_id, default to 1 if not set
        bday: formData.bday,
        user_type_id: Number.parseInt(formData.user_type_id),
        account_status: selectedCoach.account_status || "approved", // Keep existing account_status - use deactivate button to change

        // Coaches table data
        bio: selectedCoach.bio || "", // Keep existing bio value - coaches manage it themselves
        specialty: selectedSpecialties.length > 0 ? selectedSpecialties : formData.specialty,
        experience: formData.experience,
        per_session_rate: Number.parseFloat(formData.per_session_rate) || 0.0,
        monthly_rate: formData.monthly_rate ? Number.parseFloat(formData.monthly_rate) : null,
        certifications: selectedCoach.certifications || "", // Keep existing certifications - coaches manage it themselves
        is_available: selectedCoach.is_available !== undefined ? selectedCoach.is_available : true, // Keep existing availability - coaches manage it themselves
        image_url: selectedCoach.image_url || "", // Keep existing image_url - coaches manage it themselves
      }

      console.log("Updating coach with data:", updateData)
      console.log("Account status being sent:", formData.account_status)
      console.log("Full formData being sent:", formData)

      if (formData.password && formData.password.trim() !== "") {
        updateData.password = formData.password
      }

      const response = await axios.put(API_URL, updateData, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("API Response:", response.data)

      if (response.data.success) {
        // Refresh coaches list
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        console.log("Fetched updated coaches:", updatedCoaches)
        console.log("Looking for coach ID 25:", updatedCoaches.find(c => c.id == 25))
        console.log("Coach ID 25 account_status:", updatedCoaches.find(c => c.id == 25)?.account_status)

        const enhancedCoaches = updatedCoaches.map((coach) => {
          // Enhanced frontend workaround: Always use form data for the coach we just updated
          let accountStatus = coach.account_status || "approved"

          // If this is the coach we just updated, always use the form data account_status
          if (coach.id == formData.id && formData.account_status) {
            accountStatus = formData.account_status
            console.log(`🔧 Frontend workaround: Setting account_status for coach ${coach.id} to ${accountStatus}`)
          }

          return {
            ...coach,
            fullName: `${coach.fname} ${coach.mname} ${coach.lname}`,
            bio: coach.bio || "",
            specialty: coach.specialty || "General Training",
            experience: coach.experience || "Not specified",
            rating: coach.rating || 0.0,
            total_clients: coach.total_clients || 0,
            per_session_rate: coach.per_session_rate || 0.0,
            monthly_rate: coach.monthly_rate || 0.0,
            certifications: coach.certifications || "",
            is_available: coach.is_available !== undefined ? coach.is_available : true,
            image_url: coach.image_url || "",
            account_status: accountStatus,
          }
        })

        console.log("Enhanced coaches with account_status:", enhancedCoaches.map(c => ({ id: c.id, name: c.fullName, account_status: c.account_status })))
        console.log("Coach ID 25 after enhancement:", enhancedCoaches.find(c => c.id == 25))

        setCoaches(enhancedCoaches)
        setFilteredCoaches(enhancedCoaches)
        setIsEditDialogOpen(false)
        setSelectedCoach(null)
        resetForm()

        // Refresh activity logs (stats will be recalculated automatically via useEffect)
        await fetchActivityLogs()

        const coachName = `${formData.fname}${formData.mname ? ` ${formData.mname}` : ''} ${formData.lname}`.trim()
        toast({
          title: "Coach Profile Updated",
          description: `${coachName}'s profile has been successfully updated. All changes have been saved.`,
          className: "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50",
        })
      } else {
        throw new Error(response.data.error || "Failed to update coach.")
      }
    } catch (error) {
      console.error("Error updating coach:", error.response?.data || error.message)
      if (error.response?.data?.error?.includes("email")) {
        // Show the detailed error message from backend
        const errorMessage = error.response?.data?.message || "Email address already exists"
        setValidationErrors({ email: errorMessage })
        toast({
          title: "Email Already Exists",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.response?.data?.error || "Failed to update coach.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenAddDialog = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  // Ensure form is properly reset when Add Coach dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      // Reset form completely when Add dialog opens - clear any edit data
      setFormData({
        fname: "",
        mname: "",
        lname: "",
        email: "",
        password: "",
        gender_id: "",
        bday: "",
        user_type_id: 3,
        bio: "",
        specialty: "",
        experience: "",
        per_session_rate: "300",
        package_rate: "",
        package_sessions: "",
        monthly_rate: "3200",
        certifications: "",
        is_available: true,
        image_url: "",
        account_status: "approved",
      })
      setSelectedSpecialties([])
      setCustomSpecialty("")
      setValidationErrors({})
      setShowPassword(false)
      setSelectedCoach(null) // Clear selected coach to ensure no edit data persists
      setTouchedFields({
        per_session_rate: false,
        monthly_rate: false,
      })
    }
  }, [isAddDialogOpen])

  // Clear form data when Edit dialog closes (but not when opening Add dialog)
  useEffect(() => {
    if (!isEditDialogOpen && !isAddDialogOpen) {
      // Only clear selectedCoach if both dialogs are closed
      setSelectedCoach(null)
    }
  }, [isEditDialogOpen, isAddDialogOpen])

  const handleEditCoach = (coach) => {
    console.log("Editing coach:", coach)
    console.log("Coach account_status:", coach.account_status)

    setSelectedCoach(coach)
    setFormData({
      id: coach.id,
      fname: coach.fname,
      mname: coach.mname,
      lname: coach.lname,
      email: coach.email,
      password: "", // Clear password for editing
      gender_id: coach.gender_id?.toString() || "1",
      bday: coach.bday,
      user_type_id: 3,
      bio: coach.bio || "",
      specialty: coach.specialty || "",
      experience: coach.experience || "",
      per_session_rate: coach.per_session_rate?.toString() || "",
      monthly_rate: coach.monthly_rate?.toString() || "",
      certifications: coach.certifications || "",
      is_available: coach.is_available !== undefined ? coach.is_available : true,
      image_url: coach.image_url || "",
      account_status: coach.account_status || "approved",
    })

    // Parse existing specialties for editing
    if (coach.specialty) {
      const specialties = coach.specialty.split(',').map(s => s.trim()).filter(s => s)
      setSelectedSpecialties(specialties)
    } else {
      setSelectedSpecialties([])
    }
    setCustomSpecialty("")
    setValidationErrors({})
    setIsEditDialogOpen(true)
  }


  const handleDeactivateCoach = (coach) => {
    setSelectedCoach(coach)
    setIsDeactivateDialogOpen(true)
  }

  const handleConfirmDeactivate = async () => {
    if (!selectedCoach) return
    setIsLoading(true)
    try {
      const newStatus = selectedCoach.account_status === "deactivated" ? "approved" : "deactivated"

      // Get all required fields from selectedCoach for the backend update
      // The backend requires: id, email, gender_id, fname, lname, bday, and account_status
      const response = await axios.put(API_URL, {
        id: selectedCoach.id,
        email: selectedCoach.email,
        gender_id: selectedCoach.gender_id || 1,
        fname: selectedCoach.fname,
        mname: selectedCoach.mname || "",
        lname: selectedCoach.lname,
        bday: selectedCoach.bday,
        user_type_id: 3,
        account_status: newStatus,
        // Include coach-specific fields to maintain data integrity
        bio: selectedCoach.bio || "",
        specialty: selectedCoach.specialty || "General Training",
        experience: selectedCoach.experience || "Not specified",
        per_session_rate: selectedCoach.per_session_rate || 0.0,
        monthly_rate: selectedCoach.monthly_rate || 0.0,
        certifications: selectedCoach.certifications || "",
        is_available: selectedCoach.is_available !== undefined ? selectedCoach.is_available : true,
        image_url: selectedCoach.image_url || "",
      }, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.data.success) {
        // Refresh coaches list
        const getResponse = await axios.get(API_URL)
        const updatedCoaches = getResponse.data.coaches || []
        const enhancedCoaches = updatedCoaches.map((coach) => ({
          ...coach,
          fullName: `${coach.fname} ${coach.mname} ${coach.lname}`,
          bio: coach.bio || "",
          specialty: coach.specialty || "General Training",
          experience: coach.experience || "Not specified",
          rating: coach.rating || 0.0,
          total_clients: coach.total_clients || 0,
          per_session_rate: coach.per_session_rate || 0.0,
          monthly_rate: coach.monthly_rate || 0.0,
          certifications: coach.certifications || "",
          is_available: coach.is_available !== undefined ? coach.is_available : true,
          image_url: coach.image_url || "",
          account_status: coach.account_status || "approved",
        }))

        setCoaches(enhancedCoaches)
        setFilteredCoaches(enhancedCoaches)
        setIsDeactivateDialogOpen(false)
        setSelectedCoach(null)

        // Refresh activity logs (stats will be recalculated automatically via useEffect)
        await fetchActivityLogs()

        toast({
          title: "Success",
          description: `Coach account ${newStatus === "deactivated" ? "deactivated" : "reactivated"} successfully!`,
        })
      } else {
        throw new Error(response.data.error || `Failed to ${newStatus === "deactivated" ? "deactivate" : "reactivate"} coach account`)
      }
    } catch (error) {
      console.error("Error updating coach account status:", error)
      toast({
        title: "Error",
        description: `Failed to ${selectedCoach.account_status === "deactivated" ? "reactivate" : "deactivate"} coach account. Please try again.`,
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    let filtered = coaches

    console.log("Filtering coaches - currentView:", currentView)
    console.log("All coaches before filtering:", coaches.map(c => ({ id: c.id, name: c.fullName, account_status: c.account_status })))

    // Filter by current view (active vs archive)
    if (currentView === "active") {
      filtered = filtered.filter((coach) => coach.account_status !== "deactivated")
      console.log("Active coaches after filtering:", filtered.map(c => ({ id: c.id, name: c.fullName, account_status: c.account_status })))
    } else if (currentView === "archive") {
      filtered = filtered.filter((coach) => coach.account_status === "deactivated")
      console.log("Archived coaches after filtering:", filtered.map(c => ({ id: c.id, name: c.fullName, account_status: c.account_status })))
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter((coach) => (
        coach.fullName.toLowerCase().includes(searchLower) ||
        coach.email.toLowerCase().includes(searchLower) ||
        coach.specialty.toLowerCase().includes(searchLower) ||
        coach.experience.toLowerCase().includes(searchLower)
      ))
    }

    console.log("Final filtered coaches:", filtered.map(c => ({ id: c.id, name: c.fullName, account_status: c.account_status })))

    setFilteredCoaches(filtered)
    setCurrentPage(1)
  }, [searchQuery, coaches, currentView])

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  return (
    <div className="space-y-6 pb-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-white overflow-hidden group">
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6 text-blue-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Total Coaches</p>
              <p className="text-3xl font-bold text-blue-700">{coachStats.totalCoaches}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-white overflow-hidden group">
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-100 to-green-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <CheckCircle className="h-6 w-6 text-green-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Available</p>
              <p className="text-3xl font-bold text-green-700">{coachStats.availableCoaches}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-red-50 to-white overflow-hidden group">
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-100 to-red-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <XCircle className="h-6 w-6 text-red-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unavailable</p>
              <p className="text-3xl font-bold text-red-700">{coachStats.unavailableCoaches}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-yellow-50 to-white overflow-hidden group">
          <CardContent className="flex items-center p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 mr-4 shadow-md group-hover:scale-110 transition-transform">
              <Star className="h-6 w-6 text-yellow-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Avg Rating</p>
              <p className="text-3xl font-bold text-yellow-700">{coachStats.averageRating}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Coaches List Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center text-xl font-bold text-gray-800 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                Manage Coach
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 ml-11">
                View and manage all registered coaches
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentView(currentView === "active" ? "archive" : "active")}
                className={`h-10 px-4 font-medium transition-all ${
                  currentView === "active"
                    ? "bg-white text-gray-900 border-2 border-gray-200 hover:bg-gray-50 shadow-sm"
                    : "bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200"
                }`}
              >
                {currentView === "active" ? "Active Coach" : "Deactivated"}
              </Button>
              <Button onClick={handleOpenAddDialog} className="flex items-center gap-2 h-10 px-4 font-medium shadow-md hover:shadow-lg transition-all duration-200">
                <Plus className="h-4 w-4" />
                Add New Coach
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search coaches by name, email, specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Coaches Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="min-w-[200px] font-semibold text-gray-700">Coach</TableHead>
                  <TableHead className="min-w-[150px] font-semibold text-gray-700">Contact</TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-gray-700">Specialty</TableHead>
                  <TableHead className="min-w-[100px] font-semibold text-gray-700">Experience</TableHead>
                  <TableHead className="min-w-[100px] font-semibold text-gray-700">Per Session</TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-gray-700">Monthly Plan</TableHead>
                  <TableHead className="min-w-[80px] font-semibold text-gray-700">Rating</TableHead>
                  <TableHead className="min-w-[100px] font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-gray-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <span className="text-sm text-muted-foreground">Loading coaches...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : currentCoaches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">No coaches found</p>
                        <p className="text-xs text-muted-foreground mt-1">Try a different search or add a new coach</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentCoaches.map((coach) => (
                    <TableRow key={coach.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {coach.image_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                              src={coach.image_url || "/placeholder.svg"}
                              alt={coach.fullName}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{coach.fullName}</div>
                            <div className="text-xs text-gray-600">{coach.total_clients} clients</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">{coach.email}</div>
                          <div className="text-xs text-gray-600">{coach.gender}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">{coach.specialty}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">{coach.experience}</TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">₱{coach.per_session_rate}</TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {coach.monthly_rate ? (
                          <div>
                            <div className="font-medium text-gray-900">₱{coach.monthly_rate}</div>
                            <div className="text-xs text-gray-600">(18 sessions)</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1 fill-yellow-400" />
                          <span className="text-sm font-medium text-gray-900">{coach.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={coach.is_available ? "default" : "secondary"}
                          className={`text-xs ${coach.is_available ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                        >
                          {coach.is_available ? "Available" : "Unavailable"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditCoach(coach)} className="h-8">
                            <Edit className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          {coach.account_status !== "deactivated" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateCoach(coach)}
                              className="h-8 text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                              title="Deactivate Account"
                            >
                              <PowerOff className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivateCoach(coach)}
                              className="h-8 text-gray-600 hover:text-green-600 hover:bg-green-50"
                              title="Reactivate Account"
                            >
                              <RotateCw className="h-3.5 w-3.5" />
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{indexOfFirstCoach + 1}</span> to{" "}
                <span className="font-semibold text-gray-900">{Math.min(indexOfLastCoach, filteredCoaches.length)}</span> of{" "}
                <span className="font-semibold text-gray-900">{filteredCoaches.length}</span> coaches
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <Button
                      key={number}
                      variant={currentPage === number ? "default" : "outline"}
                      size="sm"
                      onClick={() => paginate(number)}
                      className="h-9 min-w-[36px]"
                    >
                      {number}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-9"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                Recent Activity
              </CardTitle>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-32 h-9 border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 overflow-y-auto space-y-4 pr-2">
              {getFilteredActivities().length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">No recent activity</p>
                </div>
              ) : (
                getFilteredActivities().map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 break-words">{activity.activity}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/50">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Award className="h-4 w-4 text-primary" />
              </div>
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span className="text-sm text-gray-700">Active Coaches:</span>
                <span className="font-semibold text-gray-900">{coachStats.availableCoaches}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span className="text-sm text-gray-700">Average Rating:</span>
                <span className="font-semibold text-gray-900">{coachStats.averageRating}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span className="text-sm text-gray-700">Total Clients:</span>
                <span className="font-semibold text-gray-900">{coachStats.totalClients}</span>
              </div>
              {coachStats.specialtyDistribution.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">Top Specialties:</p>
                  <div className="space-y-2">
                    {coachStats.specialtyDistribution.slice(0, 3).map((specialty, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 rounded bg-gray-50">
                        <span className="text-gray-700">{specialty.specialty}</span>
                        <span className="font-semibold text-gray-900">{specialty.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Coach Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            // Reset form when dialog closes
            resetForm()
            setSelectedCoach(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Add New Coach
            </DialogTitle>
            <DialogDescription className="text-base">
              Enter the complete details for the new coach. This will create entries in both User and Coaches tables.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCoach} className="space-y-6 py-4">
            {/* Personal Information Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fname" className="text-sm font-medium">First Name</Label>
                    <Input
                      id="fname"
                      name="fname"
                      placeholder="John"
                      value={formData.fname}
                      onChange={handleInputChange}
                      className={`h-11 ${validationErrors.fname ? "border-red-500" : ""}`}
                    />
                    {validationErrors.fname && <p className="text-sm text-red-500">{validationErrors.fname}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mname" className="text-sm font-medium">Middle Name (optional)</Label>
                    <Input
                      id="mname"
                      name="mname"
                      placeholder="Michael"
                      value={formData.mname || ""}
                      onChange={handleInputChange}
                      className={`h-11 ${validationErrors.mname ? "border-red-500" : ""}`}
                    />
                    {validationErrors.mname && <p className="text-sm text-red-500">{validationErrors.mname}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lname" className="text-sm font-medium">Last Name</Label>
                <Input
                  id="lname"
                  name="lname"
                  placeholder="Doe"
                  value={formData.lname}
                  onChange={handleInputChange}
                  className={`h-11 ${validationErrors.lname ? "border-red-500" : ""}`}
                />
                {validationErrors.lname && <p className="text-sm text-red-500">{validationErrors.lname}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`h-11 ${validationErrors.email ? "border-red-500" : ""}`}
                />
                {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password || generateCoachPassword(formData.fname, formData.mname, formData.lname)}
                    readOnly
                    className="bg-blue-50 border-blue-200 text-blue-900 cursor-not-allowed h-11 pr-36 font-mono"
                    onFocus={(e) => e.target.blur()}
                    tabIndex={-1}
                    onChange={(e) => {
                      // Always reset to generated password if user tries to change it
                      const generatedPwd = generateCoachPassword(formData.fname, formData.mname, formData.lname)
                      setFormData({ ...formData, password: generatedPwd })
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
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                  <p className="text-xs text-blue-800 flex items-start gap-2">
                    <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Standard password is automatically set.</strong> The default password meets all security requirements.
                    </span>
                  </p>
                </div>
                {validationErrors.password && <p className="text-sm text-red-500">{validationErrors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bday" className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Date of Birth
                </Label>
                <Input
                  type="date"
                  id="bday"
                  name="bday"
                  value={formData.bday}
                  onChange={handleInputChange}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  className={`h-11 ${validationErrors.bday ? "border-red-500" : ""}`}
                />
                {validationErrors.bday && <p className="text-sm text-red-500">{validationErrors.bday}</p>}
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="specialty" className="text-sm font-medium">Specialties</Label>

                  {/* Selected Specialties Display */}
                  {selectedSpecialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedSpecialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                          {specialty}
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecialty(specialty)}
                            className="ml-1 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Predefined Specialty Options */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {specialtyOptions.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => handleSpecialtyToggle(specialty)}
                        className={`p-2 text-sm border rounded-md text-left transition-colors ${selectedSpecialties.includes(specialty)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>

                  {/* Custom Specialty Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom specialty..."
                      value={customSpecialty}
                      onChange={(e) => setCustomSpecialty(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSpecialty())}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddCustomSpecialty}
                      disabled={!customSpecialty.trim()}
                    >
                      Add
                    </Button>
                  </div>

                  {validationErrors.specialty && <p className="text-sm text-red-500">{validationErrors.specialty}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience" className="text-sm font-medium">Experience Level</Label>
                  <Select
                    value={formData.experience}
                    onValueChange={(value) => handleSelectChange("experience", value)}
                  >
                    <SelectTrigger className={`h-11 ${validationErrors.experience ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceOptions.map((exp) => (
                        <SelectItem key={exp} value={exp}>
                          {exp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.experience && <p className="text-sm text-red-500">{validationErrors.experience}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="per_session_rate" className="text-sm font-medium">Per Session Rate (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="per_session_rate"
                    name="per_session_rate"
                    placeholder="300.00"
                    value={formData.per_session_rate}
                    onChange={handleInputChange}
                    className={`h-11 ${validationErrors.per_session_rate ? "border-red-500" : ""
                      } ${!touchedFields.per_session_rate && formData.per_session_rate === "300"
                        ? "text-gray-400"
                        : "text-gray-900"
                      }`}
                    style={{
                      color: !touchedFields.per_session_rate && formData.per_session_rate === "300"
                        ? "#9CA3AF"
                        : "#111827"
                    }}
                  />
                  {validationErrors.per_session_rate && (
                    <p className="text-sm text-red-500">{validationErrors.per_session_rate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_rate" className="text-sm font-medium">Monthly Plan Rate (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="monthly_rate"
                    name="monthly_rate"
                    placeholder="3200.00"
                    value={formData.monthly_rate}
                    onChange={handleInputChange}
                    className={`h-11 ${!touchedFields.monthly_rate && formData.monthly_rate === "3200"
                      ? "text-gray-400"
                      : "text-gray-900"
                      }`}
                    style={{
                      color: !touchedFields.monthly_rate && formData.monthly_rate === "3200"
                        ? "#9CA3AF"
                        : "#111827"
                    }}
                  />
                  <p className="text-xs text-gray-500">18 sessions per month</p>
                  {validationErrors.monthly_rate && (
                    <p className="text-sm text-red-500">{validationErrors.monthly_rate}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  resetForm()
                }}
                className="h-11 px-6"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="h-11 px-6 bg-primary hover:bg-primary/90">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <User className="mr-2 h-4 w-4" />
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Coach Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            // Clear form data when Edit dialog closes
            setSelectedCoach(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <Edit className="h-6 w-6 text-primary" />
              Edit Coach
            </DialogTitle>
            <DialogDescription className="text-base">
              Update the coach's information in both User and Coaches tables.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCoach} className="space-y-6 py-4">
            {/* Personal Information Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-fname">First Name</Label>
                    <Input
                      id="edit-fname"
                      name="fname"
                      placeholder="John"
                      value={formData.fname}
                      onChange={handleInputChange}
                      className={`h-11 ${validationErrors.fname ? "border-red-500" : ""}`}
                    />
                    {validationErrors.fname && <p className="text-sm text-red-500">{validationErrors.fname}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-mname">Middle Name (optional)</Label>
                    <Input
                      id="edit-mname"
                      name="mname"
                      placeholder="Michael"
                      value={formData.mname || ""}
                      onChange={handleInputChange}
                      className={`h-11 ${validationErrors.mname ? "border-red-500" : ""}`}
                    />
                    {validationErrors.mname && <p className="text-sm text-red-500">{validationErrors.mname}</p>}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lname">Last Name</Label>
                <Input
                  id="edit-lname"
                  name="lname"
                  placeholder="Doe"
                  value={formData.lname}
                  onChange={handleInputChange}
                  className={`h-11 ${validationErrors.lname ? "border-red-500" : ""}`}
                />
                {validationErrors.lname && <p className="text-sm text-red-500">{validationErrors.lname}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    type="email"
                    id="edit-email"
                    name="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`h-11 ${validationErrors.email ? "border-red-500" : ""}`}
                  />
                  {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-password" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showEditPassword ? "text" : "password"}
                      id="edit-password"
                      name="password"
                      placeholder="Leave blank to keep current"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`h-11 ${validationErrors.password ? "border-red-500 pr-10" : "pr-10"}`}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && <p className="text-sm text-red-500">{validationErrors.password}</p>}
                  <p className="text-xs text-gray-500">
                    If changing password: 8+ characters with uppercase, number, and special character
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bday" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Date of Birth
                </Label>
                <Input
                  type="date"
                  id="edit-bday"
                  name="bday"
                  value={formData.bday}
                  onChange={handleInputChange}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  className={`h-11 ${validationErrors.bday ? "border-red-500" : ""}`}
                />
                {validationErrors.bday && <p className="text-sm text-red-500">{validationErrors.bday}</p>}
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-specialty" className="text-sm font-medium">Specialties</Label>

                  {/* Selected Specialties Display */}
                  {selectedSpecialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedSpecialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                          {specialty}
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecialty(specialty)}
                            className="ml-1 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Predefined Specialty Options */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {specialtyOptions.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => handleSpecialtyToggle(specialty)}
                        className={`p-2 text-sm border rounded-md text-left transition-colors ${selectedSpecialties.includes(specialty)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>

                  {/* Custom Specialty Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom specialty..."
                      value={customSpecialty}
                      onChange={(e) => setCustomSpecialty(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSpecialty())}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddCustomSpecialty}
                      disabled={!customSpecialty.trim()}
                    >
                      Add
                    </Button>
                  </div>

                  {validationErrors.specialty && <p className="text-sm text-red-500">{validationErrors.specialty}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-experience" className="text-sm font-medium">Experience Level</Label>
                  <Select
                    value={formData.experience}
                    onValueChange={(value) => handleSelectChange("experience", value)}
                  >
                    <SelectTrigger className={`h-11 ${validationErrors.experience ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceOptions.map((exp) => (
                        <SelectItem key={exp} value={exp}>
                          {exp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.experience && <p className="text-sm text-red-500">{validationErrors.experience}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-per_session_rate" className="text-sm font-medium">Per Session Rate (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="edit-per_session_rate"
                    name="per_session_rate"
                    placeholder="500.00"
                    value={formData.per_session_rate}
                    onChange={handleInputChange}
                    className={`h-11 ${validationErrors.per_session_rate ? "border-red-500" : ""}`}
                  />
                  {validationErrors.per_session_rate && (
                    <p className="text-sm text-red-500">{validationErrors.per_session_rate}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-monthly_rate" className="text-sm font-medium">Monthly Plan Rate (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="edit-monthly_rate"
                    name="monthly_rate"
                    placeholder="8000.00"
                    value={formData.monthly_rate}
                    onChange={handleInputChange}
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500">18 sessions per month</p>
                  {validationErrors.monthly_rate && (
                    <p className="text-sm text-red-500">{validationErrors.monthly_rate}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false)
                  setSelectedCoach(null)
                  resetForm()
                }}
                className="h-11 px-6"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="h-11 px-6 bg-primary hover:bg-primary/90">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Edit className="mr-2 h-4 w-4" />
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Reactivate Confirmation Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCoach?.account_status === "deactivated" ? (
                <>
                  <RotateCw className="h-5 w-5 text-green-600" />
                  Reactivate Account
                </>
              ) : (
                <>
                  <PowerOff className="h-5 w-5 text-orange-600" />
                  Deactivate Account
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedCoach?.account_status === "deactivated"
                ? "Are you sure you want to reactivate this coach account? The coach will be able to access the system again and can be assigned to members."
                : "Are you sure you want to deactivate this coach account? The coach will not be able to access the system and cannot be assigned to members until reactivated."}
            </DialogDescription>
          </DialogHeader>
          {selectedCoach && (
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedCoach.fullName}</p>
                    <p className="text-sm text-muted-foreground">{selectedCoach.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Current Status:</span>
                  </div>
                  <div>
                    <Badge
                      variant={selectedCoach.account_status === "deactivated" ? "secondary" : "default"}
                      className={selectedCoach.account_status === "deactivated"
                        ? "bg-gray-50 text-gray-700 border-gray-200"
                        : "bg-green-50 text-green-700 border-green-200"}
                    >
                      {selectedCoach.account_status === "deactivated" ? "Deactivated" : "Active"}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Specialty:</span> {selectedCoach.specialty}
                  </div>
                  <div>
                    <span className="font-medium">Experience:</span> {selectedCoach.experience}
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-md border ${selectedCoach.account_status === "deactivated"
                ? "bg-green-50 border-green-200"
                : "bg-orange-50 border-orange-200"
                }`}>
                <p className={`text-sm ${selectedCoach.account_status === "deactivated"
                  ? "text-green-800"
                  : "text-orange-800"
                  }`}>
                  <strong>Note:</strong>{" "}
                  {selectedCoach.account_status === "deactivated"
                    ? "Reactivating this account will restore access to the system and allow the coach to be assigned to members again."
                    : "Deactivating this account will prevent the coach from accessing the system and they cannot be assigned to members. The account can be reactivated at any time."}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeactivateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeactivate}
              disabled={isLoading}
              className={
                selectedCoach?.account_status === "deactivated"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedCoach?.account_status === "deactivated" ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Reactivate
                </>
              ) : (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default ViewCoach
