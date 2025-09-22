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
import { handleResultCobas } from "@/lib/endokrinologi/resultCobas";
import { handleResultIds } from "@/lib/endokrinologi/resultIds";
import { handleResultAlinity } from "@/lib/patology/resultAlinity";
import { handleResultStarmax } from "@/lib/hemostasis/resultStarmax";
import { handleResultPhadia } from "@/lib/hemostasis/resultPhadia";

export async function POST(request: NextRequest) {

    const upkAlinityCodes = ["UPK249", "UPK248", "UPK246", "UPK247", "UPK61", "UPK94", "UPK93", "UPK39", "UPK89", "UPK79", "UPK32", "UPK129", "UPK134", "UPK29", "UPK132", "UPK133", "UPK37"];
    const uhkStarmaxCodes = ["UHK01", "UHK02", "UHK03", "UHK04", "UHK08", "UHK09", "UHK12", "UHK17", "UHK18", "UHK19", "UHK20", "UHK21"];

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
                else if (["HEMA1", "HEMA2", "HEMA6", "HEMA7", "HEMA8", "HEMA9", "HEMA27"].includes(testCode)) res = await handleResultStago(det);
                else if (["UPK43", "UPK51"].includes(testCode)) res = await handleResultOsmo(det);
                else if (testCode === "UPK69") res = await handleResultUrit(det);
                else if (testCode === "UPK63") res = await handleResultSebia(det);
                else if (["UKT01"].includes(testCode)) res = await handleResultBiosensor(det);
                else if (["UKT04", "UKT05"].includes(testCode)) res = await handleResultDiagcore(det);
                else if (["ENDO3", "ENDO4", "ENDO5", "ENDO6", "ENDO8", "ENDO9", "ENDO11", "ENDO12", "ENDO13", "ENDO14"].includes(testCode)) res = await handleResultCobas(det);//Cobas
                else if (["ENDO1", "ENDO2", "ENDO7", "ENDO10", "ENDO34", "ENDO35", "ENDO36", "ENDO37"].includes(testCode)) res = await handleResultIds(det);//IDS
                else if (upkAlinityCodes.includes(testCode)) { res = await handleResultAlinity(det); }
                else if (uhkStarmaxCodes.includes(testCode)) { res = await handleResultStarmax(det); }
                else if (["UHK13", "UHK14", "UHK15", "UHK16"].includes(testCode)) res = await handleResultPhadia(det);

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
