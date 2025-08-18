import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
    try {
        const [rows] = await pool.query("SELECT * FROM patients ORDER BY patients_id DESC");
        return NextResponse.json(rows);
    } catch (error: any) {
        return NextResponse.json({
            status: "error",
            message: error.message
        }, { status: 500 });
    }
}
