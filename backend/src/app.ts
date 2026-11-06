import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { parse } from "yaml";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { categoryRouter } from "./routes/category.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { ingredientRouter } from "./routes/ingredient.routes";

export const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});
app.use("/api/auth", authRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/ingredients", ingredientRouter);
app.use("/api/dashboard", dashboardRouter);

const openapiPath = path.resolve(process.cwd(), "openapi.yaml");
if (fs.existsSync(openapiPath)) {
  const spec = parse(fs.readFileSync(openapiPath, "utf8"));
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      swaggerOptions: { persistAuthorization: true, withCredentials: true },
    }),
  );
}

app.use("/api", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "요청한 API를 찾을 수 없습니다.",
    errors: [],
  });
});

app.use(errorHandler);
