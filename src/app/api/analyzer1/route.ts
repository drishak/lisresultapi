// app/api/uploadBase64Pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import {pool} from "db/pool";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ✅ Handle CORS preflight request
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // const { patient, order_id, order_date } = body;

    // if (!base64 || !order_id) {
    //   return NextResponse.json(
    //     { message: "Missing base64 or filename" },
    //     { status: 400 }
    //   );
    // }

    const runmaster: any = body.runmaster || {};


    console.log("Received runmaster body:", runmaster);


  const sql_sp = `CALL clinical_note_getbyencounter(?,?,?)`;
    const userid: string = body.userid;
    const patientid: number = body.patientid;
    const encounterid: number = body.encounterid;
    const data = [userid, patientid, encounterid];    
    //console.error("Ni dalam new api");
    // Execute a query
    const results: any[] = await pool.query(sql_sp, data);
    if(results[0].length>0){
      return respond.status(200).json(results[0]);
    }else{
      return respond.status(200).json({message: "tiada data"});
    }
    





    return NextResponse.json(
      {
        message: "PDF uploaded",
        filePath: runmaster,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Upload failed",
        error: error.message,
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
