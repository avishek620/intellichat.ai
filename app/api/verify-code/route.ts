export async function POST(req: Request) {
  const { code } = await req.json();

  const valid = code === process.env.GOODWILL_CODE;

  return Response.json({ valid });
}