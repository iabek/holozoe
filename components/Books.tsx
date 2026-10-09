"use client";

import QuoteCollection from "@/components/QuoteCollection";

type BooksProps = {
  onBack: () => void;
};

export default function Books({ onBack }: BooksProps) {
  return <QuoteCollection type="book" onBack={onBack} />;
}