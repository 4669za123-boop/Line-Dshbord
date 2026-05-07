const base = import.meta.env.BASE_URL;

export default function Slide1Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0d0d0d" }}>
      <img
        src={`${base}hero-bg.png`}
        crossOrigin="anonymous"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.45 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.85) 50%, rgba(0,185,0,0.08) 100%)" }}
      />

      <div className="absolute inset-0 flex flex-col justify-center" style={{ paddingLeft: "7vw", paddingRight: "7vw" }}>
        <div
          style={{
            width: "5vw",
            height: "0.35vh",
            background: "#00b900",
            marginBottom: "3vh",
          }}
        />

        <p
          className="font-body"
          style={{
            fontSize: "2vw",
            fontWeight: 500,
            color: "#00b900",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: "2vh",
          }}
        >
          LINE OA · Management System
        </p>

        <h1
          className="font-display"
          style={{
            fontSize: "6.5vw",
            fontWeight: 700,
            color: "#f0f0f0",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textWrap: "balance",
            marginBottom: "1.5vh",
          }}
        >
          LINE Management
        </h1>
        <h1
          className="font-display"
          style={{
            fontSize: "6.5vw",
            fontWeight: 700,
            color: "#00b900",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            textWrap: "balance",
            marginBottom: "4vh",
          }}
        >
          Dashboard
        </h1>

        <h2
          className="font-body"
          style={{
            fontSize: "2.5vw",
            fontWeight: 500,
            color: "#cccccc",
            marginBottom: "1.5vh",
            textWrap: "pretty",
          }}
        >
          แดชบอร์ดจัดการบัญชีไลน์
        </h2>

        <p
          className="font-body"
          style={{
            fontSize: "2vw",
            fontWeight: 400,
            color: "#888888",
            maxWidth: "48vw",
            lineHeight: 1.6,
            textWrap: "pretty",
          }}
        >
          ระบบกลางสำหรับติดตามและจัดการบัญชี LINE OA ข้ามหลายเว็บไซต์ในที่เดียว
        </p>
      </div>

      <div
        className="absolute"
        style={{
          right: "7vw",
          bottom: "5vh",
          width: "1.5px",
          height: "12vh",
          background: "linear-gradient(to bottom, #00b900, transparent)",
        }}
      />
      <p
        className="absolute font-display"
        style={{
          right: "8vw",
          bottom: "4vh",
          fontSize: "1.5vw",
          color: "#555555",
          letterSpacing: "0.1em",
        }}
      >
        2026
      </p>
    </div>
  );
}
