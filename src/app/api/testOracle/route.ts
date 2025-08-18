import { NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracledb";
import oracledb from "oracledb";

export async function GET() {
    let conn;
    try {
        conn = await getOracleConnection();

        const result = await conn.execute(
            "SELECT * FROM ANALYZER_RESULT ORDER BY SPECIMEN_ID DESC",
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT } // 🔑 return rows as plain objects
        );

        const rows = result.rows || [];
        const headers = result.metaData?.map(col => col.name).join(",") || "";
        const csv = [
            headers,
            ...rows.map(r => Object.values(r as Record<string, unknown>).join(","))
        ].join("\n");

        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": "attachment; filename=data.csv"
            }
        });
    } catch (error: any) {
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    } finally {
        if (conn) await conn.close();
    }
}
