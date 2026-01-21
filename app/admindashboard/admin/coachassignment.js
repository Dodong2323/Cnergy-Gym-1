"use client"

import { useState, useEffect, useMemo } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Search,
  XCircle,
  RefreshCw,
  Users,
  UserCheck,
  Filter,
  CheckCircle2,
  XCircle as XCircleIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
  TrendingUp,
  X,
  User,
  UserPlus,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = "https://api.cnergy.site/admin_coach.php"
const COACH_API_URL = "https://api.cnergy.site/addcoach.php"

const ITEMS_PER_PAGE = 10

const CoachAssignments = ({ userId }) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Enhanced filters
  const [selectedCoachFilter, setSelectedCoachFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("active") // Changed default to 'active'
  const [rateTypeFilter, setRateTypeFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [coachMembersRateFilter, setCoachMembersRateFilter] = useState("all")
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  
  const [availableCoaches, setAvailableCoaches] = useState([])
  const [selectedCoachId, setSelectedCoachId] = useState("")
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [availableMembers, setAvailableMembers] = useState([])
  const [rateType, setRateType] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const { toast } = useToast()

  const [currentUserId, setCurrentUserId] = useState(6)

  // Data states
  const [assignedMembers, setAssignedMembers] = useState([])
  const [dashboardStats, setDashboardStats] = useState({
    assigned_members: 0,
    total_coaches: 0,
    total_members: 0,
  })

  const fetchAssignedMembers = async (status = 'active') => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=assigned-members&status=${status}`)
      if (response.data.success) {
        setAssignedMembers(response.data.assignments || [])
      } else {
        throw new Error(response.data.message || "Failed to fetch assigned members")
      }
    } catch (err) {
      console.error("Error fetching assigned members:", err)
      setError("Failed to load assigned members")
    }
  }

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=dashboard-stats`)
      if (response.data.success) {
        setDashboardStats(response.data.stats)
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err)
    }
  }

  const handleAssignCoach = async () => {
    const memberId = selectedMemberId || selectedMember?.id
    if (!memberId || !selectedCoachId) {
      setError("Please select both a member and a coach")
      return
    }

    if (!selectedCoach) {
      setError("Please select a coach")
      return
    }

    let paymentAmount = 0
    switch (rateType) {
      case "monthly":
        paymentAmount = selectedCoach.monthly_rate || 0
        break
      case "package":
        paymentAmount = selectedCoach.session_package_rate || 0
        break
      case "per_session":
        paymentAmount = selectedCoach.per_session_rate || 0
        break
    }

    if (paymentMethod === "cash") {
      const received = parseFloat(amountReceived) || 0
      if (received < paymentAmount) {
        setError(`Amount received (₱${received.toFixed(2)}) is less than required amount (₱${paymentAmount.toFixed(2)})`)
        return
      }
    }

    setActionLoading(true)
    setError(null)
    try {
      const effectiveUserId = currentUserId || userId
      
      const assignResponse = await axios.post(`${API_BASE_URL}?action=assign-coach`, {
        member_id: memberId,
        coach_id: selectedCoachId,
        admin_id: effectiveUserId,
        staff_id: effectiveUserId,
        rate_type: rateType,
      })

      if (!assignResponse.data.success) {
        throw new Error(assignResponse.data.message || "Failed to assign coach")
      }

      if (paymentAmount > 0) {
        const paymentData = {
          request_id: assignResponse.data.data?.assignment_id,
          admin_id: effectiveUserId,
          staff_id: effectiveUserId,
          payment_method: paymentMethod,
          amount_received: paymentMethod === "cash" ? parseFloat(amountReceived) : paymentAmount,
          cashier_id: effectiveUserId,
          receipt_number: paymentMethod === "gcash" && referenceNumber ? referenceNumber : undefined,
        }

        const paymentResponse = await axios.post(`${API_BASE_URL}?action=approve-request-with-payment`, paymentData)
        
        if (!paymentResponse.data.success) {
          throw new Error(paymentResponse.data.message || "Coach assigned but payment processing failed")
        }
      }

      const memberName = selectedMember?.fullName || selectedMember?.name || `member #${memberId}`
      const coachName = selectedCoach?.name || `Coach #${selectedCoachId}`
      await Promise.all([fetchAssignedMembers(), fetchDashboardStats(), fetchAvailableMembers()])
      setAssignModalOpen(false)
      setSelectedMember(null)
      setSelectedMemberId("")
      setSelectedCoachId("")
      setSelectedCoach(null)
      setRateType("monthly")
      setPaymentMethod("cash")
      setAmountReceived("")
      setReferenceNumber("")
      setCurrentPage(1)
      toast({
        title: "Coach assignment confirmed",
        description: `${coachName} is now coaching ${memberName}.`,
      })
    } catch (err) {
      console.error("Error assigning coach:", err)
      setError("Failed to assign coach: " + (err.response?.data?.message || err.message))
    } finally {
      setActionLoading(false)
    }
  }

  const fetchAvailableCoaches = async () => {
    try {
      const response = await axios.get(COACH_API_URL)
      if (response.data && response.data.coaches) {
        const coachesMap = new Map()
        response.data.coaches.forEach(coach => {
          if (coach.id && !coachesMap.has(coach.id)) {
            coachesMap.set(coach.id, {
              id: coach.id,
              name: `${coach.fname} ${coach.mname} ${coach.lname}`.trim(),
              monthly_rate: coach.monthly_rate || 0,
              session_package_rate: coach.session_package_rate || coach.package_rate || 0,
              per_session_rate: coach.per_session_rate || 0,
              is_available: coach.is_available !== undefined && coach.is_available !== null ? Boolean(coach.is_available) : true
            })
          }
        })
        setAvailableCoaches(Array.from(coachesMap.values()))
      }
    } catch (err) {
      console.error("Error fetching coaches:", err)
    }
  }

  const fetchAvailableMembers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?action=available-members`)
      if (response.data.success) {
        const membersMap = new Map()
        const members = response.data.members || []
        members.forEach(member => {
          if (member.id && !membersMap.has(member.id)) {
            membersMap.set(member.id, member)
          }
        })
        setAvailableMembers(Array.from(membersMap.values()))
      }
    } catch (err) {
      console.error("Error fetching available members:", err)
    }
  }

  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchAssignedMembers(statusFilter), fetchDashboardStats(), fetchAvailableCoaches(), fetchAvailableMembers()])
    } catch (err) {
      console.error("Error loading data:", err)
      setError("Failed to load data")
    } finally {
      setLoading(false)
    }
  }
  
  // Update assigned members when status filter changes
  useEffect(() => {
    if (!loading) {
      fetchAssignedMembers(statusFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  useEffect(() => {
    const getCurrentUser = async () => {
      const storedUserId = sessionStorage.getItem("user_id")
      if (storedUserId) {
        setCurrentUserId(parseInt(storedUserId))
        return
      }

      try {
        const response = await axios.get('https://api.cnergy.site/session.php', {
          withCredentials: true
        })
        if (response.data && response.data.authenticated && response.data.user_id) {
          setCurrentUserId(response.data.user_id)
          sessionStorage.setItem("user_id", response.data.user_id)
          return
        }
      } catch (err) {
        if (err.response && err.response.status === 401) {
          if (err.response.data && err.response.data.authenticated && err.response.data.user_id) {
            setCurrentUserId(err.response.data.user_id)
            sessionStorage.setItem("user_id", err.response.data.user_id)
            return
          }
        }
        if (!err.response || err.response.status !== 401) {
          console.error("Error getting current user from session:", err)
        }
      }

      try {
        const response = await axios.get(`${API_BASE_URL}?action=get-current-user`)
        if (response.data && response.data.success && response.data.user_id) {
          setCurrentUserId(response.data.user_id)
          sessionStorage.setItem("user_id", response.data.user_id)
        }
      } catch (err) {
        if (!err.response || err.response.status !== 401) {
          console.error("Error getting current user from API:", err)
        }
      }
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    loadAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchAssignedMembers(statusFilter)
      fetchDashboardStats()
      fetchAvailableMembers()
    }, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAssignModal = (member = null) => {
    if (member) {
      setSelectedMember(member)
      setSelectedMemberId(member.id)
    } else {
      setSelectedMember(null)
      setSelectedMemberId("")
    }
    setSelectedCoachId("")
    setSelectedCoach(null)
    setRateType("")
    setPaymentMethod("cash")
    setAmountReceived("")
    setReferenceNumber("")
    setAssignModalOpen(true)
  }

  const openManualConnectionModal = () => {
    setSelectedMember(null)
    setSelectedMemberId("")
    setSelectedCoachId("")
    setSelectedCoach(null)
    setRateType("")
    setPaymentMethod("cash")
    setAmountReceived("")
    setReferenceNumber("")
    setAssignModalOpen(true)
  }

  const handleCoachSelect = (coachId) => {
    setSelectedCoachId(coachId)
    const coach = availableCoaches.find(c => c.id.toString() === coachId.toString())
    setSelectedCoach(coach || null)
    setRateType("")
    setAmountReceived("")
  }

  const calculatePaymentAmount = () => {
    if (!selectedCoach) return 0
    switch (rateType) {
      case "monthly":
        return selectedCoach.monthly_rate || 0
      case "package":
        return selectedCoach.session_package_rate || 0
      case "per_session":
        return selectedCoach.per_session_rate || 0
      default:
        return 0
    }
  }

  const calculateChange = () => {
    if (paymentMethod !== "cash" || !amountReceived) return 0
    const received = parseFloat(amountReceived) || 0
    const amount = calculatePaymentAmount()
    return Math.max(0, received - amount)
  }

  const formatDateShort = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "N/A"
    return date.toLocaleDateString("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getInitials = (name) => {
    if (!name) return "??"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const isDateRecent = (dateString, days = 7) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= days
  }

  const isDateThisMonth = (dateString) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }

  // Enhanced filtering with pagination
  const filteredMembers = useMemo(() => {
    return assignedMembers.filter((assignment) => {
      // Coach filter
      if (selectedCoachFilter !== "all" && assignment.coach?.id?.toString() !== selectedCoachFilter) {
        return false
      }

      // Status filter - backend already handles this, but keep for client-side filtering if needed
      if (statusFilter !== "all") {
        const isExpired = assignment.status === 'expired' || 
          (assignment.expiresAt && new Date(assignment.expiresAt) < new Date())
        if (statusFilter === "active" && isExpired) return false
        if (statusFilter === "expired" && !isExpired) return false
      }

      // Rate type filter
      if (rateTypeFilter !== "all" && assignment.rateType !== rateTypeFilter) {
        return false
      }

      // Date filter
      if (dateFilter !== "all") {
        const assignedDate = assignment.assignedAt
        if (dateFilter === "today" && !isDateRecent(assignedDate, 0)) return false
        if (dateFilter === "week" && !isDateRecent(assignedDate, 7)) return false
        if (dateFilter === "month" && !isDateThisMonth(assignedDate)) return false
      }

      // Search query
      const matchesSearch =
        assignment.member?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.coach?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.member?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assignment.coach?.email?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch
    })
  }, [assignedMembers, selectedCoachFilter, statusFilter, rateTypeFilter, dateFilter, searchQuery])

  // Get members for selected coach
  const coachMembers = useMemo(() => {
    if (selectedCoachFilter === "all") return []
    let members = filteredMembers.filter(assignment => assignment.coach?.id?.toString() === selectedCoachFilter)
    
    // Apply subscription/rate type filter for coach members
    if (coachMembersRateFilter !== "all") {
      members = members.filter(assignment => {
        const assignmentRateType = assignment.rateType || ""
        return assignmentRateType.toLowerCase() === coachMembersRateFilter.toLowerCase()
      })
    }
    
    return members
  }, [filteredMembers, selectedCoachFilter, coachMembersRateFilter])

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCoachFilter, statusFilter, rateTypeFilter, dateFilter, searchQuery])

  const clearFilters = () => {
    setSelectedCoachFilter("all")
    setStatusFilter("all")
    setRateTypeFilter("all")
    setDateFilter("all")
    setSearchQuery("")
    setCurrentPage(1)
  }

  const hasActiveFilters = selectedCoachFilter !== "all" || statusFilter !== "all" || rateTypeFilter !== "all" || dateFilter !== "all" || searchQuery !== ""

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading coach assignments...</span>
        </div>
      </div>
    )
  }

  const selectedCoachName = availableCoaches.find(c => c.id.toString() === selectedCoachFilter)?.name || ""

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-red-600 hover:text-red-700"
              onClick={() => {
                setError(null)
                loadAllData()
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Dashboard Stats - Matching Monitoring Subscription Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white via-slate-50 to-white overflow-hidden group">
          <CardContent className="flex items-center p-8 relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-slate-100 rounded-full -mr-20 -mt-20 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mr-6 shadow-lg group-hover:scale-110 transition-transform">
              <UserCheck className="h-8 w-8 text-slate-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Assigned Members
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">{dashboardStats.assigned_members || assignedMembers.length}</p>
              <p className="text-sm text-slate-500">Active assignments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-orange-50 via-white to-orange-50 overflow-hidden group">
          <CardContent className="flex items-center p-8 relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100 rounded-full -mr-20 -mt-20 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 mr-6 shadow-lg group-hover:scale-110 transition-transform">
              <Users className="h-8 w-8 text-orange-700" />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Total Coaches
              </p>
              <p className="text-4xl font-bold text-slate-900 mb-1">{dashboardStats.total_coaches}</p>
              <p className="text-sm text-slate-500">Available coaches</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - All Coaches */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Coaches
                  </CardTitle>
                  <CardDescription className="mt-1">Select a coach to view their assigned members</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadAllData} 
                    disabled={loading} 
                    className="shadow-sm h-9 w-9 p-0"
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button 
                    onClick={openManualConnectionModal}
                    className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                    size="sm"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    New Assignment
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search coaches by name..."
                  className="pl-10 h-11 border-gray-200 focus:border-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Coaches List */}
              <div className="space-y-3">
                {availableCoaches
                  .filter(coach => {
                    if (!searchQuery) return true
                    return coach.name.toLowerCase().includes(searchQuery.toLowerCase())
                  })
                  .map((coach) => {
                    const memberCount = assignedMembers.filter(assignment => assignment.coach?.id?.toString() === coach.id.toString()).length
                    const isSelected = selectedCoachFilter === coach.id.toString()
                    return (
                      <div
                        key={coach.id}
                        onClick={() => setSelectedCoachFilter(coach.id.toString())}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-100'
                                : 'bg-gray-100'
                            }`}>
                              <User className={`h-6 w-6 ${
                                isSelected ? 'text-blue-700' : 'text-gray-700'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-semibold text-base ${
                                  isSelected ? 'text-blue-900' : 'text-foreground'
                                }`}>
                                  {coach.name}
                                </h3>
                                {coach.is_available ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Available
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800 text-xs">
                                    <XCircleIcon className="h-3 w-3 mr-1" />
                                    Unavailable
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {memberCount} member{memberCount !== 1 ? 's' : ''}
                                </span>
                                {coach.monthly_rate > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Package className="h-4 w-4" />
                                    ₱{coach.monthly_rate.toFixed(0)}/monthly
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="ml-4">
                              <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                
                {availableCoaches.filter(coach => {
                  if (!searchQuery) return true
                  return coach.name.toLowerCase().includes(searchQuery.toLowerCase())
                }).length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No coaches found</p>
                    {searchQuery && (
                      <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Coach Members */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedCoachFilter !== "all" ? `${selectedCoachName}'s Members` : "Select a Coach"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {selectedCoachFilter !== "all" 
                      ? `Members assigned to this coach (${coachMembers.length})`
                      : "Filter by coach to see members"}
                  </CardDescription>
                </div>
              </div>
              {selectedCoachFilter !== "all" && (
                <div className="mt-4 space-y-3">
                  {/* Status Filter Tabs */}
                  <div className="flex gap-2 border-b">
                    <button
                      onClick={() => setStatusFilter("active")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        statusFilter === "active"
                          ? "border-emerald-500 text-emerald-600"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setStatusFilter("expired")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        statusFilter === "expired"
                          ? "border-gray-500 text-gray-600"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Expired
                    </button>
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        statusFilter === "all"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All
                    </button>
                  </div>
                  {/* Subscription Filter */}
                  <Select value={coachMembersRateFilter} onValueChange={setCoachMembersRateFilter}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Filter by subscription..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subscriptions</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="per_session">Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[600px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {selectedCoachFilter === "all" ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <User className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">Select a coach</p>
                    <p className="text-xs text-muted-foreground mt-1">from the left to view their members</p>
                  </div>
                ) : coachMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <User className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {coachMembersRateFilter !== "all" 
                        ? "No members found with this subscription type"
                        : "No members assigned to this coach yet"}
                    </p>
                    {coachMembersRateFilter !== "all" && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => setCoachMembersRateFilter("all")}
                        className="text-xs mt-2"
                      >
                        Clear filter
                      </Button>
                    )}
                  </div>
                ) : (
                  coachMembers.map((assignment) => {
                    const isExpired = assignment.status === 'expired' || 
                      (assignment.expiresAt && new Date(assignment.expiresAt) < new Date())
                    return (
                      <div 
                        key={assignment.id} 
                        className={`border rounded-lg p-3 transition-colors ${
                          isExpired 
                            ? 'bg-gray-50/50 opacity-75 border-gray-200 hover:bg-gray-100/50' 
                            : 'hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className={`h-10 w-10 border-2 ${
                            isExpired ? 'border-gray-200' : 'border-gray-100'
                          }`}>
                            <AvatarImage src="/placeholder.svg?height=40&width=40" />
                            <AvatarFallback className={`font-semibold text-xs ${
                              isExpired 
                                ? 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-500' 
                                : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
                            }`}>
                              {getInitials(assignment.member?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium text-sm truncate ${
                              isExpired ? 'text-gray-500' : 'text-foreground'
                            }`}>
                              {assignment.member?.name || "Unknown"}
                            </div>
                            <div className={`text-xs truncate ${
                              isExpired ? 'text-gray-400' : 'text-muted-foreground'
                            }`}>
                              {assignment.member?.email}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <Badge 
                                variant="default" 
                                className={`text-xs ${
                                  isExpired
                                    ? 'bg-gray-300 text-gray-700 border-gray-400'
                                    : assignment.status === 'active' 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {isExpired ? 'Expired' : (assignment.status || "active")}
                              </Badge>
                              {assignment.rateType && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                                >
                                  <Package className="h-3 w-3 mr-1" />
                                  {assignment.rateType === 'monthly' ? 'Monthly' : 
                                   assignment.rateType === 'per_session' ? 'Session' : 
                                   assignment.rateType}
                                </Badge>
                              )}
                              <span className={`text-xs ${
                                isExpired ? 'text-gray-400' : 'text-muted-foreground'
                              }`}>
                                {assignment.expiresAt ? `Exp: ${formatDateShort(assignment.expiresAt)}` : formatDateShort(assignment.assignedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Coach Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-slate-700" />
              New Coach Assignment
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Assign a coach to a member and process payment if applicable.
            </p>
          </DialogHeader>
          <div className="space-y-6 pt-6">
            {/* Member Selection */}
            {!selectedMember && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Select Member
                </label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Search and select a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.length === 0 ? (
                      <SelectItem value="no-members" disabled>No members available</SelectItem>
                    ) : (
                      Array.from(new Map(availableMembers.map(member => [member.id, member])).values()).map((member, index) => (
                        <SelectItem key={`member-${member.id}-${index}`} value={member.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{member.name}</span>
                            <span className="text-xs text-muted-foreground">{member.email}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Selected Member Display */}
            {selectedMember && (
              <div className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-lg border-2 border-slate-200">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-slate-300">
                    <AvatarImage src="/placeholder.svg?height=48&width=48" />
                    <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 font-bold">
                      {getInitials(selectedMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-base text-foreground">{selectedMember.name || "Unknown"}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{selectedMember.email || "N/A"}</div>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Selected
                  </Badge>
                </div>
              </div>
            )}

            {/* Coach Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Coach
              </label>
              <Select value={selectedCoachId} onValueChange={handleCoachSelect}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Search and select a coach..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCoaches.length === 0 ? (
                    <SelectItem value="no-coaches" disabled>No coaches available</SelectItem>
                  ) : (
                    Array.from(new Map(availableCoaches.map(coach => [coach.id, coach])).values()).map((coach, index) => (
                      <SelectItem key={`coach-${coach.id}-${index}`} value={coach.id.toString()} disabled={!coach.is_available}>
                        <div className="flex items-center gap-2 w-full">
                          {coach.is_available ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )}
                          <span className="font-medium">{coach.name}</span>
                          {!coach.is_available && (
                            <Badge variant="secondary" className="ml-auto text-xs">Unavailable</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedCoach && (
                <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                  selectedCoach.is_available 
                    ? 'bg-emerald-50 text-emerald-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {selectedCoach.is_available ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Coach is available</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-4 w-4" />
                      <span className="font-medium">Coach is currently unavailable</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Package Type Selection */}
            {selectedCoach && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Select Package Type
                </label>
                <Select value={rateType} onValueChange={(value) => { 
                  setRateType(value)
                  setAmountReceived("")
                  setReferenceNumber("")
                }}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose a package type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCoach.monthly_rate > 0 && (
                      <SelectItem value="monthly">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">Monthly Package</span>
                          <span className="text-sm text-muted-foreground ml-4">₱{selectedCoach.monthly_rate.toFixed(2)}</span>
                        </div>
                      </SelectItem>
                    )}
                    {selectedCoach.session_package_rate > 0 && (
                      <SelectItem value="package">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">Session Package</span>
                          <span className="text-sm text-muted-foreground ml-4">₱{selectedCoach.session_package_rate.toFixed(2)}</span>
                        </div>
                      </SelectItem>
                    )}
                    {selectedCoach.per_session_rate > 0 && (
                      <SelectItem value="per_session">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">Per Session</span>
                          <span className="text-sm text-muted-foreground ml-4">₱{selectedCoach.per_session_rate.toFixed(2)}</span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Payment Section */}
            {selectedCoach && rateType && (
              <div className="border-t border-gray-200 pt-6 space-y-5">
                <h4 className="text-base font-semibold text-foreground">Payment Details</h4>
                
                {/* Amount Due Display */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">Total Amount Due</span>
                    <span className="text-2xl font-bold text-slate-900">₱{calculatePaymentAmount().toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={(value) => { 
                    setPaymentMethod(value)
                    setAmountReceived("")
                    setReferenceNumber("")
                  }}>
                    <SelectTrigger className="h-11 border-gray-300 focus:border-gray-500">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="cursor-pointer">
                        <span className="font-medium">Cash</span>
                      </SelectItem>
                      <SelectItem value="gcash" className="cursor-pointer">
                        <span className="font-medium">GCash</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cash Payment Fields */}
                {paymentMethod === "cash" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Amount Received</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter amount received..."
                      className="h-11 text-base"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                    {amountReceived && parseFloat(amountReceived) < calculatePaymentAmount() && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Amount received is less than required amount
                      </p>
                    )}
                  </div>
                )}

                {/* GCash Payment Fields */}
                {paymentMethod === "gcash" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">
                      Reference Number
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter transaction reference..."
                      className="h-11 text-base"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Required for GCash transactions</p>
                  </div>
                )}

                {/* Change Display */}
                {paymentMethod === "cash" && amountReceived && calculateChange() > 0 && (
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-emerald-800">Change to Give</span>
                      <span className="text-2xl font-bold text-emerald-700">₱{calculateChange().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="pt-6 border-t mt-6">
            <Button 
              variant="outline" 
              onClick={() => setAssignModalOpen(false)}
              className="h-11 px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignCoach}
              className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-6 shadow-md"
              disabled={
                actionLoading || 
                !selectedCoachId || 
                (!selectedMemberId && !selectedMember?.id) ||
                !rateType ||
                (paymentMethod === "cash" && (!amountReceived || parseFloat(amountReceived) < calculatePaymentAmount())) ||
                (paymentMethod === "gcash" && !referenceNumber)
              }
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  )
}

export default CoachAssignments
