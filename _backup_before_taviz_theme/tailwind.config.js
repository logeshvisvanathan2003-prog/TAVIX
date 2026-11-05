export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {
    colors: { tavix: { red: "#E10600", deep: "#8A0000", ink: "#0A0A0A", paper: "#FFFFFF" } },
    fontFamily: { display: ["Michroma", "sans-serif"], body: ["Rajdhani", "sans-serif"] },
    keyframes: {
      wingL: { from: { transform: "translate(-60px,-30px) skewX(20deg)", opacity: 0 }, to: { transform: "none", opacity: 1 } },
      wingR: { from: { transform: "translate(60px,-30px) skewX(-20deg)", opacity: 0 }, to: { transform: "none", opacity: 1 } },
      scan: { from: { transform: "translateY(-100%)" }, to: { transform: "translateY(100%)" } },
      feed: { from: { transform: "translateY(0)" }, to: { transform: "translateY(-50%)" } },
      pulseRing: { "0%": { transform: "scale(.8)", opacity: .8 }, "100%": { transform: "scale(2)", opacity: 0 } },
      pop: { "0%": { transform: "scale(.6)", opacity: 0 }, "60%": { transform: "scale(1.1)" }, "100%": { transform: "scale(1)", opacity: 1 } },
    },
    animation: { wingL: "wingL 1s cubic-bezier(.2,.8,.2,1) both", wingR: "wingR 1s cubic-bezier(.2,.8,.2,1) both",
      scan: "scan 4s linear infinite", feed: "feed 40s linear infinite", pulseRing: "pulseRing 2s ease-out infinite", pop: "pop .5s ease-out both" },
  } },
  plugins: [],
};
