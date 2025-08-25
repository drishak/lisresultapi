import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { handleResultApi } from "../generalTest/resultApi1/route";

export async function POST(request: NextRequest) {


    try {

        const item = await request.json();
        const specimenId = item.specimen_id;
        let result: any = {};

        if (!specimenId) {
            return NextResponse.json(
                { status: "error", message: "specimen_id is required" },
                { status: 500 }
            );
        }

        const [requestdetData]: any = await pool.query(
            "SELECT * FROM request_det WHERE lab_no = ?",
            [specimenId]
        );

        console.log("Request Det Data:", requestdetData);

        if (!requestdetData || requestdetData.length === 0) {

            return NextResponse.json(
                { status: "error", message: "No data found for the given specimen_id" },
                { status: 404 }
            );

        } else {

            for (const det of requestdetData) {

                let testCode = det.test_code;

                if (testCode === "ESR") {

                    //general api handler
                    result = await handleResultApi(det);

                } else {

                    //add other test code handlers here

                }
            }
        }

        return NextResponse.json(
            {
                message: "Created successfully",
            },
            { status: 200 }
        );

    } catch (error: any) {
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    }

}
