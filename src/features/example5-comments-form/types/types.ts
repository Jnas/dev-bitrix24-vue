/**
 * Represents user data in the system
 */
export type UserType = {
    /** Unique user identifier */
    ID: string;
    /** User's first name */
    NAME: string;
    /** User's last name */
    LAST_NAME: string;
    /** User's middle name (may be empty) */
    SECOND_NAME: string;
    /** User's avatar URL */
    PERSONAL_PHOTO: string;
};

/**
 * Represents a comment in CRM storage format
 */
export type CrmCommentType = {
    /** ID of the user who left the comment */
    userId: string;
    /** Comment text */
    text: string;
    /** Comment creation timestamp (in milliseconds) */
    timestamp: number;
};

/**
 * Represents a comment in application format
 * (enriched version of CrmCommentType with additional data for display)
 */
export type CommentType = {
    /** User ID */
    userId: string;
    /** User's full name */
    username: string;
    /** User's avatar URL */
    avatar: string;
    /** Comment text */
    text: string;
    /** Comment creation timestamp */
    timestamp: number;
};
