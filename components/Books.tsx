
"use client";

import QuoteCollection from "@/components/QuoteCollection";

type Props = {
  onBack: () => void;
};

export default function Books({ onBack }: Props) {
  return <QuoteCollection type="book" onBack={onBack} />;
}
