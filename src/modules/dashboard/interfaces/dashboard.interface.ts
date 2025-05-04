export interface TaskSummary {
    total: number;
    inProgress: number;
    completed: number;
    pending: number;
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
    totalHoursToday: number;
    hoursByDay: {
        date: string;
        plannedHours: number;
        actualHours: number;
    }[];
    breakTime: number;
    overtimeHours: number;
    overtimeRate: number;
}

export interface DailyTask {
    id: string;
    name: string;
    dueTime: string;
    priority: string;
    status: string;

}

export interface ProjectStats {
    id: string;
    name: string;
    progress: number;
    tasksCount: number;
    hoursSpent: number;
}

export interface MyTask {
    id: string;
    name: string;
    project: string;
    status: string;
    dueDate: string;
    timeSpent: number;
    progress: number;
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
