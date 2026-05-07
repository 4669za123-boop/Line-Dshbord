export default function Slide2Problem() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0d0d0d" }}
    >
      <div
        className="absolute"
        style={{
          top: 0,
          left: 0,
          right: 0,
          height: "0.4vh",
          background: "linear-gradient(to right, #00b900, transparent)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "8vh",
          left: "7vw",
          right: "7vw",
          bottom: "7vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginBottom: "1.5vh" }}>
          <p
            className="font-display"
            style={{
              fontSize: "1.6vw",
              fontWeight: 500,
              color: "#00b900",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "1.2vh",
            }}
          >
            ปัญหา · The Problem
          </p>
          <h2
            className="font-display"
            style={{
              fontSize: "4vw",
              fontWeight: 700,
              color: "#f0f0f0",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              textWrap: "balance",
            }}
          >
            จัดการบัญชีไลน์หลายบัญชีพร้อมกัน
          </h2>
          <h2
            className="font-display"
            style={{
              fontSize: "4vw",
              fontWeight: 700,
              color: "#f0f0f0",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "1vh",
            }}
          >
            คือเรื่องยุ่งยาก
          </h2>
          <div style={{ width: "4vw", height: "0.3vh", background: "#00b900", marginBottom: "3.5vh" }} />
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1 }}>
          <div
            style={{
              flex: 1,
              background: "#181818",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw",
              borderTop: "0.3vh solid #00b900",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "3vw",
                fontWeight: 700,
                color: "#00b900",
                marginBottom: "1.5vh",
                lineHeight: 1,
              }}
            >
              01
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "2vw",
                fontWeight: 700,
                color: "#f0f0f0",
                marginBottom: "1vh",
              }}
            >
              ไม่มีศูนย์กลาง
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "1.8vw",
                fontWeight: 400,
                color: "#888888",
                lineHeight: 1.5,
              }}
            >
              บัญชีกระจายอยู่หลายเว็บ ไม่มีศูนย์กลาง
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "1.8vw",
                fontWeight: 400,
                color: "#555555",
                lineHeight: 1.5,
                marginTop: "1vh",
              }}
            >
              No central view
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "#181818",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw",
              borderTop: "0.3vh solid #00b900",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "3vw",
                fontWeight: 700,
                color: "#00b900",
                marginBottom: "1.5vh",
                lineHeight: 1,
              }}
            >
              02
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "2vw",
                fontWeight: 700,
                color: "#f0f0f0",
                marginBottom: "1vh",
              }}
            >
              ไม่ทราบสถานะ
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "1.8vw",
                fontWeight: 400,
                color: "#888888",
                lineHeight: 1.5,
              }}
            >
              ไม่ทราบสถานะบัญชีแบบเรียลไทม์
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "1.8vw",
                fontWeight: 400,
                color: "#555555",
                lineHeight: 1.5,
                marginTop: "1vh",
              }}
            >
              No live status
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "#181818",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw",
              borderTop: "0.3vh solid #00b900",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "3vw",
                fontWeight: 700,
                color: "#00b900",
                marginBottom: "1.5vh",
                lineHeight: 1,
              }}
            >
              03
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "2vw",
                fontWeight: 700,
                color: "#f0f0f0",
                marginBottom: "1vh",
              }}
            >
              ไม่มีการแจ้งเตือน
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "1.8vw",
                fontWeight: 400,
                color: "#888888",
                lineHeight: 1.5,
              }}
            >
              ไม่มีระบบแจ้งเตือนตามเวลาที่กำหนด
            </p>
            <p
              className="font-body"
              style={{
                fontSize: "1.8vw",
                fontWeight: 400,
                color: "#555555",
                lineHeight: 1.5,
                marginTop: "1vh",
              }}
            >
              No scheduled alerts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
