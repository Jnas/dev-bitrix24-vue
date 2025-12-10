/**
 * FileUploadManager.ts - File upload manager
 *
 * Main class responsible for managing file uploads to CRM.
 * Provides interaction between the interface and upload services.
 *
 * Main functionality:
 * - Managing state of uploading files
 * - Integration with Bitrix24 API for file uploads
 * - Managing local file state
 *
 * @module managers/FileUploadManager
 */

import {ref, type Ref} from 'vue';
import {PlacementService} from '@/features/example7-form-upload-files/services/PlacementService';
import {CrmService} from '@/features/example7-form-upload-files/services/CrmService';
import type {
    CrmServiceConfigType,
    FileWithCustomProps,
    LocalFileType,
    UploadedFileType
} from '@/features/example7-form-upload-files/types/types';
import {crmConfig} from '@/features/example7-form-upload-files/config';
import {api} from "../../../../dev/api.ts";

/**
 * File upload manager class
 *
 * Provides management of file uploads, their storage, and interaction with API.
 * Uses PlacementService and CrmService for working with Bitrix24.
 */
export class FileUploadManager {
    /** Private reactive state of file list */
    private _allFiles: Ref<FileWithCustomProps[]> = ref([]);

    /** Service for working with application placement */
    public readonly placementService: PlacementService;

    /** Service for working with CRM */
    public readonly crmService: CrmService;

    /**
     * Creates a FileUploadManager instance
     * @param {CrmServiceConfigType} config - Configuration for CRM service
     */
    constructor(config: CrmServiceConfigType = crmConfig) {
        this.placementService = new PlacementService();
        this.crmService = new CrmService(this.placementService, config);
    }

    /**
     * Gets current file list
     * @returns {FileWithCustomProps[]} Array of files
     */
    public get files() {
        return this._allFiles.value;
    }

    /**
     * Gets string with IDs of uploaded files
     * @returns {string} String with file IDs separated by commas
     */
    public get uploadedFileIds() {
        return this._allFiles.value
            .filter(this.isUploadedFile)
            .map(file => file.id)
            .join(',');
    }

    /**
     * Checks if a file is uploaded
     * @param {FileWithCustomProps} file - File to check
     * @returns {boolean} True if file is uploaded
     */
    public isUploadedFile = (file: FileWithCustomProps): file is File & UploadedFileType => {
        return 'isUploaded' in file && file.isUploaded === true;
    };

    /**
     * Checks if a file is local (not yet uploaded to CRM)
     * Used to distinguish between uploaded and not yet uploaded files in the interface
     * @param {FileWithCustomProps} file - File to check
     * @returns {boolean} True if file is local and not yet uploaded to CRM
     */
    public isLocalFile = (file: FileWithCustomProps): file is File & LocalFileType => {
        return 'isUploaded' in file && file.isUploaded === false;
    };

    /**
     * Initializes the manager
     * @async
     * @returns {Promise<void>}
     */
    public async initialize() {
        // Load current CRM item
        await this.crmService.fetchCurrentItem();

        // Create File objects for already uploaded files from CRM
        // This is needed to display files in the interface
        const uploadedFiles = Object.entries(this.placementService.files).map(([id, name]) => {
            // Create empty file with correct name
            // Real file data is not needed since it's already uploaded to CRM
            const file = new File([], name, {type: 'application/octet-stream'});
            // Add metadata for file identification
            return Object.assign(file, {id, isUploaded: true}) as FileWithCustomProps;
        });

        this._allFiles.value = [...uploadedFiles];
    }

    /**
     * Adds files for upload
     * @async
     * @param {File[]|null} files - Array of files to upload
     * @returns {Promise<void>}
     * @throws {Error} In case of file upload error
     */
    public async addFiles(files: File[] | null) {
        if (!files?.length) return;

        // Add temporary IDs and metadata to new files
        // tempId is needed to track files before they are uploaded to CRM
        const processedFiles = files.map(file =>
            Object.assign(file, {
                tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                isUploaded: false
            }) as FileWithCustomProps & LocalFileType
        );

        // Add files to the general list before upload to show them in the interface
        this._allFiles.value = [...this._allFiles.value, ...processedFiles];

        try {
            for (const file of processedFiles) {
                // Upload file to CRM and get its ID
                const fileId = await this.crmService.uploadFile(file);

                // Create new File object with correct size (without actual content)
                // new ArrayBuffer(file.size) creates a buffer of the required size for correct display in the interface
                const newFile = new File([new ArrayBuffer(file.size)], file.name, {type: file.type});

                // Create uploaded file object with ID from CRM
                const uploadedFile = Object.assign(newFile, {
                    id: fileId,
                    isUploaded: true,
                    tempId: undefined
                }) as FileWithCustomProps & UploadedFileType;

                // Replace temporary file with uploaded one in the file list
                this.replaceFile(file, uploadedFile);
            }
        } catch (error) {
            console.error('File upload error', error);
            // In case of error, remove not uploaded files from the list
            this._allFiles.value = this._allFiles.value.filter(
                f => !processedFiles.some(pf => this.getFileKey(pf) === this.getFileKey(f))
            );
        }
    }

    /**
     * Removes a file from the list of uploading/uploaded files
     * @param {FileWithCustomProps} file - File to remove
     */
    public removeFile(file: FileWithCustomProps) {
        this._allFiles.value = this._allFiles.value.filter(
            f => this.getFileKey(f) !== this.getFileKey(file)
        );
    }

    /**
     * Replaces an old file with a new one in the file list
     * Used to update file state after uploading to CRM
     * @private
     * @param {FileWithCustomProps} oldFile - Temporary file before upload
     * @param {FileWithCustomProps} newFile - File with data after upload to CRM
     */
    private replaceFile(oldFile: FileWithCustomProps, newFile: FileWithCustomProps) {
        const index = this._allFiles.value.findIndex(
            f => this.getFileKey(f) === this.getFileKey(oldFile)
        );

        if (index !== -1) {
            // Create new file array, replacing old file with new one
            // Use spread operator to create a new array and update reactivity
            this._allFiles.value = [
                ...this._allFiles.value.slice(0, index),
                newFile,
                ...this._allFiles.value.slice(index + 1)
            ];
        }
    }

    /**
     * Generates unique key for a file
     * Used to identify files in the list and correctly update UI
     * @private
     * @param {FileWithCustomProps} file - File to generate key for
     * @returns {string} Unique key in format 'uploaded-{id}' or 'local-{tempId}'
     */
    private getFileKey(file: FileWithCustomProps): string {
        return this.isUploadedFile(file)
            ? `uploaded-${file.id}`
            : `local-${file.tempId}`;
    }

    /**
     * Sets the value of the custom field with uploaded files
     * @param {null|undefined} value - Value to set. If undefined, current list of file IDs is used
     */
    public setUserFieldValue(value: null | undefined = undefined) {
        const v = this.uploadedFileIds ? this.uploadedFileIds : -1
        api().methods.setUserfieldValue(value === undefined ? v : value)
    }
}