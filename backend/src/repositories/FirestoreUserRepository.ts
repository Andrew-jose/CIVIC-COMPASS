import { IUserRepository } from './IUserRepository';
import { UserProfile, AppError } from '../../../shared/types';
import { Result, ok, err } from '../../../shared/utils/Result';
import { Firestore } from 'firebase-admin/firestore';

export class FirestoreUserRepository implements IUserRepository {
  private collection: FirebaseFirestore.CollectionReference;

  constructor(private readonly db: Firestore) {
    this.collection = this.db.collection('users');
  }

  async findById(id: string): Promise<Result<UserProfile, AppError>> {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) {
        return err({
          code: 'JURISDICTION_NOT_FOUND',
          message: 'User not found.',
          searchedJurisdiction: id
        } as AppError); // Note: using JURISDICTION_NOT_FOUND as a generic not found here, ideally we'd have USER_NOT_FOUND
      }
      return ok({ id: doc.id, ...doc.data() } as UserProfile);
    } catch (e: unknown) {
      return err({
        code: 'FIREBASE_UNAVAILABLE',
        message: 'Database error',
        operationAttempted: 'findById'
      });
    }
  }

  async save(user: UserProfile): Promise<Result<void, AppError>> {
    try {
      const { id, ...data } = user;
      await this.collection.doc(id).set(data, { merge: true });
      return ok(undefined);
    } catch (e: unknown) {
      return err({
        code: 'FIREBASE_UNAVAILABLE',
        message: 'Database error',
        operationAttempted: 'save'
      });
    }
  }

  async delete(id: string): Promise<Result<void, AppError>> {
    try {
      await this.collection.doc(id).delete();
      return ok(undefined);
    } catch (e: unknown) {
      return err({
        code: 'FIREBASE_UNAVAILABLE',
        message: 'Database error',
        operationAttempted: 'delete'
      });
    }
  }
}
