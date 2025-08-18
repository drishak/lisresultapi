import oracledb from "oracledb";

export async function getOracleConnection() {
    const connection = await oracledb.getConnection({
        user: "system",
        password: "MyPassword123",
        connectString: "192.168.151.190:1521/FREEPDB1",
    });

    // Set schema for this session
    await connection.execute(`ALTER SESSION SET CURRENT_SCHEMA = LAB_PRODB`);

    return connection;
}