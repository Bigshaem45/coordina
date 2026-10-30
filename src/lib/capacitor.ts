import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App as CapApp } from '@capacitor/app';

export const isNative = Capacitor.isNativePlatform();

/**
 * Initializes native Capacitor features (Status Bar, Splash Screen, Back Button).
 * Gracefully no-ops in standard desktop and mobile browsers.
 */
export async function initCapacitor(onBack?: () => void) {
  if (!isNative) return;

  try {
    // 1. Status Bar styling
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0B1120' });
    }
  } catch (err) {
    console.warn('Capacitor StatusBar init note:', err);
  }

  try {
    // 2. Hide Splash Screen after React is mounted
    await SplashScreen.hide();
  } catch (err) {
    console.warn('Capacitor SplashScreen note:', err);
  }

  try {
    // 3. Android Hardware Back Button listener
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && onBack) {
        onBack();
      } else if (!canGoBack) {
        CapApp.exitApp();
      }
    });
  } catch (err) {
    console.warn('Capacitor BackButton note:', err);
  }
}

/**
 * Trigger native haptic feedback on button clicks or actions.
 */
export async function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (!isNative) return;
  try {
    if (type === 'light') {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (type === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (type === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning });
    }
  } catch {
    // Graceful fallback on devices without haptic engine
  }
}

