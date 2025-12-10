/**
 * CrmService - Service for working with Bitrix24 CRM
 *
 * Responsible for:
 * - Uploading and updating files in CRM
 * - Working with CRM entities
 * - Interaction with Bitrix24 API
 */
import {PlacementService} from './PlacementService';
import {api} from "../../../../dev/api.ts";
import type {CrmItemType, CrmServiceConfigType} from "@/features/example7-form-upload-files/types/types.ts";

/**
 * CrmService constructor
 *
 * @param {PlacementService} placementService - Placement service
 * @param {CrmServiceConfigType} config - Service configuration
 */
export class CrmService {
    /**
     * Numeric identifier of CRM entity type
     */
    public entityTypeId: number | null;

    /**
     * Current CRM item
     */
    private _currentItem: CrmItemType | null = null;

    /**
     * Field name for temporary files in CRM
     */
    private readonly fieldNameUploadTempFiles: string;

    /**
     * CRM entity ID
     */
    private readonly crmId: number;

    /**
     * CrmService constructor
     *
     * @param {PlacementService} placementService - Placement service
     * @param {CrmServiceConfigType} config - Service configuration
     */
    constructor(
        placementService: PlacementService,
        config: CrmServiceConfigType
    ) {
        this.entityTypeId = placementService.entityTypeId;
        this.crmId = Number(placementService.crmId);
        this.fieldNameUploadTempFiles = config.fieldNameUploadTempFiles;
    }

    /**
     * Returns current loaded CRM item
     * @returns {CrmItemType | null} Current item or null if not loaded
     */
    get currentItem(): CrmItemType | null {
        return this._currentItem;
    }

    /**
     * Uploads file to CRM
     * @async
     * @param {File} file - File to upload
     * @returns {Promise<string>} ID of uploaded file
     * @throws {Error} If failed to upload file
     */
    async uploadFile(file: File): Promise<string> {
        const base64 = await this._readFileAsBase64(file);
        const currentFiles = this._getCurrentFiles();
        const filesData = [...currentFiles, [file.name, base64]];

        await this.updateCurrentItem({
            [this.fieldNameUploadTempFiles]: filesData
        });

        // Fix: using length instead of at(-1)
        const files = this._getCurrentFiles();
        if (files.length === 0) {
            throw new Error("File was not added to CRM");
        }
        return files[files.length - 1].id;
    }

    /**
     * Loads current CRM item by its ID
     * @async
     * @returns {Promise<void>}
     * @throws {Error} If failed to load item
     */
    async fetchCurrentItem(): Promise<void> {
        const response = await api().methods.b24Call("crm.item.get", {
            entityTypeId: this.entityTypeId,
            id: this.crmId
        }) as { result?: { item?: CrmItemType } };

        if (response?.result?.item) {
            this._currentItem = response.result.item;
        } else {
            throw new Error("Failed to load CRM item");
        }
    }

    /**
     * Updates fields of current CRM item
     * @async
     * @param {Record<string, any>} fields - Object with fields to update
     * @returns {Promise<void>}
     * @throws {Error} If failed to update item
     */
    async updateCurrentItem(fields: Record<string, any>): Promise<void> {
        const response = await api().methods.b24Call("crm.item.update", {
            entityTypeId: this.entityTypeId,
            id: this.crmId,
            fields
        }) as { result?: { item?: CrmItemType } };

        if (response?.result?.item) {
            this._currentItem = response.result.item;
        } else {
            throw new Error("Failed to update CRM item");
        }
    }

    /**
     * Returns array of current files from CRM item
     * @private
     * @returns {any[]} Array of files
     */
    private _getCurrentFiles(): any[] {
        return this._currentItem?.[this.fieldNameUploadTempFiles] || [];
    }

    /**
     * Converts file to base64 string
     * @private
     * @param {File} file - File to convert
     * @returns {Promise<string>} String in base64 format
     */
    private _readFileAsBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result?.toString().split(',')[1] || '';
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}