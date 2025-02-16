// Define status and role types to avoid repetition and ensure consistency
export type UserRoleType = "user" | "partner" | "validator" | "admin" | null;
export type RequestStatus = "pending" | "approved" | "rejected" | null;
export type RequestableRoles = Exclude<UserRoleType, "user" | "admin" | null>;

export interface RoleRequest {
  requestedRole: RequestableRoles;
  status: RequestStatus;
}

export interface AuthContextType {
  firebaseToken: string | null;
  loading: boolean;
  error: string | null;
  userRole: UserRoleType;
  roleRequest: RoleRequest | null;
  userId: string | null;
  updateUserRole: (newRole: UserRoleType) => Promise<void>;
  getValidFirebaseToken: () => Promise<string | null>;
  makeAuthenticatedRequest: (url: string, options?: RequestInit) => Promise<Response>;
}

export interface UserInfo {
    role: UserRoleType;
    roleRequest: RoleRequest | null;
  }

export interface UserData {
    user_info: UserInfo;  // required instead of optional
    lastLogin?: Date;     // additional user metadata
    createdAt?: Date;
  }
  
  // role mapping
  export const ROLE_ROUTES = {
    admin: "/dashboards/admin",
    partner: "/dashboards/restaurant-partner",
    validator: "/dashboards/validator",
    user: "/dashboards/user/find-restaurants"
  } as const;
  
  export type RoleRoute = typeof ROLE_ROUTES[keyof typeof ROLE_ROUTES];