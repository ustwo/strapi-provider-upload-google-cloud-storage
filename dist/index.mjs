import { Storage } from '@google-cloud/storage';
import { pipeline } from 'node:stream/promises';
import z$1, { z } from 'zod';
import path from 'node:path';
import slugify from 'slugify';

z.object({
    name: z.string(),
    alternativeText: z.string().optional(),
    caption: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    formats: z.record(z.string(), z.unknown()).optional(),
    hash: z.string(),
    ext: z.string().optional(),
    mime: z.string(),
    size: z.number(),
    sizeInBytes: z.number(),
    url: z.string(),
    previewUrl: z.string().optional(),
    path: z.string().optional(),
    provider: z.string().optional(),
    provider_metadata: z.record(z.string(), z.unknown()).optional(),
    stream: z.unknown().optional(),
    buffer: z.unknown().optional()
});
const serviceAccountSchema = z.object({
    project_id: z.string({
        error: (issue)=>issue.input === undefined ? 'Error parsing data "Service Account JSON". Missing "project_id" field in JSON file.' : 'Error parsing data "Service Account JSON". Property "project_id" must be a string.'
    }),
    client_email: z.string({
        error: (issue)=>issue.input === undefined ? 'Error parsing data "Service Account JSON". Missing "client_email" field in JSON file.' : 'Error parsing data "Service Account JSON". Property "client_email" must be a string.'
    }),
    private_key: z.string({
        error: (issue)=>issue.input === undefined ? 'Error parsing data "Service Account JSON". Missing "private_key" field in JSON file.' : 'Error parsing data "Service Account JSON". Property "private_key" must be a string.'
    })
});
const defaultGetContentType = (file)=>file.mime;
const defaultGenerateUploadFileName = (basePath, file)=>{
    const filePath = `${file.path ? file.path.slice(1) : file.hash}/`;
    const extension = file.ext?.toLowerCase() || '';
    const fileName = slugify(path.basename(file.hash));
    return `${basePath}${filePath}${fileName}${extension}`;
};
const optionsSchema = z.object({
    serviceAccount: z.preprocess((input)=>{
        if (typeof input === 'string') {
            try {
                return JSON.parse(input);
            } catch  {
                throw new Error('Error parsing data "Service Account JSON", please be sure to copy/paste the full JSON file.');
            }
        }
        return input;
    }, serviceAccountSchema).optional(),
    bucketName: z.string({
        error: (issue)=>issue.input === undefined ? 'Property "bucketName" is required' : 'Property "bucketName" must be a string'
    }),
    baseUrl: z.string().default('https://storage.googleapis.com/{bucket-name}'),
    basePath: z.string().default(''),
    publicFiles: z.boolean().or(z.stringbool()).default(true),
    uniform: z.boolean().or(z.stringbool()).default(false),
    skipCheckBucket: z.boolean().or(z.stringbool()).default(false),
    gzip: z.boolean().or(z.stringbool()).or(z.literal('auto')).default('auto'),
    cacheMaxAge: z.number().default(3600),
    expires: z.union([
        z.string(),
        z.date(),
        z.number().min(0).max(1000 * 60 * 60 * 24 * 7)
    ]).default(15 * 60 * 1000),
    metadata: z.custom((val)=>typeof val === 'function').optional(),
    getContentType: z.custom((val)=>typeof val === 'function').optional().default(()=>defaultGetContentType),
    generateUploadFileName: z.custom((val)=>typeof val === 'function').optional().default(()=>defaultGenerateUploadFileName)
});

