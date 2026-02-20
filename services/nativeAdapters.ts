import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Native Platform Detection
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'ios', 'android', or 'web'
export const isIOS = () => Capacitor.getPlatform() === 'ios';
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isWeb = () => Capacitor.getPlatform() === 'web';

/**
 * Haptic Feedback Helpers
 */
export const hapticImpact = async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (!isNativePlatform()) return;
    try {
        await Haptics.impact({ style });
    } catch (e) {
        console.warn('Haptic feedback not available', e);
    }
};

export const hapticNotification = async (type: NotificationType = NotificationType.Success) => {
    if (!isNativePlatform()) return;
    try {
        await Haptics.notification({ type });
    } catch (e) {
        console.warn('Haptic notification not available', e);
    }
};

export const hapticVibrate = async (duration: number = 100) => {
    if (!isNativePlatform()) return;
    try {
        await Haptics.vibrate({ duration });
    } catch (e) {
        console.warn('Haptic vibrate not available', e);
    }
};

/**
 * Haptic Presets for Common Actions
 */
export const HapticFeedback = {
    // Light tap for navigation
    navigation: () => hapticImpact(ImpactStyle.Light),

    // Medium impact for selections
    selection: () => hapticImpact(ImpactStyle.Medium),

    // Heavy impact for major actions
    action: () => hapticImpact(ImpactStyle.Heavy),

    // Success notification
    success: () => hapticNotification(NotificationType.Success),

    // Warning notification
    warning: () => hapticNotification(NotificationType.Warning),

    // Error notification
    error: () => hapticNotification(NotificationType.Error),

    // Quiz answer correct
    correctAnswer: () => hapticNotification(NotificationType.Success),

    // Quiz answer incorrect
    wrongAnswer: () => hapticNotification(NotificationType.Error),

    // Level up celebration
    levelUp: async () => {
        await hapticNotification(NotificationType.Success);
        await new Promise(resolve => setTimeout(resolve, 100));
        await hapticImpact(ImpactStyle.Heavy);
    }
};

/**
 * Status Bar Helpers
 */
export const setStatusBarStyle = async (isDark: boolean) => {
    if (!isNativePlatform()) return;
    try {
        await StatusBar.setStyle({
            style: isDark ? Style.Dark : Style.Light
        });
    } catch (e) {
        console.warn('Status bar not available', e);
    }
};

export const setStatusBarBackground = async (color: string) => {
    if (!isNativePlatform() || !isAndroid()) return;
    try {
        await StatusBar.setBackgroundColor({ color });
    } catch (e) {
        console.warn('Status bar background not available', e);
    }
};

export const hideStatusBar = async () => {
    if (!isNativePlatform()) return;
    try {
        await StatusBar.hide();
    } catch (e) {
        console.warn('Status bar hide not available', e);
    }
};

export const showStatusBar = async () => {
    if (!isNativePlatform()) return;
    try {
        await StatusBar.show();
    } catch (e) {
        console.warn('Status bar show not available', e);
    }
};

/**
 * Splash Screen Helpers
 */
export const hideSplashScreen = async () => {
    if (!isNativePlatform()) return;
    try {
        await SplashScreen.hide({
            fadeOutDuration: 300
        });
    } catch (e) {
        console.warn('Splash screen not available', e);
    }
};

/**
 * Safe Area Insets
 * Returns padding values for iOS notch/home indicator
 */
export const getSafeAreaInsets = () => {
    if (!isIOS()) {
        return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    // Get CSS env() values for safe areas
    const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0');
    const bottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0');
    const left = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0');
    const right = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0');

    return { top, bottom, left, right };
};

/**
 * Initialize Native Features
 * Call this once when app loads
 */
export const initializeNativeFeatures = async () => {
    if (!isNativePlatform()) return;

    // Set initial status bar style (dark theme)
    await setStatusBarStyle(true);
    await setStatusBarBackground('#0F172A');

    // Hide splash screen after React hydration
    setTimeout(async () => {
        await hideSplashScreen();
    }, 1000);

    console.log('✅ Native features initialized');
    console.log(`📱 Platform: ${getPlatform()}`);
};
