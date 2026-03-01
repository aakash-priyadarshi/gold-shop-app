import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  // ── Health ──────────────────────────────────────────────

  describe("/api/health (GET)", () => {
    it("should return 200 with status", () => {
      return request(app.getHttpServer())
        .get("/api/health")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status");
        });
    });
  });

  describe("/api/health/detailed (GET)", () => {
    it("should return detailed health info", () => {
      return request(app.getHttpServer())
        .get("/api/health/detailed")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status");
        });
    });
  });

  // ── Metrics ─────────────────────────────────────────────

  describe("/api/metrics (GET)", () => {
    it("should return metrics", () => {
      return request(app.getHttpServer())
        .get("/api/metrics")
        .expect(200);
    });
  });

  // ── Auth ────────────────────────────────────────────────

  describe("/api/auth/register (POST)", () => {
    it("should reject registration with invalid body", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({})
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });
  });

  describe("/api/auth/login (POST)", () => {
    it("should reject login with invalid credentials", () => {
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email: "fake@example.com", password: "wrongpassword123" })
        .expect((res) => {
          expect([400, 401, 422]).toContain(res.status);
        });
    });
  });

  // ── Protected Routes ────────────────────────────────────

  describe("Protected routes", () => {
    it("GET /api/users/me should return 401 without token", () => {
      return request(app.getHttpServer())
        .get("/api/users/me")
        .expect(401);
    });

    it("GET /api/admin/dashboard should return 401 without token", () => {
      return request(app.getHttpServer())
        .get("/api/admin/dashboard")
        .expect(401);
    });

    it("GET /api/shops should return 401 without token", () => {
      return request(app.getHttpServer())
        .get("/api/shops")
        .expect(401);
    });
  });

  // ── 404 Handling ────────────────────────────────────────

  describe("Unknown routes", () => {
    it("should return 404 for unknown path", () => {
      return request(app.getHttpServer())
        .get("/api/this-route-does-not-exist")
        .expect(404);
    });
  });
});
