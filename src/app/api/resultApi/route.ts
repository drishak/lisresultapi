import { NextResponse } from "next/server";
import { pool } from "@/lib/db"; // adjust path

export async function GET(request: Request) {
    try {
        // get query params
        const { searchParams } = new URL(request.url);
        const specimenId = searchParams.get("specimen_id");

        if (!specimenId) {
            return NextResponse.json(
                { status: "error", message: "specimen_id is required" },
                { status: 400 }
            );
        }

        const [macData]: any = await pool.query(
            "SELECT * FROM mac_tempres_in WHERE specimen_id = ?",
            [specimenId]
        );

        const [requestData]: any = await pool.query(
            "SELECT * FROM request WHERE specimen_no = ?",
            [specimenId]
        );

        console.log("request Data:", requestData);

        let analyzerResultId;

        if (macData.length > 0) {
            const [insertResult]: any = await pool.query(
                `INSERT INTO analyzer_result (insert_date, insert_by, specimen_id, patient_id, patient_name, dob, sex, request_date, run_date, equipment_full_desc, request_id_lis )
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    new Date(),
                    "SYSAPI",
                    specimenId,
                    "patient_123",
                    "patient_name",
                    null,
                    null,
                    null,
                    null,
                    macData[0].equipment_full_desc,
                    "",
                ]
            );

            analyzerResultId = insertResult.insertId;

            for (const data of macData) {
                await pool.query(
                    `INSERT INTO analyzer_result_det (analyzer_result_id, test_code, test_desc, data_result, data_reading)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        analyzerResultId,
                        data.analyzer_test_id,
                        data.analyzer_test_full_desc,
                        data.data_result,
                        data.data_reading,
                    ]
                );
            }
        }
        else if (macData.length === 0) {
            return NextResponse.json(
                { status: "not_found", message: "No result found with this specimen_id" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Result", analyzerResultId },
            { status: 201 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    }
}
