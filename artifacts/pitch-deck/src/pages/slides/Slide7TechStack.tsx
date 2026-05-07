export default function Slide7TechStack() {
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
            เทคโนโลยี · Tech Stack
          </p>
          <h2
            className="font-display"
            style={{
              fontSize: "4vw",
              fontWeight: 700,
              color: "#f0f0f0",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              marginBottom: "0.5vh",
            }}
          >
            สร้างด้วย Modern Web Stack
          </h2>
        </div>

        <div style={{ display: "flex", gap: "2.5vw", flex: 1 }}>
          <div
            style={{
              flex: 1,
              background: "#111111",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw",
              borderLeft: "0.4vw solid #00b900",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "1.5vw",
                fontWeight: 500,
                color: "#00b900",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "2vh",
              }}
            >
              Frontend
            </p>
            <p
              className="font-display"
              style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "1vh" }}
            >
              React 19 + Vite
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 400, color: "#888888", marginBottom: "0.8vh" }}
            >
              Tailwind CSS v4
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 400, color: "#888888" }}
            >
              TypeScript
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111111",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw",
              borderLeft: "0.4vw solid #00b900",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "1.5vw",
                fontWeight: 500,
                color: "#00b900",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "2vh",
              }}
            >
              Backend
            </p>
            <p
              className="font-display"
              style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "1vh" }}
            >
              Express 5
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 400, color: "#888888", marginBottom: "0.8vh" }}
            >
              Node.js 24
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 400, color: "#888888" }}
            >
              TypeScript
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111111",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw",
              borderLeft: "0.4vw solid #00b900",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "1.5vw",
                fontWeight: 500,
                color: "#00b900",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "2vh",
              }}
            >
              ข้อมูล · Data
            </p>
            <p
              className="font-display"
              style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "1vh" }}
            >
              JSON Server
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 400, color: "#888888", marginBottom: "0.8vh" }}
            >
              Server-persisted
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 400, color: "#888888" }}
            >
              localStorage
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "#111111",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw",
              borderLeft: "0.4vw solid #00b900",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <p
              className="font-display"
              style={{
                fontSize: "1.5vw",
                fontWeight: 500,
                color: "#00b900",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "2vh",
              }}
            >
              Deploy
            </p>
            <p
              className="font-display"
              style={{ fontSize: "2.2vw", fontWeight: 700, color: "#f0f0f0", marginBottom: "1vh" }}
            >
              Replit
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 400, color: "#888888", marginBottom: "0.8vh" }}
            >
              pnpm workspace
            </p>
            <p
              className="font-body"
              style={{ fontSize: "2vw", fontWeight: 400, color: "#888888" }}
            >
              Monorepo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
