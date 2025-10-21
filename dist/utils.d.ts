import type { Bucket, Storage } from '@google-cloud/storage';
import { type DefaultOptions, type File, type FileAttributes, type Options } from './types';
export declare const getConfigDefaultValues: (config: DefaultOptions) => {
    bucketName: string;
    baseUrl: string;
    basePath: string;
    publicFiles: boolean;
    uniform: boolean;
    skipCheckBucket: boolean;
    gzip: boolean | "auto";
    cacheMaxAge: number;
    expires: string | number | Date;
    getContentType: (file: File) => string;
    generateUploadFileName: (basePath: string, file: File) => string | Promise<string>;
    serviceAccount?: {
        project_id: string;
        client_email: string;
        private_key: string;
    } | undefined;
    metadata?: ((file: File) => import("@google-cloud/storage").FileMetadata) | undefined;
};
export declare const getExpires: (expires: Date | number | string) => string | number | Date;
export declare const checkBucket: (bucket: Bucket, bucketName: string) => Promise<void>;
export declare const prepareUploadFile: (file: File, config: Options, basePath: string, GCS: Storage) => Promise<{
    fileAttributes: FileAttributes;
    bucketFile: import("@google-cloud/storage").File;
    fullFileName: string;
    fileExists: boolean;
}>;
//# sourceMappingURL=utils.d.ts.map