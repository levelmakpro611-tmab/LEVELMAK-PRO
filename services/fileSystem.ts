import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { isNativePlatform } from './nativeAdapters';

/**
 * File System Service
 * Handles file operations using Capacitor Filesystem API
 */

export interface CachedFile {
    uri: string;
    path: string;
    filename: string;
    mimeType: string;
    size: number;
    cachedAt: number;
}

class FileSystemService {
    private cacheDir = 'levelmak_cache';
    private metadataKey = 'cached_files_metadata';

    /**
     * Initialize cache directory
     */
    async initCache(): Promise<void> {
        if (!isNativePlatform()) return;

        try {
            await Filesystem.mkdir({
                path: this.cacheDir,
                directory: Directory.Data,
                recursive: true
            });
            console.log('✅ Cache directory initialized');
        } catch (e: any) {
            // Directory might already exist, that's okay
            if (e.message && !e.message.includes('exists')) {
                console.error('Failed to initialize cache:', e);
            }
        }
    }

    /**
     * Download and cache a file (e.g., PDF)
     */
    async cacheFile(url: string, filename: string): Promise<string | null> {
        if (!isNativePlatform()) {
            // On web, return the original URL
            return url;
        }

        try {
            // Download file
            const response = await fetch(url);
            const blob = await response.blob();
            const base64Data = await this.blobToBase64(blob);

            const filepath = `${this.cacheDir}/${filename}`;

            // Write to filesystem
            await Filesystem.writeFile({
                path: filepath,
                data: base64Data,
                directory: Directory.Data
            });

            // Update metadata
            await this.updateCacheMetadata({
                uri: url,
                path: filepath,
                filename,
                mimeType: blob.type,
                size: blob.size,
                cachedAt: Date.now()
            });

            // Get file URI for native viewing
            const result = await Filesystem.getUri({
                path: filepath,
                directory: Directory.Data
            });

            return result.uri;
        } catch (e) {
            console.error('Failed to cache file:', e);
            return null;
        }
    }

    /**
     * Check if file is cached
     */
    async isCached(url: string): Promise<boolean> {
        if (!isNativePlatform()) return false;

        const metadata = await this.getCacheMetadata();
        return metadata.some(file => file.uri === url);
    }

    /**
     * Get cached file URI
     */
    async getCachedFileUri(url: string): Promise<string | null> {
        if (!isNativePlatform()) return url;

        const metadata = await this.getCacheMetadata();
        const cachedFile = metadata.find(file => file.uri === url);

        if (!cachedFile) return null;

        try {
            const result = await Filesystem.getUri({
                path: cachedFile.path,
                directory: Directory.Data
            });
            return result.uri;
        } catch (e) {
            console.error('Failed to get cached file URI:', e);
            return null;
        }
    }

    /**
     * Clear cache
     */
    async clearCache(): Promise<void> {
        if (!isNativePlatform()) return;

        try {
            await Filesystem.rmdir({
                path: this.cacheDir,
                directory: Directory.Data,
                recursive: true
            });

            // Reinitialize
            await this.initCache();
            await this.updateAllCacheMetadata([]);

            console.log('✅ Cache cleared');
        } catch (e) {
            console.error('Failed to clear cache:', e);
        }
    }

    /**
     * Get cache metadata
     */
    private async getCacheMetadata(): Promise<CachedFile[]> {
        const metadata = localStorage.getItem(this.metadataKey);
        return metadata ? JSON.parse(metadata) : [];
    }

    /**
     * Update cache metadata
     */
    private async updateCacheMetadata(file: CachedFile): Promise<void> {
        const metadata = await this.getCacheMetadata();
        const existingIndex = metadata.findIndex(f => f.uri === file.uri);

        if (existingIndex >= 0) {
            metadata[existingIndex] = file;
        } else {
            metadata.push(file);
        }

        await this.updateAllCacheMetadata(metadata);
    }

    /**
     * Update all cache metadata
     */
    private async updateAllCacheMetadata(metadata: CachedFile[]): Promise<void> {
        localStorage.setItem(this.metadataKey, JSON.stringify(metadata));
    }

    /**
     * Convert Blob to Base64
     */
    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                // Remove data URL prefix
                const base64Data = base64.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Export singleton instance
export const fileSystem = new FileSystemService();
