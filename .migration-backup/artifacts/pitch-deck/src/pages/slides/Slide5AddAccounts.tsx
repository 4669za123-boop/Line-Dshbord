export default function Slide5AddAccounts() {
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
          background: "linear-gradient(to right, transparent, #00b900, transparent)",
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
        <div style={{ marginBottom: "4.5vh" }}>
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
            เพิ่มบัญชีไลน์ · Add LINE Accounts
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
            เพิ่มบัญชีไลน์ใหม่ใน 3 ขั้นตอน
          </h2>
        </div>

        <div style={{ display: "flex", gap: "3vw", alignItems: "stretch" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: "6vw",
                height: "6vw",
                borderRadius: "50%",
                background: "#00b900",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "3vh",
                flexShrink: 0,
              }}
            >
              <span
                className="font-display"
                style={{ fontSize: "2.5vw", fontWeight: 700, color: "#0d0d0d" }}
              >
                1
              </span>
            </div>
            <div
              style={{
                background: "#181818",
                borderRadius: "0.8vw",
                padding: "3.5vh 2.5vw",
                width: "100%",
                flex: 1,
                textAlign: "center",
              }}
            >
              <p
                className="font-body"
                style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "1.5vh" }}
              >
                ระบุ LINE ID หรือ URL
              </p>
              <p
                className="font-body"
                style={{ fontSize: "1.8vw", fontWeight: 400, color: "#555555" }}
              >
                Enter LINE ID or URL
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingTop: "3vh",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "3vw",
                height: "0.2vh",
                background: "linear-gradient(to right, #00b900, #00b90055)",
              }}
            />
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: "6vw",
                height: "6vw",
                borderRadius: "50%",
                background: "#181818",
                border: "0.2vw solid #00b900",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "3vh",
                flexShrink: 0,
              }}
            >
              <span
                className="font-display"
                style={{ fontSize: "2.5vw", fontWeight: 700, color: "#00b900" }}
              >
                2
              </span>
            </div>
            <div
              style={{
                background: "#181818",
                borderRadius: "0.8vw",
                padding: "3.5vh 2.5vw",
                width: "100%",
                flex: 1,
                textAlign: "center",
              }}
            >
              <p
                className="font-body"
                style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "1.5vh" }}
              >
                เลือกเว็บไซต์
              </p>
              <p
                className="font-body"
                style={{ fontSize: "1.8vw", fontWeight: 400, color: "#555555" }}
              >
                Select linked website
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingTop: "3vh",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "3vw",
                height: "0.2vh",
                background: "linear-gradient(to right, #00b90055, #00b900)",
              }}
            />
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: "6vw",
                height: "6vw",
                borderRadius: "50%",
                background: "#181818",
                border: "0.2vw solid #00b900",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "3vh",
                flexShrink: 0,
              }}
            >
              <span
                className="font-display"
                style={{ fontSize: "2.5vw", fontWeight: 700, color: "#00b900" }}
              >
                3
              </span>
            </div>
            <div
              style={{
                background: "#181818",
                borderRadius: "0.8vw",
                padding: "3.5vh 2.5vw",
                width: "100%",
                flex: 1,
                textAlign: "center",
              }}
            >
              <p
                className="font-body"
                style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "1.5vh" }}
              >
                กำหนดบทบาท
              </p>
              <p
                className="font-body"
                style={{ fontSize: "1.8vw", fontWeight: 400, color: "#555555" }}
              >
                หลัก หรือ ฝากถอน
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
