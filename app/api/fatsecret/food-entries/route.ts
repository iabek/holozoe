import { NextResponse } from "next/server";
import { fatSecretRequest } from "@/lib/fatsecret";

export const dynamic = "force-dynamic";

function getDateInt(date: Date) {
  return Math.floor(
    date.getTime() / 1000 / 86400
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const dateParam =
      url.searchParams.get("date")?.trim() ?? "";

    let dateInt: number;

    if (dateParam) {
      const parsedDate =
        new Date(`${dateParam}T00:00:00Z`);

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Parameter date tidak valid. Gunakan format YYYY-MM-DD.",
          },
          { status: 400 }
        );
      }

      dateInt =
        getDateInt(parsedDate);
    } else {
      dateInt =
        getDateInt(new Date());
    }

    const data =
      await fatSecretRequest(
        "POST",
        "food_entries.get.v2",
        {
          date:
            dateInt.toString(),
          format: "json",
        },
        {
          delegated: true,
        }
      );

    return NextResponse.json(
      {
        success: true,
        date_int:
          dateInt,
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
      "FatSecret food entries error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengambil Food Diary FatSecret.",
      },
      { status: 500 }
    );
  }
}