"use client";
import SplitBuddy from "../SplitBuddy";
import BootCheck from "../components/BootCheck";
import { CurrencyProvider } from "../lib/CurrencyContext";

export default function Page() {
  return (
    <CurrencyProvider>
      <BootCheck>
        <SplitBuddy />
      </BootCheck>
    </CurrencyProvider>
  );
}
