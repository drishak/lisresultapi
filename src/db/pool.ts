import mysql from "serverless-mysql";

const pool = mysql({
  config: {
   // timezone: 'UTC+8',
    // dateStrings: [
    //     'DATE',
    //     'DATETIME'
    // ],
    host: "103.161.132.177",
    // host: "127.0.0.1",
    user: "root",
    password: "RayaTech@123",
    port: 13306,
    database: "emrai",
  },
});

export { pool };
