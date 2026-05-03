import { IUserRepository, User, Session, SessionData, PaginatedResult, ChecklistProgress } from '../IUserRepository';
import { AppError } from '../FirestoreUserRepository';

export class MockUserRepository implements IUserRepository {
  public users = new Map<string, User>();
  public sessions = new Map<string, Session>();
  public progress = new Map<string, ChecklistProgress>();
  public delayMs: number = 0;

  private async delay() {
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }
  }

  async findById(userId: string): Promise<User | null> {
    await this.delay();
    return this.users.get(userId) || null;
  }

  async createSession(userId: string, sessionData: SessionData): Promise<Session> {
    await this.delay();
    const sessionId = Math.random().toString(36).substring(7);
    const session: Session = {
      id: sessionId,
      userId,
      data: sessionData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async updateSession(userId: string, sessionId: string, data: Partial<SessionData>): Promise<void> {
    await this.delay();
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) throw new AppError('Session not found', 'NOT_FOUND');
    session.data = { ...session.data, ...data };
    session.updatedAt = Date.now();
  }

  async getSessionHistory(userId: string, limit: number, cursor?: string): Promise<PaginatedResult<Session>> {
    await this.delay();
    const allSessions = Array.from(this.sessions.values()).filter(s => s.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
    let startIndex = 0;
    if (cursor) {
      startIndex = allSessions.findIndex(s => s.id === cursor) + 1;
    }
    const items = allSessions.slice(startIndex, startIndex + limit);
    const nextCursor = items.length === limit ? items[items.length - 1].id : undefined;
    return { items, nextCursor };
  }

  async saveChecklistProgress(userId: string, sessionId: string, prog: ChecklistProgress): Promise<void> {
    await this.delay();
    this.progress.set(`${userId}:${sessionId}`, prog);
  }

  async getChecklistProgress(userId: string, sessionId: string): Promise<ChecklistProgress | null> {
    await this.delay();
    return this.progress.get(`${userId}:${sessionId}`) || null;
  }
}