const getConfigDefaultValues = (config)=>{
    try {
        const parsedConfig = optionsSchema.parse(config);
        // If no custom metadata function is provided, use the default one with the configured cacheMaxAge
        if (!config.metadata) {
            const defaultGetMetadata = (cacheMaxAge)=>(file)=>{
                    const asciiFileName = file.name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
                    return {
                        contentDisposition: `inline; filename="${asciiFileName}"`,
                        cacheControl: `public, max-age=${cacheMaxAge}`
                    };
                };
            parsedConfig.metadata = defaultGetMetadata(parsedConfig.cacheMaxAge);
        }
        return parsedConfig;
    } catch (err) {
        if (err instanceof z$1.ZodError) {
            throw new Error(err.issues[0]?.message);
        } else {
            throw err;
        }
    }
};
const getExpires = (expires)=>{
    if (typeof expires === 'number') {
        return Date.now() + expires;
    }
    return expires;
};
const checkBucket = async (bucket, bucketName)=>{
    const [exists] = await bucket.exists();
    if (!exists) {
        throw new Error(`An error occurs when we try to retrieve the Bucket "${bucketName}". Check if bucket exist on Google Cloud Platform.`);
    }
};
const prepareUploadFile = async (file, config, basePath, GCS)=>{
    const fullFileName = await config.generateUploadFileName(basePath, file);
    const bucket = GCS.bucket(config.bucketName);
    if (!config.skipCheckBucket) {
        await checkBucket(bucket, config.bucketName);
    }
    const bucketFile = bucket.file(fullFileName);
    const [fileExists] = await bucketFile.exists();
    const fileAttributes = {
        contentType: config.getContentType(file),
        gzip: config.gzip,
        metadata: config.metadata(file)
    };
    if (!config.uniform) {
        fileAttributes.public = config.publicFiles;
    }
    return {
        fileAttributes,
        bucketFile,
        fullFileName,
        fileExists
    };
};

