import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getOracleConnection } from "@/lib/oracledb";
import oracledb from "oracledb";

export async function handleResultApi(data: any) {
    let conn;

    try {

        conn = await getOracleConnection();
        // get query params
        const item = data
        const specimenId = item.lab_no;

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

        let patientData: any = [];

        if (!requestData || requestData.length > 0) {

            const patientId = requestData[0].patients_id;

            [patientData] = await pool.query(
                "SELECT * FROM patients WHERE patients_id = ?",
                [patientId]
            );

            console.log("Patient Data:", patientData[0]);
        }

        let analyzerResultId;
        let analyzerOcrResultId;
        let range = null;

        if (patientData.length > 0 && patientData) {
            if (patientData[0].gender === "L") {
                range = "1-15";
            } else if (patientData[0].gender === "P") {
                range = "1-20";
            }
        }

        if (macData.length > 0) {
            const [insertResult]: any = await pool.query(
                `INSERT INTO analyzer_result (insert_date, insert_by, specimen_id, patient_id, patient_name, dob, gender, request_date, run_date, equipment_full_desc, request_id_lis )
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    new Date(),
                    "SYSAPI",
                    specimenId,
                    patientData.length > 0 && patientData ? patientData[0]?.patients_id : null,
                    patientData.length > 0 && patientData ? patientData[0]?.full_name : null,
                    patientData.length > 0 && patientData ? patientData[0]?.birthdate : null,
                    patientData.length > 0 && patientData ? patientData[0]?.gender : null,
                    requestData.length > 0 && requestData ? requestData[0]?.request_date : null,
                    macData[0]?.collect_date,
                    macData[0]?.equipment_full_desc,
                    requestData.length > 0 && requestData ? requestData[0]?.request_id_lis : null,
                ]
            );

            analyzerResultId = insertResult.insertId;

            const insertOrcResult = await conn.execute(
                `INSERT INTO MID002ANALYZER_RESULT 
                        (ANALYZER_RESULT_ID, insert_date, insert_by, specimen_id, patient_id, patient_name, dob, sex, request_date, run_date, equipment_full_desc, request_id_lis, transmit_by, read_flag)
                    VALUES (
                        ANALYZER_RESULT_SEQ.NEXTVAL,
                        :insert_date, 
                        :insert_by, 
                        :specimen_id, 
                        :patient_id, 
                        :patient_name, 
                        :dob, 
                        :sex, 
                        :request_date, 
                        :run_date, 
                        :equipment_full_desc, 
                        :request_id_lis, 
                        :transmit_by, 
                        :read_flag
                    )
                    RETURNING ANALYZER_RESULT_ID INTO :out_id`,
                {
                    insert_date: new Date(),
                    insert_by: "SYSAPI",
                    specimen_id: specimenId,
                    patient_id: patientData.length > 0 && patientData ? patientData[0]?.patients_id : null,
                    patient_name: patientData.length > 0 && patientData ? patientData[0]?.full_name : null,
                    dob: patientData.length > 0 && patientData ? patientData[0]?.birthdate : null,
                    sex: patientData.length > 0 && patientData ? patientData[0]?.gender : null,
                    request_date: requestData.length > 0 && requestData ? requestData[0]?.request_date : null,
                    run_date: macData[0]?.collect_date,
                    equipment_full_desc: macData[0]?.equipment_full_desc,
                    request_id_lis: requestData.length > 0 && requestData ? requestData[0]?.request_id_lis : null,
                    transmit_by: "SYSAPI",
                    read_flag: "N",

                    out_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                },
                { autoCommit: true }
            );

            analyzerOcrResultId = (insertOrcResult.outBinds as { out_id: any[] }).out_id[0];
            console.log("Inserted ANALYZER_RESULT_ID:", analyzerOcrResultId);
            console.log("Rows inserted:", insertOrcResult.rowsAffected);

            for (const data of macData) {

                await pool.query(
                    "INSERT INTO analyzer_result_det (analyzer_result_id, result_item_code, result_item_desc, data_result, data_reading, normal_range, unit) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [
                        analyzerResultId,
                        data.analyzer_test_id,
                        data.analyzer_test_full_desc,
                        data.data_result,
                        data.data_reading,
                        range,
                        "mm/hr"
                    ]
                );

                await conn.execute(
                    `INSERT INTO MID003ANALYZER_RESULT_DET 
                            (ANALYZER_RESULT_DET_ID, analyzer_result_id, test_code, test_desc, data_result, data_reading, range, unit, abnormality, critical_value, data_value1, data_value2) 
                        VALUES (

                        ANALYZER_RESULT_DET_SEQ.NEXTVAL,
                        :analyzer_result_id, 
                        :test_code, 
                        :test_desc, 
                        :data_result, 
                        :data_reading, 
                        :range, 
                        :unit, 
                        :abnormality, 
                        :critical_value, 
                        :data_value1, 
                        :data_value2
                        )
                        RETURNING ANALYZER_RESULT_DET_ID INTO :out_id`,
                    {

                        analyzer_result_id: analyzerOcrResultId,
                        test_code: data.analyzer_test_id,
                        test_desc: data.analyzer_test_full_desc,
                        data_result: data.data_result,
                        data_reading: data.data_reading,
                        range: range,
                        unit: "mm/hr",
                        abnormality: "normal",
                        critical_value: "no",
                        data_value1: "0",
                        data_value2: "0",

                        out_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    },
                    { autoCommit: true }
                );
            }
        }
        else if (macData.length === 0) {
            return NextResponse.json(
                { status: "not_found", message: "No result found with this specimen_id" },
                { status: 404 }
            );
        }

        await conn.close();

        return NextResponse.json(
            {
                message: "Created successfully",
                analyzerOcrResultId
            },
            { status: 201 }
        );
    } catch (error: any) {
        return NextResponse.json(
            { status: "error", message: error.message },
            { status: 500 }
        );
    }
}
