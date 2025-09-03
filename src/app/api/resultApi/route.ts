import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { handleResultApi } from "@/lib/general/resultApi1";
import { handleResultfbc } from "@/lib/hematology/resultfbc";
import { handleResultesr } from "@/lib/hematology/resultesr";
import { handleResultStago } from "@/lib/hematology/resultStago";
import { handleResultOsmo } from "@/lib/patology/resultOsmo";

export async function POST(request: NextRequest) {


    try {
        const item = await request.json();
        const specimenId = item.specimen_id;

        if (!specimenId) {
            return NextResponse.json(
                { status: "error", message: "specimen_id is required" },
                { status: 400 }
            );
        }

        const [requestdetData]: any = await pool.query(
            "SELECT * FROM request_det WHERE lab_no = ?",
            [specimenId]
        );

        if (!requestdetData || requestdetData.length === 0) {
            return NextResponse.json(
                { status: "error", message: "No data found for the given specimen_id" },
                { status: 404 }
            );
        }

        let results: any[] = [];

        for (const det of requestdetData) {
            let testCode = det.test_code;

            // JOKOH
            if (testCode === "HEMA32") {
                const res = await handleResultesr(det);
                results.push({ testCode, result: res });
            }

            // SYSMEX
            else if (testCode === "HEMA19" || testCode === "HEMA20" || testCode === "HEMA21" || testCode === "HEMA22") {
                const res = await handleResultfbc(det);
                results.push({ testCode, result: res });
            }
            // STAGO
            else if (testCode === "HEMA1" || testCode === "HEMA2" || testCode === "HEMA6" || testCode === "HEMA8" || testCode === "HEMA9" || testCode === "HEMA27") {
                const res = await handleResultStago(det);
                results.push({ testCode, result: res });
            }
            // OSMO
            else if (testCode === "UPK43" || testCode === "UPK51") {
                const res = await handleResultOsmo(det);
                results.push({ testCode, result: res });
            }

            return NextResponse.json(
                { status: "success", message: "Results processed", data: results },
                { status: 200 }
            );
        }


    } catch (error: any) {
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    }

}
