export interface TaskSummary {
    total: number;
    inProgress: number;
    completed: number;
    pending: number;
}

export interface TimeTracking {
    totalHoursToday: number;
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
}

export interface ProjectStats {
    id: string;
    name: string;
    progress: number;
    tasksCount: number;
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
    type: 'comment' | 'status_change' | 'task_created' | 'file_upload';
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
    timeTracking: TimeTracking;
    dailyTasks: DailyTask[];
    projectStats: ProjectStats[];
    myTasks: MyTask[];
    recentActivities: RecentActivity[];
    messages: MessagePreview[];
}
