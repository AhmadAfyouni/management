import { PermissionsEnum } from './permissions.enum';
import { UserRole } from './role.enum';

export const DefaultPermissions: { [key in UserRole]: PermissionsEnum[] } = {
    [UserRole.ADMIN]: [
        PermissionsEnum.EMP_SEARCH_AND_VIEW,
        PermissionsEnum.EMP_MANAGE_FILES,
        PermissionsEnum.EMP_ADD,
        PermissionsEnum.EMP_UPDATE,
        PermissionsEnum.EMP_DELETE,

        PermissionsEnum.JOB_TITLE_SEARCH_AND_VIEW,
        PermissionsEnum.JOB_TITLE_MANAGE_FILES,
        PermissionsEnum.JOB_TITLE_ADD,
        PermissionsEnum.JOB_TITLE_UPDATE,
        PermissionsEnum.JOB_TITLE_DELETE,

        PermissionsEnum.DEPARTMENT_SEARCH_AND_VIEW,
        PermissionsEnum.DEPARTMENT_MANAGE_FILES,
        PermissionsEnum.DEPARTMENT_ADD,
        PermissionsEnum.DEPARTMENT_UPDATE,
        PermissionsEnum.DEPARTMENT_DELETE,

        PermissionsEnum.PERMISSION_SEARCH_AND_VIEW,
        PermissionsEnum.PERMISSION_ADD,
        PermissionsEnum.PERMISSION_UPDATE,
        PermissionsEnum.PERMISSION_DELETE,

        PermissionsEnum.ELECTRONIC_TRANSACTION_SEARCH_AND_VIEW,
        PermissionsEnum.ELECTRONIC_TRANSACTION_MANAGE_FILES,
        PermissionsEnum.ELECTRONIC_TRANSACTION_ADD,
        PermissionsEnum.ELECTRONIC_TRANSACTION_UPDATE,
        PermissionsEnum.ELECTRONIC_TRANSACTION_DELETE,

        PermissionsEnum.TASK_SEARCH_AND_VIEW,
        PermissionsEnum.TASK_MANAGE_FILES,
        PermissionsEnum.TASK_ADD,
        PermissionsEnum.TASK_UPDATE,
        PermissionsEnum.TASK_DELETE,
    ],
    [UserRole.PRIMARY_USER]: [
        PermissionsEnum.EMP_SEARCH_AND_VIEW,
        PermissionsEnum.EMP_MANAGE_FILES,
        PermissionsEnum.EMP_ADD,
        PermissionsEnum.EMP_UPDATE,
        PermissionsEnum.EMP_DELETE,

        PermissionsEnum.JOB_TITLE_SEARCH_AND_VIEW,
        PermissionsEnum.JOB_TITLE_MANAGE_FILES,
        PermissionsEnum.JOB_TITLE_ADD,
        PermissionsEnum.JOB_TITLE_UPDATE,
        PermissionsEnum.JOB_TITLE_DELETE,

        PermissionsEnum.DEPARTMENT_SEARCH_AND_VIEW,
        PermissionsEnum.DEPARTMENT_MANAGE_FILES,
        PermissionsEnum.DEPARTMENT_ADD,
        PermissionsEnum.DEPARTMENT_UPDATE,
        PermissionsEnum.DEPARTMENT_DELETE,

        PermissionsEnum.PERMISSION_SEARCH_AND_VIEW,

        PermissionsEnum.ELECTRONIC_TRANSACTION_SEARCH_AND_VIEW,
        PermissionsEnum.ELECTRONIC_TRANSACTION_MANAGE_FILES,
        PermissionsEnum.ELECTRONIC_TRANSACTION_ADD,
        PermissionsEnum.ELECTRONIC_TRANSACTION_UPDATE,
        PermissionsEnum.ELECTRONIC_TRANSACTION_DELETE,

        PermissionsEnum.TASK_SEARCH_AND_VIEW,
        PermissionsEnum.TASK_MANAGE_FILES,
        PermissionsEnum.TASK_ADD,
        PermissionsEnum.TASK_UPDATE,
        PermissionsEnum.TASK_DELETE,
    ],
    [UserRole.SECONDARY_USER]: [
        PermissionsEnum.EMP_SEARCH_AND_VIEW,
        PermissionsEnum.EMP_MANAGE_FILES,

        PermissionsEnum.JOB_TITLE_SEARCH_AND_VIEW,

        PermissionsEnum.DEPARTMENT_SEARCH_AND_VIEW,

        PermissionsEnum.ELECTRONIC_TRANSACTION_SEARCH_AND_VIEW,
        PermissionsEnum.ELECTRONIC_TRANSACTION_MANAGE_FILES,

        PermissionsEnum.TASK_SEARCH_AND_VIEW,   
        PermissionsEnum.TASK_MANAGE_FILES,      
    ],
};
