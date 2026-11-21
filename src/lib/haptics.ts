import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Tiny wrappers so screens can call haptics without caring about the platform. */
const native = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptics = {
  tap: () => native && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  select: () => native && Haptics.selectionAsync().catch(() => {}),
  success: () => native && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => native && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
