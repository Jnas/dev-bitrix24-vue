import {api} from "../../../../dev/api.ts";
import type { CommentType } from "../types/types.ts";

/**
 * Service for working with Bitrix24 business processes
 *
 * Main purpose - to launch business processes in response to user actions
 * (for example, adding a comment).
 *
 * Before use, it's necessary to set up a business process in Bitrix24 with parameters:
 * - Trigger: Create/modify CRM element
 * - Parameters:
 *   - END_COMMENT_USER: ID of the user who left the comment
 *   - END_COMMENT_TEXT: Comment text
 *
 * For debugging and setup, you can use the API request:
 * bizproc.workflow.template.list with parameters:
 * {
 *    "SELECT": ["ID", "MODULE_ID", "ENTITY", "DOCUMENT_TYPE", "NAME"],
 *    "FILTER": {
 *      "DOCUMENT_TYPE": "{{CRM_entity_ID}}"
 *    }
 * }
 */

export class BizprocService {
    /**
     * Business process template ID
     * @private
     */
    private readonly templateId: number;

    /**
     * Creates a BizprocService instance
     * @param templateId - Business process template ID (default: 1915)
     */
    constructor(templateId: number) {
        this.templateId = templateId;
    }

    /**
     * Starts a business process related to comment addition
     *
     * @param entityTypeId - CRM entity type ID
     * @param crmId - CRM entity element ID
     * @param comment - Comment object
     * @returns Promise that resolves when business process is successfully started
     */
    async startCommentWorkflow(
        entityTypeId: number,
        crmId: number,
        comment: CommentType
    ): Promise<void> {
        // Call Bitrix24 API to start business process
        await api().methods.b24Call("bizproc.workflow.start", {
            // Business process template ID (must be created in Bitrix24 beforehand)
            TEMPLATE_ID: this.templateId,

            // Document identifier to which the business process is attached
            DOCUMENT_ID: [
                "crm",  // CRM module
                "Bitrix\\Crm\\Integration\\BizProc\\Document\\Dynamic",  // Document class
                `DYNAMIC_${entityTypeId}_${crmId}`  // Document type identifier
            ],

            // Parameters passed to the business process
            PARAMETERS: {
                // ID of the user who left the comment (with 'user_' prefix for correct BP operation)
                END_COMMENT_USER: "user_" + comment.userId,
                // Comment text
                END_COMMENT_TEXT: comment.text
            }
        });
    }
}