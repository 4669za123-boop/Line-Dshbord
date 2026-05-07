export default function Slide3Solution() {
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
            วิธีแก้ปัญหา · The Solution
          </p>
          <h2
            className="font-display"
            style={{
              fontSize: "4.5vw",
              fontWeight: 700,
              color: "#f0f0f0",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              textWrap: "balance",
              marginBottom: "1vh",
            }}
          >
            แดชบอร์ดเดียว
          </h2>
          <h2
            className="font-display"
            style={{
              fontSize: "4.5vw",
              fontWeight: 700,
              color: "#00b900",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "2.5vh",
            }}
          >
            ที่รวมทุกอย่าง
          </h2>
          <div style={{ width: "4vw", height: "0.3vh", background: "#00b900", marginBottom: "3vh" }} />
          <p
            className="font-body"
            style={{
              fontSize: "2vw",
              fontWeight: 400,
              color: "#888888",
              lineHeight: 1.6,
              textWrap: "pretty",
            }}
          >
            One dashboard — grouped by site and role, with instant status visibility.
          </p>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          <div
            style={{
              background: "#181818",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw",
              display: "flex",
              alignItems: "center",
              gap: "2vw",
            }}
          >
            <div
              style={{
                width: "0.4vw",
                height: "6vh",
                background: "#00b900",
                borderRadius: "0.2vw",
                flexShrink: 0,
              }}
            />
            <div>
              <p
                className="font-body"
                style={{ fontSize: "2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "0.5vh" }}
              >
                มองเห็นสถานะทุกบัญชีได้ทันที
              </p>
              <p
                className="font-body"
                style={{ fontSize: "1.8vw", fontWeight: 400, color: "#555555" }}
              >
                Instant status for every account
              </p>
            </div>
          </div>

          <div
            style={{
              background: "#181818",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw",
              display: "flex",
              alignItems: "center",
              gap: "2vw",
            }}
          >
            <div
              style={{
                width: "0.4vw",
                height: "6vh",
                background: "#00b900",
                borderRadius: "0.2vw",
                flexShrink: 0,
              }}
            />
            <div>
              <p
                className="font-body"
                style={{ fontSize: "2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "0.5vh" }}
              >
                จัดกลุ่มตามเว็บไซต์และบทบาท
              </p>
              <p
                className="font-body"
                style={{ fontSize: "1.8vw", fontWeight: 400, color: "#555555" }}
              >
                Grouped by site &amp; role (หลัก / ฝากถอน)
              </p>
            </div>
          </div>

          <div
            style={{
              background: "#181818",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw",
              display: "flex",
              alignItems: "center",
              gap: "2vw",
            }}
          >
            <div
              style={{
                width: "0.4vw",
                height: "6vh",
                background: "#00b900",
                borderRadius: "0.2vw",
                flexShrink: 0,
              }}
            />
            <div>
              <p
                className="font-body"
                style={{ fontSize: "2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "0.5vh" }}
              >
                เพิ่ม ลบ และจัดการบัญชีได้ง่าย
              </p>
              <p
                className="font-body"
                style={{ fontSize: "1.8vw", fontWeight: 400, color: "#555555" }}
              >
                Add, remove, and manage accounts easily
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
