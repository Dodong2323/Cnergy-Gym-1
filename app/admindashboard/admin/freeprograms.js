"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Edit, Trash2, Loader2, Eye, AlertTriangle, Dumbbell, FileText, ClipboardList, Archive, RotateCcw, TrendingUp, GripVertical } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

// Configure axios defaults
axios.defaults.timeout = 10000
axios.defaults.headers.common["Content-Type"] = "application/json"

const FreePrograms = () => {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [programs, setPrograms] = useState([])
  const [exercises, setExercises] = useState([])
  const [muscleGroups, setMuscleGroups] = useState([])
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("all")
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState("")
  const [programWorkouts, setProgramWorkouts] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [programToArchive, setProgramToArchive] = useState(null)
  const [programToRestore, setProgramToRestore] = useState(null)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [programName, setProgramName] = useState("")
  const [programDescription, setProgramDescription] = useState("")
  const [programDifficulty, setProgramDifficulty] = useState("Beginner")
  const [selectedExercises, setSelectedExercises] = useState([])
  const [exerciseDetails, setExerciseDetails] = useState({}) // Store reps, sets, and repsPerSet for each exercise
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [error, setError] = useState("")
  const [loadingStates, setLoadingStates] = useState({
    fetchingPrograms: false,
    savingProgram: false,
    archivingProgram: false,
    restoringProgram: false,
    fetchingMuscleGroups: false,
  })

  const setLoadingState = (key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }))
  }

  // API URLs - using your existing file structure
  const PROGRAMS_API = "https://api.cnergy.site/programs.php"
  const EXERCISES_API = "https://api.cnergy.site/exercises.php?action=get_exercises"
  const MUSCLE_GROUPS_API = "https://api.cnergy.site/exercises.php?action=get_muscle_groups"

  useEffect(() => {
    fetchPrograms()
    fetchExercises()
    fetchMuscleGroups()
  }, [showArchived])

  const fetchPrograms = async () => {
    setLoadingState("fetchingPrograms", true)
    try {
      const url = showArchived ? `${PROGRAMS_API}?archived=1` : `${PROGRAMS_API}?archived=0`
      const response = await axios.get(url)
      if (response.data.success && Array.isArray(response.data.programs)) {
        setPrograms(response.data.programs)
        setError("")
      } else {
        setPrograms([])
        setError(response.data.message || "Failed to fetch programs")
      }
    } catch (error) {
      setPrograms([])
      handleAxiosError(error, "Error fetching programs")
    } finally {
      setLoadingState("fetchingPrograms", false)
    }
  }

  const fetchExercises = async () => {
    try {
      console.log("=== FETCHING EXERCISES ===")
      console.log("API URL:", EXERCISES_API)

      const response = await axios.get(EXERCISES_API)
      console.log("Exercises response:", response.data)

      if (response.data.success && Array.isArray(response.data.data)) {
        console.log("✅ Fetched exercises successfully:", response.data.data.length, "exercises")
        console.log("Sample exercise:", response.data.data[0])
        setExercises(response.data.data)
      } else {
        console.log("❌ No exercises data or invalid format:", response.data)
        setExercises([])
      }
    } catch (error) {
      setExercises([])
      console.error("❌ Error fetching exercises:", error)
    }
  }

  const fetchMuscleGroups = async () => {
    setLoadingState("fetchingMuscleGroups", true)
    try {
      console.log("=== FETCHING MUSCLE GROUPS ===")
      console.log("API URL:", MUSCLE_GROUPS_API)

      const response = await axios.get(MUSCLE_GROUPS_API)
      console.log("Muscle groups response:", response.data)

      if (response.data.success && Array.isArray(response.data.data)) {
        console.log("✅ Fetched muscle groups successfully:", response.data.data)
        setMuscleGroups(response.data.data)
      } else {
        console.log("❌ No muscle groups data or invalid format:", response.data)
        setMuscleGroups([])
      }
    } catch (error) {
      setMuscleGroups([])
      console.error("❌ Error fetching muscle groups:", error)
    } finally {
      setLoadingState("fetchingMuscleGroups", false)
    }
  }

  const handleAxiosError = (error, defaultMessage) => {
    let errorMessage = defaultMessage

    if (error.response) {
      const responseData = error.response.data

      // Check for specific error messages
      if (responseData?.message) {
        const message = responseData.message
        if (message.includes("foreign key constraint") || message.includes("Integrity constraint violation")) {
          errorMessage = "Cannot archive this program because it is currently assigned to members. Please remove all member assignments first, or contact support to handle this."
        } else if (message.includes("Database error")) {
          // Try to extract a more user-friendly message
          if (message.includes("foreign key") || message.includes("constraint")) {
            errorMessage = "Cannot archive this program because it is currently in use. Please remove all member assignments first."
          } else {
            errorMessage = message
          }
        } else if (message.includes("Invalid action") || message.includes("action")) {
          errorMessage = "Archive/Restore functionality is not yet available. Please contact support to enable this feature."
        } else {
          errorMessage = message
        }
      } else if (responseData?.error) {
        errorMessage = responseData.error
      } else if (error.response.status === 400) {
        // Check if debug info is available
        if (responseData?.debug) {
          console.error("Debug info from server:", responseData.debug)
          errorMessage = `Invalid request: ${responseData.message || "Request failed"}. Check console for details.`
        } else if (responseData?.message) {
          errorMessage = responseData.message
        } else {
          errorMessage = "Invalid request. Please check your input and try again."
        }
      } else {
        errorMessage = `Server error: ${error.response.status}`
      }
    } else if (error.request) {
      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timeout - please try again"
      } else {
        errorMessage = "Unable to connect to server - check your connection"
      }
    } else {
      errorMessage = error.message || defaultMessage
    }

    setError(errorMessage)
    console.error(defaultMessage, error)
  }

  const validateExerciseInputs = () => {
    for (const exerciseId of selectedExercises) {
      const exercise = exercises.find((ex) => ex.id === exerciseId)
      const details = exerciseDetails[exerciseId] || {}
      const exerciseName = exercise?.name || "selected exercise"
      const sets = parseInt(details.sets || 0)

      if (!sets || sets <= 0) {
        return `Please enter the number of sets for ${exerciseName}.`
      }

      if (sets === 1) {
        if (!details.reps) {
          return `Enter reps for ${exerciseName}.`
        }
      } else {
        const repsPerSet = details.repsPerSet || []
        for (let index = 0; index < sets; index += 1) {
          if (!repsPerSet[index]) {
            return `Enter reps for set ${index + 1} of ${exerciseName}.`
          }
        }
      }
    }

    return null
  }

  const handleSaveProgram = async () => {
    console.debug("FreePrograms: saving program with exercises", {
      name: programName,
      exercises: selectedExercises.map((exerciseId) => {
        const exercise = exercises.find((ex) => ex.id === exerciseId)
        return {
          id: exerciseId,
          name: exercise?.name,
          sets: exerciseDetails[exerciseId]?.sets,
          reps: exerciseDetails[exerciseId]?.reps,
          repsPerSet: exerciseDetails[exerciseId]?.repsPerSet,
        }
      }),
    })
    const validationError = validateExerciseInputs()
    if (validationError) {
      setError(validationError)
      return
    }
    if (!programName.trim()) {
      setError("Program name is required")
      return
    }

    if (selectedExercises.length === 0) {
      setError("Please select at least one exercise")
      return
    }

    setLoadingState("savingProgram", true)
    setError("")

    try {
      // Prepare exercises data for the program
      const exercisesData = selectedExercises.map((exerciseId) => {
        const exercise = exercises.find((ex) => ex.id === exerciseId)
        const details = exerciseDetails[exerciseId] || {}
        const numSets = parseInt(details.sets || 0)

        return {
          exercise_id: exerciseId,
          exercise_name: exercise ? exercise.name : "Unknown Exercise",
          reps: details.reps || "", // Keep for backward compatibility
          sets: details.sets || "",
          repsPerSet: numSets > 1 ? (details.repsPerSet || []) : [] // Array of reps for each set
        }
      })

      const programData = {
        name: programName.trim(),
        description: programDescription.trim(),
        difficulty: programDifficulty,
        exercises: exercisesData, // Send exercises with the program
      }

      let response
      if (selectedProgram) {
        // Update existing program
        response = await axios.put(PROGRAMS_API, {
          id: selectedProgram.id,
          ...programData,
        })
      } else {
        // Create new program
        response = await axios.post(PROGRAMS_API, programData)
      }

      if (response.data.success) {
        await fetchPrograms()
        handleCloseDialog()
        const action = selectedProgram ? "updated" : "created"
        toast({
          title: selectedProgram ? "Program Updated" : "Program Created",
          description: `"${programName.trim()}" has been successfully ${action}.`,
          className: "border-blue-200 bg-blue-50 text-blue-900",
        })
      } else {
        setError(response.data.message || "Failed to save program")
      }
    } catch (error) {
      // Log the full error for debugging
      console.error("Save program error details:", error.response?.data)
      if (error.response?.data?.message) {
        setError(error.response.data.message)
      } else {
        handleAxiosError(error, "Error saving program")
      }
    } finally {
      setLoadingState("savingProgram", false)
    }
  }

  const handleArchiveClick = (program) => {
    setProgramToArchive(program)
    setArchiveDialogOpen(true)
  }

  const handleArchiveProgram = async () => {
    if (!programToArchive) return

    setLoadingState("archivingProgram", true)
    setError("")

    try {
      const response = await axios.put(PROGRAMS_API, {
        id: programToArchive.id,
        action: 'archive',
        is_archived: 1
      })

      if (response.data.success) {
        setArchiveDialogOpen(false)
        await fetchPrograms()
        setProgramToArchive(null)
        toast({
          title: "Program Archived",
          description: `"${programToArchive.name}" has been successfully archived and will no longer appear in the user explore page.`,
          className: "border-orange-200 bg-orange-50 text-orange-900",
        })
      } else {
        setError(response.data.message || "Failed to archive program")
      }
    } catch (error) {
      // Log the full error for debugging
      console.error("Archive error details:", error.response?.data)
      handleAxiosError(error, "Error archiving program")
    } finally {
      setLoadingState("archivingProgram", false)
    }
  }

  const handleRestoreClick = (program) => {
    setProgramToRestore(program)
    setRestoreDialogOpen(true)
  }

  const handleRestoreProgram = async () => {
    if (!programToRestore) return

    setLoadingState("restoringProgram", true)
    setError("")

    try {
      const response = await axios.put(PROGRAMS_API, {
        id: programToRestore.id,
        action: 'restore',
        is_archived: 0
      })

      if (response.data.success) {
        setRestoreDialogOpen(false)
        await fetchPrograms()
        setProgramToRestore(null)
        toast({
          title: "Program Restored",
          description: `"${programToRestore.name}" has been successfully restored and is now available in the user explore page.`,
          className: "border-green-200 bg-green-50 text-green-900",
        })
      } else {
        setError(response.data.message || "Failed to restore program")
      }
    } catch (error) {
      handleAxiosError(error, "Error restoring program")
    } finally {
      setLoadingState("restoringProgram", false)
    }
  }

  const handleEditProgram = (program) => {
    setSelectedProgram(program)
    setProgramName(program.name)
    setProgramDescription(program.description || "")
    setProgramDifficulty(program.difficulty || "Beginner")

    // If program has exercises data, pre-select them and load details
    if (program.exercises && Array.isArray(program.exercises)) {
      const exerciseIds = program.exercises.map((ex) => ex.exercise_id).filter(Boolean)
      setSelectedExercises(exerciseIds)

      // Load exercise details
      const details = {}
      program.exercises.forEach((ex) => {
        if (ex.exercise_id) {
          const numSets = parseInt(ex.sets || 0)
          details[ex.exercise_id] = {
            reps: ex.reps || "",
            sets: ex.sets || "",
            repsPerSet: ex.repsPerSet || (numSets > 1 ? Array(numSets).fill(ex.reps || "") : [])
          }
        }
      })
      setExerciseDetails(details)
    } else {
      setSelectedExercises([])
      setExerciseDetails({})
    }

    setDialogOpen(true)
  }

  const handleAddProgram = () => {
    setSelectedProgram(null)
    setProgramName("")
    setProgramDescription("")
    setProgramDifficulty("Beginner")
    setSelectedExercises([])
    setExerciseDetails({})
    setSelectedMuscleGroup("all")
    setExerciseSearchQuery("")
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedProgram(null)
    setProgramName("")
    setProgramDescription("")
    setProgramDifficulty("Beginner")
    setSelectedExercises([])
    setExerciseDetails({})
    setSelectedMuscleGroup("all")
    setExerciseSearchQuery("")
    setError("")
  }

  const handleViewProgram = (program) => {
    setSelectedProgram(program)
    setViewDialogOpen(true)
  }

  const handleExerciseToggle = (exerciseId) => {
    setSelectedExercises((prev) => {
      if (prev.includes(exerciseId)) {
        // Remove exercise details when unselecting
        setExerciseDetails((details) => {
          const newDetails = { ...details }
          delete newDetails[exerciseId]
          return newDetails
        })
        return prev.filter((id) => id !== exerciseId)
      } else {
        // Initialize exercise details when selecting
        setExerciseDetails((details) => ({
          ...details,
          [exerciseId]: {
            reps: "", // Default reps (for backward compatibility)
            sets: "",
            repsPerSet: [] // Array to store reps for each set
          }
        }))
        return [...prev, exerciseId]
      }
    })
  }

  const handleExerciseDetailChange = (exerciseId, field, value) => {
    // Only allow numeric input (allow empty string for clearing)
    const numericValue = value === "" ? "" : value.replace(/[^0-9]/g, "")
    
    setExerciseDetails((prev) => {
      const currentDetails = prev[exerciseId] || {}
      const newDetails = { ...currentDetails, [field]: numericValue }

      // If sets is being changed, initialize repsPerSet array
      if (field === 'sets') {
        const numSets = parseInt(numericValue) || 0
        const currentRepsPerSet = currentDetails.repsPerSet || []

        // Initialize or resize repsPerSet array
        if (numSets > 0) {
          newDetails.repsPerSet = Array.from({ length: numSets }, (_, index) =>
            currentRepsPerSet[index] || currentDetails.reps || ""
          )
        } else {
          newDetails.repsPerSet = []
        }
      }

      return {
        ...prev,
        [exerciseId]: newDetails
      }
    })
  }

  const handleSetRepsChange = (exerciseId, setIndex, reps) => {
    // Only allow numeric input (allow empty string for clearing)
    const numericReps = reps === "" ? "" : reps.replace(/[^0-9]/g, "")
    
    setExerciseDetails((prev) => {
      const currentDetails = prev[exerciseId] || {}
      const repsPerSet = [...(currentDetails.repsPerSet || [])]
      repsPerSet[setIndex] = numericReps

      return {
        ...prev,
        [exerciseId]: {
          ...currentDetails,
          repsPerSet
        }
      }
    })
  }

  const getProgramExerciseCount = (program) => {
    if (program.exercises && Array.isArray(program.exercises)) {
      return program.exercises.length
    }
    return 0
  }

  // Handle drag and drop reordering
  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newOrder = [...selectedExercises]
      const [removed] = newOrder.splice(draggedIndex, 1)
      newOrder.splice(dragOverIndex, 0, removed)
      setSelectedExercises(newOrder)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  useEffect(() => {
    if (dialogOpen && !selectedProgram) {
      setSelectedExercises([])
      setExerciseDetails({})
    }
  }, [dialogOpen, selectedProgram])

  // Filter exercises based on selected muscle group and search query
  const getFilteredExercises = () => {
    let filtered = exercises

    // Filter by muscle group
    if (selectedMuscleGroup && selectedMuscleGroup !== "all") {

      console.log("=== MUSCLE FILTER DEBUG ===")
      console.log("Selected muscle group ID:", selectedMuscleGroup, "Type:", typeof selectedMuscleGroup)
      console.log("Total exercises:", exercises.length)
      console.log("Available muscle groups:", muscleGroups)

      // Debug first few exercises
      exercises.slice(0, 3).forEach((exercise, index) => {
        console.log(`Exercise ${index + 1}: ${exercise.name}`)
        console.log("  Target muscles:", exercise.target_muscles)
        if (exercise.target_muscles && Array.isArray(exercise.target_muscles)) {
          exercise.target_muscles.forEach((muscle, muscleIndex) => {
            console.log(`    Muscle ${muscleIndex + 1}:`, {
              id: muscle.id,
              name: muscle.name,
              parent_id: muscle.parent_id,
              role: muscle.role
            })
          })
        }
      })

      const filtered = exercises.filter((exercise) => {
        if (!exercise.target_muscles || !Array.isArray(exercise.target_muscles)) {
          console.log(`❌ Exercise ${exercise.name} has no target_muscles or not an array:`, exercise.target_muscles)
          return false
        }

        const matches = exercise.target_muscles.some((muscle) => {
          // Check if any target muscle belongs to the selected muscle group
          const muscleIdMatch = muscle.id === parseInt(selectedMuscleGroup)
          const parentIdMatch = muscle.parent_id && muscle.parent_id === parseInt(selectedMuscleGroup)

          if (muscleIdMatch || parentIdMatch) {
            console.log(`✅ Exercise ${exercise.name} matches muscle group ${selectedMuscleGroup}:`, {
              muscleId: muscle.id,
              muscleName: muscle.name,
              parentId: muscle.parent_id,
              muscleIdMatch,
              parentIdMatch
            })
          }

          return muscleIdMatch || parentIdMatch
        })

        if (!matches) {
          console.log(`❌ Exercise ${exercise.name} does NOT match muscle group ${selectedMuscleGroup}`)
        }

        return matches
      })

      console.log("Filtered exercises count:", filtered.length)
      console.log("Filtered exercise names:", filtered.map(ex => ex.name))
      console.log("=== END MUSCLE FILTER DEBUG ===")
    } else {
      filtered = exercises
    }

    // Filter by search query
    if (exerciseSearchQuery.trim()) {
      const searchLower = exerciseSearchQuery.toLowerCase().trim()
      filtered = filtered.filter((exercise) => {
        const nameMatch = exercise.name?.toLowerCase().includes(searchLower)
        const descMatch = exercise.description?.toLowerCase().includes(searchLower)
        return nameMatch || descMatch
      })
    }

    // Sort to show selected exercises first, maintaining their order
    const selectedExercisesSet = new Set(selectedExercises)
    const selected = []
    const unselected = []

    // First, add selected exercises in their current order
    selectedExercises.forEach((exerciseId) => {
      const exercise = filtered.find((ex) => ex.id === exerciseId)
      if (exercise) {
        selected.push(exercise)
      }
    })

    // Then add unselected exercises
    filtered.forEach((exercise) => {
      if (!selectedExercisesSet.has(exercise.id)) {
        unselected.push(exercise)
      }
    })

    return [...selected, ...unselected]
  }

  const getDifficultyBadge = (difficulty) => {
    const colors = {
      Beginner: "bg-green-50 text-green-700 border border-green-200",
      Intermediate: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      Advanced: "bg-red-50 text-red-700 border border-red-200",
    }
    const dots = {
      Beginner: "bg-green-500",
      Intermediate: "bg-yellow-500",
      Advanced: "bg-red-500",
    }
    return (
      <Badge className={`text-xs px-2 py-0.5 font-medium ${colors[difficulty] || colors.Beginner}`}>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${dots[difficulty] || dots.Beginner}`}></div>
          {difficulty || "Beginner"}
        </div>
      </Badge>
    )
  }

  const filteredPrograms = (programs || []).filter((program) => {
    const matchesSearch = program?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty = selectedDifficulty === "all" || program?.difficulty === selectedDifficulty
    return matchesSearch && matchesDifficulty
  })

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
                  <Dumbbell className="h-5 w-5" />
                </div>
                Free Programs
                {loadingStates.fetchingPrograms && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
              </CardTitle>
              <CardDescription>Create and manage free workout programs available to all users</CardDescription>
            </div>
            {!showArchived && (
              <Button
                onClick={handleAddProgram}
                disabled={loadingStates.savingProgram || loadingStates.archivingProgram}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Program
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search programs..."
                className="pl-10 h-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="h-11 w-[180px]">
                  <SelectValue placeholder="Filter by difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="Beginner">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Beginner
                    </div>
                  </SelectItem>
                  <SelectItem value="Intermediate">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      Intermediate
                    </div>
                  </SelectItem>
                  <SelectItem value="Advanced">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      Advanced
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Tabs value={showArchived ? "archived" : "active"} onValueChange={(value) => setShowArchived(value === "archived")}>
                <TabsList>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {filteredPrograms.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {loadingStates.fetchingPrograms
                  ? "Loading programs..."
                  : searchQuery
                    ? "No programs found"
                    : "No programs yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first program"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrograms.map((program) => {
                const exerciseCount = getProgramExerciseCount(program)
                return (
                  <Card
                    key={program.id}
                    className="group hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-gray-300"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded bg-gray-50 group-hover:bg-gray-100 transition-colors">
                              <ClipboardList className="h-4 w-4 text-gray-600" />
                            </div>
                            <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                              {program.name}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                            {program.description || "No description provided"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 border-gray-200 text-gray-700 font-medium px-3 py-1"
                          >
                            <Dumbbell className="h-3 w-3 mr-1.5" />
                            {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
                          </Badge>
                          {getDifficultyBadge(program.difficulty)}
                        </div>

                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewProgram(program)}
                            disabled={loadingStates.savingProgram || loadingStates.archivingProgram || loadingStates.restoringProgram}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!showArchived && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProgram(program)}
                                disabled={loadingStates.savingProgram || loadingStates.archivingProgram}
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchiveClick(program)}
                                disabled={loadingStates.savingProgram || loadingStates.archivingProgram}
                                className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                                title="Archive"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {showArchived && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreClick(program)}
                              disabled={loadingStates.restoringProgram}
                              className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                              title="Restore"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Program Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold">
              {selectedProgram ? "Edit Program" : "Add New Program"}
            </DialogTitle>
            <DialogDescription>
              {selectedProgram ? "Update the program details and exercises below." : "Create a new workout program by filling in the details and selecting exercises."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Program Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Push Day, Full Body Workout"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  disabled={loadingStates.savingProgram}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  Difficulty Level
                </Label>
                <Select
                  value={programDifficulty}
                  onValueChange={setProgramDifficulty}
                  disabled={loadingStates.savingProgram}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Beginner
                      </div>
                    </SelectItem>
                    <SelectItem value="Intermediate">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Intermediate
                      </div>
                    </SelectItem>
                    <SelectItem value="Advanced">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Advanced
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter program description (optional)"
                value={programDescription}
                onChange={(e) => setProgramDescription(e.target.value)}
                disabled={loadingStates.savingProgram}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {selectedExercises.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                    {selectedExercises.length} {selectedExercises.length === 1 ? "exercise" : "exercises"} selected
                  </Badge>
                )}
              </div>

              {/* Search and Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Exercise Search */}
                <div className="space-y-2">
                  <Label htmlFor="exercise-search" className="text-sm font-medium">
                    Search Exercises <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="exercise-search"
                      type="search"
                      placeholder="Search by name or description..."
                      value={exerciseSearchQuery}
                      onChange={(e) => setExerciseSearchQuery(e.target.value)}
                      disabled={loadingStates.savingProgram}
                      className="h-10 pl-10"
                    />
                  </div>
                </div>

                {/* Muscle Group Filter */}
                {muscleGroups.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="muscle-group-filter" className="text-sm font-medium">Filter by Muscle Group</Label>
                    <Select
                      value={selectedMuscleGroup}
                      onValueChange={setSelectedMuscleGroup}
                      disabled={loadingStates.savingProgram || loadingStates.fetchingMuscleGroups}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="All Muscle Groups" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Muscle Groups</SelectItem>
                        {muscleGroups.map((muscleGroup) => (
                          <SelectItem key={muscleGroup.id} value={muscleGroup.id.toString()}>
                            {muscleGroup.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {exercises.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No exercises found in your database. Please add exercises first before creating programs.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  {getFilteredExercises().map((exercise, index) => {
                    const isSelected = selectedExercises.includes(exercise.id)
                    const selectedIndex = isSelected ? selectedExercises.indexOf(exercise.id) : -1
                    const isDragging = draggedIndex === selectedIndex
                    const isDragOver = dragOverIndex === selectedIndex

                    return (
                      <div
                        key={exercise.id}
                        className={`space-y-3 ${isSelected ? 'bg-blue-50/50 border border-blue-200 rounded-lg p-3' : ''} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-blue-400 border-2' : ''}`}
                        draggable={isSelected}
                        onDragStart={() => isSelected && handleDragStart(selectedIndex)}
                        onDragOver={(e) => isSelected && handleDragOver(e, selectedIndex)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-start space-x-3">
                          {isSelected && (
                            <div className="cursor-move mt-1 text-gray-400 hover:text-gray-600" draggable={false}>
                              <GripVertical className="h-5 w-5" />
                            </div>
                          )}
                          <Checkbox
                            id={`exercise-${exercise.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleExerciseToggle(exercise.id)}
                            disabled={loadingStates.savingProgram}
                          />
                          <div className="flex-1">
                            <label
                              htmlFor={`exercise-${exercise.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {exercise.name}
                            </label>
                            {exercise.description && (
                              <p className="text-xs text-muted-foreground mt-1">{exercise.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Exercise Details - only show if exercise is selected */}
                        {isSelected && (
                          <div className="ml-6 p-4 bg-white border border-gray-200 rounded-lg space-y-4 shadow-sm">
                            {/* Sets Input */}
                            <div>
                              <Label htmlFor={`sets-${exercise.id}`} className="text-sm font-medium mb-2 block">
                                Number of Sets
                              </Label>
                              <Input
                                id={`sets-${exercise.id}`}
                                type="number"
                                placeholder="Enter number of sets"
                                min="1"
                                max="10"
                                value={exerciseDetails[exercise.id]?.sets || ""}
                                onChange={(e) => handleExerciseDetailChange(exercise.id, 'sets', e.target.value)}
                                onKeyDown={(e) => {
                                  // Allow: backspace, delete, tab, escape, enter, and numbers
                                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                                    e.preventDefault()
                                  }
                                }}
                                disabled={loadingStates.savingProgram}
                                className="h-10"
                              />
                            </div>

                            {/* Reps Configuration */}
                            {(() => {
                              const numSets = parseInt(exerciseDetails[exercise.id]?.sets || 0)
                              const repsPerSet = exerciseDetails[exercise.id]?.repsPerSet || []

                              if (numSets <= 0) {
                                return null
                              } else if (numSets === 1) {
                                // Single set - show simple reps input
                                return (
                                  <div>
                                    <Label htmlFor={`reps-${exercise.id}`} className="text-sm font-medium mb-2 block">
                                      Reps
                                    </Label>
                                    <Input
                                      id={`reps-${exercise.id}`}
                                      type="number"
                                      placeholder="Enter number of reps"
                                      value={exerciseDetails[exercise.id]?.reps || ""}
                                      onChange={(e) => handleExerciseDetailChange(exercise.id, 'reps', e.target.value)}
                                      onKeyDown={(e) => {
                                        // Allow: backspace, delete, tab, escape, enter, and numbers
                                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                                          e.preventDefault()
                                        }
                                      }}
                                      disabled={loadingStates.savingProgram}
                                      className="h-10"
                                    />
                                  </div>
                                )
                              } else {
                                // Multiple sets - show individual set inputs in a better layout
                                return (
                                  <div>
                                    <Label className="text-sm font-medium mb-3 block">
                                      Reps per Set
                                    </Label>
                                    <div className="space-y-2">
                                      {Array.from({ length: numSets }, (_, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                          <div className="w-20 flex-shrink-0">
                                            <span className="text-sm font-medium text-gray-700">
                                              Set {index + 1}
                                            </span>
                                          </div>
                                          <Input
                                            id={`set-${exercise.id}-${index}`}
                                            type="number"
                                            placeholder="Reps"
                                            value={repsPerSet[index] || ""}
                                            onChange={(e) => handleSetRepsChange(exercise.id, index, e.target.value)}
                                            onKeyDown={(e) => {
                                              // Allow: backspace, delete, tab, escape, enter, and numbers
                                              if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                                                e.preventDefault()
                                              }
                                            }}
                                            disabled={loadingStates.savingProgram}
                                            className="h-10 flex-1"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {(selectedMuscleGroup !== "all" || exerciseSearchQuery.trim()) && (
                <div className="text-xs text-muted-foreground">
                  Showing {getFilteredExercises().length} of {exercises.length} exercises
                  {exerciseSearchQuery.trim() && (
                    <span className="ml-1">matching "{exerciseSearchQuery}"</span>
                  )}
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="pt-4 border-t gap-2">
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={loadingStates.savingProgram}
              className="h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProgram}
              disabled={
                !programName.trim() ||
                selectedExercises.length === 0 ||
                loadingStates.savingProgram ||
                getFilteredExercises().length === 0
              }
              className="h-10 bg-gray-900 hover:bg-gray-800 text-white min-w-[100px]"
            >
              {loadingStates.savingProgram ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {selectedProgram ? "Updating..." : "Creating..."}
                </>
              ) : selectedProgram ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Program Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col" hideClose>
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-gray-600" />
              {selectedProgram?.name}
            </DialogTitle>
            {selectedProgram?.difficulty && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  {selectedProgram.difficulty}
                </Badge>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-2">
            {/* Description Section */}
            {selectedProgram?.description && (
              <div>
                <h4 className="font-semibold text-sm mb-3 text-gray-700 uppercase tracking-wide">Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {selectedProgram.description}
                </p>
              </div>
            )}

            {/* Exercises Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
                  Exercises ({selectedProgram?.exercises?.length || 0})
                </h4>
              </div>

              {selectedProgram && selectedProgram.exercises && selectedProgram.exercises.length > 0 ? (
                <div className="space-y-3">
                  {selectedProgram.exercises.map((exercise, index) => {
                    const numSets = parseInt(exercise.sets || 0)
                    // Handle repsPerSet - could be array, string, or undefined
                    let repsPerSet = exercise.repsPerSet || []
                    if (typeof repsPerSet === 'string') {
                      try {
                        repsPerSet = JSON.parse(repsPerSet)
                      } catch (e) {
                        repsPerSet = []
                      }
                    }
                    if (!Array.isArray(repsPerSet)) {
                      repsPerSet = []
                    }
                    // Ensure array matches number of sets
                    if (repsPerSet.length < numSets) {
                      repsPerSet = [...repsPerSet, ...Array(numSets - repsPerSet.length).fill('')]
                    } else if (repsPerSet.length > numSets) {
                      repsPerSet = repsPerSet.slice(0, numSets)
                    }
                    const hasMultipleSets = numSets > 1 && repsPerSet.some(r => r !== null && r !== undefined && r !== '')

                    return (
                      <div key={index} className="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm">
                                {index + 1}
                              </div>
                              <h5 className="font-semibold text-base text-gray-900">
                                {exercise.exercise_name || "Unknown Exercise"}
                              </h5>
                            </div>
                            <Badge variant="outline" className="bg-gray-50">
                              {numSets} {numSets === 1 ? "Set" : "Sets"}
                            </Badge>
                          </div>

                          {/* Sets and Reps Details */}
                          <div className="space-y-3">
                            {hasMultipleSets ? (
                              // Multiple sets with individual reps
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                  Sets & Reps
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {repsPerSet.map((reps, setIndex) => (
                                    <div
                                      key={setIndex}
                                      className="flex items-center justify-between p-2.5 bg-gray-50 rounded-md border border-gray-200"
                                    >
                                      <span className="text-sm font-medium text-gray-700">
                                        Set {setIndex + 1}
                                      </span>
                                      <span className="text-sm font-semibold text-gray-900">
                                        {reps || "N/A"} {reps && "reps"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              // Single set or same reps for all sets
                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                                <span className="text-sm font-medium text-gray-700">Reps</span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {exercise.reps || "N/A"} {exercise.reps && "reps"}
                                  {numSets > 1 && ` × ${numSets} sets`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border border-gray-200 rounded-lg bg-gray-50">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No exercises added yet</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t mt-4">
            <Button
              onClick={() => setViewDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={(open) => {
        setArchiveDialogOpen(open)
        if (!open) {
          setProgramToArchive(null)
          setError("")
        }
      }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Archive className="h-5 w-5 text-orange-600" />
              </div>
              <AlertDialogTitle className="text-xl">Archive Program</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to archive <span className="font-semibold text-foreground">"{programToArchive?.name}"</span>?
            </AlertDialogDescription>
            <div className="mt-4 p-3 bg-muted/50 rounded-md border border-orange-200">
              <p className="text-sm text-muted-foreground">
                This program will be moved to the archive. You can restore it later if needed.
              </p>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="ml-2">{error}</AlertDescription>
              </Alert>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row sm:justify-end gap-2 mt-6">
            <AlertDialogCancel
              onClick={() => {
                setProgramToArchive(null)
                setError("")
              }}
              disabled={loadingStates.archivingProgram}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveProgram}
              disabled={loadingStates.archivingProgram}
              className="bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500"
            >
              {loadingStates.archivingProgram ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Program
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={(open) => {
        setRestoreDialogOpen(open)
        if (!open) {
          setProgramToRestore(null)
          setError("")
        }
      }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <RotateCcw className="h-5 w-5 text-green-600" />
              </div>
              <AlertDialogTitle className="text-xl">Restore Program</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to restore <span className="font-semibold text-foreground">"{programToRestore?.name}"</span>?
            </AlertDialogDescription>
            <div className="mt-4 p-3 bg-muted/50 rounded-md border border-green-200">
              <p className="text-sm text-muted-foreground">
                This program will be restored and will appear in the active programs list.
              </p>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="ml-2">{error}</AlertDescription>
              </Alert>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-row sm:justify-end gap-2 mt-6">
            <AlertDialogCancel
              onClick={() => {
                setProgramToRestore(null)
                setError("")
              }}
              disabled={loadingStates.restoringProgram}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreProgram}
              disabled={loadingStates.restoringProgram}
              className="bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
            >
              {loadingStates.restoringProgram ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Program
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default FreePrograms
