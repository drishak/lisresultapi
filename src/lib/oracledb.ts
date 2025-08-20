import oracledb from "oracledb";

export async function getOracleConnection() {
    const connection = await oracledb.getConnection({
        // user: "system",
        // password: "MyPassword123",
        // connectString: "192.168.151.190:1521/FREEPDB1",
         user: "gev",
        password: "gev2025!",
        connectString: "192.168.199.227:1521/his",
    });

    // Set schema for this session
    // await connection.execute(`ALTER SESSION SET CURRENT_SCHEMA = LAB_PRODB`);
     await connection.execute(`ALTER SESSION SET CURRENT_SCHEMA = HIS`);

    return connection;
}