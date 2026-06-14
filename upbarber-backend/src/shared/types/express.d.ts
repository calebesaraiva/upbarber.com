import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      barbershopId?: string | null;
      role: UserRole;
      email: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
