"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import {
  FaUsers,
  FaUserTie,
  FaIdCard,
  FaBullhorn,
  FaDumbbell,
  FaChalkboardTeacher,
  FaClipboardList,
  FaTasks,
  FaCheckCircle,
  FaMoon,
  FaSignOutAlt,
  FaSun,
  FaShoppingCart,
  FaUserFriends,
  FaTimes,
  FaGift,
  FaBox,
  FaCog,
} from "react-icons/fa"
import { GiWhistle } from "react-icons/gi"
import { Button } from "@/components/ui/button"

const Sidebar = ({
  activeSection = "ViewClients",
  setActiveSection = () => { },
  toggleDarkMode = () => { },
  darkMode = false,
  collapsed = false,
  onToggle = () => { }
}) => {
  const router = useRouter()

  const handleLogout = useCallback(async () => {
    // Make a request to your logout PHP endpoint to clear session and cookies
    await fetch("https://api.cnergy.site/logout.php", {
      method: "GET",
      credentials: "include", // Ensure that cookies are sent with the request
    })

    // Clear sessionStorage and cookies
    if (typeof window !== 'undefined') {
      sessionStorage.clear()
      document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC"
    }

    // Redirect to the login page
    router.push("/login")
  }, [router])

  const handleSectionClick = useCallback((name) => {
    if (setActiveSection) {
      setActiveSection(name)
    }
    // Close sidebar on mobile after navigation
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onToggle) {
      onToggle()
    }
  }, [setActiveSection, onToggle])

  const sections = [
    { name: "ViewClients", icon: <FaUsers className="mr-2 h-4 w-4" /> },
    { name: "ViewCoach", icon: <GiWhistle className="mr-2 h-4 w-4" /> },
    { name: "MonitorSubscriptions", icon: <FaClipboardList className="mr-2 h-4 w-4" /> },
    { name: "Sales", icon: <FaShoppingCart className="mr-2 h-4 w-4" /> },
    { name: "AttendanceTracking", icon: <FaCheckCircle className="mr-2 h-4 w-4" /> },
    { name: "CoachAssignments", icon: <FaTasks className="mr-2 h-4 w-4" /> },
    { name: "Exercises", icon: <FaDumbbell className="mr-2 h-4 w-4" /> },
    { name: "FreePrograms", icon: <FaChalkboardTeacher className="mr-2 h-4 w-4" /> },
    { name: "Promotions", icon: <FaGift className="mr-2 h-4 w-4" /> },
    { name: "Merchandise", icon: <FaBox className="mr-2 h-4 w-4" /> },
    { name: "Announcement", icon: <FaBullhorn className="mr-2 h-4 w-4" /> },
  ]

  return (
    <aside className={`bg-white dark:bg-gray-900 border-r dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out fixed lg:relative z-50 ${collapsed ? 'w-0 -translate-x-full lg:w-16 lg:translate-x-0' : 'w-64 translate-x-0'
      }`}>
      <div className={`p-4 border-b dark:border-gray-800 transition-all duration-300 ${collapsed ? 'opacity-0 lg:opacity-100' : 'opacity-100'}`}>
        <div className="flex items-center justify-between">
          <Button variant="outline" className={`flex-1 justify-start p-2 ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}>
            <div className="w-4 h-4 rounded bg-black dark:bg-white mr-2 flex-shrink-0" />
            <span className={`text-xl font-extrabold truncate ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="text-orange-500">C</span>NERGY GYM
            </span>
          </Button>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="lg:hidden ml-2 h-8 w-8"
          >
            <FaTimes className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <nav className={`flex-1 overflow-y-auto p-2 transition-all duration-300 ${collapsed ? 'opacity-0 lg:opacity-100' : 'opacity-100'}`}>
        <div className="mb-4">
          {sections.map(({ name, icon }) => (
            <Button
              key={name}
              variant={activeSection === name ? "secondary" : "ghost"}
              className={`w-full mb-1 ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-start'}`}
              onClick={() => handleSectionClick(name)}
            title={collapsed ? (name === "ViewClients" ? "View Client" : name === "Sales" ? "Sales" : name.replace(/([A-Z])/g, " $1").trim()) : ""}
            >
              {icon}
              <span className={`text-sm font-medium truncate ${collapsed ? 'lg:hidden' : ''}`}>
                {name === "ViewClients" ? "View Client" : name === "Sales" ? "Sales" : name.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </Button>
          ))}
        </div>
      </nav>
      <div className={`p-4 border-t dark:border-gray-800 transition-all duration-300 ${collapsed ? 'opacity-0 lg:opacity-100' : 'opacity-100'}`}>
        <Button
          variant="outline"
          className={`w-full mb-2 ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-start'}`}
          onClick={toggleDarkMode}
          title={collapsed ? (darkMode ? "Light Mode" : "Dark Mode") : ""}
        >
          {darkMode ? (
            <FaSun className="mr-2 h-4 w-4 text-yellow-500" />
          ) : (
            <FaMoon className="mr-2 h-4 w-4 text-gray-500" />
          )}
          <span className={`${collapsed ? 'lg:hidden' : ''}`}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </Button>
        <Button
          variant="destructive"
          className={`w-full ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-start'}`}
          onClick={handleLogout}
          title={collapsed ? "Logout" : ""}
        >
          <FaSignOutAlt className="mr-2 h-4 w-4" />
          <span className={`${collapsed ? 'lg:hidden' : ''}`}>
            Logout
          </span>
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar