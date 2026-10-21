import { handleApiRequest } from "../server/api.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    await handleApiRequest(req, res);
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      res.statusCode = error.statusCode || 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: error.message || "Erro interno." }));
      return;
    }

    res.end();
  }
}
