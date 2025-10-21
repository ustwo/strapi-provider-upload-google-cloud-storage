import type { DefaultOptions, File } from './types';
declare const _default: {
    init(providedConfig: DefaultOptions): {
        upload(file: File): Promise<void>;
        uploadStream(file: File): Promise<void>;
        delete(file: File): Promise<void>;
        isPrivate(): boolean;
        getSignedUrl(file: File): Promise<{
            url: string;
        }>;
        detectGCPEnvironment(): boolean;
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map