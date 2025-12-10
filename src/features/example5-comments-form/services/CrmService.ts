import {api} from "../../../../dev/api";
import type {CrmCommentType} from "../types/types";

/**
 * Service for working with CRM entities
 * Provides:
 * - Loading and caching of CRM element data
 * - Managing comments in the context of an element
 * - Interaction with Bitrix24 API for CRM operations
 */
export default class CrmService {
    // Cache of loaded CRM element
    private _currentItem: Record<string, unknown> | null = null;
    /**
     * CRM entity type ID
     * Identifier of dynamic entity type
     */
    public readonly entityTypeId: number;

    /**
     * Creates a CrmService instance
     * @param entityTypeId - CRM entity type ID (default: 1288)
     */
    constructor(entityTypeId: number) {
        this.entityTypeId = entityTypeId;
    }

    /**
     * Gets the current CRM element ID from the placement context
     * @returns Numeric CRM element ID
     */
    get crmId(): number {
        const placement =  api().fields.placement as { options?: { ID?: number | string } };
        return Number(placement?.options?.ID ?? 0);
    }

    /**
     * Loads the current CRM element by its ID
     * @throws {Error} If failed to load the element
     *
     * @description
     * 1. Checks for cached element
     * 2. Loads element data via Bitrix24 API
     * 3. Saves result to cache
     */
    async fetchCurrentItem(): Promise<void> {
        // Return cached data if available
        if (this._currentItem) return;

        const response = await api().methods.b24Call<{
            result?: { item?: Record<string, unknown> }
        }>("crm.item.get", {
            entityTypeId: this.entityTypeId,
            id: this.crmId
        });
        if (response?.result?.item) {
            this._currentItem = response.result.item;
        } else {
            throw new Error("Failed to load CRM element");
        }
    }

    /**
     * Returns an array of comments for the current CRM element
     * @returns {CrmCommentType[]} Array of comments or empty array if element is not loaded
     */
    getComments(): CrmCommentType[] {
        if (!this._currentItem) return [];
        const raw = this._currentItem.ufCrm107SvJsonComments as unknown;
        return this.parseComments(raw as string[]);
    }

    /**
     * Adds a new comment to the CRM element
     *
     * @param userId - ID of the user who left the comment
     * @param text - Comment text
     * @param timestamp - Comment creation timestamp
     * @returns {Promise<{success: boolean}>} Operation result
     *
     * @description
     * 1. Loads the current element if not already loaded
     * 2. Creates a new comment in JSON format
     * 3. Updates the element's comment list
     * 4. Saves changes via Bitrix24 API
     * 5. Updates local cache on successful save
     */
    async addComment(
        userId: string,
        text: string,
        timestamp: number
    ): Promise<{ success: boolean }> {
        // Make sure the element is loaded
        await this.fetchCurrentItem();
        if (!this._currentItem) {
            console.error('CRM element not loaded');
            return {success: false};
        }

        // Create a new comment in JSON format
        const newComment = JSON.stringify({userId, text, timestamp});

        // Get current comments or initialize empty array
        const comments = (this._currentItem.ufCrm107SvJsonComments as unknown as string[]) || [];
        const updatedComments = [...comments, newComment];

        try {
            // Update element via Bitrix24 API
            const response = await api().methods.b24Call<{ result?: boolean }>("crm.item.update", {
                entityTypeId: this.entityTypeId,
                id: this.crmId,
                fields: {
                    ufCrm107SvJsonComments: updatedComments
                }
            });

            // Update local cache on successful update
            if (response?.result) {
                this._currentItem.ufCrm107SvJsonComments = updatedComments;
                return {success: true};
            }

            console.error('Failed to update comment: invalid response format');
            return {success: false};
        } catch  {
            console.error("Error updating comment");
            return {success: false};
        }
    }

    /**
     * Parses an array of JSON comment strings into an array of CrmCommentType objects
     * @param commentsRaw - Array of JSON strings
     * @returns Array of comments in CrmCommentType format
     */
    private parseComments(commentsRaw: string[]): CrmCommentType[] {
        if (!commentsRaw || !Array.isArray(commentsRaw)) return [];

        return commentsRaw.reduce<CrmCommentType[]>((acc, jsonString) => {
            try {
                const parsed = JSON.parse(jsonString);
                // Check that the parsed object has the expected structure
                if (parsed && typeof parsed === 'object' && 'userId' in parsed) {
                    acc.push({
                        userId: parsed.userId,
                        text: parsed.text || '',
                        timestamp: parsed.timestamp || Date.now()
                    });
                }
            } catch {
                console.error('Error parsing comment:', jsonString);
                // Continue processing other comments on parse error
            }
            return acc;
        }, []);
    }
}