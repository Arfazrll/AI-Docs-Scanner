import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const extractions = await prisma.extraction.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(extractions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
