import { createContext, useContext, useState, type ReactNode } from "react";
import { makeDemoCards, type CardState } from "./phone-cards";
const Context = createContext<{state:CardState; setState: React.Dispatch<React.SetStateAction<CardState>>} | null>(null);
export function PhoneCardProvider({children}:{children:ReactNode}) {
  const [state,setState]=useState(makeDemoCards);
  return <Context.Provider value={{state,setState}}>{children}</Context.Provider>;
}
export function usePhoneCards(){ const value=useContext(Context); if(!value) throw Error("Missing phone card provider"); return value; }

// Context identity must not change under an already-mounted provider during HMR.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    import.meta.hot?.invalidate("Phone-card context changed; reload the complete provider tree");
  });
}