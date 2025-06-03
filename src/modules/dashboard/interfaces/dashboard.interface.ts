export interface TaskSummary {
    total: number;
    inProgress: number;
    completed: number;
    pending: number;
    routineTasks: number;
    projectTasks: number;
    overdueCount: number;
    completionRate: number;
}

export interface TimelineEntry {
    taskId: string;
    taskName: string;
    projectId: string;
    projectName: string;
    startTime: string;
    endTime: string;
    duration: number;  // in hours
    position: number;  // percentage position for display
    width: number;     // percentage width for display
}

export interface DailyTimelineResponse {
    entries: TimelineEntry[];
    totalWorkingTime: number;
    totalBreakTime: number;
    shiftStart: string;
    shiftEnd: string;
}

export interface TimeTracking {
    totalTimeToday: string; // HH:MM:SS format
    workedHours: number;    // Total task work hours
    breakTime: number;      // Break hours
    overtimeHours: number;  // Overtime hours
    overtimeRate: number;   // Overtime rate percentage
    efficiency: number;     // Efficiency percentage
    expectedHours: number;  // Expected daily hours
    workingDaysThisWeek: number; // Working days count
    productivityScore: number;   // Overall productivity score
    hoursByDay: {
        date: string;
        plannedHours: number;
        actualHours: number;
    }[];
}

export interface DailyTask {
    id: string;
    name: string;
    dueTime: string;
    priority: string;
    status: string;
    isRoutineTask: boolean;
    isOverdue: boolean;
    progress: number;
    estimatedHours: number;
    actualHours: number;
    timeLogs: any;
}

export interface ProjectStats {
    id: string;
    name: string;
    progress: number;
    tasksCount: number;
    hoursSpent: number;
    completedTasks: number;
    pendingTasks: number;
    health: 'excellent' | 'good' | 'warning' | 'critical';
    isOnTrack: boolean;
    daysRemaining: number;
    estimatedCompletionDate: Date;
}

export interface MyTask {
    id: string;
    name: string;
    project: string;
    status: string;
    dueDate: string;
    timeSpent: number;
    progress: number;
    commentsCount: number;
    filesCount: number;
    isRoutineTask: boolean;
    isOverdue: boolean;
    priorityScore: number;
    estimatedHours: number;
    actualHours: number;
    section: string;
}

export interface RecentActivity {
    id: string;
    type: 'comment' | 'status_change' | 'timer_action' | 'task_created' | 'file_upload';
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    content: string;
    taskId: string;
    taskName: string;
    timestamp: Date;
}


export interface MessagePreview {
    id: string;
    user: {
        id: string;
        name: string;
        avatar?: string;
        isOnline: boolean;
    };
    lastMessage: string;
    timestamp: Date;
    unreadCount: number;
}

export interface DashboardData {
    taskSummary: TaskSummary;
    dailyTimeline: DailyTimelineResponse;
    timeTracking: TimeTracking;
    dailyTasks: DailyTask[];
    projectStats: ProjectStats[];
    myTasks: MyTask[];
    recentActivities: RecentActivity[];
    messages: MessagePreview[];
}
