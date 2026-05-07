export default function Slide4StatusMonitoring() {
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
          inset: 0,
          display: "flex",
          flexDirection: "column",
          padding: "8vh 7vw 7vh",
        }}
      >
        <div style={{ marginBottom: "4vh" }}>
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
            ติดตามสถานะ · Status Monitoring
          </p>
          <h2
            className="font-display"
            style={{
              fontSize: "4vw",
              fontWeight: 700,
              color: "#f0f0f0",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            มองเห็นสถานะบัญชีทุกตัวแบบ Real-time
          </h2>
        </div>

        <div style={{ display: "flex", gap: "3vw", marginBottom: "4vh" }}>
          <div
            style={{
              flex: 1,
              background: "#111111",
              borderRadius: "0.8vw",
              padding: "3vh 3vw",
              textAlign: "center",
              border: "1px solid #222222",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "9vw",
                fontWeight: 700,
                color: "#f0f0f0",
                lineHeight: 1,
                marginBottom: "1.5vh",
              }}
            >
              24
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 500, color: "#888888" }}
            >
              บัญชีทั้งหมด
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "#0a1a0a",
              borderRadius: "0.8vw",
              padding: "3vh 3vw",
              textAlign: "center",
              border: "1px solid #00b90033",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "9vw",
                fontWeight: 700,
                color: "#00b900",
                lineHeight: 1,
                marginBottom: "1.5vh",
              }}
            >
              19
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 500, color: "#00b900" }}
            >
              ออนไลน์
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "#1a0d0d",
              borderRadius: "0.8vw",
              padding: "3vh 3vw",
              textAlign: "center",
              border: "1px solid #cc333322",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "9vw",
                fontWeight: 700,
                color: "#cc3333",
                lineHeight: 1,
                marginBottom: "1.5vh",
              }}
            >
              5
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 500, color: "#cc3333" }}
            >
              โดนระงับ
            </p>
          </div>
        </div>

        <p
          className="font-body"
          style={{
            fontSize: "2vw",
            fontWeight: 400,
            color: "#555555",
            textAlign: "center",
          }}
        >
          Instant visibility — active, suspended, and totals per site · จัดกลุ่มตามเว็บ พร้อม link ตรงไปที่เว็บนั้น
        </p>
      </div>
    </div>
  );
}
