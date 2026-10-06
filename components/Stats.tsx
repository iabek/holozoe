type StatsProps = {
  stats: {
    Energy: number;
    Focus: number;
    Growth: number;
  };

  mood: {
    emoji: string;
    label: string;
  };
};

const statInfo = [
  {
    name: "Energy",
    icon: "⚡",
  },
  {
    name: "Focus",
    icon: "🎯",
  },
  {
    name: "Growth",
    icon: "🌱",
  },
];

export default function Stats({
  stats,
  mood,
}: StatsProps) {
  return (
    <section className="mb-6 grid gap-4 md:grid-cols-4">
      {statInfo.map((stat) => {
        const value =
          stats[
            stat.name as keyof typeof stats
          ];

        return (
          <div
            key={stat.name}
            className="rounded-2xl bg-white/60 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-70">
                {stat.name}
              </span>

              <span>{stat.icon}</span>
            </div>

            <p className="mt-2 text-2xl font-bold">
              {value}
            </p>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ddd4c7]">
              <div
                className="h-full rounded-full bg-[#8f806d] transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    value
                  )}%`,
                }}
              />
            </div>
          </div>
        );
      })}

      <div className="rounded-2xl bg-white/60 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm opacity-70">
            Mood
          </span>

          <span>☁️</span>
        </div>

        <p className="mt-2 text-4xl">
          {mood.emoji}
        </p>

        <p className="mt-2 text-sm font-semibold">
          {mood.label}
        </p>
      </div>
    </section>
  );
}