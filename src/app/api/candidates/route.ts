import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") || "desc";

  let query = supabase.from("candidates").select("*");

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const ascending = order === "asc";
  query = query.order(sort, { ascending });

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
