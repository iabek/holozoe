import { NextRequest, NextResponse } from "next/server";

type FoodItem = {
  name: string;
  quantity: number;
  unit: string;
  estimated_grams: number;
  confidence: "high" | "medium" | "low";
  note: string;
};

type FoodAnalysis = {
  items: FoodItem[];
  overall_confidence: "high" | "medium" | "low";
  note: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const text = typeof body?.text === "string"
      ? body.text.trim()
      : "";

    if (!text) {
      return NextResponse.json(
        {
          error: "Food description is required.",
        },
        { status: 400 }
      );
    }

    if (text.length > 2000) {
      return NextResponse.json(
        {
          error: "Food description is too long.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY belum diset di .env.local.",
        },
        { status: 500 }
      );
    }

    const model =
      process.env.OPENAI_MODEL || "gpt-5";

    const instructions = `
Kamu adalah parser makanan untuk aplikasi Life Game.

Tugasmu HANYA mengenali makanan dan memperkirakan porsinya dari teks pengguna.

PENTING:
1. Jangan memberikan kalori.
2. Jangan memberikan protein.
3. Jangan memberikan lemak.
4. Jangan memberikan karbohidrat.
5. Jangan mencari atau mengarang nilai nutrisi.
6. Nutrisi akan dihitung oleh aplikasi menggunakan database TKPI 2020.
7. Tugasmu hanya:
   - mengenali nama makanan,
   - mengenali jumlah,
   - mengenali satuan,
   - memperkirakan berat dalam gram bila memungkinkan.
8. Bahasa input pengguna bisa bahasa Indonesia sehari-hari.
9. Pahami sinonim dan variasi penulisan seperti:
   - nasi / nasi putih
   - mie / mi
   - telur / telor
   - tempe goreng / tempe digoreng
   - tahu goreng
10. Jangan memecah satu makanan menjadi bahan-bahan yang tidak disebutkan pengguna.
11. Contoh:
   "nasi 2 centong + telur dadar 1 + tempe goreng 2 potong"
   harus menjadi tiga item.
12. Untuk satuan sehari-hari seperti:
   centong, sendok makan, sendok teh, potong, butir, gelas,
   gunakan perkiraan berat gram yang masuk akal.
13. Perkiraan gram harus dianggap ESTIMASI, bukan fakta pasti.
14. Jika porsi tidak jelas, gunakan confidence "low" dan estimated_grams = 0.
15. Jika pengguna hanya berkata "makan nasi padang", jangan mengarang lauk.
   Jadikan satu item bernama "nasi padang" dengan confidence low dan
   estimated_grams = 0.
16. Jangan memasukkan minuman atau makanan yang tidak disebutkan.
17. Jika ada kata "1 gelas", "2 potong", dan sebagainya, pertahankan satuannya.
18. Gunakan nama makanan yang umum dan mudah dicocokkan dengan database pangan Indonesia.
19. Jangan mengubah "teh tarik" menjadi "teh manis", karena itu makanan/minuman berbeda.
20. Output HARUS mengikuti JSON schema yang diberikan.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          store: false,

          instructions,

          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text,
                },
              ],
            },
          ],

          text: {
            format: {
              type: "json_schema",
              name: "food_analysis",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        name: {
                          type: "string",
                        },
                        quantity: {
                          type: "number",
                        },
                        unit: {
                          type: "string",
                        },
                        estimated_grams: {
                          type: "number",
                        },
                        confidence: {
                          type: "string",
                          enum: [
                            "high",
                            "medium",
                            "low",
                          ],
                        },
                        note: {
                          type: "string",
                        },
                      },
                      required: [
                        "name",
                        "quantity",
                        "unit",
                        "estimated_grams",
                        "confidence",
                        "note",
                      ],
                    },
                  },

                  overall_confidence: {
                    type: "string",
                    enum: [
                      "high",
                      "medium",
                      "low",
                    ],
                  },

                  note: {
                    type: "string",
                  },
                },

                required: [
                  "items",
                  "overall_confidence",
                  "note",
                ],
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "OPENAI FOOD ANALYSIS ERROR:",
        errorText
      );

      return NextResponse.json(
        {
          error:
            "Gagal menghubungi Food AI.",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    const outputText =
      typeof data?.output_text === "string"
        ? data.output_text
        : "";

    if (!outputText) {
      console.error(
        "OPENAI FOOD ANALYSIS EMPTY RESPONSE:",
        data
      );

      return NextResponse.json(
        {
          error:
            "Food AI tidak menghasilkan hasil.",
        },
        { status: 500 }
      );
    }

    let result: FoodAnalysis;

    try {
      result = JSON.parse(outputText);
    } catch (parseError) {
      console.error(
        "FOOD AI JSON PARSE ERROR:",
        parseError,
        outputText
      );

      return NextResponse.json(
        {
          error:
            "Hasil Food AI tidak dapat diproses.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "FOOD ANALYSIS ROUTE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan saat menganalisis makanan.",
      },
      { status: 500 }
    );
  }
}