"use client"
import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Users, CreditCard, AlertTriangle, Calendar, TrendingUp, TrendingDown, DollarSign, Package, Activity } from "lucide-react"

// Helper function to get Philippine time
const getPhilippineTime = () => {
  const now = new Date()
  const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }))
  return phTime
}

// Helper function to get today's date in Philippine time (YYYY-MM-DD format)
const getTodayInPHTime = () => {
  const phTime = getPhilippineTime()
  const year = phTime.getFullYear()
  const month = String(phTime.getMonth() + 1).padStart(2, '0')
  const day = String(phTime.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Trend Indicator Component
const TrendIndicator = ({ trend, isPositive }) => {
  if (trend === 0) return null;

  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? "text-green-600" : "text-red-600";
  const bgColor = isPositive ? "bg-green-100" : "bg-red-100";

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {Math.abs(trend)}%
    </div>
  );
};

// Loading Skeleton Component
const CardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
      <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
    </CardContent>
  </Card>
);

// Error Display Component
const ErrorDisplay = ({ error, onRetry, retryCount }) => (
  <Card className="border-red-200 bg-red-50">
    <CardContent className="pt-6">
      <div className="flex items-center justify-center text-center">
        <div>
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Dashboard</h3>
          <p className="text-red-600 mb-4">{error}</p>
          {retryCount > 0 && (
            <p className="text-sm text-red-500 mb-4">
              Retry attempt {retryCount} of 3...
            </p>
          )}
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const GymDashboard = () => {
  const [membershipData, setMembershipData] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [allSales, setAllSales] = useState([]) // Store all sales for accurate today calculation
  const [summaryStats, setSummaryStats] = useState({
    members: { active: { value: 0, trend: 0, isPositive: true }, total: { value: 0, trend: 0, isPositive: true } },
    totalUsers: { active: { value: 0, trend: 0, isPositive: true }, total: { value: 0, trend: 0, isPositive: true } },
    salesToday: { value: 0, trend: 0, isPositive: true },
    activeSubscriptions: { value: 0, trend: 0, isPositive: true },
    upcomingExpirations: { value: 0, trend: 0, isPositive: true },
    attendanceToday: { value: 0, trend: 0, isPositive: true },
  })
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchDashboardData = useCallback(async (isRetry = false) => {
    setLoading(true)
    setError(null)

    try {
      // Always use "today" period for API - we'll filter data client-side based on date range
      // The API doesn't support custom date ranges, so we fetch all data and filter on frontend
      let period = "today"
      let apiUrl = `https://api.cnergy.site/admindashboard.php?period=${period}`

      if (period === "today") {
        const todayPH = getTodayInPHTime()
        apiUrl += `&ph_date=${todayPH}`
        console.log("Using Philippine time for today:", todayPH)
      }

      console.log("Fetching data for date range:", { startDate, endDate }, "URL:", apiUrl)

      const response = await axios.get(apiUrl, {
        timeout: 10000 // 10 second timeout
      })

      console.log("API Response received:", response.data)

      if (response.data.success) {
        const stats = response.data.summaryStats
        let allClientsData = [] // Store clients data for generating membership chart
        
        // Fetch sales and filter by date range
        let filteredSales = []
        try {
          // Fetch all sales (we'll filter client-side based on date range)
            const salesResponse = await axios.get(`https://api.cnergy.site/sales.php?action=sales`, {
              timeout: 10000
            })
            const allSalesData = salesResponse.data.sales || []
            
          // Filter sales by date range
          if (startDate || endDate) {
            filteredSales = allSalesData.filter(sale => {
              const saleDate = new Date(sale.sale_date)
              saleDate.setHours(0, 0, 0, 0)

              let matchesStart = true
              let matchesEnd = true

              if (startDate) {
                const filterStartDate = new Date(startDate)
                filterStartDate.setHours(0, 0, 0, 0)
                matchesStart = saleDate >= filterStartDate
              }

              if (endDate) {
                const filterEndDate = new Date(endDate)
                filterEndDate.setHours(0, 0, 0, 0)
                matchesEnd = saleDate <= filterEndDate
              }

              return matchesStart && matchesEnd
            })
          } else {
            // Default to today if no date range is set
            const phTime = getPhilippineTime()
            phTime.setHours(0, 0, 0, 0)
            const todayStr = format(phTime, "yyyy-MM-dd")
            filteredSales = allSalesData.filter(sale => {
                const saleDate = new Date(sale.sale_date)
                saleDate.setHours(0, 0, 0, 0)
                const saleDateStr = format(saleDate, "yyyy-MM-dd")
                return saleDateStr === todayStr
              })
          }
          
          // Calculate sales total
          const salesTotal = filteredSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
            
          // Update salesToday with calculated value
          stats.salesToday.value = salesTotal
            setAllSales(allSalesData)
          console.log("Sales (filtered by date range):", salesTotal, "Date Range:", { startDate, endDate })
          } catch (salesError) {
          console.error("Error fetching sales:", salesError)
            // Keep the API value if sales fetch fails
        }
        
        // Fetch active subscriptions and clients using the same logic as monitoring subscription page
        try {
          const subscriptionsResponse = await axios.get(`https://api.cnergy.site/monitor_subscription.php`, {
            timeout: 10000
          })
          const allSubscriptions = subscriptionsResponse.data.subscriptions || []
          
          // Filter active subscriptions (same logic as monitoring subscription page - getActiveSubscriptions)
          const now = new Date()
          const activeSubscriptions = allSubscriptions.filter((s) => {
            // Exclude cancelled subscriptions
            if (s.status_name?.toLowerCase() === "cancelled" || 
                s.display_status?.toLowerCase() === "cancelled" ||
                s.status_name?.toLowerCase() === "canceled" || 
                s.display_status?.toLowerCase() === "canceled") {
              return false
            }
            
            // Check if subscription is expired (end_date is in the past)
            if (s.end_date) {
              const endDate = new Date(s.end_date)
              if (endDate < now) return false
            }
            
            // Only show if status is Active or approved and not expired
            return s.display_status === "Active" || s.status_name === "approved"
          })
          
          // Group by user (same as monitoring subscription page - groupSubscriptionsByUser)
          const grouped = {}
          activeSubscriptions.forEach((subscription) => {
            // Use the exact same logic as groupSubscriptionsByUser
            const key = subscription.is_guest_session || subscription.subscription_type === 'guest'
              ? `guest_${subscription.guest_name || subscription.id}`
              : subscription.user_id || `unknown_${subscription.id}`
            
            if (!grouped[key]) {
              grouped[key] = []
            }
            grouped[key].push(subscription)
          })
          
          const activeCount = Object.keys(grouped).length
          stats.activeSubscriptions.value = activeCount
          
          // Update Annual Members count - same as active subscriptions (users with active membership plans)
          stats.members.active.value = activeCount
          
          // Fetch total clients (same logic as View Clients page - only approved clients)
          try {
            const clientsResponse = await axios.get(`https://api.cnergy.site/member_management.php`, {
              timeout: 10000
            })
            // member_management.php returns users with user_type_id = 4 (clients/members only)
            const allClients = Array.isArray(clientsResponse.data) ? clientsResponse.data : []
            allClientsData = allClients // Store for generating membership chart
            // Filter to only approved clients (same as View Clients page)
            const approvedClients = allClients.filter((m) => m.account_status === "approved")
            const clientsCount = approvedClients.length
            
            stats.totalUsers.active.value = clientsCount
            console.log("Total clients count (approved only):", clientsCount, "Total members:", allClients.length)
          } catch (clientsError) {
            console.error("Error fetching clients:", clientsError)
            // Keep the API value if clients fetch fails
          }
          
          console.log("Active subscriptions count (grouped by user):", activeCount, "Total active subscriptions:", activeSubscriptions.length)
          
          // Calculate expiring subscriptions (same logic as monitoring subscription page - getExpiringSoonSubscriptions)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const sevenDaysFromNow = new Date()
          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
          sevenDaysFromNow.setHours(23, 59, 59, 999)
          
          const expiringSoonSubscriptions = allSubscriptions.filter((s) => {
            if (!s.end_date) return false
            
            const endDate = new Date(s.end_date)
            // Check if subscription is already expired (end_date is in the past)
            if (endDate < now) return false
            
            endDate.setHours(0, 0, 0, 0)
            return (s.display_status === "Active" || s.status_name === "approved") &&
              endDate >= today &&
              endDate <= sevenDaysFromNow
          })
          
          // Group expiring subscriptions by user (same logic as groupSubscriptionsByUser)
          const groupedExpiring = {}
          expiringSoonSubscriptions.forEach((subscription) => {
            const key = subscription.is_guest_session || subscription.subscription_type === 'guest'
              ? `guest_${subscription.guest_name || subscription.id}`
              : subscription.user_id || `unknown_${subscription.id}`
            
            if (!groupedExpiring[key]) {
              groupedExpiring[key] = []
            }
            groupedExpiring[key].push(subscription)
          })
          
          const expiringCount = Object.keys(groupedExpiring).length
          stats.upcomingExpirations.value = expiringCount
          console.log("Expiring subscriptions count (grouped by user):", expiringCount, "Total expiring subscriptions:", expiringSoonSubscriptions.length)
        } catch (subscriptionsError) {
          console.error("Error fetching active subscriptions:", subscriptionsError)
          // Keep the API value if subscriptions fetch fails
        }
        
        // Fetch active attendance (only currently checked in, not total)
        try {
          const attendanceResponse = await axios.get(`https://api.cnergy.site/attendance.php?action=attendance`, {
            timeout: 10000
          })
          // The API returns an array directly, not wrapped in an object
          const attendanceData = Array.isArray(attendanceResponse.data) ? attendanceResponse.data : (attendanceResponse.data?.attendance || [])
          
          // Filter for only active sessions (same logic as attendance tracking page)
          const activeAttendance = attendanceData.filter(entry => {
            // Active if check_out is null, undefined, or contains "Still in gym"
            return !entry.check_out || entry.check_out === null || (typeof entry.check_out === 'string' && entry.check_out.includes("Still in gym"))
          })
          
          stats.attendanceToday = { 
            value: activeAttendance.length, 
            trend: 0, 
            isPositive: true 
          }
        } catch (attendanceError) {
          console.error("Error fetching attendance:", attendanceError)
          stats.attendanceToday = { value: 0, trend: 0, isPositive: true }
        }
        
        setSummaryStats(stats)
        
        // Handle membership data based on date range
        let filteredMembershipData = response.data.membershipData || []
        if ((startDate || endDate) && allClientsData.length > 0) {
          // Generate client growth data from member created_at dates
          try {
            // Filter clients by created_at date within the selected range (only approved clients for growth)
            const approvedClients = allClientsData.filter((m) => m.account_status === "approved")
            const filteredClients = approvedClients.filter(client => {
              if (!client.created_at) return false
              
              const createdDate = new Date(client.created_at)
              createdDate.setHours(0, 0, 0, 0)

              let matchesStart = true
              let matchesEnd = true

              if (startDate) {
                const filterStartDate = new Date(startDate)
                filterStartDate.setHours(0, 0, 0, 0)
                matchesStart = createdDate >= filterStartDate
              }

              if (endDate) {
                const filterEndDate = new Date(endDate)
                filterEndDate.setHours(0, 0, 0, 0)
                matchesEnd = createdDate <= filterEndDate
              }

              return matchesStart && matchesEnd
            })
            
            // Group clients by day and count how many were created each day
            const clientsByDate = {}
            
            filteredClients.forEach(client => {
              if (!client.created_at) return
              
              const createdDate = new Date(client.created_at)
              const dateKey = format(createdDate, "yyyy-MM-dd")
              const displayKey = format(createdDate, "MMM dd")
              
              if (!clientsByDate[dateKey]) {
                clientsByDate[dateKey] = {
                  name: displayKey,
                  date: dateKey,
                  count: 0
                }
              }
              
              clientsByDate[dateKey].count += 1
            })
            
            // Convert to array, sort by date, and calculate cumulative total
            const sortedDates = Object.values(clientsByDate)
              .sort((a, b) => new Date(a.date) - new Date(b.date))
            
            // Calculate base count (clients created before the start date)
            let baseCount = 0
            if (startDate) {
              const filterStartDate = new Date(startDate)
              filterStartDate.setHours(0, 0, 0, 0)
              baseCount = approvedClients.filter(client => {
                if (!client.created_at) return false
                const createdDate = new Date(client.created_at)
                createdDate.setHours(0, 0, 0, 0)
                return createdDate < filterStartDate
              }).length
            }
            
            let cumulativeCount = baseCount
            filteredMembershipData = sortedDates.map(item => {
              cumulativeCount += item.count
              return {
                name: item.name,
                members: cumulativeCount
              }
            })
            
            console.log("Generated membership data from filtered clients:", filteredMembershipData.length, "days")
          } catch (membershipError) {
            console.error("Error generating membership data from clients:", membershipError)
            filteredMembershipData = []
          }
        } else {
          // Use API data when no date range is set
          filteredMembershipData = response.data.membershipData || []
        }
        
        setMembershipData(filteredMembershipData)
        
        // Filter revenue data by date range
        let filteredRevenueData = response.data.revenueData || []
        if ((startDate || endDate) && filteredSales.length > 0) {
          // Generate revenue chart data from filtered sales
          try {
            // Group sales by day for the chart
            const revenueByDate = {}
            
            filteredSales.forEach(sale => {
              if (!sale.sale_date || !sale.total_amount) return
              
              const saleDate = new Date(sale.sale_date)
              const dateKey = format(saleDate, "yyyy-MM-dd")
              const displayKey = format(saleDate, "MMM dd")
              
              if (!revenueByDate[dateKey]) {
                revenueByDate[dateKey] = {
                  name: displayKey,
                  date: dateKey,
                  revenue: 0
                }
              }
              
              revenueByDate[dateKey].revenue += parseFloat(sale.total_amount) || 0
            })
            
            // Convert to array and sort by date
            filteredRevenueData = Object.values(revenueByDate)
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map(item => ({
                name: item.name,
                revenue: item.revenue
              }))
            
            console.log("Generated revenue data from filtered sales:", filteredRevenueData.length, "days")
          } catch (revenueError) {
            console.error("Error generating revenue data from sales:", revenueError)
            filteredRevenueData = []
          }
        } else {
          // Default to today if no date range is set
          const phToday = getPhilippineTime()
          phToday.setHours(0, 0, 0, 0)
          const todayStr = format(phToday, "yyyy-MM-dd")
          
          filteredRevenueData = filteredRevenueData.filter(item => {
            // If it's a time format (HH:MM), check if it represents today in Philippine time
            if (item.name && item.name.match(/^\d{1,2}:\d{2}$/)) {
              const [utcHours, minutes] = item.name.split(':').map(Number)
              
              // Get today's date in UTC
              const now = new Date()
              const utcYear = now.getUTCFullYear()
              const utcMonth = now.getUTCMonth()
              const utcDay = now.getUTCDate()
              
              // Try both today and yesterday in UTC (since late UTC hours might be from previous day)
              const utcDateToday = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHours, minutes, 0))
              const utcDateYesterday = new Date(Date.UTC(utcYear, utcMonth, utcDay - 1, utcHours, minutes, 0))
              
              // Convert to Philippine time and get the date
              const getPHDate = (utcDate) => {
                const phTimeStr = utcDate.toLocaleString("en-US", {
                  timeZone: "Asia/Manila",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit"
                })
                const [phMonth, phDay, phYear] = phTimeStr.split('/').map(Number)
                return `${phYear}-${String(phMonth).padStart(2, '0')}-${String(phDay).padStart(2, '0')}`
              }
              
              const phDate1 = getPHDate(utcDateToday)
              const phDate2 = getPHDate(utcDateYesterday)
              
              // Include if either conversion results in today's date in Philippine time
              return phDate1 === todayStr || phDate2 === todayStr
            }
            // For non-time formats, include them (they should already be filtered by API)
            return true
          })
        }
        
        setRevenueData(filteredRevenueData)
        setRetryCount(0)
      } else {
        throw new Error(response.data.error || 'Failed to fetch dashboard data')
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError(err.message)
      setMembershipData([])
      setRevenueData([])

      // Auto-retry logic (max 3 retries)
      if (!isRetry && retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchDashboardData(true)
        }, 2000 * (retryCount + 1)) // Exponential backoff
      }
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, retryCount])

  const handleRetry = () => {
    setRetryCount(0)
    fetchDashboardData()
  }

  useEffect(() => {
    console.log("useEffect triggered - Date Range:", { startDate, endDate })
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  // Custom formatters
  const formatCurrency = (value) => {
    return `₱${value.toLocaleString()}`
  }

  const formatNumber = (value) => {
    return value.toLocaleString()
  }

  // Helper function to convert UTC time to Philippine time
  const convertTimeToPH = (timeString) => {
    // Parse time string (HH:MM format) - assume it's UTC
    const [utcHours, minutes] = timeString.split(':').map(Number)
    
    // Philippine time is UTC+8, so add 8 hours
    let phHours = utcHours + 8
    
    // Handle day rollover (if hour exceeds 23, it's next day, but for display we just show the hour)
    if (phHours >= 24) {
      phHours = phHours - 24
    }
    
    // Format as 12-hour with AM/PM
    const period = phHours >= 12 ? 'PM' : 'AM'
    const hour12 = phHours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Format chart data to show proper dates
  const formatChartData = (data) => {
    if (!data || data.length === 0) return []

    return data.map(item => {
      if (!item.name) return { ...item, displayName: item.name || '' }

      // If already has displayName, use it
      if (item.displayName) {
        return item
      }

      // If it's a time format (HH:MM), convert to Philippine timezone first, then to 12-hour format with AM/PM
      if (item.name.match(/^\d{1,2}:\d{2}$/)) {
        // For "today" period (when no date range is set), convert UTC time to Philippine time
        const formattedTime = (!startDate && !endDate)
          ? convertTimeToPH(item.name)
          : (() => {
              // For other periods, just format as 12-hour
        const [hours, minutes] = item.name.split(':').map(Number)
        const period = hours >= 12 ? 'PM' : 'AM'
              const hour12 = hours % 12 || 12
              return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
            })()
        return { ...item, displayName: formattedTime }
      }

      // Handle month abbreviations (e.g., "Jan", "Feb", "Aug", "Oct")
      const monthAbbrev = item.name.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}$/i)
      if (monthAbbrev) {
        // Return as is for month/day format
        return { ...item, displayName: item.name }
      }

      // Try to format as date if it's a valid date string
      try {
        const date = new Date(item.name)
        if (!isNaN(date.getTime())) {
          return { ...item, displayName: format(date, "MMM dd") }
        }
      } catch (error) {
        // Use original name if date parsing fails
      }

      // Use original name
      return { ...item, displayName: item.name }
    })
  }

  // Show error state if there's an error and no data
  if (error && !loading && membershipData.length === 0 && revenueData.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <ErrorDisplay error={error} onRetry={handleRetry} retryCount={retryCount} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dashboard */}
      <Card className="border border-gray-100 shadow-sm bg-white">
        <CardHeader className="pb-4 pt-5 px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="h-1 w-1 rounded-full bg-gray-400"></div>
                <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Dashboard</CardTitle>
              </div>
              <CardDescription className="text-sm text-gray-500 mt-1 ml-4">
                Key metrics and performance insights
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range Filter */}
              <Label htmlFor="start-date-filter" className="flex items-center gap-2 whitespace-nowrap">
                <Calendar className="h-4 w-4 text-gray-600" />
                Start Date:
              </Label>
              <Input
                type="date"
                id="start-date-filter"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40 h-10 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                max={endDate || undefined}
              />
              <Label htmlFor="end-date-filter" className="flex items-center gap-2 whitespace-nowrap">
                <Calendar className="h-4 w-4 text-gray-600" />
                End Date:
              </Label>
              <Input
                type="date"
                id="end-date-filter"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40 h-10 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            {loading ? (
              // Show loading skeletons
              Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)
            ) : (
              <>
                {/* Total Clients */}
                <Card 
                  className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white cursor-pointer hover:scale-[1.02]"
                  onClick={() => {
                    localStorage.setItem('adminNavTarget', 'ViewClients')
                    localStorage.setItem('adminNavParams', JSON.stringify({ filter: 'all' }))
                    window.dispatchEvent(new CustomEvent('adminNavigate', { detail: { section: 'ViewClients' } }))
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Total Clients</CardTitle>
                    <div className="p-2 rounded-lg bg-gray-100">
                      <Users className="h-4 w-4 text-gray-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {summaryStats.totalUsers.active.value || 0}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600">Approved clients</p>
                      {summaryStats.totalUsers.active.trend !== undefined && (
                        <TrendIndicator
                          trend={summaryStats.totalUsers.active.trend}
                          isPositive={summaryStats.totalUsers.active.isPositive}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Sales Card */}
                <Card 
                  className="border border-green-300 shadow-sm hover:shadow-md transition-all duration-200 bg-white cursor-pointer hover:scale-[1.02]"
                  onClick={() => {
                    localStorage.setItem('adminNavTarget', 'Sales')
                    localStorage.setItem('adminNavParams', JSON.stringify({ 
                      openModal: 'totalSales',
                      startDate: startDate || undefined,
                      endDate: endDate || undefined
                    }))
                    window.dispatchEvent(new CustomEvent('adminNavigate', { detail: { section: 'Sales' } }))
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Sales</CardTitle>
                    <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-700 mb-1">₱{Number(summaryStats.salesToday.value || 0).toLocaleString('en-US')}</div>
                    <p className="text-xs text-gray-600">
                      {startDate || endDate ? 
                        (startDate && endDate ? `${format(new Date(startDate), "MMM dd")} - ${format(new Date(endDate), "MMM dd, yyyy")}` :
                         startDate ? `From ${format(new Date(startDate), "MMM dd, yyyy")}` :
                         `Until ${format(new Date(endDate), "MMM dd, yyyy")}`) :
                        "Today's revenue"}
                    </p>
                  </CardContent>
                </Card>

                {/* Attendance Card */}
                <Card 
                  className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white cursor-pointer hover:scale-[1.02]"
                  onClick={() => {
                    localStorage.setItem('adminNavTarget', 'AttendanceTracking')
                    localStorage.setItem('adminNavParams', JSON.stringify({ filterType: 'active' }))
                    window.dispatchEvent(new CustomEvent('adminNavigate', { detail: { section: 'AttendanceTracking' } }))
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-2xl font-bold text-gray-900">{Number(summaryStats.attendanceToday.value || 0).toLocaleString('en-US')}</div>
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Activity className="h-4 w-4 text-gray-600" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">Currently active</p>
                  </CardContent>
                </Card>

                {/* Active Subscriptions */}
                <Card 
                  className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white cursor-pointer hover:scale-[1.02]"
                  onClick={() => {
                    localStorage.setItem('adminNavTarget', 'MonitorSubscriptions')
                    localStorage.setItem('adminNavParams', JSON.stringify({ tab: 'active' }))
                    window.dispatchEvent(new CustomEvent('adminNavigate', { detail: { section: 'MonitorSubscriptions' } }))
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Active Subscriptions</CardTitle>
                    <div className="p-2 rounded-lg bg-gray-100">
                      <CreditCard className="h-4 w-4 text-gray-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{summaryStats.activeSubscriptions.value || 0}</div>
                    <p className="text-xs text-gray-600">Active subscription plans</p>
                  </CardContent>
                </Card>

                {/* Expirations */}
                <Card 
                  className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white cursor-pointer hover:scale-[1.02]"
                  onClick={() => {
                    localStorage.setItem('adminNavTarget', 'MonitorSubscriptions')
                    localStorage.setItem('adminNavParams', JSON.stringify({ tab: 'upcoming' }))
                    window.dispatchEvent(new CustomEvent('adminNavigate', { detail: { section: 'MonitorSubscriptions' } }))
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Upcoming Expirations</CardTitle>
                    <div className="p-2 rounded-lg bg-yellow-100">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{summaryStats.upcomingExpirations.value || 0}</div>
                    <p className="text-xs text-gray-600">Expiring subscriptions</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-800 mb-0.5">
              {startDate || endDate ? 
                (startDate && endDate ? `${format(new Date(startDate), "MMM dd")} - ${format(new Date(endDate), "MMM dd")}` :
                 startDate ? `From ${format(new Date(startDate), "MMM dd")}` :
                 `Until ${format(new Date(endDate), "MMM dd")}`) :
                "Today's"} Client Growth
            </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0">Client growth trend</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <ChartContainer
              config={{
                members: { label: "Clients", color: "hsl(var(--chart-1))" },
              }}
              className="h-[320px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={formatChartData(membershipData)}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#f3f4f6" 
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="displayName"
                    className="text-xs fill-gray-500"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis
                    className="text-xs fill-gray-500"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatNumber}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickMargin={8}
                    width={60}
                  />
                  <Line
                    type="monotone"
                    dataKey="members"
                    strokeWidth={2.5}
                    stroke="#f97316"
                    dot={{ fill: '#f97316', r: 4, strokeWidth: 2 }}
                    activeDot={{
                      r: 6,
                      stroke: '#f97316',
                      strokeWidth: 2,
                      fill: '#fff',
                    }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent
                      className="bg-white border border-gray-200 shadow-lg rounded-lg"
                      formatter={(value) => formatNumber(value)}
                      labelFormatter={(label) => label || 'N/A'}
                    />}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 pt-4 px-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-800 mb-0.5">
              {startDate || endDate ? 
                (startDate && endDate ? `${format(new Date(startDate), "MMM dd")} - ${format(new Date(endDate), "MMM dd")}` :
                 startDate ? `From ${format(new Date(startDate), "MMM dd")}` :
                 `Until ${format(new Date(endDate), "MMM dd")}`) :
                "Today's"} Revenue
            </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0">Revenue performance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "#14b8a6" },
              }}
              className="h-[320px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={formatChartData(revenueData)}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#f3f4f6" 
                    strokeOpacity={0.5}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="displayName"
                    className="text-xs fill-gray-500"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis
                    className="text-xs fill-gray-500"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCurrency}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickMargin={8}
                    width={70}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="#14b8a6"
                    radius={[6, 6, 0, 0]}
                    opacity={0.85}
                    activeBar={{
                      fill: '#0d9488',
                      opacity: 1,
                      stroke: '#0d9488',
                      strokeWidth: 1.5,
                      radius: [6, 6, 0, 0],
                    }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent
                      className="bg-white border border-gray-200 shadow-lg rounded-lg"
                      formatter={(value) => {
                        // Format currency with commas and proper decimal places
                        const numValue = typeof value === 'number' ? value : parseFloat(value) || 0
                        return `₱${numValue.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}`
                      }}
                      labelFormatter={(label) => {
                        if (!label) return 'N/A'
                        
                        // If it's already in 12-hour format (has AM/PM), return as is
                        if (typeof label === 'string' && (label.includes('AM') || label.includes('PM'))) {
                          return label
                        }
                        
                        // If it's in 24-hour format (HH:MM or HH:MM:SS), convert to 12-hour
                        if (typeof label === 'string') {
                          const timeMatch = label.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
                          if (timeMatch) {
                            const hours = parseInt(timeMatch[1])
                            const minutes = timeMatch[2]
                            const period = hours >= 12 ? 'PM' : 'AM'
                            const hour12 = hours % 12 || 12
                            return `${hour12}:${minutes} ${period}`
                          }
                        }
                        
                        return label
                      }}
                    />}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default GymDashboard
