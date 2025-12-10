import type { UserType } from "../types/types";
import {api} from "../../../../dev/api.ts";

/**
 * Service for working with system users
 * 
 * Main functions:
 * - Managing current user data
 * - Caching the list of users
 * - Searching users by ID
 * - Forming user's full name
 */
export default class UserService {
    // Current user data cache
    private _currentUser: UserType | null = null;
    
    // Users list cache
    private _users: UserType[] | null = null;

    /**
     * Gets data of the current authenticated user
     * Uses caching to avoid unnecessary requests
     * @returns Promise with user data
     */
    async getCurrentUser(): Promise<UserType> {
        // Return cached data if available
        if (this._currentUser) return this._currentUser;

        // Request current user data from Bitrix24 API
        const response = await api().methods.b24Call<{ result: UserType }>(
            "user.current",
            {}
        );
        this._currentUser = response.result as UserType;
        return this._currentUser;
    }

    /**
     * Getter for current user's avatar
     * @returns {string} Avatar URL or empty string if avatar is not set
     * 
     * @note
     * Returns avatar URL in a format suitable for use in img tag
     */
    get userAvatar(): string {
        return this._currentUser?.PERSONAL_PHOTO || "";
    }

    /**
     * Loads the list of all system users
     * @returns {Promise<void>}
     * 
     * @description
     * 1. Checks for cached users list
     * 2. Loads users list via Bitrix24 API
     * 3. Saves result to cache
     */
    async fetchUsers(): Promise<void> {
        // Don't reload if data is already cached
        if (this._users) return;

        // Load users list via API
        const response = await api().methods.b24Call<{ result: UserType[] }>(
            "user.get",
            {}
        );
        
        // Save result to cache
        this._users = response.result;
    }

    /**
     * Finds a user by ID
     * 
     * @param id - User ID to search for
     * @returns {UserType | undefined} Found user or undefined if not found
     * 
     * @note
     * For the method to work, fetchUsers() must be called beforehand
     */
    getUserById(id: string): UserType | undefined {
        return this._users?.find(user => user.ID === id);
    }

    /**
     * Forms user's full name by their ID
     * @param id - User ID
     * @returns String with user's full name or empty string if user not found
     */
    getUserFullNameById(id: string): string {
        const user = this.getUserById(id);
        if (!user) return "";

        // Collect full name from separate fields, filtering out empty values
        return [user.NAME, user.SECOND_NAME, user.LAST_NAME]
            .filter(Boolean) // Remove empty values
            .join(" ");     // Join with space
    }
}
