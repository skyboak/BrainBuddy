import { firestore } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { getCurrentUserIdRequired } from '../utils/userUtils';

class TagService {
  private getUserTagsCollection(userId: string) {
    return collection(firestore, 'users', userId, 'tags');
  }

  async getTags(userId: string | null): Promise<string[]> {
    const uid = userId || getCurrentUserIdRequired();
    const snapshot = await getDocs(this.getUserTagsCollection(uid));
    return snapshot.docs.map((doc) => doc.id);
  }

  async addTags(userId: string | null, tags: string[]): Promise<void> {
    const uid = userId || getCurrentUserIdRequired();
    const batchPromises = tags.map(async (tag) => {
      const tagRef = doc(firestore, 'users', uid, 'tags', tag);
      const docSnap = await getDoc(tagRef);
      if (!docSnap.exists()) {
        await setDoc(tagRef, { createdAt: new Date() });
      }
    });
    await Promise.all(batchPromises);
  }
}

export default new TagService();
