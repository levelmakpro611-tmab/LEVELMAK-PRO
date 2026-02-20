import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.levelmak.app',
    appName: 'LEVELMAK',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        iosScheme: 'https'
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            launchAutoHide: true,
            launchFadeOutDuration: 300,
            backgroundColor: '#0F172A',
            androidSplashResourceName: 'splash',
            androidScaleType: 'CENTER_CROP',
            showSpinner: false,
            androidSpinnerStyle: 'large',
            iosSpinnerStyle: 'small',
            spinnerColor: '#3B82F6',
            splashFullScreen: true,
            splashImmersive: true,
        },
        StatusBar: {
            style: 'dark',
            backgroundColor: '#0F172A',
            overlaysWebView: true
        },
        Keyboard: {
            resize: 'body',
            style: 'dark',
            resizeOnFullScreen: true
        },
        Haptics: {
            // Enable haptic feedback for premium experience
        }
    },
    android: {
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: true // Disable in production
    },
    ios: {
        contentInset: 'automatic',
        scrollEnabled: true
    }
};

export default config;
