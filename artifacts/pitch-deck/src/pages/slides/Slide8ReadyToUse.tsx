const base = import.meta.env.BASE_URL;

export default function Slide8ReadyToUse() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d0d0d" }}>
      <img
        src={`${base}hero-bg.png`}
        crossOrigin="anonymous"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.15 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 40%, rgba(0,0,0,0.7) 100%)" }}
      />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ padding: "0 7vw" }}
      >
        <div
          style={{
            width: "5vw",
            height: "0.35vh",
            background: "#00b900",
            marginBottom: "3vh",
          }}
        />

        <p
          className="font-display"
          style={{
            fontSize: "1.6vw",
            fontWeight: 500,
            color: "#00b900",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "2.5vh",
            textAlign: "center",
          }}
        >
          พร้อมใช้งาน · Ready to Use
        </p>

        <h2
          className="font-display"
          style={{
            fontSize: "6vw",
            fontWeight: 700,
            color: "#f0f0f0",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginBottom: "1vh",
            textAlign: "center",
            textWrap: "balance",
          }}
        >
          ติดตั้งง่าย
        </h2>
        <h2
          className="font-display"
          style={{
            fontSize: "6vw",
            fontWeight: 700,
            color: "#00b900",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginBottom: "5vh",
            textAlign: "center",
          }}
        >
          ใช้ได้ทันที
        </h2>

        <div style={{ display: "flex", gap: "3vw", marginBottom: "5vh" }}>
          <div style={{ textAlign: "center" }}>
            <p className="font-body" style={{ fontSize: "2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "0.5vh" }}>
              ไม่ต้องตั้งค่าฐานข้อมูลซับซ้อน
            </p>
            <p className="font-body" style={{ fontSize: "1.8vw", fontWeight: 400, color: "#555555" }}>
              No complex database setup
            </p>
          </div>
          <div style={{ width: "0.2vw", background: "#222222" }} />
          <div style={{ textAlign: "center" }}>
            <p className="font-body" style={{ fontSize: "2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "0.5vh" }}>
              รองรับภาษาไทย
            </p>
            <p className="font-body" style={{ fontSize: "1.8vw", fontWeight: 400, color: "#555555" }}>
              Thai-first UI design
            </p>
          </div>
          <div style={{ width: "0.2vw", background: "#222222" }} />
          <div style={{ textAlign: "center" }}>
            <p className="font-body" style={{ fontSize: "2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "0.5vh" }}>
              Dark mode ทั้งระบบ
            </p>
            <p className="font-body" style={{ fontSize: "1.8vw", fontWeight: 400, color: "#555555" }}>
              Dark mode throughout
            </p>
          </div>
        </div>

        <div
          style={{
            width: "5vw",
            height: "0.35vh",
            background: "linear-gradient(to right, transparent, #00b900, transparent)",
          }}
        />
      </div>

      <p
        className="absolute font-display"
        style={{
          bottom: "4vh",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "1.5vw",
          color: "#333333",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}
      >
        LINE Management Dashboard · 2026
      </p>
    </div>
  );
}
