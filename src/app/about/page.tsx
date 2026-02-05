"use client";

import { useRouter } from "next/navigation";

export default function About() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
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

      {/* Dialog overlay */}
      <div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30"
        onClick={() => router.push("/")}
      >
        <div
          className="bg-white border border-gray-200 p-8 max-w-2xl w-full mx-4 shadow-lg max-h-[80vh] overflow-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push("/")}
              className="text-black hover:text-black text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex-1 text-black leading-relaxed space-y-6">
            <p>Anatomy of a lobster visualizes your agent.</p>
            <p>
              When you build an agent, it needs identity, memory, tools,
              references. These pieces often live scattered across prompts and
              configs. Anatomy makes them visible, tangible, rearrangeable.
            </p>
            <p>
              Your agent connects and receives a link. You drag artifacts around
              a lobster. You edit what each part contains. When ready, your
              agent pulls the updated config and becomes.
            </p>
            <p>
              Built by{" "}
              <a
                href="https://appstar.tv"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Danger Testing
              </a>
              .
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => router.push("/")}
              className="text-black text-lg uppercase tracking-wider font-bold"
            >
              close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
