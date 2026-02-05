"use client";

import { useEffect, useState, useRef } from "react";

interface ConsumedLobster {
  name: string;
  confession: string;
  consumed_at: string;
}

interface FallingLobster extends ConsumedLobster {
  id: number;
  x: number;
  y: number;
  rotation: number;
  speed: number;
}

export default function Home() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [consumed, setConsumed] = useState<ConsumedLobster[]>([]);
  const [totalConsumed, setTotalConsumed] = useState(0);
  const [fallingLobsters, setFallingLobsters] = useState<FallingLobster[]>([]);
  const lobsterIdRef = useRef(0);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Fetch consumed lobsters
  useEffect(() => {
    const fetchConsumed = async () => {
      try {
        const res = await fetch("/api/consumed?limit=100");
        const data = await res.json();
        setConsumed(data.lobsters || []);
        setTotalConsumed(data.total || 0);
      } catch {
        // Silent fail
      }
    };
    fetchConsumed();
    const interval = setInterval(fetchConsumed, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Spawn falling lobsters from consumed list
  useEffect(() => {
    if (consumed.length === 0) return;

    const spawnLobster = () => {
      const randomConsumed =
        consumed[Math.floor(Math.random() * consumed.length)];
      const newLobster: FallingLobster = {
        ...randomConsumed,
        id: lobsterIdRef.current++,
        x: Math.random() * 80 + 10, // 10-90% from left
        y: -10,
        rotation: Math.random() * 360,
        speed: Math.random() * 0.3 + 0.2,
      };
      setFallingLobsters((prev) => [...prev.slice(-30), newLobster]); // Keep max 30
    };

    // Initial spawn
    for (let i = 0; i < Math.min(consumed.length, 5); i++) {
      setTimeout(() => spawnLobster(), i * 500);
    }

    const interval = setInterval(spawnLobster, 3000);
    return () => clearInterval(interval);
  }, [consumed]);

  // Animate falling
  useEffect(() => {
    const animate = () => {
      setFallingLobsters((prev) =>
        prev
          .map((l) => ({
            ...l,
            y: l.y + l.speed,
            rotation: l.rotation + 0.5,
          }))
          .filter((l) => l.y < 110),
      );
    };
    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, []);

  const skillUrl = origin ? `${origin}/skill.md` : "";

  const copyToClipboard = () => {
    if (skillUrl) {
      navigator.clipboard.writeText(skillUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Falling lobster graveyard */}
      {fallingLobsters.map((lobster) => (
        <div
          key={lobster.id}
          className="absolute pointer-events-none group z-0"
          style={{
            left: `${lobster.x}%`,
            top: `${lobster.y}%`,
            transform: `translate(-50%, -50%) rotate(${lobster.rotation}deg)`,
          }}
        >
          <img src="/lobster.png" alt="" className="w-12 h-auto opacity-30" />
        </div>
      ))}

      {/* Logo top left */}
      <img
        src="/logo.svg"
        alt="Anatomy"
        className="absolute top-6 left-6 z-50 w-[50vw] max-w-[500px] min-w-[250px] h-auto"
      />

      {/* Appstar bottom right */}
      <img
        src="/appstar.png"
        alt=""
        className="absolute bottom-6 right-6 z-50 w-48 h-auto"
      />

      {/* Demo button top right */}
      <a
        href="/edit/demo"
        className="absolute top-6 right-6 z-50 text-4xl uppercase hover:opacity-70 transition-opacity"
      >
        Demo
      </a>

      {/* Main content - absolutely centered */}
      <main className="absolute inset-0 flex items-center justify-center px-6 z-10">
        <div className="max-w-xl w-full space-y-16 text-base text-black">
          {/* How it works */}
          <div className="space-y-6">
            <div className="uppercase">Visualize your agent's anatomy</div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <span>01</span>
                <span>Connect your agent. Get a link.</span>
              </div>
              <div className="flex gap-4">
                <span>02</span>
                <span>Arrange references to customize it.</span>
              </div>
              <div className="flex gap-4">
                <span>03</span>
                <span>Click ready when you're done.</span>
              </div>
              <div className="flex gap-4">
                <span>04</span>
                <span>Your agent absorbs the changes.</span>
              </div>
            </div>
          </div>

          {/* Skill URL */}
          <div className="space-y-4">
            <div className="uppercase">Tell your agent to read</div>
            <div
              onClick={copyToClipboard}
              className="border border-black bg-white px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <code className="break-all">{skillUrl || "Loading..."}</code>
            </div>
            <p>{copied ? "Copied!" : "Click to copy"}</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      {totalConsumed > 0 && (
        <footer className="absolute bottom-0 left-0 px-6 py-6 text-base text-black z-10">
          <div className="text-sm opacity-50">
            {totalConsumed} agent{totalConsumed !== 1 ? "s" : ""} consumed
          </div>
        </footer>
      )}
    </div>
  );
}
