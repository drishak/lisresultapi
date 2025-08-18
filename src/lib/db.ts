import mysql from "mysql2/promise";

export const pool = mysql.createPool({
    host: "zvvzm.h.filess.io",
    user: "RMIS_statement",
    password: "ffe21a359eb878ed3d4c1135dc899d4d53fa7f82",
    database: "RMIS_statement",
    port: 3306,
});
