import { NextResponse } from "next/server";
import { fatSecretRequest } from "@/lib/fatsecret";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const query =
      url.searchParams.get("q")?.trim() ?? "";

    const page =
      url.searchParams.get("page") ?? "0";

    const maxResults =
      url.searchParams.get("max_results") ?? "20";

    const region =
      url.searchParams.get("region") ?? "ID";

    const language =
      url.searchParams.get("language") ?? "en";

    if (!query) {
      return NextResponse.json(
        {
          error: "Parameter q wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (query.length > 100) {
      return NextResponse.json(
        {
          error: "Pencarian terlalu panjang.",
        },
        { status: 400 }
      );
    }

    const parsedPage =
      Number.parseInt(page, 10);

    const parsedMaxResults =
      Number.parseInt(maxResults, 10);

    if (
      Number.isNaN(parsedPage) ||
      parsedPage < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Parameter page tidak valid.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(parsedMaxResults) ||
      parsedMaxResults < 1 ||
      parsedMaxResults > 50
    ) {
      return NextResponse.json(
        {
          error:
            "max_results harus antara 1 dan 50.",
        },
        { status: 400 }
      );
    }

    const data =
      await fatSecretRequest(
        "POST",
        "foods.search",
        {
          search_expression: query,
          page_number:
            parsedPage.toString(),
          max_results:
            parsedMaxResults.toString(),
          region,
          language,
          format: "json",
        }
      );

    return NextResponse.json(
      {
        success: true,
        query,
        debug_version: "food-search-v4",
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "FatSecret food search error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mencari makanan di FatSecret.",
      },
      { status: 500 }
    );
  }
}