import { UserProfile, AppError } from '../../../shared/types';
import { Result } from '../../../shared/utils/Result';

export interface IUserRepository {
  findById(id: string): Promise<Result<UserProfile, AppError>>;
  save(user: UserProfile): Promise<Result<void, AppError>>;
  delete(id: string): Promise<Result<void, AppError>>;
}
