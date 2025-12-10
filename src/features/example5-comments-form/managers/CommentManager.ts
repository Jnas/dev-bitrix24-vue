import {ref} from "vue";
import type { CommentType, CrmCommentType, UserType } from "../types/types";
import CrmService from "../services/CrmService";
import UserService from "../services/UserService";
import { BizprocService } from "../services/BizprocService";

/**
 * Comment manager - central class for working with comments
 * Responsible for:
 * - Loading and storing the list of comments
 * - Managing the current user
 * - Interaction with CRM and business processes
 */
export default class CommentManager {
    // Reactive array of comments
    public comments = ref<CommentType[]>([]);

    // Current authorized user
    public currentUser = ref<UserType | null>(null);

    // Data interaction services
    private crmService: CrmService;
    private userService: UserService;
    private bizprocService: BizprocService;

    /**
     * Creates a CommentManager instance
     * @param entityTypeId - CRM entity type ID (default: 1288)
     * @param bizprocTemplateId - Business process template ID (default: 1915)
     */
    constructor(entityTypeId: number = 1288, bizprocTemplateId: number = 1915) {
        this.crmService = new CrmService(entityTypeId);
        this.userService = new UserService();
        this.bizprocService = new BizprocService(bizprocTemplateId);
    }

    /**
     * Initializes the comment manager
     * Performs parallel loading:
     * - Current CRM item
     * - List of users
     * - Current user data
     * Updates the comments list after loading data
     */
    async initialize(): Promise<void> {
        try {
            // Parallel loading of all required data
            await Promise.all([
                this.crmService.fetchCurrentItem(),
                this.userService.fetchUsers(),
                this.loadCurrentUser()
            ]);

            // Update comments list after loading data
            this.updateComments(this.crmService.getComments());
        } catch {
            console.error('CommentManager initialization error');
            throw 'CommentManager initialization error';
        }
    }

    private async loadCurrentUser(): Promise<void> {
        this.currentUser.value = await this.userService.getCurrentUser();
    }

    /**
     * Updates the comments list, converting them from CRM format to application format
     *
     * @param comments - Array of comments in CRM format
     * @returns void
     *
     * @description
     * 1. Accepts an array of comments from CRM
     * 2. Converts each comment to application format
     * 3. Filters null/undefined values
     * 4. Updates the reactive comments property
     */
    updateComments(comments: CrmCommentType[]): void {
        const convertedComments = comments
            .map(comment => this.convertComment(comment))
            .filter((comment): comment is CommentType => comment !== null);

        this.comments.value = convertedComments;
    }

    /**
     * Converts a comment from CRM format to application format
     * @param comment - Comment in CRM format
     * @returns Comment in application format or null if conversion is not possible
     */
    private convertComment(comment: CrmCommentType): CommentType | null {
        // Check for required fields
        if (!comment?.userId) return null;

        // Get user data
        const userId = comment.userId.toString();
        const user = this.userService.getUserById(userId);
        if (!user) return null;

        // Form user's full name
        const username = this.userService.getUserFullNameById(userId);
        if (!username) return null;

        // Return comment object in application format
        return {
            userId: userId,
            username,
            avatar: user.PERSONAL_PHOTO || '',
            text: comment.text || '',
            timestamp: comment.timestamp || Date.now()
        };
    }

    /**
     * Adds a new comment from the current user
     *
     * @param text - Comment text to add
     * @returns Promise<boolean> - true if comment was successfully added, otherwise false
     *
     * @description
     * 1. Checks user authorization
     * 2. Creates a comment object with current timestamp
     * 3. Saves comment to CRM
     * 4. On successful save:
     *    - Adds comment to local list
     *    - Starts related business process
     */
    async addComment(text: string): Promise<boolean> {
        // Check that user is authorized
        if (!this.currentUser.value) {
            console.error('Current user is not defined');
            return false;
        }

        const userId = this.currentUser.value.ID;
        const timestamp = Date.now();

        // Form comment object for display
        const commentData: CommentType = {
            userId,
            username: this.userService.getUserFullNameById(userId) || "Unknown user",
            avatar: this.currentUser.value.PERSONAL_PHOTO || "",
            text,
            timestamp
        };

        try {
            // Save comment to CRM
            const saveResult = await this.crmService.addComment(userId, text, timestamp);
            if (!saveResult.success) {
                console.error('Failed to save comment to CRM');
                return false;
            }

            // Add comment to local list for instant display
            this.comments.value.push(commentData);

            // Start business process asynchronously, without waiting for completion
            this.startBusinessProcess(commentData).catch(() => {
                console.error('Error starting business process');
                // Continue execution even if business process didn't start
            });

            return true;
        } catch {
            console.error('Error adding comment');
            return false;
        }
    }

    /**
     * Starts a business process related to comment addition
     *
     * @param comment - Comment data to pass to the business process
     * @returns Promise<void>
     *
     * @description
     * 1. Gets entity type ID from CRM service
     * 2. Calls business process service to start workflow
     * 3. Handles possible errors, logging them to console
     *
     * @note
     * - Errors are logged but not thrown higher to not interrupt main flow
     * - Business process starts asynchronously and doesn't block interface
     */
    private async startBusinessProcess(comment: CommentType): Promise<void> {
        try {
            await this.bizprocService.startCommentWorkflow(
                this.crmService.entityTypeId,
                this.crmService.crmId,
                comment
            );
        } catch {
            console.error('Error starting business process');
            // Can add user notification about error through notification system
        }
    }

    /**
     * Getter for current user's avatar
     */
    get currentUserAvatar(): string {
        return this.currentUser.value?.PERSONAL_PHOTO || "";
    }

    /**
     * Getter for current user's name
     */
    get currentUserName(): string {
        return this.currentUser.value?.NAME || "";
    }
}