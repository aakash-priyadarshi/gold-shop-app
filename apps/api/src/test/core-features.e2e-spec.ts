import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Core Features Integration Tests
 *
 * These tests verify that critical features are working correctly.
 * Run these before any deployment to ensure nothing is broken.
 */
describe("Core Features (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Health Check", () => {
    it("/ (GET) should return API info", () => {
      return request(app.getHttpServer())
        .get("/")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("name");
          expect(res.body).toHaveProperty("version");
        });
    });
  });

  describe("Authentication", () => {
    it("/api/auth/login (POST) should reject invalid credentials", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "invalid@test.com",
          password: "wrongpassword",
        })
        .expect(401);
    });

    it("/api/auth/register (POST) should validate email format", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "not-an-email",
          password: "password123",
          name: "Test User",
        })
        .expect(400);
    });
  });

  describe("Public Endpoints", () => {
    it("/api/shops (GET) should return shop list", () => {
      return request(app.getHttpServer())
        .get("/api/shops")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data || res.body)).toBe(true);
        });
    });

    it("/api/market-rates (GET) should return market rates", () => {
      return request(app.getHttpServer())
        .get("/api/market-rates")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("data");
        });
    });
  });

  describe("Database Connection", () => {
    it("should be able to query the database", async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it("should have required tables", async () => {
      // Check critical tables exist
      const tables = await prisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;

      const tableNames = tables.map((t) => t.tablename);

      expect(tableNames).toContain("User");
      expect(tableNames).toContain("Shop");
      expect(tableNames).toContain("RfqRequest");
      expect(tableNames).toContain("Order");
    });
  });
});
