// src/features/example7-form-upload-files/types/types.ts
export type FileItemType = LocalFileType | UploadedFileType;

export type  FileWithCustomProps = File & FileItemType;

export type LocalFileType = File & {
    tempId: string;
    isUploaded: false
};

export type UploadedFileType = {
    id: string;
    name: string;
    isUploaded: true;
};

export type CrmItemType = {
    [key: string]: any;
}

export type BitrixPlacementOptionsType = {
    VALUE?: string;
    ENTITY_ID?: string;
}

export type BitrixPlacementType = {
    options?: BitrixPlacementOptionsType;
}

export type CrmServiceConfigType = {
    fieldNameUploadTempFiles: string;
    fieldNameUploadFiles: string;
}
