import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

export async function initExpressApp(app: express.Express) {
  // need to decide what to do with CORS - this lines enables it for everything
  app.use(cors());

  app.use(bodyParser.json());

  app.get("/api/health", async (req, res) => {
    res.status(200).json({ status: "ok" });
  });
}