var index = {
    init (providedConfig) {
        const config = getConfigDefaultValues(providedConfig);
        const { serviceAccount  } = config;
        const GCS = new Storage(serviceAccount && {
            projectId: serviceAccount.project_id,
            credentials: {
                client_email: serviceAccount.client_email,
                private_key: serviceAccount.private_key
            }
        });
        const basePath = `${config.basePath}/`.replace(/^\/+/, '');
        const baseUrl = config.baseUrl.replace('{bucket-name}', config.bucketName);
        return {
            async upload (file) {
                try {
                    const { fileAttributes , bucketFile , fullFileName , fileExists  } = await prepareUploadFile(file, config, basePath, GCS);
                    if (fileExists) {
                        await this.delete(file);
                    }
                    if (file.buffer) {
                        await bucketFile.save(file.buffer, fileAttributes);
                        file.url = `${baseUrl}/${fullFileName}`;
                        file.mime = fileAttributes.contentType;
                    }
                } catch (error) {
                    if (error instanceof Error && 'message' in error) {
                        console.error(`Error uploading file to Google Cloud Storage: ${error.message}`);
                    }
                    throw error;
                }
            },
            async uploadStream (file) {
                try {
                    const { fileAttributes , bucketFile , fullFileName , fileExists  } = await prepareUploadFile(file, config, basePath, GCS);
                    if (fileExists) {
                        await this.delete(file);
                    }
                    if (file.stream) {
                        await pipeline(file.stream, bucketFile.createWriteStream(fileAttributes));
                        file.url = `${baseUrl}/${fullFileName}`;
                        file.mime = fileAttributes.contentType;
                    }
                } catch (error) {
                    if (error instanceof Error && 'message' in error) {
                        console.error(`Error uploading file to Google Cloud Storage: ${error.message}`);
                    }
                    throw error;
                }
            },
            async delete (file) {
                if (!file.url) {
                    return;
                }
                // Extract filename from file.url when file.path is missing
                const fileName = file.path ? `${basePath}${file.path.slice(1)}/${file.hash}${file.ext?.toLowerCase() || ''}` : (()=>{
                    if (!file.url) return '';
                    // Remove query parameters and fragments from URL
                    const cleanUrl = file.url.split('?')[0].split('#')[0];
                    // Extract path after baseUrl
                    if (cleanUrl.startsWith(`${baseUrl}/`)) {
                        return cleanUrl.substring(`${baseUrl}/`.length);
                    }
                    // Handle direct paths
                    if (cleanUrl.startsWith(basePath)) {
                        return cleanUrl.substring(basePath.length).replace(/^\/+/, '');
                    }
                    // Fallback to hash-based reconstruction
                    return `${file.hash}/${file.hash}${file.ext?.toLowerCase() || ''}`;
                })();
                const bucket = GCS.bucket(config.bucketName);
                try {
                    await bucket.file(fileName).delete();
                } catch (error) {
                    if (error instanceof Error && 'code' in error && error.code === 404) {
                        throw new Error('Remote file was not found, you may have to delete manually.');
                    }
                    throw error;
                }
            },
            isPrivate () {
                return !config.publicFiles;
            },
            async getSignedUrl (file) {
                try {
                    // First, try to generate signed URL - this works with ADC in GCP environments
                    const options = {
                        version: 'v4',
                        action: 'read',
                        expires: getExpires(config.expires)
                    };
                    // Extract filename from file.url when file.path is missing
                    const fileName = file.path ? `${basePath}${file.path.slice(1)}/${file.hash}${file.ext?.toLowerCase() || ''}` : (()=>{
                        if (!file.url) return '';
                        // Remove query parameters and fragments from URL
                        const cleanUrl = file.url.split('?')[0].split('#')[0];
                        // Extract path after baseUrl
                        if (cleanUrl.startsWith(`${baseUrl}/`)) {
                            return cleanUrl.substring(`${baseUrl}/`.length);
                        }
                        // Handle direct paths
                        if (cleanUrl.startsWith(basePath)) {
                            return cleanUrl.substring(basePath.length).replace(/^\/+/, '');
                        }
                        // Fallback to hash-based reconstruction
                        return `${file.hash}/${file.hash}${file.ext?.toLowerCase() || ''}`;
                    })();
                    const [url] = await GCS.bucket(config.bucketName).file(fileName).getSignedUrl(options);
                    return {
                        url
                    };
                } catch (error) {
                    // If signing fails, check if this is a credentials issue
                    if (error instanceof Error && error.message.includes('Cannot sign data without')) {
                        // Check if we're in a GCP environment where ADC should work
                        const isGCPEnvironment = this.detectGCPEnvironment();
                        if (!isGCPEnvironment && (!serviceAccount || !serviceAccount.client_email)) {
                            // Non-GCP environment requires explicit service account credentials
                            if (!config.publicFiles) {
                                throw new Error('Cannot generate signed URLs without service account credentials. ' + 'Either:\n' + '1. Provide serviceAccount with client_email and private_key in your configuration, or\n' + '2. Set publicFiles to true to use direct URLs instead of signed URLs.\n' + 'For more information, see: https://github.com/strapi-community/strapi-provider-upload-google-cloud-storage#setting-up-google-authentication');
                            }
                            // Fallback to direct URL for public files in non-GCP environments
                            console.warn('Warning: Cannot generate signed URL without service account credentials. ' + 'Returning direct URL instead. This works only for public files.');
                            return {
                                url: file.url
                            };
                        }
                        // For GCP environments, provide more specific error message
                        if (isGCPEnvironment) {
                            throw new Error(`Failed to generate signed URL in GCP environment: ${error.message}\n` + 'This may indicate that your GCP service account lacks the necessary permissions for URL signing. ' + 'Please ensure your service account has the "Storage Object Admin" or "Storage Admin" role.');
                        }
                        // Fallback error for other cases
                        throw new Error(`Failed to generate signed URL: ${error.message}\n` + 'This usually means your service account credentials are incomplete. ' + 'Please ensure your serviceAccount configuration includes both client_email and private_key fields.');
                    }
                    // Re-throw other errors as-is
                    throw error;
                }
            },
            detectGCPEnvironment () {
                // Check common GCP environment variables
                const gcpEnvVars = [
                    'GOOGLE_CLOUD_PROJECT',
                    'GCLOUD_PROJECT',
                    'GAE_APPLICATION',
                    'GAE_SERVICE',
                    'K_SERVICE',
                    'FUNCTION_NAME',
                    'FUNCTION_TARGET'
                ];
                // Check if we're running in a GCP environment
                const hasGCPEnvVar = gcpEnvVars.some((envVar)=>process.env[envVar]);
                // Additional check for Google metadata server (available in GCP environments)
                const hasGoogleMetadata = process.env.GCE_METADATA_HOST || process.env.KUBERNETES_SERVICE_HOST; // GKE
                return hasGCPEnvVar || !!hasGoogleMetadata;
            }
        };
    }
};

export { index as default };
//# sourceMappingURL=index.mjs.map
