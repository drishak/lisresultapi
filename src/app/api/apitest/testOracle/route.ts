import { NextRequest, NextResponse } from "next/server";
import oracledb from "oracledb";

export async function GET() {
    try {
        // Point to your Instant Client directory
        oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_19_23" });
        // Linux: oracledb.initOracleClient({ libDir: "/opt/oracle/instantclient_19_23" });

        // Connect to Oracle
        const connection = await oracledb.getConnection({
            user: "gev",
            password: "gev2025!",
            connectString: "192.168.199.227:1521:his"  // adjust host, port, and service/SID
        });

        // Run a test query
        const result = await connection.execute("SELECT sysdate FROM dual");

        await connection.close();

        return NextResponse.json({ success: true, data: result.rows }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}
