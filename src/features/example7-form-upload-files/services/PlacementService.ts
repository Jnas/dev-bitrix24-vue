/**
 * PlacementService - Service for working with application placement in Bitrix24
 *
 * Responsible for:
 * - Parsing placement parameters from Bitrix24
 * - Managing application state in the context of placement
 * - Providing access to data about files and CRM entities
 */
import type {BitrixPlacementType, BitrixPlacementOptionsType} from "@/features/example7-form-upload-files/types/types.ts";
import {api} from "../../../../dev/api.ts";

export class PlacementService {
    /** Dictionary of files in format {id: file_name} */
    private _files: Record<string, string> = {};

    /** ID of the CRM entity the application is working with */
    private _crmId: string | null = null;

    /** CRM entity type (numeric identifier) */
    private _entityTypeId: number | null = null;

    /**
     * Service constructor, initializes internal state
     */
    constructor() {
        this._initialize();
    }

    /**
     * Initializes the service, parses placement parameters
     * @private
     */
    private _initialize(): void {
        try {
            const placement = api().fields?.placement as BitrixPlacementType;
            const options = placement.options || ({} as BitrixPlacementOptionsType);

            this._parseValueInput(options.VALUE);
            this._parseEntityId(options.ENTITY_ID);
            console.log('PlacementService initialized', this);
        } catch (error) {
            console.error('PlacementService initialization error:', error);
            this._resetState();
        }
    }

    /**
     * Resets the internal state of the service
     * @private
     */
    private _resetState(): void {
        this._files = {};
        this._crmId = null;
        this._entityTypeId = null;
    }

    /**
     * Parses a string with data about files and entity ID
     * String format: "id1#file1.txt??id2#file2.jpg??crmId#123"
     * @private
     * @param {string} [input] - Input string with data
     */
    private _parseValueInput(input?: string): void {
        if (!input) {
            this._resetState();
            return;
        }

        const files: Record<string, string> = {};
        let crmId: string | null = null;

        input.split('??').forEach(part => {
            if (!part || !part.includes('#')) return;

            const [key, value] = part.split('#');
            const trimmedKey = key.trim();
            const trimmedValue = value.trim();

            if (trimmedKey === 'crmId') {
                crmId = trimmedValue;
            } else {
                files[trimmedKey] = trimmedValue;
            }
        });

        this._files = files;
        this._crmId = crmId;
    }

    /**
     * Extracts numeric entity type identifier from a string
     * @private
     * @param {string} [entityIdStr] - String with entity ID (e.g., "CRM_DYNAMIC_123")
     */
    private _parseEntityId(entityIdStr?: string): void {
        if (!entityIdStr) {
            this._entityTypeId = null;
            return;
        }

        const match = entityIdStr.match(/CRM_DYNAMIC_(\d+)/);
        this._entityTypeId = match ? parseInt(match[1], 10) : null;

        if (!this._entityTypeId) {
            console.warn(`Failed to determine entityTypeId from ENTITY_ID: ${entityIdStr}`);
        }
    }

    /**
     * Returns a copy of the files dictionary
     * @returns {Record<string, string>} Object with files in format {id: file_name}
     */
    get files(): Record<string, string> {
        return {...this._files};
    }

    /**
     * Returns the ID of the current CRM entity
     * @returns {string | null} Entity ID or null if not defined
     */
    get crmId(): string | null {
        return this._crmId;
    }

    /**
     * Returns numeric entity type identifier
     * @returns {number | null} Numeric entity type ID or null if not defined
     */
    get entityTypeId(): number | null {
        return this._entityTypeId;
    }
}