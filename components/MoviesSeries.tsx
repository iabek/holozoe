"use client";

import QuoteCollection from "@/components/QuoteCollection";

type Props = {
  onBack: () => void;
};

export default function MoviesSeries({ onBack }: Props) {
  return <QuoteCollection type="media" onBack={onBack} />;
}