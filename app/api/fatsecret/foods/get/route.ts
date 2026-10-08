import { NextResponse } from "next/server";
import { fatSecretRequest } from "@/lib/fatsecret";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const foodId =
      url.searchParams.get("food_id")?.trim() ?? "";

    if (!foodId) {
      return NextResponse.json(
        {
          error: "Parameter food_id wajib diisi.",
        },
        { status: 400 }
      );
    }

    const data = await fatSecretRequest(
      "POST",
      "food.get",
      {
        food_id: foodId,
        format: "json",
      }
    );

    return NextResponse.json(
      {
        success: true,
        food_id: foodId,
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "FatSecret food get error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil detail makanan dari FatSecret.",
      },
      { status: 500 }
    );
  }
}