import { handle } from "hono/vercel";
import app from "../src/index";

export const config = {
  api: { bodyParser: false },
};

export default handle(app);
