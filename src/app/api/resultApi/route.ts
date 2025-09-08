import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { handleResultApi } from "@/lib/general/resultApi1";
import { handleResultfbc } from "@/lib/hematology/resultfbc";
import { handleResultesr } from "@/lib/hematology/resultesr";
import { handleResultStago } from "@/lib/hematology/resultStago";
import { handleResultOsmo } from "@/lib/patology/resultOsmo";
import { handleResultUrit } from "@/lib/patology/resultUrit";
import { handleResultSebia } from "@/lib/patology/resultSebia";
import { handleResultBiosensor } from "@/lib/tissue/resultBiosensor";
import { handleResultDiagcore } from "@/lib/tissue/resultDiagcore";

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

            try {
                let res;
                if (testCode === "HEMA32") res = await handleResultesr(det);
                else if (["HEMA19", "HEMA20", "HEMA21", "HEMA22"].includes(testCode)) res = await handleResultfbc(det);
                else if (["HEMA1", "HEMA2", "HEMA6", "HEMA8", "HEMA9", "HEMA27"].includes(testCode)) res = await handleResultStago(det);
                else if (["UPK43", "UPK51"].includes(testCode)) res = await handleResultOsmo(det);
                else if (testCode === "UPK69") res = await handleResultUrit(det);
                else if (testCode === "UPK63") res = await handleResultSebia(det);
                else if (["UKT01"].includes(testCode)) res = await handleResultBiosensor(det);
                else if (["UKT04", "UKT05"].includes(testCode)) res = await handleResultDiagcore(det);

                results.push({
                    specimenId: specimenId,
                    testCode: testCode,
                    result: res,
                    status: res?.status === "no_result" ? "no_result" : "success"
                });
            } catch (error: any) {
                results.push({ testCode: testCode, error: error.message, status: "failed" });
            }
        }

        return NextResponse.json(
            { status: results.every(r => r.status === "success") ? "success" : "partial", data: results },
            { status: results.every(r => r.status === "success") ? 200 : 404 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    }

}
