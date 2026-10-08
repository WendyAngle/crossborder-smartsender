import { useContext, useState, type ReactNode } from "react";
import { makeDemoCards, type CardState } from "./phone-cards";
import { PhoneCardContext } from "./phone-card-context";

type Store = { state: CardState; setState: React.Dispatch<React.SetStateAction<CardState>> };

export function PhoneCardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(makeDemoCards);
  return <PhoneCardContext.Provider value={{ state, setState }}>{children}</PhoneCardContext.Provider>;
}

export function usePhoneCards(): Store {
  const value = useContext(PhoneCardContext);
  if (!value) throw Error("Missing phone card provider");
  return value as Store;
}
