import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getOracleConnection } from "@/lib/oracledb";
import oracledb from "oracledb";

export async function handleResultBiosensor(data: any) {
    let conn;

    try {

        conn = await getOracleConnection();

        const item = data
        const specimenId = item.lab_no;
        const testCode = item.test_code;

        let patientData: any = [];
        let gender = null;
        let ageDays = null;

        let analyzerResultId;
        let analyzerOcrResultId;

        if (!specimenId) {
            return NextResponse.json(
                { status: "error", message: "specimen_id is required" },
                { status: 400 }
            );
        }

        const [requestData]: any = await pool.query(
            "SELECT * FROM request WHERE specimen_no = ?",
            [specimenId]
        );

        if (!requestData || requestData.length > 0) {

            const patientId = requestData[0].patients_id;

            [patientData] = await pool.query(
                "SELECT * FROM patients WHERE patients_id = ?",
                [patientId]
            );

            gender = patientData[0].gender == "L" ? "M" : "F";
            const birthdate = new Date(patientData[0].birthdate);
            const today = new Date();

            // difference in milliseconds
            const diffMs = today.getTime() - birthdate.getTime();

            // convert ms → days
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            ageDays = diffDays;

            console.log("Age in days:", ageDays);
        }

        const [requestdetData]: any = await pool.query(
            "SELECT * FROM request_det WHERE lab_no = ? and test_code = ?",
            [specimenId, testCode]
        );

        const reqdetid = requestdetData[0].request_det_id;

        const testCodedet = requestdetData[0].test_code;

        const [requestdetlistData]: any = await pool.query(
            "SELECT * FROM request_det_list WHERE request_det_id = ?",
            [reqdetid]
        );

        if (requestdetlistData.length > 0) {

            let macData: any[] = [];
            let macInData: any[] = [];
            let row: any[] = [];

            for (const det of requestdetlistData) {
                const resultItemCode = det.result_item_code;

                // get ref product
                const [refProductData]: any = await pool.query(
                    "SELECT * FROM ref_product WHERE result_item_code = ?",
                    [resultItemCode]
                );

                const testCodeRef = refProductData[0]?.test_code;

                // get mac data
                const [rows]: any = await pool.query(
                    "SELECT * FROM mac_tempres_in WHERE analyzer_test_id = ? AND specimen_id = ? AND read_flag = 0 LIMIT 1",
                    [testCodeRef, specimenId]
                );

                if (rows.length > 0) {
                    macData = rows;
                    break; // stop looping
                } else {
                    // throw new Error(`No MAC data found for test code ${specimenId}`);
                    return {
                        status: "no_result",
                        message: `No MAC data found for specimen_id : ${specimenId}`,
                    }
                }
            }

            const [insertResult]: any = await pool.query(
                `INSERT INTO analyzer_result (
                        insert_date, 
                        insert_by, 
                        specimen_id, 
                        patient_id, 
                        patient_name, 
                        dob, 
                        gender, 
                        request_date, 
                        run_date, 
                        equipment_full_desc, 
                        request_id_lis,
                        transmit_by, 
                        read_flag
                )
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    new Date(),
                    "SYSAPI",
                    specimenId,
                    patientData.length > 0 && patientData ? patientData[0]?.patient_id_no : null,
                    patientData.length > 0 && patientData ? patientData[0]?.full_name : null,
                    patientData.length > 0 && patientData ? patientData[0]?.birthdate : null,
                    patientData.length > 0 && patientData ? patientData[0]?.gender : null,
                    requestData.length > 0 && requestData ? requestData[0]?.request_date : null,
                    macData[0]?.collect_date,
                    macData[0]?.equipment_full_desc,
                    requestData.length > 0 && requestData ? requestData[0]?.request_id_lis : null,
                    macData[0]?.transmit_by,
                    "1"
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
                    patient_id: patientData.length > 0 && patientData ? patientData[0]?.patient_id_no : null,
                    patient_name: patientData.length > 0 && patientData ? patientData[0]?.full_name : null,
                    dob: patientData.length > 0 && patientData ? patientData[0]?.birthdate : null,
                    sex: patientData.length > 0 && patientData ? patientData[0]?.gender : null,
                    request_date: requestData.length > 0 && requestData ? requestData[0]?.request_date : null,
                    run_date: macData[0]?.collect_date,
                    equipment_full_desc: macData[0]?.equipment_full_desc,
                    request_id_lis: requestData.length > 0 && requestData ? requestData[0]?.request_id_lis : null,
                    transmit_by: "SYSAPI",
                    read_flag: "1",

                    out_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                },
                { autoCommit: true }
            );

            analyzerOcrResultId = (insertOrcResult.outBinds as { out_id: any[] }).out_id[0];

            //Update status and run date in request_det
            await pool.execute(
                "UPDATE request_det SET status = ?, run_date = ? WHERE request_det_id = ?",
                ["TST", macData[0]?.collect_date, reqdetid]
            );

            for (const detlist of requestdetlistData) {

                const resultItemCode = detlist.result_item_code;

                const [refProductData]: any = await pool.query(
                    "SELECT * FROM ref_product WHERE result_item_code = ?",
                    [resultItemCode]
                );

                const testCodeRef = refProductData[0]?.test_code;
                const refProductId = refProductData[0]?.ref_product_id;

                macInData = await pool.query(
                    "SELECT * FROM mac_tempres_in WHERE analyzer_test_id = ? and specimen_id = ? and read_flag = 0 limit 1",
                    [testCodeRef, specimenId]
                );

                if (macInData.length > 0) {

                    // const [refProductData]: any = await pool.query(
                    //     "SELECT * FROM ref_product WHERE result_item_code = ?",
                    //     [testCodedet]
                    // );

                    //hardcode ESR ref_product_id
                    // const rprRefProductId = "298";

                    row = await pool.query(
                        `
                            SELECT 
                                verify_min_range,
                                verify_max_range,
                                range_uom_code
                            FROM vw_product_ranges
                            WHERE ref_product_id = ?
                                AND (? IS NULL OR gender_code = ? OR gender_code IS NULL)
                                AND (? BETWEEN min_age_days AND max_age_days OR (min_age_days IS NULL AND max_age_days IS NULL))
                            limit 1
                            `,
                        [refProductId, gender, gender, ageDays]
                    );

                    console.log("Condition Range:", refProductId, gender, ageDays);
                    console.log("Range Data:", testCodeRef, refProductId, row);
                }

                const min = row[0][0]?.verify_min_range;
                const max = row[0][0]?.verify_max_range;
                const result = macInData[0][0]?.data_result;

                const normalRange = (min != null && max != null) ? `${min} - ${max}` : null;

                let abnormality = null;
                if (row.length > 0 && macInData.length > 0) {
                    if (parseFloat(result) > parseFloat(min) && parseFloat(result) < parseFloat(max)) {
                        abnormality = "Normal";
                    } else if (parseFloat(result) > parseFloat(max)) {
                        abnormality = "High";
                    } else if (parseFloat(result) < parseFloat(min)) {
                        abnormality = "Low";
                    } else {
                        abnormality = null;
                    }
                } else {
                    abnormality = null;
                }



                await pool.query(
                    `INSERT INTO analyzer_result_det (
                        analyzer_result_id, 
                        result_item_id, 
                        result_item_code, 
                        result_item_desc, 
                        data_result, 
                        normal_range, 
                        unit, 
                        abnormality
                        ) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        analyzerResultId,
                        detlist?.result_item_id,
                        detlist?.result_item_code,
                        detlist?.result_item_desc,
                        result,
                        normalRange,
                        row[0][0]?.range_uom_code,
                        abnormality
                    ]
                );

                await conn.execute(
                    `INSERT INTO MID003ANALYZER_RESULT_DET 
                                            (ANALYZER_RESULT_DET_ID, analyzer_result_id, result_item_id, result_item_code, result_item_desc, data_result, range, unit, abnormality, test_code, test_desc) 
                                        VALUES (
                
                                        ANALYZER_RESULT_DET_SEQ.NEXTVAL,
                                        :analyzer_result_id, 
                                        :result_item_id,
                                        :result_item_code, 
                                        :result_item_desc, 
                                        :data_result, 
                                        :range, 
                                        :unit, 
                                        :abnormality, 
                                        :test_code,
                                        :test_desc
                                        )
                                        RETURNING ANALYZER_RESULT_DET_ID INTO :out_id`,
                    {

                        analyzer_result_id: analyzerOcrResultId,
                        result_item_id: detlist?.result_item_id,
                        result_item_code: detlist?.result_item_code,
                        result_item_desc: detlist?.result_item_desc,
                        data_result: result,
                        range: normalRange,
                        unit: row[0][0]?.range_uom_code,
                        abnormality: abnormality,
                        test_code: requestdetData[0]?.test_code,
                        test_desc: requestdetData[0]?.test_desc,

                        out_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    },
                    { autoCommit: true }
                );
            }

        }


        return {
            specimenId,
            status: "success"
        };
    } catch (error: any) {
        console.error("Error in handleResultesr:", error);
        throw new Error(error.message || "Failed to handle ESR result");
    }
}
