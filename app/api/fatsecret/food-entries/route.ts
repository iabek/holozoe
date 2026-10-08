import { NextResponse } from "next/server";
import { fatSecretRequest } from "@/lib/fatsecret";

export const dynamic =
  "force-dynamic";

function dateToFatSecretDate(
  date: string
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      date
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const timestamp =
    Date.UTC(
      year,
      month - 1,
      day
    );

  const parsed =
    new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !==
      month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  /*
   * FatSecret tidak menerima
   * "2026-10-09" secara langsung.

   * Parameter date harus berupa
   * jumlah hari sejak 1 Januari 1970.
   */
  return Math.floor(
    timestamp /
      (24 * 60 * 60 * 1000)
  );
}

export async function GET(
  request: Request
) {
  try {
    const url =
      new URL(request.url);

    const date =
      url.searchParams
        .get("date")
        ?.trim() ?? "";

    if (!date) {
      return NextResponse.json(
        {
          error:
            "Parameter date wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    const dateInt =
      dateToFatSecretDate(
        date
      );

    if (dateInt === null) {
      return NextResponse.json(
        {
          error:
            "Parameter date harus berformat YYYY-MM-DD dan merupakan tanggal yang valid.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await fatSecretRequest(
        "POST",
        "food_entries.get.v2",
        {
          date:
            dateInt.toString(),

          format:
            "json",
        },
        {
          delegated:
            true,
        }
      );

    return NextResponse.json(
      {
        success:
          true,

        date,

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
      {
        status: 500,
      }
    );
  }
}