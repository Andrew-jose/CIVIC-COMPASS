import { SecurityLog, AppError } from '../../../shared/types';
import { Result } from '../../../shared/utils/Result';

export interface ISecurityLogRepository {
  logEvent(log: Omit<SecurityLog, 'id'>): Promise<Result<void, AppError>>;
  getLogsByUser(userId: string, limit?: number): Promise<Result<SecurityLog[], AppError>>;
}
