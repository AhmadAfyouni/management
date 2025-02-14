export enum TransactionStatus {
    NOT_APPROVED = 'NOT_APPROVED',
    PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
    FULLY_APPROVED = 'FULLY_APPROVED',
    ADMIN_APPROVED = 'ADMIN_APPROVED'
}

export enum DepartmentScheduleStatus {
    PENDING = "PENDING",
    ONGOING = "ONGOING",
    CHECKING = "CHECKING",
    DONE = "DONE",
}

export enum TransactionAction {
    SEND_BACK = "send_back",
    APPROVE = "approve",
    REJECT = "reject"
}