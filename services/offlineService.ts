import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { OfflinePack } from '../types';
import { isNativePlatform } from './nativeAdapters';

const OFFLINE_FOLDER = 'offline_courses';
const CACHE_DIR = 'levelmak_cache';

export const offlineService = {
    async init() {
        try {
            if (isNativePlatform()) {
                await Filesystem.mkdir({
                    path: OFFLINE_FOLDER,
                    directory: Directory.Data,
                    recursive: true
                });
                await Filesystem.mkdir({
                    path: CACHE_DIR,
                    directory: Directory.Data,
                    recursive: true
                });
            }
        } catch (e) {
            // Folders likely exist
        }
    },

    /**
     * Get real-time connection status
     */
    async getStatus() {
        if (!isNativePlatform()) {
            return { connected: navigator.onLine, connectionType: 'wifi' };
        }
        return await Network.getStatus();
    },

    /**
     * Download and cache a binary file (PDF/Image)
     */
    async downloadFile(url: string, filename: string): Promise<string | null> {
        if (!isNativePlatform()) return url;

        try {
            const response = await fetch(url);
            const blob = await response.blob();

            // Convert to base64
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const res = reader.result as string;
                    resolve(res.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const path = `${CACHE_DIR}/${filename}`;
            await Filesystem.writeFile({
                path,
                data: base64Data,
                directory: Directory.Data
            });

            const result = await Filesystem.getUri({
                path,
                directory: Directory.Data
            });

            return result.uri;
        } catch (e) {
            console.error('Download failed:', e);
            return null;
        }
    },

    async savePack(pack: OfflinePack): Promise<void> {
        if (!isNativePlatform()) return;

        const fileName = `${OFFLINE_FOLDER}/${pack.courseId}.json`;
        await Filesystem.writeFile({
            path: fileName,
            data: JSON.stringify(pack),
            directory: Directory.Data,
            encoding: Encoding.UTF8
        });

        const list = await this.getOfflineList();
        if (!list.find(p => p.id === pack.courseId)) {
            list.push({ id: pack.courseId, title: pack.title, date: new Date().toISOString() });
            await Preferences.set({
                key: 'offline_courses_list',
                value: JSON.stringify(list)
            });
        }
    },

    async getPack(courseId: string): Promise<OfflinePack | null> {
        if (!isNativePlatform()) return null;

        try {
            const fileName = `${OFFLINE_FOLDER}/${courseId}.json`;
            const result = await Filesystem.readFile({
                path: fileName,
                directory: Directory.Data,
                encoding: Encoding.UTF8
            });
            return JSON.parse(result.data as string) as OfflinePack;
        } catch (e) {
            return null;
        }
    },

    async getOfflineList(): Promise<{ id: string; title: string; date: string }[]> {
        const { value } = await Preferences.get({ key: 'offline_courses_list' });
        return value ? JSON.parse(value) : [];
    },

    async deletePack(courseId: string): Promise<void> {
        if (!isNativePlatform()) return;

        try {
            const fileName = `${OFFLINE_FOLDER}/${courseId}.json`;
            await Filesystem.deleteFile({
                path: fileName,
                directory: Directory.Data
            });

            const list = await this.getOfflineList();
            const newList = list.filter(p => p.id !== courseId);
            await Preferences.set({
                key: 'offline_courses_list',
                value: JSON.stringify(newList)
            });
        } catch (e) {
            console.error('Error deleting offline pack:', e);
        }
    }
};
