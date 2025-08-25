
import { NextRequest, NextResponse } from "next/server";
import oracledb from "oracledb";

export async function GET() {
    try {
        // Point to your Instant Client directory
        oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_23" });
        // oracledb.initOracleClient({ libDir: undefined });

        const connection = await oracledb.getConnection({
            user: "gev",
            password: "gev2025!",
            connectString: "192.168.199.227:1521/his"
            // user: "system",
            // password: "MyPassword123",
            // connectString: "192.168.151.190:1521/FREEPDB1",
        });

        const result = await connection.execute("SELECT * FROM HIS.MID002ANALYZER_RESULT");

        await connection.close();

        return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
