import { POST as handleIncrement } from "../route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleIncrement(req);
}
