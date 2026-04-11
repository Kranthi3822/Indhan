import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createOwnerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "owner-user",
    email: "owner@bees.com",
    name: "Kranthi",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("Indhan — Auth", () => {
  it("returns authenticated user from auth.me", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.name).toBe("Kranthi");
    expect(user?.role).toBe("admin");
  });

  it("clears session cookie on logout", async () => {
    const cleared: string[] = [];
    const ctx = createOwnerContext();
    ctx.res = {
      clearCookie: (name: string) => { cleared.push(name); },
    } as unknown as TrpcContext["res"];
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared).toHaveLength(1);
  });
});

describe("Indhan — Sathi AI Agent", () => {
  it("sathi router is registered in appRouter", () => {
    expect(appRouter._def.procedures["sathi.ask"]).toBeDefined();
  });
});

describe("Indhan — Core Routers", () => {
  it("dashboard router is registered", () => {
    expect(appRouter._def.procedures["dashboard.kpis"]).toBeDefined();
  });

  it("customers router is registered", () => {
    expect(appRouter._def.procedures["customers.list"]).toBeDefined();
  });

  it("inventory router is registered", () => {
    expect(appRouter._def.procedures["inventory.list"]).toBeDefined();
  });

  it("expenses router is registered", () => {
    expect(appRouter._def.procedures["expenses.list"]).toBeDefined();
  });

  it("bank router is registered", () => {
    expect(appRouter._def.procedures["bank.list"]).toBeDefined();
  });

  it("reconciliation router is registered", () => {
    expect(appRouter._def.procedures["reconciliation.list"]).toBeDefined();
  });

  it("sales router is registered", () => {
    expect(appRouter._def.procedures["sales.list"]).toBeDefined();
  });
});
