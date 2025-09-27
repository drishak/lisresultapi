import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getOracleConnection } from "@/lib/oracledb";
import oracledb from "oracledb";

export async function handleResultIh500(data: any) {

    // const idctMap: Record<string, string> = {
    //     "Anti Compliment C3d": "",
    //     "Anti Compliment C3c": "",
    //     "Anti Ig-A": "AntiIgA",
    //     "Anti Ig-M": "AntiIgM",
    //     "Anti Ig-G": "AntiIgG",
    // };

    // const aborhMap: Record<string, string> = {
    //     "Cell-O": "cellO",
    //     "Cell-B": "cellB",
    //     "Cell-A1": "cellA1",
    //     "Cell-A": "cellA",
    //     "Anti-H": "AntiH",
    //     "Anti-D": "AntiD",
    //     "Anti-AB": "CtrlAB",
    //     "Anti-B": "AntiB",
    //     "Anti-A": "AntiA",
    // };



    let conn;

    const idctMap: Record<string, { testCodeRef: string; refProductId: string }> = {
        "Anti Compliment C3d": { testCodeRef: "", refProductId: "1463" },
        "Anti Compliment C3c": { testCodeRef: "", refProductId: "1464" },
        "Anti Ig-A": { testCodeRef: "AntiIgA", refProductId: "1468" },
        "Anti Ig-M": { testCodeRef: "AntiIgM", refProductId: "1465" },
        "Anti Ig-G": { testCodeRef: "AntiIgG", refProductId: "1468" },
    };

    const aborhMap: Record<string, { testCodeRef: string; refProductId: string }> = {
        "Cell-O": { testCodeRef: "cellO", refProductId: "1455" },
        "Cell-B": { testCodeRef: "cellB", refProductId: "1456" },
        "Cell-A1": { testCodeRef: "cellA1", refProductId: "1457" },
        "Cell-A": { testCodeRef: "cellA", refProductId: "1458" },
        "Anti-H": { testCodeRef: "AntiH", refProductId: "1469" },
        "Anti-D": { testCodeRef: "AntiD", refProductId: "1462" },
        "Anti-AB": { testCodeRef: "CtrlAB", refProductId: "1461" },
        "Anti-B": { testCodeRef: "AntiB", refProductId: "1460" },
        "Anti-A": { testCodeRef: "AntiA", refProductId: "1459" },
    };

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
            throw new Error("specimen_id is required");
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
                const resultItemDesc = det.result_item_desc;
                let testCodeRef = null;

                if (testCodedet === "BB13" || testCodedet === "BB15") {
                    if (resultItemCode === "IDCT") {
                        const mapping = idctMap[resultItemDesc];
                        if (mapping) {
                            testCodeRef = mapping.testCodeRef || null;
                        }
                    } else if (testCodedet === "BB15" && resultItemCode === "ABORH") {
                        const mapping = aborhMap[resultItemDesc];
                        if (mapping) {
                            testCodeRef = mapping.testCodeRef || null;
                        }
                    } else {
                        // get ref product from DB
                        const [refProductData]: any = await pool.query(
                            "SELECT * FROM ref_product WHERE result_item_code = ?",
                            [resultItemCode]
                        );
                        testCodeRef = refProductData[0]?.test_code || null;
                    }
                }

                console.log("Test Code Ref:", testCodeRef);

                if (testCodeRef && testCodeRef !== "" && testCodeRef !== 'NULL') {

                    // get mac data
                    const [rows]: any = await pool.query(
                        "SELECT * FROM mac_tempres_in WHERE analyzer_test_id = ? AND specimen_id = ? AND read_flag = 0 LIMIT 1",
                        [testCodeRef, specimenId]
                    );

                    console.log("Test Code Ref:", testCodeRef, specimenId, rows);
                    if (rows.length > 0) {
                        macData = rows;
                        break; // stop looping
                    } else {
                        return {
                            status: "no_result",
                            message: `No MAC data found for specimen_id : ${specimenId}`,
                        }
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
                const resultItemDesc = detlist.result_item_desc;

                let testCodeRef = null;
                let refProductId = null;

                if (testCodedet === "BB13" || testCodedet === "BB15") {
                    if (resultItemCode === "IDCT") {
                        const mapping = idctMap[resultItemDesc];
                        if (mapping) {
                            testCodeRef = mapping.testCodeRef;
                            refProductId = mapping.refProductId;
                        }
                    } else if (testCodedet === "BB15" && resultItemCode === "ABORH") {
                        const mapping = aborhMap[resultItemDesc];
                        if (mapping) {
                            testCodeRef = mapping.testCodeRef;
                            refProductId = mapping.refProductId;
                        }
                    } else {

                        const [refProductData]: any = await pool.query(
                            "SELECT * FROM ref_product WHERE result_item_code = ?",
                            [resultItemCode]
                        );

                        testCodeRef = refProductData[0]?.test_code;
                        refProductId = refProductData[0]?.ref_product_id;
                    }
                }

                macInData = await pool.query(
                    "SELECT * FROM mac_tempres_in WHERE analyzer_test_id = ? and specimen_id = ? and read_flag = 0 limit 1",
                    [testCodeRef, specimenId]
                );

                const result = macInData[0][0]?.data_result;
                console.log("Result:", result, resultItemDesc, testCodeRef, refProductId);

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
                        null,
                        null,
                        null
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
                        range: null,
                        unit: null,
                        abnormality: null,
                        test_code: requestdetData[0]?.test_code,
                        test_desc: requestdetData[0]?.test_desc,

                        out_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
                    },
                    { autoCommit: true }
                );
            }

        }


        return {
            test_code: requestdetData[0]?.test_code,
            status: "success"
        };
    } catch (error: any) {
        console.error("Error in handleResultIh500:", error);
        throw new Error(error.message || "Failed to handle Ih500 result");
    }
}
