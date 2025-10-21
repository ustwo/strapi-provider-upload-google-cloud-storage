/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import type { FileMetadata } from '@google-cloud/storage';
import type { ReadStream } from 'node:fs';
import { z } from 'zod';
declare const fileSchema: z.ZodObject<{
    name: z.ZodString;
    alternativeText: z.ZodOptional<z.ZodString>;
    caption: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    formats: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    hash: z.ZodString;
    ext: z.ZodOptional<z.ZodString>;
    mime: z.ZodString;
    size: z.ZodNumber;
    sizeInBytes: z.ZodNumber;
    url: z.ZodString;
    previewUrl: z.ZodOptional<z.ZodString>;
    path: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodString>;
    provider_metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    stream: z.ZodOptional<z.ZodUnknown>;
    buffer: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export type File = z.infer<typeof fileSchema> & {
    stream?: ReadStream;
    buffer?: Buffer;
};
export type FileAttributes = {
    contentType: string;
    gzip: Options['gzip'];
    metadata: FileMetadata;
    public?: boolean;
};
export declare const serviceAccountSchema: z.ZodObject<{
    project_id: z.ZodString;
    client_email: z.ZodString;
    private_key: z.ZodString;
}, z.core.$strip>;
export type ServiceAccount = z.infer<typeof serviceAccountSchema>;
type MetadataFn = (file: File) => FileMetadata;
type GetContentTypeFn = (file: File) => string;
type GenerateUploadFileNameFn = (basePath: string, file: File) => Promise<string> | string;
export declare const optionsSchema: z.ZodObject<{
    serviceAccount: z.ZodOptional<z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodObject<{
        project_id: z.ZodString;
        client_email: z.ZodString;
        private_key: z.ZodString;
    }, z.core.$strip>>>;
    bucketName: z.ZodString;
    baseUrl: z.ZodDefault<z.ZodString>;
    basePath: z.ZodDefault<z.ZodString>;
    publicFiles: z.ZodDefault<z.ZodUnion<[z.ZodBoolean, z.ZodCodec<z.ZodString, z.ZodBoolean>]>>;
    uniform: z.ZodDefault<z.ZodUnion<[z.ZodBoolean, z.ZodCodec<z.ZodString, z.ZodBoolean>]>>;
    skipCheckBucket: z.ZodDefault<z.ZodUnion<[z.ZodBoolean, z.ZodCodec<z.ZodString, z.ZodBoolean>]>>;
    gzip: z.ZodDefault<z.ZodUnion<[z.ZodUnion<[z.ZodBoolean, z.ZodCodec<z.ZodString, z.ZodBoolean>]>, z.ZodLiteral<"auto">]>>;
    cacheMaxAge: z.ZodDefault<z.ZodNumber>;
    expires: z.ZodDefault<z.ZodUnion<readonly [z.ZodString, z.ZodDate, z.ZodNumber]>>;
    metadata: z.ZodOptional<z.ZodCustom<MetadataFn, MetadataFn>>;
    getContentType: z.ZodDefault<z.ZodOptional<z.ZodCustom<GetContentTypeFn, GetContentTypeFn>>>;
    generateUploadFileName: z.ZodDefault<z.ZodOptional<z.ZodCustom<GenerateUploadFileNameFn, GenerateUploadFileNameFn>>>;
}, z.core.$strip>;
export type Options = z.infer<typeof optionsSchema>;
export type DefaultOptions = Partial<Omit<Options, 'serviceAccount' | 'bucketName'>> & {
    bucketName: string;
    serviceAccount?: ServiceAccount | string;
};
export {};
//# sourceMappingURL=types.d.ts.map