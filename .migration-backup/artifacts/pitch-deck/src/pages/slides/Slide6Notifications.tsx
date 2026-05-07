export default function Slide6Notifications() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0d0d0d" }}
    >
      <div
        className="absolute"
        style={{
          top: 0,
          right: 0,
          width: "35vw",
          height: "35vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,185,0,0.06) 0%, transparent 70%)",
          transform: "translate(10vw, -10vw)",
          pointerEvents: "none",
        }}
      />
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
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 7vw",
          gap: "8vw",
        }}
      >
        <div style={{ flex: "0 0 42vw" }}>
          <p
            className="font-display"
            style={{
              fontSize: "1.6vw",
              fontWeight: 500,
              color: "#00b900",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "2vh",
            }}
          >
            ตั้งเวลาแจ้งเตือน · Notification Schedule
          </p>
          <h2
            className="font-display"
            style={{
              fontSize: "4.2vw",
              fontWeight: 700,
              color: "#f0f0f0",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "1.5vh",
              textWrap: "balance",
            }}
          >
            ตั้งเวลาการแจ้งเตือน
          </h2>
          <h2
            className="font-display"
            style={{
              fontSize: "4.2vw",
              fontWeight: 700,
              color: "#00b900",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "3vh",
            }}
          >
            ตามโซนเวลากรุงเทพฯ
          </h2>
          <div style={{ width: "4vw", height: "0.3vh", background: "#00b900", marginBottom: "3vh" }} />
          <p
            className="font-body"
            style={{
              fontSize: "2vw",
              fontWeight: 400,
              color: "#888888",
              lineHeight: 1.6,
            }}
          >
            Configure daily alert windows in Bangkok time — built for 24/7 operations.
          </p>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          <div
            style={{
              background: "#181818",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #222222",
            }}
          >
            <div>
              <p className="font-body" style={{ fontSize: "2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "0.5vh" }}>
                กำหนดช่วงเวลาได้หลายรอบ
              </p>
              <p className="font-body" style={{ fontSize: "1.8vw", color: "#555555" }}>Multiple windows per day</p>
            </div>
            <div
              style={{
                width: "1.5vw",
                height: "1.5vw",
                borderRadius: "50%",
                background: "#00b900",
              }}
            />
          </div>

          <div
            style={{
              background: "#181818",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #222222",
            }}
          >
            <div>
              <p className="font-body" style={{ fontSize: "2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "0.5vh" }}>
                บันทึกการตั้งค่าแบบถาวร
              </p>
              <p className="font-body" style={{ fontSize: "1.8vw", color: "#555555" }}>Persistent settings</p>
            </div>
            <div
              style={{
                width: "1.5vw",
                height: "1.5vw",
                borderRadius: "50%",
                background: "#00b900",
              }}
            />
          </div>

          <div
            style={{
              background: "#181818",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #222222",
            }}
          >
            <div>
              <p className="font-body" style={{ fontSize: "2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "0.5vh" }}>
                ออกแบบสำหรับการดำเนินงาน 24/7
              </p>
              <p className="font-body" style={{ fontSize: "1.8vw", color: "#555555" }}>Designed for 24/7 operations</p>
            </div>
            <div
              style={{
                width: "1.5vw",
                height: "1.5vw",
                borderRadius: "50%",
                background: "#00b900",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
