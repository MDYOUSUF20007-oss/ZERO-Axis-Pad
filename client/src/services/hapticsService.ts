import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

class HapticsService {
  private enabled: boolean = true;
  private intensity: 'light' | 'medium' | 'heavy' = 'medium';

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setIntensity(intensity: 'light' | 'medium' | 'heavy') {
    this.intensity = intensity;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Light tap for button down / joystick notch
  public async impactLight() {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  }

  // Medium tap for face buttons (A, B, X, Y)
  public async impactMedium() {
    if (!this.enabled) return;
    try {
      const style =
        this.intensity === 'light'
          ? ImpactStyle.Light
          : this.intensity === 'heavy'
          ? ImpactStyle.Heavy
          : ImpactStyle.Medium;
      await Haptics.impact({ style });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        const ms = this.intensity === 'light' ? 10 : this.intensity === 'heavy' ? 35 : 20;
        navigator.vibrate(ms);
      }
    }
  }

  // Heavy feedback for triggers / stick click (L3/R3)
  public async impactHeavy() {
    if (!this.enabled) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }
  }

  // Selection tick for slider / wheel notch
  public async selectionChanged() {
    if (!this.enabled) return;
    try {
      await Haptics.selectionChanged();
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    }
  }

  // Success double tick
  public async notificationSuccess() {
    if (!this.enabled) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 30, 20]);
      }
    }
  }

  // Warning pulse
  public async notificationWarning() {
    if (!this.enabled) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    }
  }
}

export const haptics = new HapticsService();
