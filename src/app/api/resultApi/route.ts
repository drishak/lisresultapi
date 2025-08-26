import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { handleResultApi } from "../generalTest/resultApi1/route";
import { handleResultfbc } from "../hematology/resultApi1/route";

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

            if (testCode === "HEMA32") {
                const res = await handleResultApi(det);
                results.push({ testCode, result: res });
            } else if (testCode === "HEMA21") {
                // const res = await handleResultFBC(det);
                // results.push({ testCode, result: res });
            }
        }

        return NextResponse.json(
            { status: "success", message: "Results processed", data: results },
            { status: 200 }
        );

    } catch (error: any) {
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    }

}
