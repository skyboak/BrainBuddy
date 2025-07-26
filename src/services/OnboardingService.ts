import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserIdRequired } from '../utils/userUtils';

class OnboardingService {
  private key(userId: string) {
    return `onboardingCompleted_${userId}`;
  }

  async isOnboardingCompleted(userId: string | null): Promise<boolean> {
    const uid = userId ?? getCurrentUserIdRequired();
    const value = await AsyncStorage.getItem(this.key(uid));
    return value === 'true';
  }

  async setOnboardingCompleted(userId: string | null, completed: boolean): Promise<void> {
    const uid = userId ?? getCurrentUserIdRequired();
    await AsyncStorage.setItem(this.key(uid), completed ? 'true' : 'false');
  }

  async resetOnboarding(userId: string | null): Promise<void> {
    const uid = userId ?? getCurrentUserIdRequired();
    await AsyncStorage.removeItem(this.key(uid));
  }
}

export default new OnboardingService();
