import mysql from "mysql2/promise";

export const pool = mysql.createPool({
    host: "192.168.151.190",
    user: "root",
    password: "rootpass",
    database: "iirt",
    port: 3306,
});